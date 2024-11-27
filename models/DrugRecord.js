/ models/DrugRecord.js
const db = require('../config/database');

class DrugRecord {
  // แปลงข้อมูลจาก DB เป็น JSON object
  static formatRecord(record) {
    return {
      ...record,
      has_used_drugs: !!record.has_used_drugs,
      drug_types: JSON.parse(record.drug_types || '[]'),
      reasons: JSON.parse(record.reasons || '[]')
    };
  }

  // ตรวจสอบความถูกต้องของข้อมูล
  static validateRecord(data) {
    const errors = [];
    
    if (!data.first_name) errors.push('กรุณาระบุชื่อ');
    if (!data.last_name) errors.push('กรุณาระบุนามสกุล');
    if (!data.id_card?.match(/^\d{13}$/)) errors.push('เลขบัตรประชาชนไม่ถูกต้อง');
    if (!data.age || data.age < 0) errors.push('กรุณาระบุอายุที่ถูกต้อง');
    
    return errors;
  }

  // สร้างเลขที่บันทึกอัตโนมัติ
  static async generateRecordNumber() {
    const [rows] = await db.query(
      'SELECT COUNT(*) as count FROM  tb_drugs_record WHERE YEAR(created_at) = YEAR(CURRENT_DATE)'
    );
    const count = rows[0].count + 1;
    return `DRUG-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
  }
}

module.exports = DrugRecord;
