import { SENSORS } from "../utils/iaq";

export type SensorType = (typeof SENSORS)[number] | "voc";
