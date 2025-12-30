const { WebSocketServer } = require("ws");
const { JWT_SCOPE_USER } = require("../utils/constants");
const jwt = require("jsonwebtoken");
const Module = require("../models/Module");

const addDeviceIdToSocket = (deviceId, ws, socketsByDevice) => {
  if (!socketsByDevice.has(deviceId)) {
    socketsByDevice.set(deviceId, new Set());
  }

  socketsByDevice.get(deviceId).add(ws);
};

function removeDeviceIdFromSocket(deviceId, ws, socketsByDevice) {
  const set = socketsByDevice.get(deviceId);

  if (!set) return;

  set.delete(ws);

  if (set.size === 0) {
    socketsByDevice.delete(deviceId);
  }
}

const jwtAuth = (req) => {
  const protocols = req.headers["sec-websocket-protocol"]
    ?.split(",")
    .map((p) => p.trim());
  const token = protocols?.[1];

  if (!token) throw new Error("NO_TOKEN");

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.scope !== JWT_SCOPE_USER) {
    throw new Error("INSUFFICIENT_SCOPE");
  }

  return decoded;
};

const connectWS = (socketsByDevice, lastByDevice) => {
  const wss = new WebSocketServer({ port: process.env.WS_PORT });

  wss.on("connection", async (ws, req) => {
    try {
      const user = jwtAuth(req);
      ws.user = user;
    } catch (err) {
      ws.close(1008, "Unauthorized");
      return;
    }

    const userModules = await Module.find({ owner_id: ws.user.id });

    for (const { device_id } of userModules) {
      addDeviceIdToSocket(device_id, ws, socketsByDevice);
    }

    for (const { device_id } of userModules) {
      const deviceCache = lastByDevice.get(device_id);
      if (!deviceCache) continue;
      for (const msg of deviceCache.values()) {
        if (ws.readyState === ws.OPEN) {
          ws.send(msg);
        }
      }
    }

    ws.on("close", async () => {
      console.log("[Web Socket] Client disconnected");
      for (const { device_id } of userModules) {
        removeDeviceIdFromSocket(device_id, ws, socketsByDevice);
      }
    });
  });
};

module.exports = connectWS;
