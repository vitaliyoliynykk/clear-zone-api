const express = require("express");
const { Types } = require("mongoose");

const Measurement = require("../models/Measurement");
const VocSignal = require("../models/VocSignal");
const Module = require("../models/Module");

const { SENSORS } = require("../utils/constants");
const { getLookbackDate, getBinSize } = require("../utils/time");

const router = express.Router();

router.get("/aggregated/voc/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { hoursLookback } = req.query;

    const fromDate = getLookbackDate(hoursLookback);
    const binSize = getBinSize(hoursLookback);

    const module = await Module.findOne({ device_id: deviceId });

    const result = await VocSignal.aggregate([
      {
        $match: {
          ts: { $gte: fromDate },
          "meta.module_id": module._id,
        },
      },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: "$ts",
              unit: "minute",
              binSize,
            },
          },
          value: { $max: "$voc_index" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          value: { $round: ["$value", 0] },
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/aggregated/:deviceId/:sensor", async (req, res) => {
  try {
    const { sensor, deviceId } = req.params;
    const { hoursLookback } = req.query;

    if (!SENSORS.includes(sensor)) {
      res.status(400).json({ message: "Invalid sensor" });
      return;
    }

    const fromDate = getLookbackDate(hoursLookback);
    const binSize = getBinSize(hoursLookback);

    const module = await Module.findOne({ device_id: deviceId });

    const result = await Measurement.aggregate([
      {
        $match: {
          sensor,
          ts: { $gte: fromDate },
          "meta.module_id": new Types.ObjectId(module._id),
        },
      },
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: "$ts",
              unit: "minute",
              binSize,
            },
          },
          value: { $avg: "$value" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          value: { $round: ["$value", 2] },
        },
      },
      {
        $sort: { date: 1 },
      },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/voc/latest/:moduleId", async (req, res) => {
  try {
    const { moduleId } = req.params;

    const latestVoc = await VocSignal.findOne({ "meta.module_id": moduleId })
      .sort({ ts: -1 })
      .limit(1);

    res
      .status(200)
      .json(
        latestVoc ? { index: latestVoc.voc_index, date: latestVoc.ts } : null,
      );
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
