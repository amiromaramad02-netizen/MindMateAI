const { pool } = require("../db");

async function logAnalytics(event, data) {
  try {
    const conn = await pool.getConnection();
    await conn.execute(
      `INSERT INTO Analytics (event, data, createdAt) VALUES (?, ?, NOW())`,
      [event, JSON.stringify(data)]
    );
    conn.release();
  } catch (err) {
    console.error("Failed to log analytics:", err);
  }
}

module.exports = { logAnalytics };