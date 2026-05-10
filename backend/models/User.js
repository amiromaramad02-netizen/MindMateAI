const { pool } = require("../db");

// ── Create or update user on login ──────────────────────────────
const createUser = async (name, email, uid, password = null) => {
  const [result] = await pool.execute(
    `INSERT INTO User (name, email, uid, password) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), lastLogin = NOW()`,
    [name, email, uid, password]
  );
  return result.insertId;
};

// ── Find user by Firebase UID ───────────────────────────────────
const findByUid = async (uid) => {
  const [rows] = await pool.execute(
    "SELECT id, name, email, uid, role, lastLogin, createdAt FROM User WHERE uid = ?",
    [uid]
  );
  return rows[0] || null;
};

// ── Find user by email ──────────────────────────────────────────
const findByEmail = async (email) => {
  const [rows] = await pool.execute(
    "SELECT id, name, email, uid, role, password, lastLogin, createdAt FROM User WHERE email = ?",
    [email]
  );
  return rows[0] || null;
};

// ── Update last login timestamp ─────────────────────────────────
const updateLastLogin = async (uid) => {
  await pool.execute("UPDATE User SET lastLogin = NOW() WHERE uid = ?", [uid]);
};

// ── Get all users (admin) ───────────────────────────────────────
const getAllUsers = async () => {
  const [rows] = await pool.execute(
    "SELECT id, name, email, uid, role, lastLogin, createdAt FROM User ORDER BY createdAt DESC"
  );
  return rows;
};

// ── Update user role (admin) ────────────────────────────────────
const updateUserRole = async (uid, role) => {
  await pool.execute("UPDATE User SET role = ? WHERE uid = ?", [role, uid]);
};

// ── Profile Updates ─────────────────────────────────────────────
const updateProfile = async (uid, { name, bio, profilePic }) => {
  await pool.execute(
    "UPDATE User SET name = ?, bio = ?, profilePic = ? WHERE uid = ?",
    [name, bio, profilePic, uid]
  );
};

// ── Preferences ─────────────────────────────────────────────────
const getPreferences = async (uid) => {
  const [rows] = await pool.execute(
    "SELECT * FROM UserPreferences WHERE userId = ?",
    [uid]
  );
  if (rows.length === 0) {
    // Return default values if not set
    return { theme: 'dark', toneMode: 'normal', notifications: true, saveHistory: true };
  }
  return rows[0];
};

const updatePreferences = async (uid, prefs) => {
  const { theme, toneMode, notifications, saveHistory } = prefs;
  await pool.execute(
    `INSERT INTO UserPreferences (userId, theme, toneMode, notifications, saveHistory)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
     theme = VALUES(theme), toneMode = VALUES(toneMode), 
     notifications = VALUES(notifications), saveHistory = VALUES(saveHistory)`,
    [uid, theme, toneMode, notifications, saveHistory]
  );
};

const deleteUser = async (uid) => {
  await pool.execute("DELETE FROM User WHERE uid = ?", [uid]);
};

module.exports = { 
  createUser, 
  findByUid, 
  findByEmail, 
  updateLastLogin, 
  getAllUsers, 
  updateUserRole,
  updateProfile,
  getPreferences,
  updatePreferences,
  deleteUser
};