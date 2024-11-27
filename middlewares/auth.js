const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      throw new ApiError(401, "กรุณาเข้าสู่ระบบ");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      next(new ApiError(401, "Token ไม่ถูกต้อง"));
    } else {
      next(error);
    }
  }
};

module.exports = auth;
