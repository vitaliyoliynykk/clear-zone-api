const connectDB = require("../config/db");

const VocSensorState = require("../models/VocSensorState");
const GasMesurement = require("../models/GasMeasurement");
const { Worker } = require("./worker");

require("dotenv").config();

const WORKER_POLLING_MS = 30000; // 30 Seconds

const VocSignalWorker = new Worker(WORKER_POLLING_MS);

const process = async () => {};

VocSignalWorker.run(process);

// voc_signals {
//   ts,
//   module_id,
//   voc_index,
//   deviation,          // optional
//   baseline_snapshot,  // optional
//   window_sec          // optional
// }
