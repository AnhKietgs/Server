const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

exports.register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Kiểm tra email tồn tại
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(400).json({ message: "Email đã được sử dụng" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Lưu DB
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, fullName },
    });

    res.status(201).json({ message: "Đăng ký thành công", userId: user.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user)
      return res.status(404).json({ message: "Không tìm thấy người dùng" });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword)
      return res.status(401).json({ message: "Sai mật khẩu" });

    // Tạo JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }, // PWA nên để thời gian sống của token dài một chút
    );

    res.json({
      message: "Đăng nhập thành công",
      token,
      user: { id: user.id, fullName: user.fullName },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
