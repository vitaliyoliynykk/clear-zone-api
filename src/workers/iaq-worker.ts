import { Worker } from "./worker";
import connectDB from "../config/db";
import { scoreLowerIsBetter, scoreBand } from "../utils/math";
import { processInBatches } from "../utils/workers";
import { VocSignalModel } from "../models/VocSignal";
import { Types } from "mongoose";

const Measurement = require("../models/Measurement");

const WORKER_POLLING_MS = 5000; // 30 Seconds
const MODULES_BATCH_SIZE = 1; // Process each module in parallel

const IaqWorker = new Worker(WORKER_POLLING_MS);

const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

const co2SubScore = (ppm) => scoreLowerIsBetter(ppm, 600, 2000);
const vocSubScore = (index) => scoreLowerIsBetter(index, 50, 250);
const pm10SubScore = (concentration) =>
  scoreLowerIsBetter(concentration, 10, 35);
const pm25SubScore = (concentration) =>
  scoreLowerIsBetter(concentration, 5, 25);
const pm100SubScore = (concentration) =>
  scoreLowerIsBetter(concentration, 5, 20);
const tempSubScore = (temp) => scoreBand(temp, 15, 18, 22, 26);
const humSubScore = (rh) => scoreBand(rh, 20, 40, 60, 80);

connectDB();

const arrangeDataBySensors = (data) =>
  data.reduce((acc, m) => {
    (acc[m.sensor] ||= []).push(m.value);
    return acc;
  }, {});

const processModule = async (moduleId: Types.ObjectId) => {
  const sensorsData = await Measurement.aggregate([
    {
      $match: {
        ts: { $gte: tenMinutesAgo },
        "meta.module_id": moduleId,
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
        "meta.module_id": moduleId,
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
        value: { $round: ["$value", 0] },
      },
    },
  ]);

  if (sensorsData.length && vocData.length) {
    const { hum, co2, temp, pm25, pm10, pm100 } =
      arrangeDataBySensors(sensorsData);

    const co2Score = co2SubScore(Number(co2));
    const vocScore = vocSubScore(Number(vocData[0].value));
    const pm10Score = pm10SubScore(Number(pm10));
    const pm25Score = pm25SubScore(Number(pm25));
    const pm100Score = pm100SubScore(Number(pm100));
    const tempScore = tempSubScore(Number(temp));
    const humScore = humSubScore(Number(hum));

    const IAQ =
      pm25Score * 0.35 +
      pm10Score * 0.05 +
      pm100Score * 0.05 +
      co2Score * 0.3 +
      vocScore * 0.15 +
      humScore * 0.07 +
      tempScore * 0.03;

    console.log({ IAQ, pm25Score, vocScore });
  }
};

const calculateIaqForModules = async () => {
  const moduleIds = await Measurement.distinct("meta.module_id");

  await processInBatches(moduleIds, MODULES_BATCH_SIZE, processModule);
};

IaqWorker.run(calculateIaqForModules);
