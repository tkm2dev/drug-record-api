const db = require("../config/database");
const ApiError = require("../utils/ApiError");
const logger = require("../config/logger");
const ExcelExporter = require("../utils/excelExporter");
const PDFGenerator = require("../utils/pdfGenerator");

class DrugRecordService {
  async create(data) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      if (!data.first_name || !data.last_name || !data.id_card) {
        throw new ApiError(
          400,
          "กรุณากรอกข้อมูลที่จำเป็น: ชื่อ, นามสกุล, และเลขบัตรประชาชน"
        );
      }

      const recordNumber = await this.generateRecordNumber();

      const record = {
        ...data,
        record_number: recordNumber,
        drug_types: JSON.stringify(data.drug_types || []),
        motivations: JSON.stringify(data.motivations || []),
        has_used_drugs: data.has_used_drugs ? 1 : 0,
        address: JSON.stringify(data.address || {}),
        last_usage: JSON.stringify({
          type: data.lastUsage?.type || "",
          sellerName: data.lastUsage?.sellerName || "",
          date: data.lastUsage?.date || "",
          time: data.lastUsage?.time || "",
          amount: data.lastUsage?.amount || "",
          location: data.lastUsage?.location || "",
          sellerPhone: data.lastUsage?.sellerPhone || "",
          sellerLine: data.lastUsage?.sellerLine || "",
          sellerFacebook: data.lastUsage?.sellerFacebook || "",
          sellerBankaccount: data.lastUsage?.sellerBankaccount || "",
        }),
        attachments: JSON.stringify(data.attachments || []),
        images: JSON.stringify(data.images || []),
        created_at: new Date(),
        updated_at: new Date(),
      };

      console.log("Transformed Data for Insertion:", record);

      const [result] = await conn.query("INSERT INTO DrugSurvey SET ?", [
        record,
      ]);

      await conn.commit();
      return {
        id: result.insertId,
        record_number: recordNumber,
        message: "บันทึกข้อมูลสำเร็จ",
      };
    } catch (error) {
      await conn.rollback();
      console.error("Error creating drug record:", error);
      throw new ApiError(500, "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      conn.release();
    }
  }

  async generateRecordNumber() {
    const [rows] = await db.query(
      "SELECT COUNT(*) as count FROM DrugSurvey WHERE YEAR(created_at) = YEAR(CURRENT_DATE)"
    );
    const count = rows[0].count + 1;
    return `DRUG-${new Date().getFullYear()}-${String(count).padStart(4, "0")}`;
  }

  async findAll(page, limit) {
    const offset = (page - 1) * limit;

    const [[records], [total]] = await Promise.all([
      db.query(
        `SELECT * FROM DrugSurvey 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?`,
        [parseInt(limit), offset]
      ),
      db.query("SELECT COUNT(*) as total FROM DrugSurvey"),
    ]);

    return {
      records: records.map(this.formatRecord),
      total: total[0].total,
    };
  }

  async findOne(id) {
    const [records] = await db.query(
      "SELECT * FROM tb_drugs_record WHERE id = ?",
      [id]
    );

    if (records.length === 0) {
      throw new ApiError(404, "ไม่พบข้อมูล");
    }

    return this.formatRecord(records[0]);
  }

  async update(id, data) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // เตรียมข้อมูล
      const record = {
        ...data,
        drug_types: data.drug_types
          ? JSON.stringify(data.drug_types)
          : undefined,
        reasons: data.reasons ? JSON.stringify(data.reasons) : undefined,
        updated_at: new Date(),
      };

      const [result] = await conn.query(
        "UPDATE drug_records SET ? WHERE id = ?",
        [record, id]
      );

      if (result.affectedRows === 0) {
        throw new ApiError(404, "ไม่พบข้อมูลที่ต้องการแก้ไข");
      }

      await conn.query(
        "INSERT INTO record_activities (drug_record_id, activity_type, status, created_by) VALUES (?, ?, ?, ?)",
        [id, "update", "completed", data.updated_by]
      );

      await conn.commit();
      return { affected_rows: result.affectedRows };
    } catch (error) {
      await conn.rollback();
      logger.error("Error updating drug record:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async delete(id) {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // ตรวจสอบการมีอยู่ของข้อมูล
      const [record] = await conn.query(
        "SELECT * FROM tb_drugs_record WHERE id = ?",
        [id]
      );

      if (record.length === 0) {
        throw new ApiError(404, "ไม่พบข้อมูลที่ต้องการลบ");
      }

      // ลบไฟล์ที่เกี่ยวข้อง
      await conn.query("DELETE FROM record_files WHERE drug_record_id = ?", [
        id,
      ]);

      // ลบประวัติการทำงาน
      await conn.query(
        "DELETE FROM record_activities WHERE drug_record_id = ?",
        [id]
      );

      // ลบข้อมูลหลัก
      await conn.query("DELETE FROM tb_drugs_record WHERE id = ?", [id]);

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      logger.error("Error deleting drug record:", error);
      throw error;
    } finally {
      conn.release();
    }
  }

  async exportToExcel(id) {
    const record = await this.findOne(id);
    return await ExcelExporter.export(record);
  }

  async generatePDF(id) {
    const record = await this.findOne(id);
    return await PDFGenerator.generate(record);
  }

  formatRecord(record) {
    return {
      ...record,
      drug_types: JSON.parse(record.drug_types || "[]"),
      reasons: JSON.parse(record.reasons || "[]"),
      has_used_drugs: Boolean(record.has_used_drugs),
      files: record.files ? record.files.split(",") : [],
      created_at: record.created_at ? new Date(record.created_at) : null,
      updated_at: record.updated_at ? new Date(record.updated_at) : null,
    };
  }

  // ค้นหาทั่วไป
  async search({ keyword, id_card, province, page, limit }) {
    try {
      const offset = (page - 1) * limit;
      const params = [];
      let whereClause = "";

      // สร้าง where clause
      const conditions = [];

      if (keyword) {
        conditions.push(`(
        first_name LIKE ? OR 
        last_name LIKE ? OR 
        nickname LIKE ?
      )`);
        const searchKeyword = `%${keyword}%`;
        params.push(searchKeyword, searchKeyword, searchKeyword);
      }

      if (id_card) {
        conditions.push("id_card = ?");
        params.push(id_card);
      }

      if (province) {
        conditions.push("province = ?");
        params.push(province);
      }

      if (conditions.length > 0) {
        whereClause = "WHERE " + conditions.join(" AND ");
      }

      // Query หลัก
      const query = `
      SELECT 
        dr.*,
        CONCAT(dr.first_name, ' ', dr.last_name) as full_name,
        COUNT(*) OVER() as total_count
      FROM tb_drugs_record dr
      ${whereClause}
      ORDER BY dr.created_at DESC
      LIMIT ? OFFSET ?
    `;

      params.push(limit, offset);

      const [records] = await db.query(query, params);

      return {
        records: records.map(this.formatRecord),
        total: records.length > 0 ? records[0].total_count : 0,
      };
    } catch (error) {
      throw new ApiError(500, "เกิดข้อผิดพลาดในการค้นหาข้อมูล");
    }
  }

  // ค้นหาแบบละเอียด
  async advancedSearch({
    first_name,
    last_name,
    nickname,
    id_card,
    province,
    amphoe,
    tambon,
    age_start,
    age_end,
    has_used_drugs,
    drug_types,
    start_date,
    end_date,
    status,
    page,
    limit,
  }) {
    try {
      const offset = (page - 1) * limit;
      const params = [];
      const conditions = [];

      // สร้างเงื่อนไขการค้นหา
      if (first_name) {
        conditions.push("fname LIKE ?");
        params.push(`%${first_name}%`);
      }

      if (last_name) {
        conditions.push("lname LIKE ?");
        params.push(`%${last_name}%`);
      }

      if (nickname) {
        conditions.push("nickname LIKE ?");
        params.push(`%${nickname}%`);
      }

      if (id_card) {
        conditions.push("pid = ?");
        params.push(id_card);
      }

      if (province) {
        conditions.push("province = ?");
        params.push(province);
      }

      if (amphoe) {
        conditions.push("amphoe = ?");
        params.push(amphoe);
      }

      if (tambon) {
        conditions.push("tambon = ?");
        params.push(tambon);
      }

      if (age_start && age_end) {
        conditions.push("age BETWEEN ? AND ?");
        params.push(age_start, age_end);
      }

      if (has_used_drugs !== undefined) {
        conditions.push("has_used_drugs = ?");
        params.push(has_used_drugs);
      }

      if (drug_types && drug_types.length > 0) {
        const drugTypeConditions = drug_types.map((type) => {
          return "JSON_CONTAINS(drug_types, ?)";
        });
        conditions.push(`(${drugTypeConditions.join(" OR ")})`);
        drug_types.forEach((type) => params.push(JSON.stringify(type)));
      }

      if (start_date && end_date) {
        conditions.push("created_at BETWEEN ? AND ?");
        params.push(start_date, end_date);
      }

      if (status) {
        conditions.push("status = ?");
        params.push(status);
      }

      const whereClause =
        conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

      const query = `
      SELECT 
        dr.*,
        CONCAT(dr.fname, ' ', dr.lname) as full_name,
      FROM patients dr
      ${whereClause}
      ORDER BY dr.created_at DESC
      LIMIT ? OFFSET ?
    `;

      params.push(limit, offset);

      const [records] = await db.query(query, params);

      return {
        records: records.map(this.formatRecord),
        total: records.length > 0 ? records[0].total_count : 0,
      };
    } catch (error) {
      throw new ApiError(500, "เกิดข้อผิดพลาดในการค้นหาข้อมูล");
    }
  }

  //getPatients
  async getHumanModel() {
    const [patients] = await db.query("SELECT * FROM tb_patients limit 100");
    return patients;
  }

  async searchhuman({ keyword, id_card, province, page, limit }) {
    try {
      const offset = (page - 1) * limit;
      const params = [];
      let whereClause = "";

      // สร้าง where clause
      const conditions = [];

      //ถ้ามีการส่งเป็นตัวเลข ให้ค้นหาจาก pid ก่อน

      if (keyword) {
        conditions.push(`(fname LIKE ? OR lname LIKE ? )`);
        const searchKeyword = `%${keyword}%`;
        params.push(searchKeyword, searchKeyword);
      }

      if (id_card) {
        conditions.push("pid = ?");
        params.push(id_card);
      }
      if (province) {
        conditions.push("province = ?");
        params.push(province);
      }

      if (conditions.length > 0) {
        whereClause = "WHERE " + conditions.join(" AND ");
      }

      // Query หลัก
      const query = `
      SELECT * From patients  ${whereClause}  ORDER BY created_at DESC LIMIT ? OFFSET ?
    `;

      params.push(limit, offset);

      const [records] = await db.query(query, params);

      return {
        records: records,
        total: records.length > 0 ? records[0].total_count : 0,
      };
    } catch (error) {
      throw new ApiError(500, "เกิดข้อผิดพลาดในการค้นหาข้อมูล", error);
    }
  }

  // เพิ่มเมธอดสำหรับดึงข้อมูลพื้นที่
  async searchByArea({ province, amphoe, tambon, moo, house_no, page, limit }) {
    try {
      const offset = (page - 1) * limit;
      const params = [];
      const conditions = [];

      // สร้างเงื่อนไขการค้นหาจาก column แยก
      if (province) {
        conditions.push("province = ?");
        params.push(province);
      }

      if (amphoe) {
        conditions.push("amphoe = ?"); // สมมติว่าชื่อ column คือ amphur
        params.push(amphoe);
      }

      if (tambon) {
        conditions.push("tambon = ?");
        params.push(tambon);
      }

      if (moo) {
        conditions.push("moo = ?");
        params.push(moo);
      }
      if (house_no) {
        conditions.push("house_no = ?");
        params.push(house_no);
      }

      const whereClause =
        conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

      // Query หลัก
      const query = `
    SELECT   *    FROM patients ${whereClause} ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;

      console.log("query", query);
      params.push(limit, offset);

      const [records] = await db.query(query, params);

      console.log("records", records);
      // แปลงผลลัพธ์
      const formattedRecords = records.map((record) => {
        const address_parts = {
          house_no: record.house_no,
          moo: record.moo,
          tambon: record.tambon,
          amphoe: record.amphur, // ปรับตามชื่อ column จริง
          province: record.province,
        };

        return {
          ...record,
          address_parts,
        };
      });

      return {
        records: formattedRecords,
        total: records.length > 0 ? records[0].total_count : 0,
      };
    } catch (error) {
      logger.error("Area search error:", error);
      console.error("Full error:", error);
      throw new ApiError(500, "เกิดข้อผิดพลาดในการค้นหาข้อมูลตามพื้นที่");
    }
  }

  // เพิ่มเมธอดสำหรับดึงข้อมูลพื้นที่
  async getProvinces() {
    try {
      const [provinces] = await db.query(`
    SELECT DISTINCT province 
    FROM patients 
    WHERE province IS NOT NULL 
    ORDER BY province
  `);
      return provinces.map((p) => p.province);
    } catch (error) {
      logger.error("Get provinces error:", error);
      throw new ApiError(500, "เกิดข้อผิดพลาดในการดึงข้อมูลจังหวัด");
    }
  }

  async getAmphoes(province) {
    try {
      const [amphoes] = await db.query(
        `
    SELECT DISTINCT amphoe 
    FROM patients 
    WHERE province = ? AND amphoe IS NOT NULL 
    ORDER BY amphoe
  `,
        [province]
      );
      return amphoes.map((a) => a.amphoe);
    } catch (error) {
      logger.error("Get amphoes error:", error);
      throw new ApiError(500, "เกิดข้อผิดพลาดในการดึงข้อมูลอำเภอ");
    }
  }

  async getTambons(province, amphoe) {
    try {
      const [tambons] = await db.query(
        `
    SELECT DISTINCT tambon 
    FROM patients 
    WHERE province = ? AND amphoe = ? AND tambon IS NOT NULL 
    ORDER BY tambon
  `,
        [province, amphoe]
      );
      return tambons.map((t) => t.tambon);
    } catch (error) {
      logger.error("Get tambons error:", error);
      throw new ApiError(500, "เกิดข้อผิดพลาดในการดึงข้อมูลตำบล");
    }
  }
}

function parseThaiAddress(addressString) {
  const address = {
    houseNo: "",
    moo: "",
    soi: "",
    road: "",
    tambon: "",
    amphoe: "",
    province: "",
  };

  try {
    // แยกเลขที่บ้าน
    const houseMatch = addressString.match(/^(\d+(?:\/\d+)?)/);
    if (houseMatch) {
      address.houseNo = houseMatch[1];
    }

    // แยกหมู่
    const mooMatch = addressString.match(/ม\.(\d+)/);
    if (mooMatch) {
      address.moo = mooMatch[1];
    }

    // แยกซอย
    const soiMatch = addressString.match(/ซอย([^\s]+)/);
    if (soiMatch) {
      address.soi = soiMatch[1];
    }

    // แยกถนน
    const roadMatch = addressString.match(/ถ\.([^\s]+)/);
    if (roadMatch) {
      address.road = roadMatch[1];
    }

    // แยกตำบล
    const tambonMatch = addressString.match(/ต\.([^\s]+)/);
    if (tambonMatch) {
      address.tambon = tambonMatch[1];
    }

    // แยกอำเภอ
    const amphoeMatch = addressString.match(/อ\.([^\s]+)/);
    if (amphoeMatch) {
      address.amphoe = amphoeMatch[1];
    }

    // แยกจังหวัด
    const provinceMatch = addressString.match(/จ\.([^\s]+)/);
    if (provinceMatch) {
      address.province = provinceMatch[1];
    }

    return address;
  } catch (error) {
    logger.error("Address parsing error:", error);
    return address;
  }
}

module.exports = new DrugRecordService();
