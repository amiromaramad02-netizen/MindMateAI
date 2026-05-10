const express = require("express");
const router = express.Router();
const { requireAdmin } = require("../middleware/auth");
const { getAllUsers, updateUserRole } = require("../models/User");
const { pool } = require("../db");
const settingsManager = require("../services/settingsManager");

// All admin routes require admin role
router.use(requireAdmin);

// ── Dashboard stats ─────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  try {
    const [[{ totalUsers }]] = await pool.execute("SELECT COUNT(*) as totalUsers FROM User");
    const [[{ totalChats }]] = await pool.execute("SELECT COUNT(*) as totalChats FROM Chat");
    const [[{ totalMessages }]] = await pool.execute("SELECT COUNT(*) as totalMessages FROM Messages");
    const [[{ crisisCount }]] = await pool.execute(
      "SELECT COUNT(*) as crisisCount FROM Messages WHERE emotion = 'crisis'"
    );

    res.json({
      success: true,
      data: { totalUsers, totalChats, totalMessages, crisisCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── List all users ──────────────────────────────────────────────
router.get("/users", async (req, res) => {
  try {
    const users = await getAllUsers();
    // Add chat count per user
    for (const user of users) {
      const [[{ count }]] = await pool.execute(
        "SELECT COUNT(*) as count FROM Chat WHERE userId = ?", [user.uid]
      );
      user.chatCount = count;
    }
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── View user's chats ───────────────────────────────────────────
router.get("/users/:uid/chats", async (req, res) => {
  try {
    const [chats] = await pool.execute(
      "SELECT chatId, chatTitle, createdAt FROM Chat WHERE userId = ? ORDER BY createdAt DESC",
      [req.params.uid]
    );
    res.json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Crisis conversations ────────────────────────────────────────
router.get("/crisis", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT DISTINCT c.chatId, c.chatTitle, c.userId, c.createdAt,
        u.name as userName, u.email as userEmail
      FROM Messages m
      JOIN Chat c ON m.chatId = c.chatId
      JOIN User u ON c.userId = u.uid
      WHERE m.emotion = 'crisis'
      ORDER BY m.createdAt DESC
      LIMIT 50
    `);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Update user role ────────────────────────────────────────────
router.put("/users/:uid/role", async (req, res) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({ success: false, error: "Invalid role." });
    }
    await updateUserRole(req.params.uid, role);
    res.json({ success: true, data: { message: "Role updated." } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Manage fallback responses ───────────────────────────────────
router.get("/fallbacks", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT * FROM FallbackResponses ORDER BY emotion, id");
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/fallbacks", async (req, res) => {
  try {
    const { emotion, response } = req.body;
    if (!emotion || !response) {
      return res.status(400).json({ success: false, error: "Emotion and response required." });
    }
    await pool.execute(
      "INSERT INTO FallbackResponses (emotion, response) VALUES (?, ?)",
      [emotion, response]
    );
    res.status(201).json({ success: true, data: { message: "Fallback added." } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/fallbacks/:id", async (req, res) => {
  try {
    await pool.execute("DELETE FROM FallbackResponses WHERE id = ?", [req.params.id]);
    res.json({ success: true, data: { message: "Fallback deleted." } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ── Global System Settings ──────────────────────────────────────
router.get("/settings", (req, res) => {
  const settings = settingsManager.getAllSettings();
  res.json({ success: true, data: settings });
});

router.put("/settings", async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, error: "Invalid settings payload" });
    }

    const success = await settingsManager.updateMultipleSettings(settings);
    
    if (success) {
      res.json({ success: true, message: "Settings updated successfully", data: settingsManager.getAllSettings() });
    } else {
      res.status(500).json({ success: false, error: "Failed to update some settings" });
    }
  } catch (error) {
    console.error("[Admin API] Error updating settings:", error);
    res.status(500).json({ success: false, error: "Server error updating settings" });
  }
});

module.exports = router;
