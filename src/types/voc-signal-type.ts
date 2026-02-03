import { Types } from "mongoose";

export interface VocSignal {
  ts: Date;
  meta: {
    module_id: Types.ObjectId;
  };
  voc_index: number;
  deviation?: number;
  baseline_snapshot?: number;
  window_sec?: number;
}
