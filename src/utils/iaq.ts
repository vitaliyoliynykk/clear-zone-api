import { SensorType } from "../types";
import { scoreBand, scoreLowerIsBetter } from "./math";

export const SENSORS_IAQ_CONFIG: Record<
  SensorType,
  { weight: number; subScoreCalculator: (rawValue: number) => number }
> = {
  co2: {
    weight: 0.3,
    subScoreCalculator: (ppm) => scoreLowerIsBetter(ppm, 600, 2000),
  },
  pm25: {
    weight: 0.35,
    subScoreCalculator: (index) => scoreLowerIsBetter(index, 5, 25),
  },
  pm100: {
    weight: 0.05,
    subScoreCalculator: (concentration) =>
      scoreLowerIsBetter(concentration, 5, 20),
  },
  pm10: {
    weight: 0.05,
    subScoreCalculator: (concentration) =>
      scoreLowerIsBetter(concentration, 10, 35),
  },
  voc: {
    weight: 0.15,
    subScoreCalculator: (concentration) =>
      scoreLowerIsBetter(concentration, 50, 250),
  },
  hum: {
    weight: 0.07,
    subScoreCalculator: (rh) => scoreBand(rh, 20, 40, 60, 80),
  },
  temp: {
    weight: 0.03,
    subScoreCalculator: (temp) => scoreBand(temp, 15, 18, 22, 26),
  },
};

export const SENSORS = ["temp", "hum", "co2", "pm10", "pm25", "pm100"] as const;
