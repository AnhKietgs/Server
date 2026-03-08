const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

exports.register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Kiểm tra email tồn tại
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(400).json({ message: "Email had been used!!!" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Lưu DB
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, fullName },
    });

    res.status(201).json({ message: "Successfully", userId: user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) return res.status(404).json({ message: "User not found!!!" });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword)
      return res.status(401).json({ message: "Password is wrong!!" });

    // Tạo JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }, // PWA nên để thời gian sống của token dài một chút
    );

    res.json({
      message: "Successfully",
      token,
      user: { id: user.id, fullName: user.fullName },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Cập nhật mật khẩu khi người dùng ĐÃ ĐĂNG NHẬP (Sử dụng JWT Token)
exports.changePassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    // 1. Lấy thông tin người dùng từ DB dựa vào req.user.id
    // (req.user.id có được là nhờ middleware verifyToken đã giải mã JWT)
    const user = await prisma.user.findUnique({
      where: { email: email },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy tài khoản với email này" });
    }

    if (user.id !== req.user.id) {
      return res.status(403).json({
        message:
          "Lỗi bảo mật: Bạn không có quyền đổi mật khẩu của tài khoản này",
      });
    }
    //tiến hành mã hóa (Hash) mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 4. Lưu mật khẩu mới vào Database
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: "Success!!!" });
  } catch (error) {
    next(error);
  }
};
