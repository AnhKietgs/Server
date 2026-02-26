const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const {
  registerValidator,
  loginValidator,
} = require("../validations/auth.validator");

// Gắn Validator TRƯỚC khi gọi Controller
router.post("/register", registerValidator, authController.register);
router.post("/login", loginValidator, authController.login);

module.exports = router;
