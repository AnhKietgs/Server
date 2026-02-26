// Nạp các biến môi trường từ file .env
require("dotenv").config();

// Import app đã được cấu hình đầy đủ từ thư mục src
const app = require("./src/app.js");

// Xác định Port (Lấy từ .env, nếu không có thì mặc định là 5000)
const PORT = process.env.PORT || 5000;

// Khởi động server
const server = app.listen(PORT, () => {
  console.log(`[🚀 Backend] Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`[📚 Môi trường] ${process.env.NODE_ENV || "development"}`);
});

// Xử lý lỗi Unhandled Promise Rejections (Ví dụ: Mất kết nối DB đột ngột)
// Giúp server không bị crash một cách im lặng
process.on("unhandledRejection", (err, promise) => {
  console.error(`[LỖI NGHIÊM TRỌNG] Unhandled Rejection: ${err.message}`);
  // Đóng server một cách an toàn
  server.close(() => process.exit(1));
});
