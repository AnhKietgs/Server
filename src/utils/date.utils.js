// Hàm lấy số thứ tự của tuần trong năm và xác định Chẵn/Lẻ
exports.getCurrentWeekParity = () => {
  const today = new Date();
  const startDate = new Date(today.getFullYear(), 0, 1);
  const days = Math.floor((today - startDate) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((days + startDate.getDay() + 1) / 7);
  
  // Nếu chia hết cho 2 là tuần chẵn, ngược lại là tuần lẻ
  return weekNumber % 2 === 0 ? "EVEN_WEEKS" : "ODD_WEEKS";
};