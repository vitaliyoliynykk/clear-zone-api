import { Worker } from "./worker";
import { connectDB } from "../config/db";
import { processInBatches } from "../utils/workers";
import { VocSignalModel } from "../models/VocSignal";
import { Types } from "mongoose";
import { SENSORS_IAQ_CONFIG } from "../utils/iaq";
import { SensorType } from "../types";
import { IaqScoreModel } from "../models/IaqScore";

const Measurement = require("../models/Measurement");

const WORKER_POLLING_MS = 60000; // 60 Seconds
const MODULES_BATCH_SIZE = 1; // Process each module in parallel

const IaqWorker = new Worker(WORKER_POLLING_MS);

connectDB();

const processModule = async (module_id: Types.ObjectId) => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const sensorsData = await Measurement.aggregate([
    {
      $match: {
        ts: { $gte: tenMinutesAgo },
        "meta.module_id": module_id,
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

  const vocData = await VocSignalModel.aggregate([
    {
      $match: {
        ts: { $gte: tenMinutesAgo },
        "meta.module_id": module_id,
      },
    },
    {
      $group: {
        _id: 0,
        value: { $max: "$voc_index" },
      },
    },
    {
      $project: {
        _id: 0,
        sensor: "voc",
        value: { $round: ["$value", 0] },
      },
    },
  ]);

  if (sensorsData.length && vocData.length) {
    const allSensorsData = [...sensorsData, ...vocData];

    let sum = 0;
    let weightSum = 0;

    for (const { sensor, value } of allSensorsData) {
      const { weight, subScoreCalculator } =
        SENSORS_IAQ_CONFIG[sensor as SensorType];
      const score = subScoreCalculator(value);

      sum += score * weight;
      weightSum += weight;
    }

    const score = weightSum ? sum / weightSum : null;

    await IaqScoreModel.insertOne({
      meta: { module_id },
      score: Math.round(score),
    });
  }
};

const calculateIaqForModules = async () => {
  const moduleIds = await Measurement.distinct("meta.module_id");

  await processInBatches(moduleIds, MODULES_BATCH_SIZE, processModule);
};

IaqWorker.run(calculateIaqForModules);
