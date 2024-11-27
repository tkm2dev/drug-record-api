const PDFGenerator = require("../utils/pdfGenerator");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");
require("moment/locale/th");

class PDFService {
  constructor() {
    this.pdfDir = path.join(__dirname, "../uploads/pdf");
    this.tempDir = path.join(__dirname, "../uploads/temp");

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    fs.ensureDirSync(this.pdfDir);
    fs.ensureDirSync(this.tempDir);
  }

  async generatePDF(data, options = {}) {
    try {
      // กำหนดชื่อไฟล์
      const fileName = this.generateFileName(data);
      const filePath = path.join(this.pdfDir, fileName);

      // ตรวจสอบ cache ถ้ามีการกำหนด
      if (
        options.useCache &&
        (await this.checkCache(filePath, options.cacheTime))
      ) {
        return filePath;
      }

      // สร้าง PDF
      const pdfPath = await PDFGenerator.generate(data);

      // ย้ายไฟล์จาก temp ไปยังโฟลเดอร์หลัก
      await fs.move(pdfPath, filePath, { overwrite: true });

      return filePath;
    } catch (error) {
      throw new Error(`Error generating PDF: ${error.message}`);
    }
  }

  async generateBatchPDF(records, options = {}) {
    try {
      const results = [];
      for (const record of records) {
        const filePath = await this.generatePDF(record, options);
        results.push({
          id: record.id,
          filePath,
          success: true,
        });
      }
      return results;
    } catch (error) {
      throw new Error(`Error generating batch PDFs: ${error.message}`);
    }
  }

  generateFileName(data) {
    const timestamp = moment().tz("Asia/Bangkok").format("YYYYMMDD-HHmmss");
    return `drug_record_${data.record_number}_${timestamp}.pdf`;
  }

  async checkCache(filePath, cacheTime = 3600) {
    try {
      const stats = await fs.stat(filePath);
      const now = moment();
      const fileTime = moment(stats.mtime);
      return now.diff(fileTime, "seconds") < cacheTime;
    } catch (error) {
      return false;
    }
  }

  async cleanupOldFiles(maxAge = 86400) {
    // 24 ชั่วโมง
    try {
      const files = await fs.readdir(this.pdfDir);
      const now = moment();

      for (const file of files) {
        const filePath = path.join(this.pdfDir, file);
        const stats = await fs.stat(filePath);
        const fileTime = moment(stats.mtime);

        if (now.diff(fileTime, "seconds") > maxAge) {
          await fs.remove(filePath);
        }
      }
    } catch (error) {
      throw new Error(`Error cleaning up old files: ${error.message}`);
    }
  }
}

module.exports = new PDFService();
