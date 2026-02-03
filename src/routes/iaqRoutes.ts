import { Request, Response, Router } from "express";
import Module from "../models/Module";
import { IaqScoreModel } from "../models/IaqScore";
import { getDateMinutesAgo } from "../utils/time";

const iaqRoutes = Router();

iaqRoutes.get("/", async (req: Request, res: Response) => {
  try {
    const { deviceIds } = req.query;

    if (!Array.isArray(deviceIds)) {
      res.status(400).json({ message: "Bad query params format" });

      return;
    } else if (deviceIds.length === 0) {
      res.status(200).json([]);

      return;
    }

    const tenMinutesAgo = getDateMinutesAgo(10);

    const modules = await Module.find(
      {
        device_id: { $in: deviceIds },
      },
      { _id: 1 },
    );

    const moduleIds = modules.map((m) => m._id);

    const latestScores = await IaqScoreModel.aggregate([
      {
        $match: {
          ts: { $gte: tenMinutesAgo },
          "meta.module_id": { $in: moduleIds },
        },
      },
      {
        $sort: { ts: -1 },
      },
      {
        $group: {
          _id: "$meta.module_id",
          score: { $first: "$score" },
          ts: { $first: "$ts" },
        },
      },
      {
        $project: {
          _id: 0,
          module_id: "$_id",
          score: 1,
          ts: 1,
        },
      },
    ]);

    res.status(200).json(latestScores);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

export { iaqRoutes };
