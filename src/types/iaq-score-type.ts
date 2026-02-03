import { Types } from "mongoose";

export interface IaqScore {
  ts: Date;
  meta: {
    module_id: Types.ObjectId;
  };
  score: number;
}
