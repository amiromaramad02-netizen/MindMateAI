const express = require("express");
const router = express.Router();
const { saveMood, getMoodsByUser } = require("../models/Mood");

// Save user mood
router.post("/", async (req, res) => {
  try {
    const userId = req.user.uid; // From JWT middleware
    const { mood } = req.body;

    if (!mood) {
      return res.status(400).json({ error: "Mood is required." });
    }

    await saveMood(userId, mood);

    res.status(201).json({ success: true, data: { message: "Mood saved successfully." } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user mood history
router.get("/history", async (req, res) => {
  try {
    const userId = req.user.uid; // From JWT middleware
    const moods = await getMoodsByUser(userId);
    res.json({ success: true, data: moods });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;