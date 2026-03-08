const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const verifyToken = require("../middlewares/auth.middleware");

// Áp dụng middleware bảo vệ cho tất cả các route task
router.use(verifyToken);

router.post("/createTask", taskController.createTask); //tao task
router.patch("/updateStatus/:id", taskController.updateTaskStatus); //update trang thai
router.put("/updateTask/:id", taskController.updateTask); //update task
router.delete("/deleteTask/:id", taskController.deleteTask); //xoa
router.get("/getTask", taskController.getTasks); //xuat task
router.get("/weekly-progress", taskController.getWeeklyProgress);
module.exports = router;
