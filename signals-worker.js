const connectDB = require("./config/db");

const Module = require("./models/Module");
const WorkerState = require("./models/WorkerState");

require("dotenv").config();

const WORKER_NAME = "signals-worker";

connectDB();

const setupWorkerState = async () => {
  const workerState = await WorkerState.findOne({ worker_name: WORKER_NAME });

  if (!workerState) {
    return await WorkerState.create({ worker_name: WORKER_NAME });
  }

  return workerState;
};

setInterval(async () => {
  let workerState = null;

  try {
    workerState = await setupWorkerState();
  } catch (e) {
    console.log(e);
  }

  if (workerState) {
    // Do stuff
    console.log("[Worker] Alive");
  }
}, 5000);
