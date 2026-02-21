import { Types } from "mongoose";
import { processInBatches } from "../utils/workers";
import { Worker } from "./worker";
import { PushSubscriptionModel } from "../models/PushSubscriptionModel";
import ModuleModel from "../models/Module";
import { connectDB } from "../config/db";
import webpush from "web-push";
import { initWebPush } from "../config/webPush";
import { getDateMinutesAgo, hoursDiff } from "../utils/time";
import { IaqScoreModel } from "../models/IaqScore";

initWebPush();
connectDB();

const WORKER_POLLING_MS = 120000; // 2 minutes
const MODULES_BATCH_SIZE = 1; // Process each module in parallel
const DETERIORATION_THRESHOLD = 5;
const IMPROVEMENT_THRESHOLD = 5;
const COOLDOWN_HOURS = 1;

const NotificationsWorker = new Worker(WORKER_POLLING_MS);

const getIaqDifference = async (
  module_id: Types.ObjectId,
): Promise<{ now: number; past: number } | null> => {
  const pastWindowStart = getDateMinutesAgo(60);
  const pastWindowEnd = getDateMinutesAgo(50);

  const iaqNow = await IaqScoreModel.aggregate([
    {
      $match: {
        ts: { $gte: pastWindowEnd },
        "meta.module_id": module_id,
      },
    },
    {
      $group: {
        _id: "$meta.module_id",
        value: { $avg: "$score" },
      },
    },
    {
      $project: {
        _id: 0,
        value: { $round: ["$value", 2] },
      },
    },
  ]).limit(1);

  const iaqPast = await IaqScoreModel.aggregate([
    {
      $match: {
        ts: { $gte: pastWindowStart, $lte: pastWindowEnd },
        "meta.module_id": module_id,
      },
    },
    {
      $group: {
        _id: "$meta.module_id",
        value: { $avg: "$score" },
      },
    },
    {
      $project: {
        _id: 0,
        value: { $round: ["$value", 2] },
      },
    },
  ]);

  if (!iaqNow.length || !iaqPast.length) return null;

  return { now: iaqNow[0].value, past: iaqPast[0].value };
};

const handleDeteriorationNotification = async (module_id: Types.ObjectId) => {
  const iaqIndexes = await getIaqDifference(module_id);
  if (iaqIndexes === null) return;

  const now = new Date();

  const delta_deterioration = Math.round(iaqIndexes.past - iaqIndexes.now);

  if (delta_deterioration > DETERIORATION_THRESHOLD) {
    const module = await ModuleModel.findOne({ _id: module_id });

    const ownerSubscriptions = await PushSubscriptionModel.find({
      user_id: module.owner_id,
    });

    for (const { settings, endpoint, keys, save } of ownerSubscriptions) {
      if (
        settings.deterioration.enabled &&
        hoursDiff(now, settings.deterioration.last_used_at) > COOLDOWN_HOURS
      ) {
        try {
          await webpush.sendNotification(
            {
              endpoint,
              keys,
            },
            JSON.stringify({
              title: "Air Quality 🍃",
              body: `The air quality is deteriorating in the ${module.name.toLocaleLowerCase()} 👎`,
            }),
          );
          settings.deterioration.last_used_at = new Date();
          await save();
        } catch (e) {
          console.log(e);
        }
      }
    }
  }
};

const handleImprovementNotification = async (module_id: Types.ObjectId) => {
  const iaqIndexes = await getIaqDifference(module_id);
  if (iaqIndexes === null) return;

  const now = new Date();

  const delta_improvement = Math.round(iaqIndexes.now - iaqIndexes.past);

  if (delta_improvement > IMPROVEMENT_THRESHOLD) {
    const module = await ModuleModel.findOne({ _id: module_id });

    const ownerSubscriptions = await PushSubscriptionModel.find({
      user_id: module.owner_id,
    });

    for (const { settings, endpoint, keys, save } of ownerSubscriptions) {
      if (
        settings.improvement.enabled &&
        hoursDiff(now, settings.improvement.last_used_at) > COOLDOWN_HOURS
      ) {
        try {
          await webpush.sendNotification(
            {
              endpoint,
              keys,
            },
            JSON.stringify({
              title: "Air Quality 🍃",
              body: `The air quality is improving in the ${module.name.toLocaleLowerCase()} 👍`,
            }),
          );

          settings.improvement.last_used_at = new Date();
          await save();
        } catch (e) {
          console.log(e);
        }
      }
    }
  }
};

const processModule = async (module_id: Types.ObjectId) => {
  await handleDeteriorationNotification(module_id);
  await handleImprovementNotification(module_id);
};

const handlePushNotifications = async () => {
  const usersWithNotificationsEnabled = await PushSubscriptionModel.distinct(
    "user_id",
    { enabled_alerts: true },
  );

  const moduleIds = (await ModuleModel.distinct("_id", {
    owner_id: { $in: usersWithNotificationsEnabled },
  })) as Types.ObjectId[];

  await processInBatches(moduleIds, MODULES_BATCH_SIZE, processModule);
};

NotificationsWorker.run(handlePushNotifications);
