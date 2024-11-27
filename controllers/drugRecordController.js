const DrugRecordService = require("../services/drugRecordService");
const logger = require("../config/logger");
const ApiError = require("../utils/ApiError");

// แก้ไข: ลบ class และใช้ object literal แทน
const drugRecordController = {
  async exportRecord(req, res) {
    const { id } = req.params;
    const filePath = await DrugRecordService.exportToExcel(id);

    res.json({
      message: "Export ข้อมูลสำเร็จ",
      filePath,
    });
  },

  async generatePDF(req, res) {
    const { id } = req.params;
    const filePath = await DrugRecordService.generatePDF(id);

    res.json({
      message: "สร้าง PDF สำเร็จ",
      filePath,
    });
  },

  async searchDrug(req, res) {
    try {
      const { keyword, id_card, province, page = 1, limit = 10 } = req.query;

      const result = await DrugRecordService.search({
        keyword,
        id_card,
        province,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
        },
      });
    } catch (error) {
      logger.error("Search error:", error);
      throw error;
    }
  },

  async advancedSearch(req, res) {
    try {
      const {
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
        page = 1,
        limit = 10,
      } = req.query;

      const result = await DrugRecordService.advancedSearch({
        first_name,
        last_name,
        nickname,
        id_card,
        province,
        amphoe,
        tambon,
        age_start: age_start ? parseInt(age_start) : null,
        age_end: age_end ? parseInt(age_end) : null,
        has_used_drugs: has_used_drugs === "true",
        drug_types: drug_types ? drug_types.split(",") : null,
        start_date,
        end_date,
        status,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
        },
      });
    } catch (error) {
      logger.error("Advanced search error:", error);
      throw error;
    }
  },

  async create(req, res, next) {
    console.log("--------------------   >>  Create drug record:", req.body);
    try {
      const data = req.body;
      const result = await DrugRecordService.create(data);
      res.status(201).json({
        success: true,
        message: "บันทึกข้อมูลสำเร็จ",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async findAll(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await DrugRecordService.findAll(
        parseInt(page),
        parseInt(limit)
      );
      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async findOne(req, res, next) {
    try {
      const { id } = req.params;
      const result = await DrugRecordService.findOne(id);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;
      const result = await DrugRecordService.update(id, data);
      res.json({
        success: true,
        message: "แก้ไขข้อมูลสำเร็จ",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await DrugRecordService.delete(id);
      res.json({
        success: true,
        message: "ลบข้อมูลสำเร็จ",
      });
    } catch (error) {
      next(error);
    }
  },

  // บุคคลที่ใช้ยาเสพติด
  async getPatientsByKeyword(req, res) {
    try {
      // Extract query parameters
      let { keyword, id_card, province, page = 1, limit = 50 } = req.query;

      console.log("Searching patients by keyword:", keyword);

      // ตรวจสอบว่า keyword เป็นตัวเลขและมีจำนวน 13 หลักหรือไม่
      if (keyword && /^\d{13}$/.test(keyword)) {
        id_card = keyword;
        keyword = null;
      } else {
        keyword = keyword || null;
        id_card = null;
      }

      console.log("Searching patients by id_card:", id_card);
      console.log("Searching patients by keyword:", keyword);

      // เรียกใช้บริการค้นหาบุคคล
      const result = await DrugRecordService.searchhuman({
        keyword,
        id_card,
        province,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      // ส่งผลลัพธ์กลับไปยัง client
      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
        },
      });
    } catch (error) {
      logger.error("Search error:", error);
      // ส่งสถานะ 500 พร้อมข้อความแจ้งข้อผิดพลาด
      res.status(500).json({
        success: false,
        message: "An error occurred while searching for patients.",
        error: error.message,
      });
    }
  },

  //เพิ่ม function สำหรับค้นหาข้อมูลตามพื้นที่

  // เพิ่มเมธอดใหม่ใน drugRecordController object
  async searchByArea(req, res) {
    try {
      const {
        province,
        amphoe,
        tambon,
        moo,
        house_no,
        page = 1,
        limit = 10,
      } = req.query;

      const result = await DrugRecordService.searchByArea({
        province,
        amphoe,
        tambon,
        moo,
        house_no,
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: result.records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
        },
      });
    } catch (error) {
      logger.error("Area search error:", error);
      throw error;
    }
  },

  async getProvinces(req, res) {
    try {
      const provinces = await DrugRecordService.getProvinces();
      console.log("Provinces:", provinces);
      res.json({
        success: true,
        data: provinces,
      });
    } catch (error) {
      logger.error("Get provinces error:", error);
      throw error;
    }
  },

  async getAmphoes(req, res) {
    try {
      const { province } = req.query;
      if (!province) {
        throw new ApiError(400, "กรุณาระบุจังหวัด");
      }

      console.log("Searching amphoes for province:", province);

      const amphoes = await DrugRecordService.getAmphoes(province);
      res.json({
        success: true,
        data: amphoes,
      });
    } catch (error) {
      logger.error("Get amphoes error:", error);
      throw error;
    }
  },

  async getTambons(req, res) {
    try {
      const { province, amphoe } = req.query;
      if (!province || !amphoe) {
        throw new ApiError(400, "กรุณาระบุจังหวัดและอำเภอ");
      }
      const tambons = await DrugRecordService.getTambons(province, amphoe);
      res.json({
        success: true,
        data: tambons,
      });
    } catch (error) {
      logger.error("Get tambons error:", error);
      throw error;
    }
  },
};

// แก้ไข: export object โดยตรง
module.exports = drugRecordController;
