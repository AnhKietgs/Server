const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/studySession.controller");
const verifyToken = require("../middlewares/auth.middleware");

router.use(verifyToken);

// API lưu thời gian khi hết phút
router.post("/saveTime", sessionController.saveStudySession);

// API lấy dữ liệu vẽ biểu đồ (Frontend sẽ gọi API này ở trang Dashboard)
router.get("/weekly-chart", sessionController.getWeeklyChartData);

module.exports = router;
