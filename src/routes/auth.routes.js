const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const verifyToken = require("../middlewares/auth.middleware");
const {
  registerValidator,
  loginValidator,
  changePasswordValidator,
} = require("../validations/auth.validator");

// Gắn Validator TRƯỚC khi gọi Controller
router.post("/register", registerValidator, authController.register); //dang ky

router.post("/login", loginValidator, authController.login); //dang nhap

router.put(
  "/forgot-password",
  verifyToken,
  changePasswordValidator,
  authController.changePassword,
); //quen mat khau

module.exports = router;
