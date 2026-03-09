const prisma = require("../config/db");

// Lấy danh sách môn học của sinh viên đang đăng nhập
// exports.getSubjects = async (req, res, next) => {
//   try {
//     const subjects = await prisma.subject.findMany({
//       where: { userId: req.user.id },
//       orderBy: { createdAt: "desc" },
//       // Tùy chọn: include thêm số lượng task đang mở của môn này để hiển thị trên Dashboard
//       include: {
//         _count: {
//           select: { tasks: { where: { status: { not: "DONE" } } } },
//         },
//       },
//     });
//     res.status(200).json(subjects);
//   } catch (error) {
//     next(error); // Đẩy lỗi về Global Error Handler
//   }
// };

// 1. LẤY DANH SÁCH MÔN HỌC (Giữ nguyên logic tính toán progress của bạn)
exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { userId: req.user.id },
      include: {
        tasks: { select: { status: true } },
      },
    });

    const subjectsWithProgress = subjects.map((subject) => {
      const totalTasks = subject.tasks.length;
      const completedTasks = subject.tasks.filter((task) => task.status === "DONE").length;
      const progressPercentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      const { tasks, ...subjectData } = subject;

      return {
        ...subjectData,
        totalTasks: totalTasks,
        completedTasks: completedTasks,
        progress: progressPercentage, 
      };
    });

    res.status(200).json({
      message: "Lấy danh sách môn học thành công",
      totalSubjects: subjectsWithProgress.length,
      data: subjectsWithProgress,
    });
  } catch (error) {
    next(error);
  }
};

// 2. THÊM MÔN HỌC MỚI (Đã sửa để khớp với FE)
exports.createSubject = async (req, res, next) => {
  try {
    // FE gửi lên: { name, target, icon, color }
    const { name, target, icon, color } = req.body;

    const newSubject = await prisma.subject.create({
      data: {
        name: name,
        // Chuyển đổi tên trường để khớp với Schema: weeklyStudyHours và colorCode
        weeklyStudyHours: parseInt(target) || 4, 
        colorCode: color || "#CCCCCC",
        userId: req.user.id,
        // Lưu ý: Nếu trong Schema chưa có trường 'icon', hãy tạm thời comment dòng dưới lại
        // icon: icon || "📚" 
      },
    });

    res.status(201).json({
      success: true,
      data: newSubject
    });
  } catch (error) {
    // In lỗi ra terminal để bạn dễ theo dõi nếu vẫn còn lỗi database
    console.error("Prisma Error:", error);
    next(error);
  }
};

// 3. CẬP NHẬT MÔN HỌC
exports.updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, target, color } = req.body;

    const subject = await prisma.subject.updateMany({
      where: { id: id, userId: req.user.id },
      data: { 
        name: name,
        weeklyStudyHours: parseInt(target),
        colorCode: color
      },
    });

    if (subject.count === 0) {
      return res.status(404).json({ message: "Không tìm thấy môn học" });
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    next(error);
  }
};