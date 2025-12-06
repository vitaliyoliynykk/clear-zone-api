const express = require("express");
const Module = require("../models/Module");

const {
  generateModuleToken,
} = require("../utils/generateTokens");

const router = express.Router();

router.post("/register-module", async (req, res) => {
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
})

module.exports = router;