import { Request, Response, Router } from "express";
import Module from "../models/Module";
import { IaqScoreModel } from "../models/IaqScore";
import { VocSignalModel } from "../models/VocSignal";
import { getAiAnalysis } from "../config/aiConfig";
import { buildWindowDateRange } from "../utils/time";
import {
  buildDeltaMap,
  roundValue,
  SENSOR_KEYS,
  SENSOR_OUTPUT_MAP,
} from "../utils/aiAnalysis";

const Measurement = require("../models/Measurement");

const aiRoutes = Router();

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

aiRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const { deviceId, hoursAgo } = req.query;

    if (typeof deviceId !== "string" || typeof hoursAgo !== "string") {
      res
        .status(400)
        .json({ message: "deviceId and hoursLookback are required" });

      return;
    }

    const lookbackHours = Number(hoursAgo);

    if (!Number.isFinite(lookbackHours) || lookbackHours <= 0) {
      res.status(400).json({ message: "hoursAgo must be a positive number" });

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

    const result = await getAiAnalysis(content);

    res.status(200).json({
      result,
      date: new Date(),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

export { aiRoutes };
