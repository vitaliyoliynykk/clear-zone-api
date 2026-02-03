const { VOC_WARM_UP_SEC, VOC_CALIBRATION_SEC } = require("./constants");
const { clamp } = require("./math");

const getResistanceDeviationDelta = (gas_resistance, baseline) =>
  (baseline - gas_resistance) / baseline;

const getVocSensorState = (uptimeSeconds) => {
  if (uptimeSeconds <= VOC_WARM_UP_SEC) {
    return "warm_up";
  } else if (uptimeSeconds <= VOC_CALIBRATION_SEC) {
    return "calibrating";
  } else {
    return "ready";
  }
};

const calculateVocIndex = (deviation) =>
  clamp(Math.log1p(deviation * 10) * 200, 0, 500);

module.exports = {
  getResistanceDeviationDelta,
  getVocSensorState,
  calculateVocIndex,
};
