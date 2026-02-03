const express = require("express");
const { JWT_SCOPE_MODULE } = require('../utils/constants');

const jwt = require("jsonwebtoken");

const Module = require("../models/Module");

const {
    generateModuleToken,
} = require("../utils/generateTokens");

const router = express.Router();

router.post("/register-module", async (req, res) => {
    try {
        const { deviceId, secret } = req.body;

        let registeredModule = await Module.findOne({ device_id: deviceId });

        if (!registeredModule && secret === process.env.MODULE_PROVISION_SECRET) {
            const modulesCount = await Module.countDocuments();
            const module = new Module({ device_id: deviceId, name: `Clear Zone Module #${modulesCount + 1}` });

            module.save();

            const { moduleToken } = generateModuleToken(deviceId);

            res.status(200).json({ moduleToken, mqttUsername: process.env.HIVEMQ_USERNAME, mqttPass: process.env.HIVEMQ_PASS });

            return
        }

        res.status(400).json({ message: "Module is registered or isn't eligible for registration" });
    } catch (e) {
        console.error("Failed to register a module", e);
        res.status(500).json({ error: "Server error" });
    }

})

router.post("/me", async (req, res) => {
    try {
        const { moduleToken, deviceId } = req.body;

        const decoded = jwt.verify(moduleToken, process.env.JWT_SECRET);

        if (decoded && decoded.scope === JWT_SCOPE_MODULE) {
            const module = await Module.findOne({ device_id: deviceId });
            if (module) {
                res.status(200).json({ ok: true });
            } else {
                res.status(403).json({ message: "Not Registered" });
            }

            return;
        }

        res.status(401).json({ message: "Not Authorized" });
    } catch (e) {
        console.error("Failed to verify a module", e);
        res.status(500).json({ error: "Server error" });
    }
})

module.exports = router;