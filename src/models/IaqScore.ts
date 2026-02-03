import mongoose, { Types, Model } from "mongoose";

export interface IaqScore {
  ts: Date;
  meta: {
    module_id: Types.ObjectId;
  };
  score: number;
}

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

IaqScoresSchema.index({ "meta.module_id": 1, ts: 1 });

export const IaqScoreModel: Model<IaqScore> = mongoose.model<IaqScore>(
  "iaq_scores",
  IaqScoresSchema,
);
