const router = require("express").Router();
const pdfController = require("../controllers/pdfController");
const auth = require("../middlewares/auth");
const asyncHandler = require("../middlewares/asyncHandler");

// สร้าง PDF เดี่ยว
router.get(
  "/drug-records/:id/pdf",
  auth,
  asyncHandler(pdfController.generateSinglePDF)
);

// สร้าง PDF หลายรายการ
router.post(
  "/drug-records/batch-pdf",
  auth,
  asyncHandler(pdfController.generateBatchPDF)
);

// Preview PDF
router.get(
  "/drug-records/:id/pdf/preview",
  auth,
  asyncHandler(pdfController.previewPDF)
);

module.exports = router;
