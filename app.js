require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");
const logger = require("./config/logger");
const errorHandler = require("./middlewares/errorHandler");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// ตั้งค่า Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 นาที
  max: 100, // จำกัด 100 requests ต่อ IP
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(morgan("combined", { stream: logger.stream }));
app.use(limiter);

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", timestamp: new Date() });
});

// Routes
//use route
app.use("/api/", require("./routes/drugRecordsRoute"));

// Error Handling
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "เกิดข้อผิดพลาดในระบบ",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

app.use(errorHandler);

// Uncaught Exception Handler
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

// Unhandled Rejection Handler
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled Rejection:", error);
  process.exit(1);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
