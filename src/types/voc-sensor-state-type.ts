import { Types } from "mongoose";

export interface VocSensorState {
  module_id: Types.ObjectId;
  last_processed_at: Date;
  baseline_gas_resistance: number;
  uptime_seconds: number;
  state: string;
}
