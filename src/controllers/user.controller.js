const prisma = require("../config/db");

exports.deleteMyAccount = async (req, res, next) => {
  try {
    // Lấy ID người dùng từ Token đã được giải mã
    const userId = req.user.id;

    // 1. Kiểm tra xem user có tồn tại không (phòng hờ)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }

    // 2. Thực hiện xóa User
    // Nhờ có chế độ onDelete: Cascade trong Prisma, toàn bộ Subject và Task
    // của sinh viên này sẽ TỰ ĐỘNG bốc hơi khỏi Database cùng lúc.
    await prisma.user.delete({
      where: { id: userId },
    });

    // 3. (Tùy chọn) Nếu hệ thống có lưu file ảnh avatar trên server/Cloudinary,
    // thì bạn sẽ viết thêm code xóa file ảnh ở đây trước khi return.

    res.status(200).json({
      message:
        "Đã xóa tài khoản và toàn bộ dữ liệu liên quan thành công. Hẹn gặp lại!",
    });
  } catch (error) {
    next(error);
  }
};
