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

// Thêm môn học mới
exports.createSubject = async (req, res, next) => {
  try {
    const { name, weeklyStudyHours, colorCode } = req.body;
    const newSubject = await prisma.subject.create({
      data: {
        name,
        weeklyStudyHours: weeklyStudyHours || 4,
        colorCode: colorCode || "#CCCCCC", // Màu mặc định nếu không truyền
        userId: req.user.id,
      },
    });
    res.status(201).json(newSubject);
  } catch (error) {
    next(error);
  }
};

// Cập nhật môn học
exports.updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, credits, colorCode } = req.body;

    // Đảm bảo user chỉ sửa được môn học của chính họ
    const subject = await prisma.subject.updateMany({
      where: { id: id, userId: req.user.id },
      data: { name, credits, colorCode },
    });

    if (subject.count === 0) {
      return res.status(404).json({
        message: "Không tìm thấy môn học hoặc không có quyền truy cập",
      });
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    next(error);
  }
};
exports.getAllSubjects = async (req, res, next) => {
  try {
    // 1. Lấy tất cả môn học của user đang đăng nhập,
    // ĐỒNG THỜI lấy kèm (include) trạng thái các task thuộc môn đó
    const subjects = await prisma.subject.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        tasks: {
          select: { status: true }, // Chỉ lấy trường status để tính toán, giúp API chạy nhanh hơn
        },
      },
    });

    // 2. Tính toán phần trăm hoàn thành cho từng môn học
    const subjectsWithProgress = subjects.map((subject) => {
      // Đếm tổng số lượng task trong môn học
      const totalTasks = subject.tasks.length;

      // Đếm số lượng task ĐÃ HOÀN THÀNH (VD: status là 'DONE')
      const completedTasks = subject.tasks.filter(
        (task) => task.status === "DONE",
      ).length;

      // Tính phần trăm: (Số task hoàn thành / Tổng số task) * 100
      // Dùng Math.round để làm tròn số (VD: 85.5% -> 86%)
      // Xử lý Edge Case: Nếu môn học chưa có task nào (totalTasks === 0), mặc định trả về 0 để tránh lỗi NaN (Not a Number)
      const progressPercentage =
        totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      // Loại bỏ mảng tasks ra khỏi kết quả trả về để data gọn nhẹ hơn
      const { tasks, ...subjectData } = subject;

      // Trả về object môn học có kèm theo các chỉ số mới
      return {
        ...subjectData,
        totalTasks: totalTasks,
        completedTasks: completedTasks,
        progress: progressPercentage, // Biến này Frontend dùng để vẽ thanh hiển thị
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
