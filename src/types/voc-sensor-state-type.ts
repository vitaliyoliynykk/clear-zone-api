import { Types } from "mongoose";

export interface VocSensorState {
  module_id: Types.ObjectId;
  last_processed_at: Date;
  baseline_gas_resistance: number | null;
  baseline_initialization_started_at?: Date | null;
  baseline_initialization_samples?: number[];
  uptime_seconds: number;
  state: string;
}
