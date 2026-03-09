import { Request, Response, Router } from "express";
import Module from "../models/Module";

const aiRoutes = Router();

aiRoutes.get("/", async (req: Request, res: Response) => {
  const { deviceId } = req.query;

  const module = await Module.findOne(
    {
      device_id: deviceId,
    },
    { _id: 1 },
  );
});

export { aiRoutes };
