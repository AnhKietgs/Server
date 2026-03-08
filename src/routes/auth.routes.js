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
router.post("/register", registerValidator, authController.register);
router.post("/login", loginValidator, authController.login);
router.put(
  "/change-password",
  verifyToken,
  changePasswordValidator,
  authController.changePassword,
);
module.exports = router;
