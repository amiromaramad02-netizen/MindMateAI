const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { pool } = require('../db');

router.post('/ticket', verifyToken, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, error: "Subject and message are required." });
    }

    await pool.execute(
      "INSERT INTO SupportTickets (userId, subject, message) VALUES (?, ?, ?)",
      [req.user.uid, subject, message]
    );

    res.json({ success: true, message: "Support ticket submitted successfully. We will get back to you soon!" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
