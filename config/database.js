const mysql = require("mysql2/promise");
const logger = require("./logger");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+07:00",
});

// ทดสอบการเชื่อมต่อ
pool
  .getConnection()
  .then((connection) => {
    logger.info("Database connected successfully");
    connection.release();
  })
  .catch((error) => {
    logger.error("Database connection error:", error);
  });

module.exports = pool;
