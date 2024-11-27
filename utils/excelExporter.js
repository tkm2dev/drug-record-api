const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");

class ExcelExporter {
  static async export(record) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Drug Record");

    // กำหนดหัวตาราง
    worksheet.columns = [
      { header: "หัวข้อ", key: "label", width: 20 },
      { header: "ข้อมูล", key: "value", width: 30 },
    ];

    // เพิ่มข้อมูล
    worksheet.addRows([
      { label: "เลขที่บันทึก", value: record.record_number },
      { label: "ชื่อ-สกุล", value: `${record.first_name} ${record.last_name}` },
      { label: "เลขบัตรประชาชน", value: record.id_card },
      { label: "อายุ", value: record.age },
      {
        label: "ที่อยู่",
        value: `${record.house_no} ต.${record.tambon} อ.${record.amphoe} จ.${record.province}`,
      },
      {
        label: "ประวัติการใช้ยา",
        value: record.has_used_drugs ? "เคย" : "ไม่เคย",
      },
      { label: "ประเภทยา", value: record.drug_types.join(", ") },
      { label: "เหตุผล", value: record.reasons.join(", ") },
    ]);

    // จัดรูปแบบ
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "left" };
      });
    });

    // สร้างไฟล์
    const fileName = `drug_record_${record.record_number}.xlsx`;
    const filePath = path.join(__dirname, "../uploads/exports", fileName);

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }
}

module.exports = ExcelExporter;
