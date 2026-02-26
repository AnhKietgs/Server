const prisma = require("../config/db");

// Lấy danh sách môn học của sinh viên đang đăng nhập
exports.getSubjects = async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      // Tùy chọn: include thêm số lượng task đang mở của môn này để hiển thị trên Dashboard
      include: {
        _count: {
          select: { tasks: { where: { status: { not: "DONE" } } } },
        },
      },
    });
    res.status(200).json(subjects);
  } catch (error) {
    next(error); // Đẩy lỗi về Global Error Handler
  }
};

// Thêm môn học mới
exports.createSubject = async (req, res, next) => {
  try {
    const { name, credits, colorCode } = req.body;
    const newSubject = await prisma.subject.create({
      data: {
        name,
        credits: parseInt(credits) || 0,
        colorCode: colorCode || "#CCCCCC", // Màu mặc định nếu không truyền
        userId: req.user.id,
      },
    });
    res.status(201).json(newSubject);
  } catch (error) {
    next(error);
  }
};

// Cập nhật môn học
exports.updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, credits, colorCode } = req.body;

    // Đảm bảo user chỉ sửa được môn học của chính họ
    const subject = await prisma.subject.updateMany({
      where: { id: id, userId: req.user.id },
      data: { name, credits, colorCode },
    });

    if (subject.count === 0) {
      return res
        .status(404)
        .json({
          message: "Không tìm thấy môn học hoặc không có quyền truy cập",
        });
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    next(error);
  }
};
