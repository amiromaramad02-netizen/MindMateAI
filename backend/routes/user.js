const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { verifyToken } = require('../middleware/auth');
const { 
  findByUid, 
  updateProfile, 
  getPreferences, 
  updatePreferences, 
  deleteUser 
} = require('../models/User');
const { pool } = require('../db');

// Get full profile + preferences
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const user = await findByUid(req.user.uid);
    const preferences = await getPreferences(req.user.uid);
    
    if (!user) return res.status(404).json({ success: false, error: "User not found" });

    res.json({
      success: true,
      data: {
        profile: {
          name: user.name,
          email: user.email,
          bio: user.bio,
          profilePic: user.profilePic
        },
        preferences
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, bio, profilePic } = req.body;
    await updateProfile(req.user.uid, { name, bio, profilePic });
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update Preferences
router.put('/preferences', verifyToken, async (req, res) => {
  try {
    await updatePreferences(req.user.uid, req.body);
    res.json({ success: true, message: "Preferences updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change Password
router.put('/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await findByUid(req.user.uid);

    if (!user.password) {
      return res.status(400).json({ success: false, error: "Social login accounts cannot change password here." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Current password incorrect." });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.execute("UPDATE User SET password = ? WHERE uid = ?", [hashed, req.user.uid]);

    res.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete Account
router.delete('/', verifyToken, async (req, res) => {
  try {
    await deleteUser(req.user.uid);
    res.clearCookie('mindmate_session', { path: "/" });
    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
