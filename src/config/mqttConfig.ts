import { GasMeasurementModel } from "../models/GasMeasurement";
import mqtt from "mqtt";

import Module from "../models/Module";
const Measurement = require("../models/Measurement");

const connectMqtt = (
  socketsByDevice: Map<string, Set<any>>,
  lastByDevice: Map<string, Map<string, string>>,
) => {
  const mqttClient = mqtt.connect(process.env.HIVE_MQ_HOST, {
    username: process.env.HIVEMQ_USERNAME,
    password: process.env.HIVEMQ_PASS,
  });

  mqttClient.on("connect", () => {
    const qosOne = 1 as const;
    const qosZero = 0 as const;

    const topics = {
      "devices/+/status": { qos: qosOne },
      "devices/+/temp": { qos: qosZero },
      "devices/+/co2": { qos: qosZero },
      "devices/+/pms": { qos: qosZero },
      "devices/+/bme": { qos: qosZero },
    };

    mqttClient.subscribe(topics, (err) => {
      if (err) console.error("Subscribe error", err);
    });
  });

  mqttClient.on("message", (topic, payload, packet) => {
    const [, deviceId, type] = topic.split("/");

    if (type !== "bme") {
      handleResendToWs(
        deviceId,
        payload,
        packet,
        lastByDevice,
        socketsByDevice,
        type,
      );
    }

    switch (type) {
      case "temp":
        handleTemp(deviceId, payload);
        break;
      case "co2":
        handleCO2(deviceId, payload);
        break;
      case "pms":
        handlePMS(deviceId, payload);
        break;
      case "bme":
        handleBME(deviceId, payload);
        break;
    }
  });
};

const handleResendToWs = (
  deviceId: string,
  payload: Buffer<ArrayBufferLike>,
  packet: mqtt.IPublishPacket,
  lastByDevice: Map<string, Map<string, string>>,
  socketsByDevice: Map<string, Set<any>>,
  type: string,
): void => {
  let data: Record<string, any>;
  try {
    data = JSON.parse(payload.toString());
  } catch (error) {
    console.error("Invalid MQTT payload", { deviceId, type, error });
    return;
  }

  const msg = JSON.stringify({
    type,
    deviceId,
    ts: Date.now(),
    data,
    retained: Boolean(packet?.retain),
  });

  if (!lastByDevice.has(deviceId)) {
    lastByDevice.set(deviceId, new Map());
  }
  lastByDevice.get(deviceId).set(type, msg);

  const sockets = socketsByDevice.get(deviceId);

  if (!sockets) return;

  for (const ws of sockets) {
    if (ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  }
};

const handleTemp = async (
  device_id: string,
  payload: Buffer<ArrayBufferLike>,
): Promise<void> => {
  let data: Record<string, any>;
  try {
    data = JSON.parse(payload.toString());
  } catch (error) {
    console.error("Invalid MQTT temp payload", { device_id, error });
    return;
  }
  const { temp, hum } = data;

  const module = await Module.findOne({ device_id });

  await Measurement.create({
    meta: {
      module_id: module._id,
    },
    sensor: "temp",
    value: temp,
    unit: "C",
  });

  await Measurement.create({
    meta: {
      module_id: module._id,
    },
    sensor: "hum",
    value: hum,
    unit: "RH",
  });
};

const handleCO2 = async (
  device_id: string,
  payload: Buffer<ArrayBufferLike>,
): Promise<void> => {
  let data: Record<string, any>;
  try {
    data = JSON.parse(payload.toString());
  } catch (error) {
    console.error("Invalid MQTT co2 payload", { device_id, error });
    return;
  }
  const { co2 } = data;

  const module = await Module.findOne({ device_id });

  await Measurement.create({
    meta: {
      module_id: module._id,
    },
    sensor: "co2",
    value: co2,
    unit: "ppm",
  });
};

const handlePMS = async (
  device_id: string,
  payload: Buffer<ArrayBufferLike>,
): Promise<void> => {
  let data: Record<string, any>;
  try {
    data = JSON.parse(payload.toString());
  } catch (error) {
    console.error("Invalid MQTT pms payload", { device_id, error });
    return;
  }
  const { pm10, pm25, pm100 } = data;

  const module = await Module.findOne({ device_id });

  await Measurement.create({
    meta: {
      module_id: module._id,
    },
    sensor: "pm10",
    value: pm10,
    unit: "µg/m³",
  });

  await Measurement.create({
    meta: {
      module_id: module._id,
    },
    sensor: "pm25",
    value: pm25,
    unit: "µg/m³",
  });

  await Measurement.create({
    meta: {
      module_id: module._id,
    },
    sensor: "pm100",
    value: pm100,
    unit: "µg/m³",
  });
};

const handleBME = async (
  device_id: string,
  payload: Buffer<ArrayBufferLike>,
): Promise<void> => {
  let data: Record<string, any>;
  try {
    data = JSON.parse(payload.toString());
  } catch (error) {
    console.error("Invalid MQTT bme payload", { device_id, error });
    return;
  }
  const { gas_resistance, sensor_humidity, uptime_seconds } = data;

  const module = await Module.findOne({ device_id });

  await GasMeasurementModel.create({
    meta: {
      module_id: module._id,
    },
    gas_resistance,
    humidity: sensor_humidity,
    uptime_seconds,
  });
};

export { connectMqtt };
