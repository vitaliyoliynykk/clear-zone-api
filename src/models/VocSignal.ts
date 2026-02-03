import mongoose, { Types, Model } from "mongoose";
import { VocSignal } from "../types";

const VocSignalSchema = new mongoose.Schema<VocSignal>(
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
    voc_index: {
      type: Number,
      required: true,
    },
    deviation: {
      type: Number,
      required: false,
    },
    baseline_snapshot: {
      type: Number,
      required: false,
    },
    window_sec: {
      type: Number,
      required: false,
    },
  },
  { versionKey: false },
);

VocSignalSchema.index({ "meta.module_id": 1, ts: 1 });

export const VocSignalModel: Model<VocSignal> = mongoose.model<VocSignal>(
  "voc_signals",
  VocSignalSchema,
);
