import connectWS from "./ws";
import { connectMqtt } from "./mqttConfig";

const socketsByDevice = new Map<string, Set<any>>(); // deviceId -> Set<ws>
const lastByDevice = new Map<string, Map<string, string>>(); // deviceId -> Map<type, msg>

const initWsMqtt = (): void => {
  connectWS(socketsByDevice, lastByDevice);
  connectMqtt(socketsByDevice, lastByDevice);
};

export { initWsMqtt };
