import mongoose, { Types, Model } from "mongoose";

export interface VocSensorState {
  module_id: Types.ObjectId;
  last_processed_at: Date;
  baseline_gas_resistance: number;
  uptime_seconds: number;
  state: string;
}

const { VOC_SENSOR_STATES } = require("../utils/constants");

const VocSensorStateSchema = new mongoose.Schema<VocSensorState>({
  module_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "modules",
    required: true,
    unique: true,
  },
  baseline_gas_resistance: {
    type: Number,
    required: true,
  },
  state: {
    type: String,
    enum: VOC_SENSOR_STATES,
    required: true,
  },
  uptime_seconds: {
    type: Number,
    required: true,
  },
  last_processed_at: {
    type: Date,
    required: true,
  },
});

export const VocSensorStateModel: Model<VocSensorState> =
  mongoose.model<VocSensorState>("voc_sensor_state", VocSensorStateSchema);
