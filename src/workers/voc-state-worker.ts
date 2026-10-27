import { GasMeasurementModel } from "../models/GasMeasurement";
import { VocSensorStateModel } from "../models/VocSensorState";
import { Worker } from "./worker";
import dotenv from "dotenv";
import { processInBatches } from "../utils/workers";
import { connectDB } from "../config/db";
import { VOC_WARM_UP_SEC, VOC_CALIBRATION_SEC } from "../utils/constants";
import { Types } from "mongoose";
import {
  getVocSensorState,
  getResistanceDeviationDelta,
} from "../utils/vocSensor";
import { GasMeasurement } from "../types";

dotenv.config();

const ALPHA_CALIBRATING = 0.02;
const ALPHA_READY = 0.005;
const POLLUTION_THRESHOLD = 0.1;
const HUMIDITY_THRESHOLD = 70;
const OFFLINE_RESET_THRESHOLD_MS = 14400000; // 4 Hours
const WORKER_POLLING_MS = 30000; // 30 Seconds
const MODULES_BATCH_SIZE = 1; // Process each module in parallel
const BASELINE_INITIALIZATION_MS = 5 * 60 * 1000; // 5 Minutes

const VocStateWorker = new Worker(WORKER_POLLING_MS);

connectDB();

const calculateAlpha = (data: GasMeasurement): number => {
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
const processModule = async (moduleId: Types.ObjectId): Promise<void> => {
  const sensorState = await VocSensorStateModel.findOne({
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

  const hasNewData = await GasMeasurementModel.exists(query);

  if (hasNewData) {
    const newData = await GasMeasurementModel.find(query).sort({ ts: 1 });
    if (newData.length === 0) return;

    const latestRow = newData[newData.length - 1];

    let baseline = sensorState?.baseline_gas_resistance ?? null;

    if (!Number.isFinite(baseline) || baseline <= 0) baseline = null;

    let initializationStartedAt =
      sensorState?.baseline_initialization_started_at ?? null;

    let initializationSamples = [
      ...(sensorState?.baseline_initialization_samples ?? []),
    ];

    let previousTimestamp = sensorState?.last_processed_at;
    let previousUptime = sensorState?.uptime_seconds;

    for (const [index, row] of newData.entries()) {
      if (baseline === null) {
        const restarted =
          previousUptime != null && row.uptime_seconds < previousUptime;

        const longGap =
          previousTimestamp != null &&
          row.ts.getTime() - previousTimestamp.getTime() >=
            OFFLINE_RESET_THRESHOLD_MS;

        previousTimestamp = row.ts;
        previousUptime = row.uptime_seconds;

        if (restarted || longGap || row.uptime_seconds <= VOC_WARM_UP_SEC) {
          initializationStartedAt = null;
          initializationSamples = [];
        }

        if (
          !Number.isFinite(row.uptime_seconds) ||
          row.uptime_seconds <= VOC_WARM_UP_SEC ||
          !Number.isFinite(row.gas_resistance) ||
          row.gas_resistance <= 0
        )
          continue;

        initializationStartedAt ??= row.ts;
        initializationSamples.push(row.gas_resistance);

        if (
          row.ts.getTime() - initializationStartedAt.getTime() >=
            BASELINE_INITIALIZATION_MS &&
          initializationSamples.length >= 2
        ) {
          initializationSamples.sort((a, b) => a - b);
          const middle = Math.floor(initializationSamples.length / 2);
          baseline =
            initializationSamples.length % 2 === 0
              ? (initializationSamples[middle - 1] +
                  initializationSamples[middle]) /
                2
              : initializationSamples[middle];
          initializationStartedAt = null;
          initializationSamples = [];
        }
        continue;
      }

      if (
        row.uptime_seconds > VOC_WARM_UP_SEC &&
        getResistanceDeviationDelta(row.gas_resistance, baseline) <=
          POLLUTION_THRESHOLD
      ) {
        // Check time difference between records, in order to see if module went offline
        const time_delta_ms = newData[index - 1]
          ? row.ts.getTime() - newData[index - 1].ts.getTime()
          : 0;

        // Reset baseline if module was offline for more than a OFFLINE_RESET_THRESHOLD_MS
        if (time_delta_ms >= OFFLINE_RESET_THRESHOLD_MS) {
          baseline = row.gas_resistance;
        } else {
          const alpha = calculateAlpha(row);

          baseline = Math.round(
            (1 - alpha) * baseline + alpha * row.gas_resistance,
          );
        }
      }
    }

    const latestState =
      baseline === null && latestRow.uptime_seconds > VOC_WARM_UP_SEC
        ? "calibrating"
        : getVocSensorState(latestRow.uptime_seconds);

    if (sensorState) {
      sensorState.state = latestState;
      sensorState.last_processed_at = latestRow.ts;
      sensorState.uptime_seconds = latestRow.uptime_seconds;
      sensorState.baseline_gas_resistance = baseline;
      sensorState.baseline_initialization_started_at = initializationStartedAt;
      sensorState.baseline_initialization_samples = initializationSamples;

      await sensorState.save();
    } else {
      await VocSensorStateModel.create({
        state: latestState,
        last_processed_at: latestRow.ts,
        uptime_seconds: latestRow.uptime_seconds,
        baseline_gas_resistance: baseline,
        baseline_initialization_started_at: initializationStartedAt,
        baseline_initialization_samples: initializationSamples,
        module_id: moduleId,
      });
    }
  }
};

const updateVocBaselineForModules = async (): Promise<void> => {
  const moduleIds = await GasMeasurementModel.distinct("meta.module_id");

  await processInBatches(moduleIds, MODULES_BATCH_SIZE, processModule);
};

VocStateWorker.run(updateVocBaselineForModules);
