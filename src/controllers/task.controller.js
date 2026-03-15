const prisma = require("../config/db");
const { calculateAutoPriority } = require("../utils/priority.utils");
exports.createTask = async (req, res) => {
  try {
    // 1. Chỉ lấy những trường cần thiết từ body, KHÔNG lấy priority vì hệ thống sẽ tự tính
    const { title, description, deadline, subjectId } = req.body;

    // 2. Tính toán Auto Priority TRƯỚC khi lưu vào Database
    const autoPriority = calculateAutoPriority(deadline);

    // 3. Tạo công việc vào Database
    const task = await prisma.task.create({
      data: {
        title,
        description,
        // Kiểm tra an toàn: Có deadline mới parse sang Date, không thì để null
        deadline: deadline ? new Date(deadline) : null,

        priority: autoPriority, // Gán giá trị đã tính toán tự động vào Database

        subjectId,
        userId: req.user.id, // Lấy từ middleware verifyToken
      },
    });

    res.status(201).json({
      message: "Tạo công việc thành công",
      task: task,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    // 1. Lấy danh sách task từ DB (Giữ nguyên logic của bạn)
    const tasks = await prisma.task.findMany({
      where: { userId: req.user.id },
      include: { subject: { select: { name: true, colorCode: true } } },
      orderBy: { deadline: "asc" }, 
    });

    // 2. BỘ DỊCH TỪ SỐ SANG CHỮ (Ánh xạ Priority)
    const priorityMap = {
      1: "HIGH",
      2: "MEDIUM",
      3: "LOW"
    };

    // 3. Ghi đè lại trường priority trước khi gửi về Frontend
    const formattedTasks = tasks.map(task => {
      return {
        ...task,
        // Chuyển 1,2,3 thành chữ. Nếu không có thì mặc định là MEDIUM
        priority: priorityMap[task.priority] || "MEDIUM"
      };
    });

    // Trả về danh sách đã được "dịch"
    res.json(formattedTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Cập nhật trạng thái công việc (TODO -> IN_PROGRESS -> DONE)
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 1. Kiểm tra tính hợp lệ của dữ liệu đầu vào (Validation)
    const allowedStatuses = ["TODO", "IN_PROGRESS", "DONE"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message:
          "Trạng thái không hợp lệ. Chỉ chấp nhận: TODO, IN_PROGRESS, DONE",
      });
    }

    // 2. Cập nhật vào Database thông qua Prisma
    // Dùng updateMany để kết hợp điều kiện userId, đảm bảo tính bảo mật (Ai tạo người nấy sửa)
    const updatedTask = await prisma.task.updateMany({
      where: {
        id: id,
        userId: req.user.id, // Lấy từ token qua middleware verifyToken
      },
      data: {
        status: status,
      },
    });

    // 3. Xử lý trường hợp không tìm thấy task hoặc cố tình sửa task của người khác
    if (updatedTask.count === 0) {
      return res.status(404).json({
        message:
          "Không tìm thấy công việc này hoặc bạn không có quyền chỉnh sửa",
      });
    }

    res.status(200).json({
      message: "Cập nhật trạng thái công việc thành công",
      newStatus: status,
    });
  } catch (error) {
    next(error); // Đẩy lỗi về Global Error Handler
  }
};
exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, deadline, subjectId } = req.body;
    const autoPriority = calculateAutoPriority(deadline);
    const task = await prisma.task.updateMany({
      where: { id: id, userId: req.user.id },
      data: {
        title,
        description,
        subjectId,
        priority: autoPriority,
        deadline: deadline ? new Date(deadline) : undefined,
      },
    });

    if (task.count === 0)
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    res.status(200).json({ message: "Cập nhật công việc thành công" });
  } catch (error) {
    next(error);
  }
};
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedTask = await prisma.task.deleteMany({
      where: { id: id, userId: req.user.id },
    });

    if (deletedTask.count === 0)
      return res.status(404).json({ message: "Không tìm thấy công việc" });
    res.status(200).json({ message: "Xóa công việc thành công" });
  } catch (error) {
    next(error);
  }
};

exports.getWeeklyProgress = async (req, res, next) => {
  try {
    // 1. Xác định khung thời gian: Đầu tuần (Thứ 2) và Cuối tuần (Chủ nhật)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 (Chủ nhật) đến 6 (Thứ 7)
    const distanceToMonday =
      now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);

    const startOfWeek = new Date(now.setDate(distanceToMonday));
    startOfWeek.setHours(0, 0, 0, 0); // 00:00:00 Thứ 2

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // 23:59:59 Chủ nhật

    // 2. Query lấy tất cả Task của User CÓ HẠN CHÓT nằm trong tuần này
    // (Giả sử model Task của bạn có trường dueDate. Nếu bạn dùng tên khác như scheduledDate thì nhớ đổi lại nhé)
    const tasksThisWeek = await prisma.task.findMany({
      where: {
        userId: req.user.id,
        deadline: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
    });

    // 3. TÍNH TOÁN CÁC CHỈ SỐ
    const totalTasks = tasksThisWeek.length;

    // Lọc ra các task đã hoàn thành (Giả sử trạng thái là 'DONE')
    const completedTasksList = tasksThisWeek.filter(
      (task) => task.status === "DONE",
    );
    const completedTasks = completedTasksList.length;

    // A. Tính Tiến độ theo Số lượng Task (Công thức của bạn)
    // Dùng toán tử ba ngôi để chống lỗi Chia cho 0 (Khi tuần đó không có task nào)
    const taskProgressPercentage =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // B. Tính Tiến độ theo Thời gian nỗ lực (Time-based Effort)
    // (Giả sử model Task có trường estimatedMinutes)
    let totalMinutes = 0;
    let completedMinutes = 0;

    tasksThisWeek.forEach((task) => {
      // Nếu task không nhập thời gian, mặc định cho là 30 phút để tránh bị lỗi
      const taskTime = task.estimatedMinutes || 30;
      totalMinutes += taskTime;

      if (task.status === "DONE") {
        completedMinutes += taskTime;
      }
    });

    const timeProgressPercentage =
      totalMinutes === 0
        ? 0
        : Math.round((completedMinutes / totalMinutes) * 100);

    // 4. Trả kết quả về cho Frontend
    res.status(200).json({
      message: "Lấy tiến độ tuần thành công",
      data: {
        weekRange: {
          start: startOfWeek,
          end: endOfWeek,
        },
        taskStats: {
          totalTasks,
          completedTasks,
          progressPercentage: taskProgressPercentage, // <-- Công thức của bạn
        },
        timeStats: {
          totalMinutes,
          completedMinutes,
          progressPercentage: timeProgressPercentage, // <-- Công thức nâng cao
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
