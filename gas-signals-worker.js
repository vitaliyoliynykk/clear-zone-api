const connectDB = require("./config/db");

const WorkerState = require("./models/WorkerState");
const GasMesurement = require("./models/GasMeasurement");

require("dotenv").config();

const WORKER_NAME = "gas-signals-worker";

const BATCH_LIMIT = 500;
const ALPHA = 0.001;

connectDB();

const setupWorkerState = async () => {
  const workerState = await WorkerState.findOne({ worker_name: WORKER_NAME });

  if (!workerState) {
    return await WorkerState.create({ worker_name: WORKER_NAME });
  }

  return workerState;
};

const runWorker = async () => {
  setInterval(async () => {
    const workerState = await setupWorkerState();
    let baseline = 0;
    let counts = 0;

    if (workerState) {
      const query = workerState.last_processed_at
        ? { ts: { $gt: workerState.last_processed_at } }
        : {};

      const rows = await GasMesurement.find(query).sort({ ts: 1 }); // chronological order

      console.time();
      for (const row of rows) {
        if (row.uptime_seconds > 1200) {
          baseline = (1 - ALPHA) * baseline + ALPHA * row.gas_resistance;
          counts++;
        }
      }
      console.timeEnd();

      // console.log(rows[rows.length - 1]);

      const lastProcessedAt = rows[rows.length - 1].ts;

      console.log(
        `Baseline for last ${rows.length} rows: ${Math.round(baseline)} (${lastProcessedAt}), Counts: ${counts}`,
      );
    }
  }, 5000);
};

runWorker();
