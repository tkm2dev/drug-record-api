const pdfService = require("../services/pdfService");
const drugRecordService = require("../services/drugRecordService");
const logger = require("../config/logger");
const ApiError = require("../utils/ApiError");

class PDFController {
  async generateSinglePDF(req, res) {
    try {
      const { id } = req.params;
      const { useCache = true } = req.query;

      // ดึงข้อมูล
      const record = await drugRecordService.findOne(id);

      // สร้าง PDF
      const filePath = await pdfService.generatePDF(record, {
        useCache: useCache === "true",
        cacheTime: 3600, // 1 ชั่วโมง
      });

      // อัพเดทสถานะ
      await drugRecordService.updateStatus(id, {
        pdf_status: "completed",
        pdf_generated_date: new Date(),
        pdf_generated_by: req.user?.username || "system",
        pdf_file_path: filePath,
      });

      // ส่งไฟล์
      res.download(filePath, `drug_record_${record.record_number}.pdf`);
    } catch (error) {
      logger.error("Error generating PDF:", error);
      throw new ApiError(500, "เกิดข้อผิดพลาดในการสร้าง PDF");
    }
  }

  async generateBatchPDF(req, res) {
    try {
      const { ids } = req.body; // array ของ record IDs
      const { useCache = true } = req.query;

      if (!Array.isArray(ids)) {
        throw new ApiError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
      }

      // ดึงข้อมูลทั้งหมด
      const records = await Promise.all(
        ids.map((id) => drugRecordService.findOne(id))
      );

      // สร้าง PDF แบบ batch
      const results = await pdfService.generateBatchPDF(records, {
        useCache: useCache === "true",
        cacheTime: 3600,
      });

      // อัพเดทสถานะ
      await Promise.all(
        results.map((result) =>
          drugRecordService.updateStatus(result.id, {
            pdf_status: "completed",
            pdf_generated_date: new Date(),
            pdf_generated_by: req.user?.username || "system",
            pdf_file_path: result.filePath,
          })
        )
      );

      res.json({
        message: "สร้าง PDF สำเร็จ",
        results,
      });
    } catch (error) {
      logger.error("Error generating batch PDFs:", error);
      throw new ApiError(500, "เกิดข้อผิดพลาดในการสร้าง PDF");
    }
  }

  async previewPDF(req, res) {
    try {
      const { id } = req.params;

      const record = await drugRecordService.findOne(id);
      const filePath = await pdfService.generatePDF(record, {
        useCache: true,
        cacheTime: 3600,
      });

      // ส่ง PDF แบบ preview
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      res.sendFile(filePath);
    } catch (error) {
      logger.error("Error previewing PDF:", error);
      throw new ApiError(500, "เกิดข้อผิดพลาดในการแสดง PDF");
    }
  }
}

module.exports = new PDFController();
