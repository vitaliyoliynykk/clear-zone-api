const getDateHoursAgo = (hoursAgo: number): Date => {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
};

const getDateMinutesAgo = (minutesAgo: number): Date => {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
};

const getBinSize = (hoursAgo: number): number => {
  if (hoursAgo <= 6) {
    return 5;
  } else if (hoursAgo <= 24) {
    return 10;
  } else if (hoursAgo <= 72) {
    return 30;
  } else {
    return 60;
  }
};

export { getDateHoursAgo, getBinSize, getDateMinutesAgo };
