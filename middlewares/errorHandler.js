const logger = require("../config/logger");
const ApiError = require("../utils/ApiError");

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || "เกิดข้อผิดพลาดในระบบ";
    error = new ApiError(statusCode, message, false, err.stack);
  }

  const response = {
    code: error.statusCode,
    message: error.message,
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  };

  if (error.statusCode >= 500) {
    logger.error("Error:", {
      error: error,
      request: {
        method: req.method,
        url: req.url,
        body: req.body,
        user: req.user,
      },
    });
  }

  res.status(error.statusCode).json(response);
};

module.exports = errorHandler;
