import mongoose, { Schema, Model } from "mongoose";
import { PushSubscription } from "../types";

const PushSubscriptionSchema = new Schema<PushSubscription>(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
      unique: false,
    },
    endpoint: {
      type: mongoose.Schema.Types.String,
      required: true,
      unique: true,
    },
    keys: {
      p256dh: {
        type: mongoose.Schema.Types.String,
        required: true,
      },
      auth: {
        type: mongoose.Schema.Types.String,
        required: true,
      },
    },
    created_at: {
      type: mongoose.Schema.Types.Date,
      required: true,
      default: Date.now,
    },
    updated_at: {
      type: mongoose.Schema.Types.Date,
      required: true,
      default: Date.now,
    },
    enabled_alerts: {
      type: mongoose.Schema.Types.Boolean,
      required: true,
      default: true,
    },

    settings: {
      // TODO: Move individual setting to separate schema
      deterioration: {
        enabled: { type: mongoose.Schema.Types.Boolean, default: true },
        last_used_at: {
          type: mongoose.Schema.Types.Date,
          default: null,
        },
      },
      improvement: {
        enabled: { type: mongoose.Schema.Types.Boolean, default: true },
        last_used_at: {
          type: mongoose.Schema.Types.Date,
          default: null,
        },
      },
    },
  },
  { versionKey: false },
);

PushSubscriptionSchema.index({ user_id: 1 });

export const PushSubscriptionModel: Model<PushSubscription> =
  mongoose.model<PushSubscription>(
    "push_subscriptions",
    PushSubscriptionSchema,
  );
