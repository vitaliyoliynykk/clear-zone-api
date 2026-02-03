import { Types } from "mongoose";

export interface GasMeasurement {
  ts: Date;
  meta: {
    module_id: Types.ObjectId;
  };
  gas_resistance: number;
  humidity: number;
  uptime_seconds: number;
}
