import mongoose, { Model } from "mongoose";
import { IaqScore } from "../types";

const IaqScoresSchema = new mongoose.Schema<IaqScore>(
  {
    ts: {
      type: Date,
      required: true,
      default: Date.now,
    },
    meta: {
      module_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "modules",
        required: true,
      },
    },
    score: {
      type: Number,
      required: true,
    },
  },
  { versionKey: false },
);

IaqScoresSchema.index({ "meta.module_id": 1, ts: -1 });

export const IaqScoreModel: Model<IaqScore> = mongoose.model<IaqScore>(
  "iaq_scores",
  IaqScoresSchema,
);
