const express = require("express");
const router = express.Router();
const scheduleController = require("../controllers/schedule.controller");
const verifyToken = require("../middlewares/auth.middleware");

router.use(verifyToken);

router.post("/create", scheduleController.createClassSchedule);
router.get("/today", scheduleController.getTodayClasses);
router.get("/all", scheduleController.getAllClasses);
router.delete("/:id", scheduleController.deleteSchedule);

module.exports = router;
