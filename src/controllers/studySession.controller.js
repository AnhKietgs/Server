const prisma = require("../config/db");

// Ghi nhận thời gian học (Sau khi hết giờ Pomodoro)
exports.saveStudySession = async (req, res, next) => {
  try {
    const { taskId, duration } = req.body;
    // duration là số phút, ví dụ truyền lên 25

    // 1. Kiểm tra Task có tồn tại và thuộc về user không
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: req.user.id },
    });

    if (!task) {
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    }

    // 2. Lưu phiên học vào lịch sử
    const session = await prisma.studySession.create({
      data: {
        duration: duration,
        taskId: taskId,
        userId: req.user.id,
      },
    });

    res.status(201).json({
      message: "Đã lưu thời gian học thành công",
      data: session,
    });
  } catch (error) {
    next(error);
  }
};

// Lấy dữ liệu vẽ biểu đồ thời gian học trong tuần hiện tại
exports.getWeeklyChartData = async (req, res, next) => {
  try {
    // 1. Tìm ngày Thứ 2 và Chủ nhật của tuần hiện tại
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 là Chủ nhật, 1-6 là T2-T7
    const distanceToMonday =
      now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

    const startOfWeek = new Date(now.setDate(distanceToMonday));
    startOfWeek.setHours(0, 0, 0, 0); // Đầu ngày T2

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // Cuối ngày CN

    // 2. Lấy toàn bộ các phiên học của User trong tuần này
    const sessions = await prisma.studySession.findMany({
      where: {
        userId: req.user.id,
        createdAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    // 3. Khởi tạo mảng dữ liệu rỗng cho 7 ngày (Format chuẩn cho Frontend vẽ biểu đồ)
    // hours mặc định là 0
    const chartData = [
      { day: "Mon", hours: 0 },
      { day: "Tue", hours: 0 },
      { day: "Wed", hours: 0 },
      { day: "Thu", hours: 0 },
      { day: "Fri", hours: 0 },
      { day: "Sat", hours: 0 },
      { day: "Sun", hours: 0 },
    ];

    // 4. Cộng dồn thời gian học vào từng ngày tương ứng
    sessions.forEach((session) => {
      const sessionDay = session.createdAt.getDay(); // Lấy thứ của phiên học (0-6)
      // Chuyển đổi getDay() (0 là CN, 1 là T2) thành index của mảng chartData (0 là T2, 6 là CN)
      const mappedIndex = sessionDay === 0 ? 6 : sessionDay - 1;

      // Cộng dồn thời gian (chia 60 để đổi từ Phút sang Giờ)
      chartData[mappedIndex].hours += session.duration / 60;
    });

    // 5. Làm tròn số giờ cho đẹp (Ví dụ: 1.25 giờ thay vì 1.25333333 giờ)
    const finalChartData = chartData.map((item) => ({
      day: item.day,
      hours: Number(item.hours.toFixed(1)), // Lấy 1 chữ số thập phân
    }));

    res.status(200).json({
      message: "Lấy dữ liệu biểu đồ thành công",
      data: finalChartData,
    });
  } catch (error) {
    next(error);
  }
};

// LẤY TỔNG SỐ GIỜ ĐÃ HỌC (Dùng cho thẻ Total Study Time trên Analytics)
exports.getTotalStudyTime = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Dùng aggregate của Prisma để tính TỔNG (_sum) cột duration
    const result = await prisma.studySession.aggregate({
      where: { 
        userId: userId 
      },
      _sum: {
        duration: true // Cột lưu số phút trong bảng StudySession của bạn
      }
    });

    // Lấy ra tổng số phút (nếu user chưa học phút nào thì trả về 0)
    const totalMinutes = result._sum.duration || 0;

    // Quy đổi ra giờ (chia 60) và làm tròn 1 chữ số thập phân (VD: 142.5)
    const totalHours = (totalMinutes / 60).toFixed(1);

    res.status(200).json({
      message: "Lấy tổng thời gian học thành công",
      data: {
        totalMinutes: totalMinutes,
        totalHours: parseFloat(totalHours) // Ép kiểu về số thực cho an toàn
      }
    });
  } catch (error) {
    next(error);
  }
};