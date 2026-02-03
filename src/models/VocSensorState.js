const mongoose = require("mongoose");
const { VOC_SENSOR_STATES } = require("../utils/constants");

const VocSensorStateSchema = new mongoose.Schema({
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

module.exports = mongoose.model("voc_sensor_state", VocSensorStateSchema);
