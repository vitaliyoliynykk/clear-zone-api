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
const DETERIORATION_THRESHOLD = 15;
const COOLDOWN_HOURS = 2;

const NotificationsWorker = new Worker(WORKER_POLLING_MS);

const processModule = async (module_id: Types.ObjectId) => {
  const now = new Date();

  const pastWindowStart = getDateMinutesAgo(120);
  const pastWindowEnd = getDateMinutesAgo(110);

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

  if (!iaqNow.length || !iaqPast.length) return;

  const delta_deterioration = Math.round(iaqPast[0].value - iaqNow[0].value);

  if (delta_deterioration > DETERIORATION_THRESHOLD) {
    console.log(`[${module_id}] IAQ deteriorated - ${delta_deterioration}`);
    const module = await ModuleModel.findOne({ _id: module_id });

    const ownerSubscriptions = await PushSubscriptionModel.find({
      user_id: module.owner_id,
    });

    for (const sub of ownerSubscriptions) {
      if (hoursDiff(now, sub.last_used_at) > COOLDOWN_HOURS) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys,
            },
            JSON.stringify({
              title: "Air Quality 🍃",
              body: `The air quality is deteriorating in the ${module.name.toLocaleLowerCase()} 👎`,
            }),
          );
          sub.last_used_at = new Date();
          await sub.save();
        } catch (e) {
          console.log(e);
        }
      }
    }
  }
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
