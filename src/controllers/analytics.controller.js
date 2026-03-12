const prisma = require("../config/db");

exports.getAnalyticsOverview = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // ==========================================
    // 1. TÍNH TOÁN TOP STATS (4 Thẻ trên cùng)
    // ==========================================
    
    // a. Total Study Time
    const sessionSum = await prisma.studySession.aggregate({
      where: { userId },
      _sum: { duration: true },
    });
    const totalMinutes = sessionSum._sum.duration || 0;
    const totalHours = (totalMinutes / 60).toFixed(1);

    const totalTasksCount = await prisma.task.count({ where: { userId } });
    const completedTasksCount = await prisma.task.count({
      where: { userId, status: "DONE" },
    });
    
    // THÊM DÒNG NÀY ĐỂ ĐẾM SỐ LỊCH HỌC ĐANG CÓ:
    const totalClassesCount = await prisma.classSchedule.count({ where: { userId } });

    // c. Avg Daily Hours
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // Tính số ngày từ lúc tạo tài khoản đến nay (ít nhất là 1 ngày để tránh chia cho 0)
    const daysSinceCreation = Math.max(1, Math.ceil((now - user.createdAt) / (1000 * 60 * 60 * 24)));
    const avgDailyHours = (totalHours / daysSinceCreation).toFixed(1);

    // ==========================================
    // 2. WEEKLY STUDY HOURS (Biểu đồ cột)
    // ==========================================
    const dayOfWeek = now.getDay();
    const distanceToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(distanceToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    const weeklySessions = await prisma.studySession.findMany({
      where: { userId, createdAt: { gte: startOfWeek } },
    });

    const weeklyStudyData = [
      { day: 'Mon', hours: 0 }, { day: 'Tue', hours: 0 }, { day: 'Wed', hours: 0 },
      { day: 'Thu', hours: 0 }, { day: 'Fri', hours: 0 }, { day: 'Sat', hours: 0 }, { day: 'Sun', hours: 0 }
    ];

    weeklySessions.forEach(session => {
      const dayIndex = session.createdAt.getDay();
      const mappedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      weeklyStudyData[mappedIndex].hours += (session.duration / 60);
    });
    // Làm tròn 1 chữ số
    weeklyStudyData.forEach(d => d.hours = Number(d.hours.toFixed(1)));

    // ==========================================
    // 3. SUBJECT DISTRIBUTION (Biểu đồ tròn)
    // ==========================================
    // Lấy tất cả môn học và đếm số task của từng môn
    const subjectsWithTaskCount = await prisma.subject.findMany({
      where: { userId },
      include: {
        _count: { select: { tasks: true } }
      }
    });

    // Tính tổng số task có gắn môn học để chia %
    const totalTasksWithSubject = subjectsWithTaskCount.reduce((acc, sub) => acc + sub._count.tasks, 0);

    const subjectDistribution = subjectsWithTaskCount.map(sub => {
      const count = sub._count.tasks;
      const percentage = totalTasksWithSubject === 0 ? 0 : Math.round((count / totalTasksWithSubject) * 100);
      return {
        name: sub.name,
        value: percentage, // Recharts PieChart dùng trường value
        color: sub.colorCode || '#2563EB', // Lấy màu mặc định nếu môn không có màu
        taskCount: count
      };
    }).filter(sub => sub.taskCount > 0); // Chỉ lấy những môn có task

    // ==========================================
    // 4. TASK COMPLETION TREND (6 tháng gần nhất)
    // ==========================================
    const taskCompletionData = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);

    // Lấy task 6 tháng qua
    const recentTasks = await prisma.task.findMany({
      where: { userId, createdAt: { gte: sixMonthsAgo } }
    });

    // Tạo khung 6 tháng
    for(let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      taskCompletionData.push({
        month: d.toLocaleString('en-US', { month: 'short' }), // Jan, Feb...
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        completed: 0,
        total: 0
      });
    }

    // Lấp data vào khung
    recentTasks.forEach(task => {
      const taskMonth = task.createdAt.getMonth();
      const taskYear = task.createdAt.getFullYear();
      
      const monthData = taskCompletionData.find(m => m.monthNum === taskMonth && m.year === taskYear);
      if(monthData) {
        monthData.total += 1;
        if(task.status === "DONE") monthData.completed += 1;
      }
    });

    // ==========================================
    // 5. TRẢ VỀ CHO FRONTEND
    // ==========================================
    res.status(200).json({
      message: "Lấy dữ liệu Analytics thành công",
      data: {
        stats: {
          totalHours,
          totalTasksCount,
          completedTasksCount,
          avgDailyHours,
          totalClassesCount
        },
        weeklyStudyData,
        subjectDistribution,
        taskCompletionData
      }
    });

  } catch (error) {
    next(error);
  }
};