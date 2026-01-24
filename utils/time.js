const getLookbackDate = (lookbackHours) => {
  return new Date(Date.now() - lookbackHours * 60 * 60 * 1000);
};

module.exports = { getLookbackDate };
