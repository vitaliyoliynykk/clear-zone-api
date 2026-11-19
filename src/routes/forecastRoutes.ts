import { Request, Response, Router } from "express";
import Module from "../models/Module";
import { getDateMinutesAgo } from "../utils/time";
import Measurement from "../models/Measurement";
import { prepareWindow, resampleData } from "../utils/prepareMeasurementData";
import * as ort from "onnxruntime-node";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { ModelMetadata, Scaler } from "../types";

const forecastRoutes = Router();

forecastRoutes.get("/models", async (_req: Request, res: Response) => {
  try {
    const modelsDirectory = path.resolve(__dirname, "../../src/forecast-models");
    const entries = await readdir(modelsDirectory, { withFileTypes: true });
    const metadata: ModelMetadata[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const modelDirectory = path.join(modelsDirectory, entry.name);
      const files = await readdir(modelDirectory);
      if (
        !files.includes(`${entry.name}.onnx`) ||
        !files.includes(`${entry.name}_scaler.json`) ||
        !files.includes(`${entry.name}_metadata.json`)
      ) {
        continue;
      }

      metadata.push(
        require(path.join(modelDirectory, `${entry.name}_metadata.json`)) as ModelMetadata,
      );
    }

    res.status(200).json(metadata);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

forecastRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const { deviceId, model } = req.query;

    if (
      !deviceId ||
      typeof deviceId !== "string" ||
      !model ||
      typeof model !== "string"
    ) {
      res.status(400).json({ message: "Bad query params format" });

      return;
    }

    let modelDirectory: string;
    let scaler: Scaler;
    let modelMetadata: ModelMetadata;

    try {
      modelDirectory = path.resolve(
        __dirname,
        `../../src/forecast-models/${model}`,
      );

      scaler = require(
        path.join(modelDirectory, `${model}_scaler.json`),
      ) as Scaler;

      modelMetadata = require(
        path.join(modelDirectory, `${model}_metadata.json`),
      ) as ModelMetadata;
    } catch (error) {
      res.status(400).json({ message: "Model not found" });
      return;
    }

    const modules = await Module.find(
      {
        device_id: deviceId,
      },
      { _id: 1 },
    );

    const moduleIds = modules.map((m) => m._id);

    const inferenceHistoryWindow = getDateMinutesAgo(
      modelMetadata.window_size + 10,
    );

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

    if (data.length < modelMetadata.window_size) {
      res.status(400).json({ message: "Not enough data for inference" });
      return;
    }

    const resampledData = resampleData(data).slice(-modelMetadata.window_size);

    if (resampledData.length < modelMetadata.window_size) {
      res
        .status(400)
        .json({ message: "Not enough data for inference after resampling" });
      return;
    }

    let window: number[][];

    try {
      window = prepareWindow(resampledData, modelMetadata.window_size, scaler);
    } catch (error) {
      console.error(error.message);
      res.status(400).json({ message: "Not enough data for forecasting" });
      return;
    }

    const input = new ort.Tensor("float32", Float32Array.from(window.flat()), [
      1,
      modelMetadata.window_size,
      modelMetadata.features.length,
    ]);

    const session = await ort.InferenceSession.create(
      path.join(modelDirectory, `${model}.onnx`),
      {
        executionProviders: ["cpu"],
        intraOpNumThreads: 1,
      },
    );

    const output = await session.run({ [session.inputNames[0]]: input });
    const forecastOutput = output[session.outputNames[0]];
    const index = scaler.features.indexOf(modelMetadata.target_value);
    const forecasts = Array.from(
      forecastOutput.data as Float32Array,
      (value) => Number(value) * scaler.scale[index] + scaler.mean[index],
    );

    res.status(200).json({
      forecasts: forecasts.map((value, index) => ({
        value: value,
        unit: modelMetadata.unit,
        horizonMinutes: modelMetadata.forecast_horizons_minutes[index],
      })),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

export { forecastRoutes };
