const HOUR_IN_MS = 60 * 60 * 1000;

const getDateHoursAgo = (hoursAgo: number): Date => {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
};

const getDateMinutesAgo = (minutesAgo: number): Date => {
  return new Date(Date.now() - minutesAgo * 60 * 1000);
};

const hoursDiff = (date1: Date, date2: Date): number =>
  Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60);

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

const buildWindowDateRange = (hoursAgo: number) => {
  const now = new Date();
  const currentFrom = new Date(now.getTime() - hoursAgo * HOUR_IN_MS);
  const previousFrom = new Date(now.getTime() - hoursAgo * 2 * HOUR_IN_MS);

  return { now, currentFrom, previousFrom };
};

export {
  getDateHoursAgo,
  getBinSize,
  getDateMinutesAgo,
  hoursDiff,
  buildWindowDateRange,
  HOUR_IN_MS,
};
