const mqtt = require("mqtt");
const Module = require("../models/Module");
const Measurement = require("../models/Measurement");

const connectMqtt = (socketsByDevice, lastByDevice) => {
  const mqttClient = mqtt.connect(process.env.HIVE_MQ_HOST, {
    username: process.env.HIVEMQ_USERNAME,
    password: process.env.HIVEMQ_PASS,
  });

  mqttClient.on("connect", () => {
    const topics = {
      "devices/+/status": { qos: 1 },
      "devices/+/temp": { qos: 0 },
    };

    mqttClient.subscribe(topics, (err) => {
      if (err) console.error("Subscribe error", err);
    });
  });

  mqttClient.on("message", (topic, payload, packet) => {
    const [, deviceId, type] = topic.split("/");

    console.log("[MQTT]", deviceId, type, JSON.parse(payload.toString()));

    switch (type) {
      case "status":
        handleStatus(deviceId, payload, packet, lastByDevice, socketsByDevice);
        break;
      case "temp":
        handleTemp(deviceId, payload);
        break;
    }
  });
};

const handleStatus = (
  deviceId,
  payload,
  packet,
  lastByDevice,
  socketsByDevice
) => {
  const msg = JSON.stringify({
    type: "status",
    deviceId,
    ts: Date.now(),
    data: JSON.parse(payload.toString()),
    retained: Boolean(packet?.retain),
  });

  if (!lastByDevice.has(deviceId)) {
    lastByDevice.set(deviceId, new Map());
  }
  lastByDevice.get(deviceId).set("status", msg);

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

  console.log("[MQTT] Temp saved to DB");
};

module.exports = connectMqtt;
