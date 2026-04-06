import { Request, Response, Router } from "express";
import Module from "../models/Module";
import { IaqScoreModel } from "../models/IaqScore";
import { VocSignalModel } from "../models/VocSignal";
import { getAiAnalysis } from "../ai-test";

const Measurement = require("../models/Measurement");

const aiRoutes = Router();

const HOUR_IN_MS = 60 * 60 * 1000;

const SENSOR_OUTPUT_MAP = {
  co2: "co2_ppm",
  hum: "humidity_percent",
  pm100: "pm1_ug_m3",
  pm25: "pm25_ug_m3",
  pm10: "pm10_ug_m3",
  temp: "temp_c",
} as const;

const SENSOR_KEYS = Object.keys(SENSOR_OUTPUT_MAP);

const roundValue = (value: number | null, digits = 2): number | null => {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
};

const buildWindowDateRange = (hoursLookback: number) => {
  const now = new Date();
  const currentFrom = new Date(now.getTime() - hoursLookback * HOUR_IN_MS);
  const previousFrom = new Date(now.getTime() - hoursLookback * 2 * HOUR_IN_MS);

  return { now, currentFrom, previousFrom };
};

const getAverageScoreForWindow = async (
  moduleId: unknown,
  fromDate: Date,
  toDate: Date,
) => {
  const [result] = await IaqScoreModel.aggregate([
    {
      $match: {
        ts: { $gte: fromDate, $lt: toDate },
        "meta.module_id": moduleId,
      },
    },
    {
      $group: {
        _id: null,
        averageScore: { $avg: "$score" },
      },
    },
    {
      $project: {
        _id: 0,
        averageScore: { $round: ["$averageScore", 2] },
      },
    },
  ]);

  return result?.averageScore ?? null;
};

const getMeasurementAveragesForWindow = async (
  moduleId: unknown,
  fromDate: Date,
  toDate: Date,
) => {
  const averages = Object.values(SENSOR_OUTPUT_MAP).reduce<
    Record<string, number | null>
  >((acc, key) => {
    acc[key] = null;

    return acc;
  }, {});

  const results = await Measurement.aggregate([
    {
      $match: {
        ts: { $gte: fromDate, $lt: toDate },
        "meta.module_id": moduleId,
        sensor: { $in: SENSOR_KEYS },
      },
    },
    {
      $group: {
        _id: "$sensor",
        value: { $avg: "$value" },
      },
    },
    {
      $project: {
        _id: 0,
        sensor: "$_id",
        value: { $round: ["$value", 2] },
      },
    },
  ]);

  for (const result of results) {
    const outputKey =
      SENSOR_OUTPUT_MAP[result.sensor as keyof typeof SENSOR_OUTPUT_MAP];

    if (outputKey) {
      averages[outputKey] = result.value;
    }
  }

  return averages;
};

const getVocAverageForWindow = async (
  moduleId: unknown,
  fromDate: Date,
  toDate: Date,
) => {
  const [result] = await VocSignalModel.aggregate([
    {
      $match: {
        ts: { $gte: fromDate, $lt: toDate },
        "meta.module_id": moduleId,
      },
    },
    {
      $group: {
        _id: null,
        value: { $avg: "$voc_index" },
      },
    },
    {
      $project: {
        _id: 0,
        value: { $round: ["$value", 2] },
      },
    },
  ]);

  return result?.value ?? null;
};

const buildDeltaMap = (
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

aiRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const { deviceId, hoursLookback } = req.query;

    if (typeof deviceId !== "string" || typeof hoursLookback !== "string") {
      res
        .status(400)
        .json({ message: "deviceId and hoursLookback are required" });

      return;
    }

    const lookbackHours = Number(hoursLookback);

    if (!Number.isFinite(lookbackHours) || lookbackHours <= 0) {
      res
        .status(400)
        .json({ message: "hoursLookback must be a positive number" });

      return;
    }

    const module = await Module.findOne(
      {
        device_id: deviceId,
      },
      { _id: 1 },
    );

    if (!module) {
      res.status(404).json({ message: "Module not found" });

      return;
    }

    const { now, currentFrom, previousFrom } =
      buildWindowDateRange(lookbackHours);

    const [
      currentAverageScore,
      previousAverageScore,
      currentMeasurementAverages,
      previousMeasurementAverages,
      currentVocAverage,
      previousVocAverage,
    ] = await Promise.all([
      getAverageScoreForWindow(module._id, currentFrom, now),
      getAverageScoreForWindow(module._id, previousFrom, currentFrom),
      getMeasurementAveragesForWindow(module._id, currentFrom, now),
      getMeasurementAveragesForWindow(module._id, previousFrom, currentFrom),
      getVocAverageForWindow(module._id, currentFrom, now),
      getVocAverageForWindow(module._id, previousFrom, currentFrom),
    ]);

    const averages = {
      ...currentMeasurementAverages,
      voc_index: currentVocAverage,
    };

    const previousWindowAverages = {
      ...previousMeasurementAverages,
      voc_index: previousVocAverage,
    };

    const trendPercent =
      currentAverageScore === null ||
      previousAverageScore === null ||
      previousAverageScore === 0
        ? null
        : roundValue(
            ((currentAverageScore - previousAverageScore) /
              previousAverageScore) *
              100,
          );

    const content = JSON.stringify(
      {
        iaq_score: currentAverageScore,
        time_window: `last ${lookbackHours} hours`,
        trend_percent: trendPercent,
        averages,
        deltas_vs_previous_window: buildDeltaMap(
          averages,
          previousWindowAverages,
        ),
      },
      null,
      2,
    );

    console.log(currentAverageScore);

    const output = await getAiAnalysis(content);

    res.status(200).json({
      output,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

export { aiRoutes };
