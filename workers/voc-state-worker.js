const connectDB = require("../config/db");

const GasMeasurement = require("../models/GasMeasurement");
const VocSensorState = require("../models/VocSensorState");
const { VOC_WARM_UP_SEC, VOC_CALIBRATION_SEC } = require("../utils/constants");
const {
  getVocSensorState,
  getResistanceDeviationDelta,
} = require("../utils/voc-sensor");
const { processInBatches } = require("../utils/workers");
const { Worker } = require("./worker");

require("dotenv").config();

const ALPHA_CALIBRATING = 0.02;
const ALPHA_READY = 0.005;
const POLLUTION_THRESHOLD = 0.1;
const HUMIDITY_THRESHOLD = 70;
const OFFLINE_RESET_THRESHOLD_MS = 14400000; // 4 Hours
const WORKER_POLLING_MS = 30000; // 30 Seconds
const MODULES_BATCH_SIZE = 1; // Process each module in parallel

const VocStateWorker = new Worker(WORKER_POLLING_MS);

connectDB();

const calculateAlpha = (data) => {
  const alpha =
    data.uptime_seconds <= VOC_CALIBRATION_SEC
      ? ALPHA_CALIBRATING
      : ALPHA_READY;

  // Slow down baseline update if humidity is high
  if (data.humidity > HUMIDITY_THRESHOLD) {
    return alpha * 0.02;
  }

  return alpha;
};
const processModule = async (moduleId) => {
  const sensorState = await VocSensorState.findOne({
    module_id: moduleId,
  });

  const query = sensorState?.last_processed_at
    ? {
        "meta.module_id": moduleId,
        ts: { $gt: sensorState.last_processed_at },
      }
    : {
        "meta.module_id": moduleId,
      };

  const hasNewData = await GasMeasurement.exists(query);

  if (hasNewData) {
    const newData = await GasMeasurement.find(query).sort({ ts: 1 });
    const latestRow = newData[newData.length - 1];

    const latestState = getVocSensorState(latestRow.uptime_seconds);

    let baseline =
      sensorState?.baseline_gas_resistance ?? newData[0].gas_resistance;

    for (const [index, row] of newData.entries()) {
      if (
        row.uptime_seconds > VOC_WARM_UP_SEC &&
        getResistanceDeviationDelta(row.gas_resistance, baseline) <=
          POLLUTION_THRESHOLD
      ) {
        // Check time difference between records, in order to see if module went offline
        const time_delta_ms = newData[index - 1]
          ? row.ts - newData[index - 1].ts
          : 0;

        // Reset baseline if module was offline for more than a OFFLINE_RESET_THRESHOLD_MS
        if (time_delta_ms >= OFFLINE_RESET_THRESHOLD_MS) {
          baseline = row.gas_resistance;
        } else {
          const alpha = calculateAlpha(row);

          baseline = (1 - alpha) * baseline + alpha * row.gas_resistance;
        }
      }
    }

    if (sensorState) {
      sensorState.state = latestState;
      sensorState.last_processed_at = latestRow.ts;
      sensorState.uptime_seconds = latestRow.uptime_seconds;
      sensorState.baseline_gas_resistance = baseline;

      await sensorState.save();
    } else {
      await VocSensorState.create({
        state: latestState,
        last_processed_at: latestRow.ts,
        uptime_seconds: latestRow.uptime_seconds,
        baseline_gas_resistance: baseline,
        module_id: moduleId,
      });
    }
  }
};

const updateVocBaselineForModules = async () => {
  const moduleIds = await GasMeasurement.distinct("meta.module_id");

  await processInBatches(moduleIds, MODULES_BATCH_SIZE, processModule);
};

VocStateWorker.run(updateVocBaselineForModules);
