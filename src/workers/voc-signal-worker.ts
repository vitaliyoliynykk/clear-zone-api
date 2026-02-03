import { GasMeasurementModel } from "../models/GasMeasurement";
import { VocSensorStateModel } from "../models/VocSensorState";
import { VocSignal, VocSignalModel } from "../models/VocSignal";
import { Worker } from "./worker";
import dotenv from "dotenv";
import { Types } from "mongoose";
import {
  getResistanceDeviationDelta,
  calculateVocIndex,
} from "../utils/voc-sensor";
import { processInBatches } from "../utils/workers";
import { connectDB } from "../config/db";

dotenv.config();

const WORKER_POLLING_MS = 30000; // 30 Seconds
const MODULES_BATCH_SIZE = 1;

const VocSignalWorker = new Worker(WORKER_POLLING_MS);

connectDB();

const processModule = async (moduleId: Types.ObjectId): Promise<void> => {
  const latestSignal = await VocSignalModel.findOne({
    "meta.module_id": moduleId,
  })
    .sort({ ts: -1 })
    .limit(1);

  const query = latestSignal?.ts
    ? {
        "meta.module_id": moduleId,
        ts: { $gt: latestSignal.ts },
      }
    : {
        "meta.module_id": moduleId,
      };

  const hasNewData = await GasMeasurementModel.exists(query);

  if (hasNewData) {
    const sensorState = await VocSensorStateModel.findOne({
      module_id: moduleId,
    });

    if (!sensorState || sensorState.baseline_gas_resistance <= 0) return;

    const newData = await GasMeasurementModel.find(query).sort({ ts: 1 });

    const dataToWrite: VocSignal[] = [];

    for (const data of newData) {
      const deviation = getResistanceDeviationDelta(
        data.gas_resistance,
        sensorState.baseline_gas_resistance,
      );

      let vocIndex;

      // Resistance is higher than baseline -> Air is clean
      if (!Number.isFinite(deviation) || deviation <= 0) {
        vocIndex = 0;
        // Lower resistence means pollution
      } else {
        // Non-linear normalization of voc deviation to [0,500]
        vocIndex = calculateVocIndex(deviation);
      }

      dataToWrite.push({
        ts: data.ts,
        meta: { module_id: moduleId },
        voc_index: Math.round(vocIndex),
        deviation,
        baseline_snapshot: sensorState.baseline_gas_resistance,
      });
    }

    if (dataToWrite.length > 0) {
      await VocSignalModel.insertMany(dataToWrite);
    }
  }
};

const process = async () => {
  const moduleIds = await VocSensorStateModel.distinct("module_id");

  await processInBatches(moduleIds, MODULES_BATCH_SIZE, processModule);
};

VocSignalWorker.run(process);
