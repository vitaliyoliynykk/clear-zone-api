const { VOC_WARM_UP_SEC, VOC_CALIBRARION_SEC } = require("./constants");

const getResistanceDeviationDelta = (gas_resistance, baseline) =>
  (baseline - gas_resistance) / baseline;

const getVocSensorState = (uptimeSeconds) => {
  if (uptimeSeconds <= VOC_WARM_UP_SEC) {
    return "warm_up";
  } else if (uptimeSeconds <= VOC_CALIBRARION_SEC) {
    return "calibrating";
  } else {
    return "ready";
  }
};

module.exports = { getResistanceDeviationDelta, getVocSensorState };
