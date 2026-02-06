import { Types } from "mongoose";

export interface PushSubscription {
  user_id: Types.ObjectId;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: Date;
  updated_at: Date;
  last_used_at: Date;
  enabled_alerts: boolean;
}
