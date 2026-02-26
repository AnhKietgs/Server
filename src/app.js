const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const errorHandler = require("./middlewares/error.middleware");

// Import routes
const authRoutes = require("./routes/auth.routes");
const subjectRoutes = require("./routes/subject.routes");
const taskRoutes = require("./routes/task.routes");

const app = express();

// 1. Áp dụng Middlewares tầng Global
app.use(helmet()); // Bảo vệ các header HTTP
app.use(cors()); // Cho phép Frontend React gọi API
app.use(express.json()); // Phân tích body dưới dạng JSON

// 2. Định tuyến các module (Routes)
app.use("/api/v1/auth", authRoutes); //đăng ký, đăng nhập
app.use("/api/v1/subjects", subjectRoutes); //tạo môn đựa trên(token) login
app.use("/api/v1/tasks", taskRoutes); //Tạo Công việc dựa trên(token) login

// 3. Xử lý đường dẫn không tồn tại (404 Not Found)
app.use((req, res, next) => {
  res.status(404).json({ message: "Không tìm thấy API Endpoint này" });
});

// 4. Áp dụng Global Error Handler (Luôn phải nằm ở cuối cùng)
app.use(errorHandler);

module.exports = app;
