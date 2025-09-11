const express = require("express");

const User = require("../models/User");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const userResponse = {
      email: user.email,
      id: user._id,
      profilePictureUrl: user.profile_picture_url,
      name: user.name,
    };

    res.status(200).json(userResponse);
  } catch (e) {
    console.error("Failed to find a user", e);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/", async ({ user, body }, res) => {
  let updateQuery = {};

  if (body.name !== undefined) updateQuery.name = body.name;
  if (body.profilePictureUrl !== undefined)
    updateQuery.profile_picture_url = body.profilePictureUrl;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: user.id },
      { $set: updateQuery },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (e) {
    console.error("Failed to update user", e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
