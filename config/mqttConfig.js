const mqtt = require("mqtt");

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

    if (type === "status") {
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
    }
  });
};

// const handleStatus = (deviceId, type, payload) => {
//   const msg = JSON.stringify({
//     type,
//     deviceId,
//     ts: Date.now(),
//     data: JSON.parse(payload.toString()),
//     retained: Boolean(packet?.retain),
//   });

//   if (!lastByDevice.has(deviceId)) {
//     lastByDevice.set(deviceId, new Map());
//   }
//   lastByDevice.get(deviceId).set(type, msg);

//   const sockets = socketsByDevice.get(deviceId);

//   if (!sockets) return;

//   for (const ws of sockets) {
//     if (ws.readyState === ws.OPEN) {
//       ws.send(msg);
//     }
//   }
// };

module.exports = connectMqtt;
