const JWT_SCOPE_USER = "scope-user";
const JWT_SCOPE_MODULE = "scope-module";

const SENSORS = ["temp", "hum", "co2", "pm10", "pm25", "pm100"];

const VOC_SENSOR_STATES = ["warm_up", "calibrating", "ready"];
const VOC_WARM_UP_SEC = 1200; // 15 Minutes
const VOC_CALIBRATION_SEC = 28800; // 8 Hours

module.exports = {
  JWT_SCOPE_USER,
  JWT_SCOPE_MODULE,
  SENSORS,
  VOC_SENSOR_STATES,
  VOC_WARM_UP_SEC,
  VOC_CALIBRATION_SEC,
};
