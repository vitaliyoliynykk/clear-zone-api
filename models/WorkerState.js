const mongoose = require("mongoose");

const WorkerStateSchema = new mongoose.Schema({
  worker_name: { type: String, required: true, unique: true },
  last_processed_at: {
    type: Date,
    required: false,
    default: null,
  },
});

module.exports = mongoose.model("worker-state", WorkerStateSchema);
