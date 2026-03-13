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

    const totalClassesCount = await prisma.classSchedule.count({ where: { userId } });

    // c. Avg Daily Hours
    const user = await prisma.user.findUnique({ where: { id: userId } });
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
        value: percentage, 
        color: sub.colorCode || '#2563EB', 
        taskCount: count
      };
    }).filter(sub => sub.taskCount > 0); 
    
    // ==========================================
    // 4. TASK COMPLETION TREND (6 tháng gần nhất)
    // ==========================================
    const taskCompletionData = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0,0,0,0);
    
    const recentTasks = await prisma.task.findMany({
      where: { userId, createdAt: { gte: sixMonthsAgo } }
    });

    for(let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      taskCompletionData.push({
        month: d.toLocaleString('en-US', { month: 'short' }), 
        monthNum: d.getMonth(),
        year: d.getFullYear(),
        completed: 0,
        total: 0
      });
    }

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
    // 4.5. TÍNH TOÁN TRẠNG THÁI HUY HIỆU (ACHIEVEMENTS)
    // ==========================================
    
    // Lấy thời gian của tất cả các phiên học (chỉ lấy cột createdAt cho nhẹ)
    const allSessions = await prisma.studySession.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    // Kiểm tra Early Bird: Có phiên học nào bắt đầu trong khoảng 4:00 AM đến 7:59 AM không?
    const isEarlyBird = allSessions.some(session => {
      const hour = session.createdAt.getHours();
      return hour >= 4 && hour < 8;
    });

    // Kiểm tra 7-Day Streak: Lọc ra các ngày duy nhất có học, đưa về timestamp để tính toán
    const uniqueStudyDates = [...new Set(allSessions.map(session => {
      const d = new Date(session.createdAt);
      d.setHours(0, 0, 0, 0); // Đưa về 0h sáng để tránh bị lệch giờ
      return d.getTime();
    }))].sort((a, b) => a - b);

    let isSevenDayStreak = false;
    let currentStreak = 1;
    
    if (uniqueStudyDates.length >= 7) {
      for (let i = 1; i < uniqueStudyDates.length; i++) {
        // Tính khoảng cách giữa 2 ngày (1 ngày = 86,400,000 milliseconds)
        const diffInDays = (uniqueStudyDates[i] - uniqueStudyDates[i - 1]) / (1000 * 60 * 60 * 24);
        
        if (diffInDays === 1) {
          currentStreak++;
          if (currentStreak >= 7) {
            isSevenDayStreak = true;
            break;
          }
        } else if (diffInDays > 1) {
          currentStreak = 1; // Nếu cách hơn 1 ngày -> Mất chuỗi, reset lại từ 1
        }
      }
    }

    // Gói tất cả kết quả lại thành 1 object
    const achievements = {
      taskMaster: completedTasksCount >= 100,  
      bookworm: parseFloat(totalHours) >= 50, 
      earlyBird: isEarlyBird,                
      sevenDayStreak: isSevenDayStreak        
    };
    const recentSessions = await prisma.studySession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // 5. TRẢ VỀ CHO FRONTEND
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
        taskCompletionData,
        achievements,
        recentSessions
      }
    });

  } catch (error) {
    next(error);
  }
};