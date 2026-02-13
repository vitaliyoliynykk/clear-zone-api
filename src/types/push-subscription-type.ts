import { Types } from "mongoose";

export type PushNotificationType = "deterioration" | "improvement";

export interface PushNotificationSettings {
  enabled: boolean;
  last_used_at: Date;
}

export interface PushSubscription {
  user_id: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: Date;
  updated_at: Date;
  enabled_alerts: boolean;
  settings: Record<PushNotificationType, PushNotificationSettings>;
}
