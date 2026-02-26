const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subject.controller");
const verifyToken = require("../middlewares/auth.middleware");

// Mọi thao tác với môn học đều yêu cầu người dùng phải đăng nhập (có token)
router.use(verifyToken);

router.get("/", subjectController.getSubjects);
router.post("/", subjectController.createSubject);
router.put("/:id", subjectController.updateSubject);

module.exports = router;
