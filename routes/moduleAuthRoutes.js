const express = require("express");
const Module = require("../models/Module");

const router = express.Router();

router.post("/register-module", async (req, res) => {
    const { deviceId, secret } = req.body;

    let registeredModule = await Module.findOne({ device_id: deviceId });

    if (!registeredModule && secret === process.env.MODULE_PROVISION_SECRET) {
        const module = new Module({ device_id: deviceId });
        module.save();

        res.status(200).json({ registerd: true });

        return
    }

    res.status(200).json({ registered: false });
})

module.exports = router;