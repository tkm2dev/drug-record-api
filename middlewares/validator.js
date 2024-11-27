const { body, query, validationResult } = require("express-validator");

const validate = (method) => {
  switch (method) {
    case "createDrugRecord": {
      return [
        body("first_name").notEmpty().withMessage("กรุณาระบุชื่อ"),
        body("last_name").notEmpty().withMessage("กรุณาระบุนามสกุล"),
        body("id_card")
          .matches(/^\d{13}$/)
          .withMessage("เลขบัตรประชาชนไม่ถูกต้อง"),
        body("age")
          .optional()
          .isInt({ min: 0 })
          .withMessage("กรุณาระบุอายุที่ถูกต้อง"),
        (req, res, next) => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            console.error("Validation Errors:", errors.array());
            return res.status(400).json({
              success: false,
              errors: errors.array(),
            });
          }
          next();
        },
      ];
    }

    case "listDrugRecords": {
      return [
        query("page")
          .optional()
          .isInt({ min: 1 })
          .withMessage("หน้าต้องเป็นตัวเลขที่มากกว่า 0"),
        query("limit")
          .optional()
          .isInt({ min: 1 })
          .withMessage("จำนวนต่อหน้าต้องเป็นตัวเลขที่มากกว่า 0"),
        (req, res, next) => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({
              success: false,
              errors: errors.array(),
            });
          }
          next();
        },
      ];
    }
    case "searchRecords": {
      return [
        query("keyword").optional().isString(),
        query("id_card")
          .optional()
          .matches(/^\d{13}$/)
          .withMessage("เลขบัตรประชาชนไม่ถูกต้อง"),
        query("province").optional().isString(),
        (req, res, next) => {
          const errors = validationResult(req);
          if (!errors.isEmpty()) {
            return res.status(400).json({
              success: false,
              errors: errors.array(),
            });
          }
          next();
        },
      ];
    }
    default:
      return [];
  }
};

module.exports = validate;
