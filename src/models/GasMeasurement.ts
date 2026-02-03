import mongoose, { Schema, Model } from "mongoose";
import { GasMeasurement } from "../types";

const GasMeasurementSchema = new Schema<GasMeasurement>(
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
    gas_resistance: {
      type: Number,
      required: true,
    },
    humidity: {
      type: Number,
      required: true,
    },
    uptime_seconds: {
      type: Number,
      required: true,
    },
  },
  { versionKey: false },
);

GasMeasurementSchema.index({ "meta.module_id": 1, ts: 1 });

export const GasMeasurementModel: Model<GasMeasurement> =
  mongoose.model<GasMeasurement>("gas_measurements", GasMeasurementSchema);
