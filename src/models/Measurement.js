const mongoose = require("mongoose");
const { SENSORS } = require("../utils/iaq");

const MeasurementSchema = new mongoose.Schema(
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

    sensor: {
      type: String,
      enum: SENSORS,
      required: true,
    },

    value: {
      type: Number,
      required: true,
    },

    unit: {
      type: String,
      required: false,
    },
  },
  { versionKey: false },
);

module.exports = mongoose.model("measurements", MeasurementSchema);
