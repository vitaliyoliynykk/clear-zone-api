export const FORECAST_SENSORS = ["co2", "temp", "hum"] as const;

export type ForecastSensor = (typeof FORECAST_SENSORS)[number];

export interface MeasurementRow {
  ts: Date | string;
  sensor: string;
  value: number;
}

export interface Scaler {
  features: Array<"co2" | "temp" | "hum">;
  mean: number[];
  scale: number[];
}

export type ResampledRow = {
  ts: Date;
} & Record<ForecastSensor, number | null>;

const MINUTE_MS = 60_000;
const MAX_INTERPOLATION_GAP_MINUTES = 15;

const KYIV_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Kyiv",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** Groups readings by UTC minute, averages duplicates, and fills short internal gaps. */
export const resampleData = (data: MeasurementRow[]): ResampledRow[] => {
  const buckets = new Map<
    number,
    Map<ForecastSensor, { sum: number; count: number }>
  >();

  for (const row of data) {
    const timestamp =
      row.ts instanceof Date ? row.ts.getTime() : new Date(row.ts).getTime();
    if (
      !Number.isFinite(timestamp) ||
      !FORECAST_SENSORS.includes(row.sensor as ForecastSensor)
    ) {
      continue;
    }

    const minute = Math.floor(timestamp / MINUTE_MS) * MINUTE_MS;
    let sensors = buckets.get(minute);
    if (!sensors) {
      sensors = new Map();
      buckets.set(minute, sensors);
    }

    const sensor = row.sensor as ForecastSensor;
    const aggregate = sensors.get(sensor) ?? { sum: 0, count: 0 };
    aggregate.sum += row.value;
    aggregate.count += 1;
    sensors.set(sensor, aggregate);
  }

  if (buckets.size === 0) return [];

  const minutes = [...buckets.keys()].sort((a, b) => a - b);
  const firstMinute = minutes[0];
  const lastMinute = minutes[minutes.length - 1];
  const result: ResampledRow[] = [];

  for (let minute = firstMinute; minute <= lastMinute; minute += MINUTE_MS) {
    const bucket = buckets.get(minute);
    const point = { ts: new Date(minute) } as ResampledRow;
    for (const sensor of FORECAST_SENSORS) {
      const aggregate = bucket?.get(sensor);
      point[sensor] = aggregate ? aggregate.sum / aggregate.count : null;
    }
    result.push(point);
  }

  for (const sensor of FORECAST_SENSORS) {
    let index = 0;
    while (index < result.length) {
      if (result[index][sensor] !== null) {
        index += 1;
        continue;
      }

      const gapStart = index;
      while (index < result.length && result[index][sensor] === null)
        index += 1;
      const gapLength = index - gapStart;
      const left = gapStart - 1;
      const right = index;

      if (left < 0 || right >= result.length) {
        continue;
      }

      const leftValue = result[left][sensor] as number;
      const rightValue = result[right][sensor] as number;
      const fillLength = Math.min(gapLength, MAX_INTERPOLATION_GAP_MINUTES);
      for (let offset = 0; offset < fillLength; offset += 1) {
        const ratio = (offset + 1) / (gapLength + 1);
        result[gapStart + offset][sensor] =
          leftValue + (rightValue - leftValue) * ratio;
      }
    }
  }

  return result;
};

export const prepareWindow = (
  rows: ResampledRow[],
  windowSize: number,
  scaler: Scaler,
): number[][] => {
  return rows.slice(-windowSize).map((row) => {
    const sensorValues = scaler.features.map((sensor, index) => {
      const value = row[sensor];
      if (value === null || !Number.isFinite(value)) {
        throw new Error(`Missing ${sensor} value in forecast window`);
      }
      return (value - scaler.mean[index]) / scaler.scale[index];
    });

    const parts = KYIV_TIME_FORMATTER.formatToParts(row.ts);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? "0";
    const hour = Number(part("hour")) + Number(part("minute")) / 60;
    const day = WEEKDAY_INDEX[part("weekday")];

    return [
      ...sensorValues,
      Math.sin((2 * Math.PI * hour) / 24),
      Math.cos((2 * Math.PI * hour) / 24),
      Math.sin((2 * Math.PI * day) / 7),
      Math.cos((2 * Math.PI * day) / 7),
    ];
  });
};
