const connectWS = require("./ws");
const connectMqtt = require("./mqttConfig");

const socketsByDevice = new Map(); // deviceId -> Set<ws>
const lastByDevice = new Map(); // deviceId -> Map<type, msg>

const initWsMqtt = () => {
  connectWS(socketsByDevice, lastByDevice);
  connectMqtt(socketsByDevice, lastByDevice);
};

module.exports = initWsMqtt;
