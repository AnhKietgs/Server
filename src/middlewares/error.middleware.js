// Middleware này sẽ hứng tất cả các lỗi được ném ra từ các Controller (thông qua hàm next(error))
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] - ${err.message}`);

  // Phân tích các lỗi đặc thù từ Prisma ORM (Ví dụ: lỗi trùng lặp Unique Constraint)
  if (err.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "Dữ liệu này đã tồn tại trong hệ thống (Trùng lặp)",
    });
  }

  // Lỗi mặc định
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Lỗi máy chủ nội bộ",
    // Chỉ hiển thị stack trace (dấu vết lỗi) ở môi trường phát triển (development)
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

module.exports = errorHandler;
