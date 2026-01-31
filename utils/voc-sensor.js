const getResistanceDeviationDelta = (gas_resistance, baseline) =>
  (baseline - gas_resistance) / baseline;

const getVocSensorState = (uptimeSeconds) => {
  if (uptimeSeconds <= WARM_UP_SEC) {
    return "warm_up";
  } else if (uptimeSeconds <= CALIBRARION_SEC) {
    return "calibrating";
  } else {
    return "ready";
  }
};

module.exports = { getResistanceDeviationDelta, getVocSensorState };
