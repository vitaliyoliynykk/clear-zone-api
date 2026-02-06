import { Request, Response, Router } from "express";
import { PushSubscriptionModel } from "../models/PushSubscriptionModel";
import webpush from "web-push";

const webPushRoutes = Router();

webPushRoutes.post("/subscribe", async (req: Request, res: Response) => {
  const { user } = req as any;
  const { endpoint, keys } = req.body;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: "Invalid push subscription" });
  }
  try {
    await PushSubscriptionModel.findOneAndUpdate(
      { endpoint },
      {
        user_id: user.id,
        endpoint,
        keys,
        last_used_at: new Date(),
        updated_at: new Date(),
        enabled_alerts: true,
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    res.status(200).json({ message: "subscribed" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

webPushRoutes.get("", async (req: Request, res: Response) => {
  const { user } = req as any;
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ message: "Invalid push subscription" });
  }
  try {
    const subscription = await PushSubscriptionModel.findOne({
      endpoint,
      user_id: user.id,
    });

    if (subscription) {
      res.status(200).json({
        enableAlerts: subscription.enabled_alerts,
        lastUsedAt: subscription.last_used_at,
      });
    } else {
      res.status(204).json({});
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

webPushRoutes.get("/test", async (req: Request, res: Response) => {
  const { user } = req as any;
  const { endpoint } = req.query;

  if (!endpoint) {
    return res.status(400).json({ message: "Invalid push subscription" });
  }
  try {
    const subscription = await PushSubscriptionModel.findOne({
      endpoint,
      user_id: user.id,
    });

    if (subscription) {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        },
        JSON.stringify({
          title: "Clear Zone",
          body: "Test push message from API",
        }),
      );

      subscription.last_used_at = new Date();
      await subscription.save();
    }

    res.status(200).json({
      message: "ok",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
});

export { webPushRoutes };
