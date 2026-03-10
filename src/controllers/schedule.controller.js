const prisma = require("../config/db");
const { getCurrentWeekParity } = require("../utils/date.utils");

// 1. TẠO LỊCH HỌC MỚI
exports.createClassSchedule = async (req, res, next) => {
  try {
    // FE sẽ gửi mảng daysOfWeek (VD: [1, 4] là Thứ 2 và Thứ 5)
    const { subjectId, daysOfWeek, startTime, endTime, recurrence, room } = req.body;

    // Tạo nhiều dòng lịch học tương ứng với các thứ được chọn
    const schedulesToCreate = daysOfWeek.map(day => ({
      userId: req.user.id,
      subjectId,
      dayOfWeek: day,
      startTime,
      endTime,
      recurrence: recurrence || "EVERY_WEEK",
      room: room || null
    }));

    const createdSchedules = await prisma.classSchedule.createMany({
      data: schedulesToCreate
    });

    res.status(201).json({
      message: "Tạo lịch học thành công",
      count: createdSchedules.count
    });
  } catch (error) {
    next(error);
  }
};

// 2. LẤY LỊCH HỌC CỦA NGÀY HÔM NAY (Dùng cho Dashboard)
exports.getTodayClasses = async (req, res, next) => {
  try {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0 (CN) đến 6 (T7)
    const currentWeekParity = getCurrentWeekParity(); // "EVEN_WEEKS" hoặc "ODD_WEEKS"

    // TÌM CÁC LỊCH THỎA MÃN: Của user đó + Đúng thứ hôm nay + (Lặp mỗi tuần HOẶC Đúng tuần chẵn/lẻ hiện tại)
    const todayClasses = await prisma.classSchedule.findMany({
      where: {
        userId: req.user.id,
        dayOfWeek: currentDayOfWeek,
        OR: [
          { recurrence: "EVERY_WEEK" },
          { recurrence: currentWeekParity }
        ]
      },
      include: {
        subject: { select: { name: true, colorCode: true } }
      },
      orderBy: {
        startTime: "asc" // Sắp xếp theo giờ học từ sáng đến tối
      }
    });

    // Format lại dữ liệu cho đẹp trước khi gửi về FE
    const formattedClasses = todayClasses.map(cls => {
      // Tính thời lượng (VD: từ "09:00" đến "11:30" ra "2h 30m")
      const start = new Date(`1970-01-01T${cls.startTime}:00Z`);
      const end = new Date(`1970-01-01T${cls.endTime}:00Z`);
      const diffMins = (end - start) / (1000 * 60);
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      const duration = `${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm' : ''}`.trim();

      return {
        id: cls.id,
        subject: cls.subject.name,
        color: cls.subject.colorCode,
        time: `${cls.startTime} - ${cls.endTime}`,
        duration: duration,
        room: cls.room
      };
    });

    res.status(200).json(formattedClasses);
  } catch (error) {
    next(error);
  }
};

// 3. LẤY TOÀN BỘ LỊCH HỌC (Dùng cho trang Calendar)
exports.getAllClasses = async (req, res, next) => {
  try {
    const classes = await prisma.classSchedule.findMany({
      where: { userId: req.user.id },
      include: {
        subject: { select: { name: true, colorCode: true } }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });
    res.status(200).json(classes);
  } catch (error) {
    next(error);
  }
};