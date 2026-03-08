const express = require("express");
const router = express.Router();
const userController = require("../controllers/user.controller");
const verifyToken = require("../middlewares/auth.middleware");

// Phải có Token mới được xóa
router.use(verifyToken);

// API: Xóa tài khoản của chính tôi
router.delete("/delete", userController.deleteMyAccount);

module.exports = router;
