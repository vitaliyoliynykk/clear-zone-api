const mongoose = require("mongoose");

const IaqScoresSchema = new mongoose.Schema(
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

module.exports = mongoose.model("iaq_scores", IaqScoresSchema);
