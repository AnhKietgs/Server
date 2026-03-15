const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const verifyToken = require("../middlewares/auth.middleware");

router.use(verifyToken);

// Gọi API lấy toàn bộ dữ liệu Analytics
router.get("/overview", analyticsController.getAnalyticsOverview);

module.exports = router;