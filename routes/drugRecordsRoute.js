const express = require("express");
const router = express.Router();
const drugRecordController = require("../controllers/drugRecordController");
const validator = require("../middlewares/validator");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });

router.get("/search-human", drugRecordController.getPatientsByKeyword);

// เพิ่ม routes สำหรับการค้นหาตามพื้นที่
router.get("/area-search", drugRecordController.searchByArea);
router.get("/provinces", drugRecordController.getProvinces);
router.get("/amphoes", drugRecordController.getAmphoes);
router.get("/tambons", drugRecordController.getTambons);

// แก้ไข: ใช้ controller โดยตรงไม่ต้องสร้าง instance
router.get(
  "/drug-survey",
  validator("listDrugRecords"),
  drugRecordController.findAll
);

router.post(
  "/drug-survey",
  upload.fields([
    { name: "attachments", maxCount: 3 },
    { name: "images", maxCount: 3 },
  ]),
  validator("createDrugRecord"),
  drugRecordController.create
);
router.get(
  "/searchdrug",
  validator("searchRecords"),
  drugRecordController.searchDrug
);

router.get(
  "/advanced-search",
  validator("advancedSearch"),
  drugRecordController.advancedSearch
);

// API สำหรับค้นหาข้อมูล

router.get(
  "/drug/:id",
  validator("getDrugRecord"),
  drugRecordController.findOne
);

router.put("/:id", validator("updateDrugRecord"), drugRecordController.update);

router.delete(
  "/:id",
  validator("deleteDrugRecord"),
  drugRecordController.delete
);

router.post("/:id/export", drugRecordController.exportRecord);
router.post("/:id/pdf", drugRecordController.generatePDF);

//ค้นหาข้อมูล  บุคคลจากที่อยู่

module.exports = router;
