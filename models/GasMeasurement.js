const mongoose = require("mongoose");

const GasMesurementSchema = new mongoose.Schema(
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

module.exports = mongoose.model("gas_measurements", GasMesurementSchema);
