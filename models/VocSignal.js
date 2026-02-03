const mongoose = require("mongoose");

const VocSignalSchema = new mongoose.Schema(
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

module.exports = mongoose.model("voc_signals", VocSignalSchema);
