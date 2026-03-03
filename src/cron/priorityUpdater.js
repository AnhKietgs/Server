const cron = require("node-cron");
const prisma = require("../config/db");
const { calculateAutoPriority } = require("../utils/priority.utils");

const startPriorityUpdater = () => {
  // Biểu thức '0 0 * * *' nghĩa là: Chạy vào lúc 00:00 mỗi ngày
  // Trong lúc dev/test, bạn có thể đổi thành '* * * * *' để nó chạy MỖI PHÚT cho dễ test
  cron.schedule("0 0 * * *", async () => {
    console.log("[CRON] Bắt đầu quét và cập nhật Priority tự động...");

    try {
      // 1. Lấy tất cả các task CHƯA HOÀN THÀNH và CÓ DEADLINE
      const pendingTasks = await prisma.task.findMany({
        where: {
          status: { not: "DONE" },
          deadline: { gt: new Date("2000-01-01") },
        },
      });

      let updateCount = 0;

      // 2. Duyệt qua từng task để kiểm tra
      for (const task of pendingTasks) {
        const newPriority = calculateAutoPriority(task.deadline);

        // 3. Nếu Priority mới KHÁC với Priority hiện tại lưu trong DB thì mới cập nhật
        if (newPriority !== task.priority) {
          await prisma.task.update({
            where: { id: task.id },
            data: { priority: newPriority },
          });
          updateCount++;
        }
      }

      console.log(`[CRON] Đã kiểm tra ${pendingTasks.length} công việc.`);
      console.log(
        `[CRON] Đã cập nhật độ khẩn cấp cho ${updateCount} công việc.`,
      );
    } catch (error) {
      console.error("[CRON LỖI] Không thể cập nhật Priority:", error.message);
    }
  });
};

module.exports = startPriorityUpdater;
