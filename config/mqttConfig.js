const mqtt = require("mqtt");
const Module = require("../models/Module");
const Measurement = require("../models/Measurement");
const GasMeasurement = require("../models/GasMeasurement");

const connectMqtt = (socketsByDevice, lastByDevice) => {
  const mqttClient = mqtt.connect(process.env.HIVE_MQ_HOST, {
    username: process.env.HIVEMQ_USERNAME,
    password: process.env.HIVEMQ_PASS,
  });

  mqttClient.on("connect", () => {
    const topics = {
      "devices/+/status": { qos: 1 },
      "devices/+/temp": { qos: 0 },
      "devices/+/co2": { qos: 0 },
      "devices/+/pms": { qos: 0 },
      "devices/+/bme": { qos: 0 },
    };

    mqttClient.subscribe(topics, (err) => {
      if (err) console.error("Subscribe error", err);
    });
  });

  mqttClient.on("message", (topic, payload, packet) => {
    const [, deviceId, type] = topic.split("/");

    console.log("[MQTT]", deviceId, type, JSON.parse(payload.toString()));

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
  deviceId,
  payload,
  packet,
  lastByDevice,
  socketsByDevice,
  type,
) => {
  const msg = JSON.stringify({
    type,
    deviceId,
    ts: Date.now(),
    data: JSON.parse(payload.toString()),
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

const handleTemp = async (device_id, payload) => {
  const { temp, hum } = JSON.parse(payload.toString());

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

const handleCO2 = async (device_id, payload) => {
  const { co2 } = JSON.parse(payload.toString());

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

const handlePMS = async (device_id, payload) => {
  const { pm10, pm25, pm100 } = JSON.parse(payload.toString());

  const module = await Module.findOne({ device_id });

  await Measurement.create({
    meta: {
      module_id: module._id,
    },
    sensor: "PM1.0",
    value: pm10,
    unit: "µg/m³",
  });

  await Measurement.create({
    meta: {
      module_id: module._id,
    },
    sensor: "PM2.5",
    value: pm25,
    unit: "µg/m³",
  });

  await Measurement.create({
    meta: {
      module_id: module._id,
    },
    sensor: "PM10",
    value: pm100,
    unit: "µg/m³",
  });
};

const handleBME = async (device_id, payload) => {
  const { gas_resistance, sensor_humidity, uptime_seconds } = JSON.parse(
    payload.toString(),
  );

  const module = await Module.findOne({ device_id });

  await GasMeasurement.create({
    meta: {
      module_id: module._id,
    },
    gas_resistance,
    humidity: sensor_humidity,
    uptime_seconds,
  });
};

module.exports = connectMqtt;
