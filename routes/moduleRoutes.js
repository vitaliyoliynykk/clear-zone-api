const express = require("express");

const Module = require("../models/Module");

const router = express.Router();

router.post("/link/:moduleId", async (req, res) => {
  try {
    const { moduleId } = req.params;
    const module = await Module.findOne({ device_id: moduleId });

    if (!module) {
      return res.status(404).json({ message: "Module not found" });
    }

    if (module.owner_id) {
      return res
        .status(400)
        .json({ message: "Module has already been linked" });
    }

    module.owner_id = req.user.id;
    await module.save();

    res.status(200).json({ message: "Module linked successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/all", async (req, res) => {
  try {
    const modules = await Module.find({ owner_id: req.user.id });

    res.status(200).json(modules);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:moduleId", async (req, res) => {
  try {
    const { moduleId } = req.params;

    const modules = await Module.findOneAndDelete({
      owner_id: req.user.id,
      device_id: moduleId,
    });

    res.status(200).json(modules);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
