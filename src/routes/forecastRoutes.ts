import { Request, Response, Router } from "express";
import Module from "../models/Module";
import { getDateMinutesAgo } from "../utils/time";
import Measurement from "../models/Measurement";
import { prepareWindow, resampleData } from "../utils/prepareMeasurementData";
import * as ort from "onnxruntime-node";
import path from "node:path";

const modelDirectory = path.resolve(__dirname, "../../src/forecast-models/v1");
const scaler = require(path.join(modelDirectory, "model_scaler.json")) as {
  features: Array<"co2" | "temp" | "hum">;
  mean: number[];
  scale: number[];
};
const WINDOW_SIZE = 180;

const forecastRoutes = Router();

forecastRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId || typeof deviceId !== "string") {
      res.status(400).json({ message: "Bad query params format" });

      return;
    }

    const modules = await Module.find(
      {
        device_id: deviceId,
      },
      { _id: 1 },
    );

    const moduleIds = modules.map((m) => m._id);

    const inferenceHistoryWindow = getDateMinutesAgo(190);

    const data = await Measurement.aggregate([
      {
        $match: {
          ts: { $gte: inferenceHistoryWindow },
          "meta.module_id": { $in: moduleIds },
          sensor: { $in: ["co2", "temp", "hum"] },
        },
      },
      {
        $project: {
          _id: 0,
          sensor: 1,
          value: 1,
          ts: 1,
        },
      },
    ]);

    if (data.length < WINDOW_SIZE) {
      res.status(400).json({ message: "Not enough data for inference" });
      return;
    }

    const resampledData = resampleData(data).slice(-WINDOW_SIZE);

    if (resampledData.length < WINDOW_SIZE) {
      res
        .status(400)
        .json({ message: "Not enough data for inference after resampling" });
      return;
    }

    const window = prepareWindow(resampledData, WINDOW_SIZE, scaler);
    const input = new ort.Tensor("float32", Float32Array.from(window.flat()), [
      1,
      WINDOW_SIZE,
      7,
    ]);

    const session = await ort.InferenceSession.create(
      path.join(modelDirectory, "model.onnx"),
      {
        executionProviders: ["cpu"],
        intraOpNumThreads: 1,
      },
    );
    const output = await session.run({ [session.inputNames[0]]: input });
    const forecastOutput = output[session.outputNames[0]];
    const co2Index = scaler.features.indexOf("co2");
    const forecastPpm = Array.from(
      forecastOutput.data as Float32Array,
      (value) => Number(value) * scaler.scale[co2Index] + scaler.mean[co2Index],
    );

    const horizons = [60, 120, 180];

    res.status(200).json({
      forecasts: forecastPpm.map((ppm, index) => ({
        value: ppm,
        unit: "ppm",
        horizonMinutes: horizons[index],
      })),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

export { forecastRoutes };
