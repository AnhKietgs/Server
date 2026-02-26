const prisma = require("../config/db");

exports.createTask = async (req, res) => {
  try {
    const { title, description, deadline, priority, subjectId } = req.body;
    const task = await prisma.task.create({
      data: {
        title,
        description,
        deadline: new Date(deadline),
        priority,
        subjectId,
        userId: req.user.id, // Lấy từ middleware verifyToken
      },
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    // Chỉ lấy task của user đang đăng nhập, tự động join với bảng Subject
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      include: { subject: { select: { name: true, colorCode: true } } },
      orderBy: { deadline: "asc" }, // Ưu tiên task sắp đến hạn
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Cập nhật trạng thái công việc (TODO -> IN_PROGRESS -> DONE)
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào (Validation)
    const allowedStatuses = ["TODO", "IN_PROGRESS", "DONE"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Trạng thái không hợp lệ. Chỉ chấp nhận: TODO, IN_PROGRESS, DONE",
      });
    }

    // 2. Cập nhật vào Database thông qua Prisma
    // Dùng updateMany để kết hợp điều kiện userId, đảm bảo tính bảo mật (Ai tạo người nấy sửa)
    const updatedTask = await prisma.task.updateMany({
      where: {
        id: id,
        userId: req.user.id, // Lấy từ token qua middleware verifyToken
      },
      data: {
        status: status,
      },
    });

    // 3. Xử lý trường hợp không tìm thấy task hoặc cố tình sửa task của người khác
    if (updatedTask.count === 0) {
      return res.status(404).json({
        message:
          "Không tìm thấy công việc này hoặc bạn không có quyền chỉnh sửa",
      });
    }

    res.status(200).json({
      message: "Cập nhật trạng thái công việc thành công",
      newStatus: status,
    });
  } catch (error) {
    next(error); // Đẩy lỗi về Global Error Handler
  }
};
