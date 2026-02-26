const jwt = require("jsonwebtoken");

// Tạo token với thời hạn sống (mặc định 7 ngày cho PWA để tránh user phải đăng nhập liên tục)
const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Hàm verify có thể tái sử dụng ở các luồng khác nếu cần
const verifyTokenBase = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyTokenBase };
