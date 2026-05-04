export const SENSOR_OUTPUT_MAP = {
  co2: "co2_ppm",
  hum: "humidity_percent",
  pm100: "pm1_ug_m3",
  pm25: "pm25_ug_m3",
  pm10: "pm10_ug_m3",
  temp: "temp_c",
} as const;

export const SENSOR_KEYS = Object.keys(SENSOR_OUTPUT_MAP);

export const roundValue = (value: number | null, digits = 2): number | null => {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
};

export const buildDeltaMap = (
  currentValues: Record<string, number | null>,
  previousValues: Record<string, number | null>,
) =>
  Object.keys(currentValues).reduce<Record<string, number | null>>(
    (acc, key) => {
      const currentValue = currentValues[key];
      const previousValue = previousValues[key];

      acc[key] =
        currentValue === null || previousValue === null
          ? null
          : roundValue(currentValue - previousValue);

      return acc;
    },
    {},
  );
