const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");
const verifyToken = require("../middlewares/auth.middleware");

// Áp dụng middleware bảo vệ cho tất cả các route task
router.use(verifyToken);

router.post("/", taskController.createTask);
router.get("/", taskController.getTasks);
// Bổ sung router.put('/:id', ...) và router.delete('/:id', ...)
router.patch("/:id/status", taskController.updateTaskStatus);
router.put("/:id", taskController.updateTask);
router.delete("/:id", taskController.deleteTask);
module.exports = router;
