const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subject.controller");
const verifyToken = require("../middlewares/auth.middleware");

// Mọi thao tác với môn học đều yêu cầu người dùng phải đăng nhập (có token)
router.use(verifyToken);

router.get("/getSubject", subjectController.getAllSubjects); //xuat
router.post("/createSubject", subjectController.createSubject); //nhap
router.put("/updateSubject/:id", subjectController.updateSubject); //update
router.delete("/deleteSubject/:id", subjectController.deleteSubject); //xoa

module.exports = router;
