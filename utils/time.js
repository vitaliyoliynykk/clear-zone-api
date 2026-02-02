const getLookbackDate = (lookbackHours) => {
  return new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
};

const getBinSize = (hoursLookback) => {
  if (hoursLookback <= 6) {
    return 5;
  } else if (hoursLookback <= 24) {
    return 10;
  } else if (hoursLookback <= 72) {
    return 30;
  } else {
    return 60;
  }
};

module.exports = { getLookbackDate, getBinSize };
