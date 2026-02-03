import { VOC_WARM_UP_SEC, VOC_CALIBRATION_SEC } from "./constants";
import { clamp } from "./math";

export const getResistanceDeviationDelta = (
  gas_resistance: number,
  baseline: number,
): number => (baseline - gas_resistance) / baseline;

export const getVocSensorState = (uptimeSeconds: number) => {
  if (uptimeSeconds <= VOC_WARM_UP_SEC) {
    return "warm_up";
  } else if (uptimeSeconds <= VOC_CALIBRATION_SEC) {
    return "calibrating";
  } else {
    return "ready";
  }
};

export const calculateVocIndex = (deviation: number): number =>
  clamp(Math.log1p(deviation * 10) * 200, 0, 500);
