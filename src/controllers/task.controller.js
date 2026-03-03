const prisma = require("../config/db");
const { calculateAutoPriority } = require("../utils/priority.utils");
exports.createTask = async (req, res) => {
  try {
    // 1. Chỉ lấy những trường cần thiết từ body, KHÔNG lấy priority vì hệ thống sẽ tự tính
    const { title, description, deadline, subjectId } = req.body;

    // 2. Tính toán Auto Priority TRƯỚC khi lưu vào Database
    const autoPriority = calculateAutoPriority(deadline);

    // 3. Tạo công việc vào Database
    const task = await prisma.task.create({
      data: {
        title,
        description,
        // Kiểm tra an toàn: Có deadline mới parse sang Date, không thì để null
        deadline: deadline ? new Date(deadline) : null,

        priority: autoPriority, // Gán giá trị đã tính toán tự động vào Database

        subjectId,
        userId: req.user.id, // Lấy từ middleware verifyToken
      },
    });

    res.status(201).json({
      message: "Tạo công việc thành công",
      task: task,
    });
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
exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, subjectId } = req.body;
    const autoPriority = calculateAutoPriority(deadline);
    const task = await prisma.task.updateMany({
      where: { id: id, userId: req.user.id },
      data: {
        title,
        description,
        subjectId,
        priority: autoPriority,
        deadline: deadline ? new Date(deadline) : undefined,
      },
    });

    if (task.count === 0)
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    res.status(200).json({ message: "Cập nhật công việc thành công" });
  } catch (error) {
    next(error);
  }
};
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedTask = await prisma.task.deleteMany({
      where: { id: id, userId: req.user.id },
    });

    if (deletedTask.count === 0)
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    res.status(200).json({ message: "Xóa công việc thành công" });
  } catch (error) {
    next(error);
  }
};
