const { pool } = require('../db');

let globalSettings = {};

/**
 * Load all settings from the database into memory.
 * Should be called on server boot and when settings are updated.
 */
async function loadSettings() {
  try {
    const [rows] = await pool.execute("SELECT * FROM SystemSettings");
    const newSettings = {};
    rows.forEach(row => {
      newSettings[row.settingKey] = row.settingValue;
    });
    globalSettings = newSettings;
    console.log("[Settings] Loaded global settings successfully.");
  } catch (error) {
    console.error("[Settings] Error loading global settings:", error);
  }
}

/**
 * Get a specific setting by key. Returns default if not found.
 */
function getSetting(key, defaultValue = null) {
  return globalSettings[key] !== undefined ? globalSettings[key] : defaultValue;
}

/**
 * Update a specific setting in the database and reload memory cache.
 */
async function updateSetting(key, value) {
  try {
    await pool.execute(
      "INSERT INTO SystemSettings (settingKey, settingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE settingValue = ?",
      [key, value, value]
    );
    globalSettings[key] = value;
    return true;
  } catch (error) {
    console.error(`[Settings] Error updating setting ${key}:`, error);
    return false;
  }
}

/**
 * Update multiple settings at once.
 */
async function updateMultipleSettings(settingsObj) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const [key, value] of Object.entries(settingsObj)) {
      await connection.execute(
        "INSERT INTO SystemSettings (settingKey, settingValue) VALUES (?, ?) ON DUPLICATE KEY UPDATE settingValue = ?",
        [key, String(value), String(value)]
      );
      globalSettings[key] = String(value);
    }
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    console.error("[Settings] Error updating multiple settings:", error);
    return false;
  } finally {
    connection.release();
  }
}

/**
 * Get all current loaded settings.
 */
function getAllSettings() {
  return { ...globalSettings };
}

module.exports = {
  loadSettings,
  getSetting,
  updateSetting,
  updateMultipleSettings,
  getAllSettings
};
