const express = require("express");
const { Types } = require("mongoose");

const Measurement = require("../models/Measurement");
const Module = require("../models/Module");

const { SENSORS } = require("../utils/constants");

const router = express.Router();

router.get("/aggregated/:moduleId/:sensor", async (req, res) => {
  try {
    const { sensor, moduleId } = req.params;

    if (!SENSORS.includes(sensor)) {
      res.status(400).json({ message: "Invalid sensor" });
      return;
    }

    const fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    const module = await Module.findOne({ device_id: moduleId });

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
              binSize: 10,
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

module.exports = router;
