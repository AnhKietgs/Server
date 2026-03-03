const calculateAutoPriority = (deadline) => {
  if (!deadline) return 3;

  const now = new Date();
  const taskDeadline = new Date(deadline);

  now.setHours(0, 0, 0, 0);
  taskDeadline.setHours(0, 0, 0, 0);

  const diffTime = taskDeadline.getTime() - now.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  if (diffDays <= 2) return 1;
  if (diffDays <= 7) return 2;
  return 3;
};

module.exports = { calculateAutoPriority };
