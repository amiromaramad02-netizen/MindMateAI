const { pool } = require("../db");

const saveMood = async (userId, mood) => {
  const [result] = await pool.execute(
    "INSERT INTO Mood (userId, mood) VALUES (?, ?)",
    [userId, mood]
  );
  return result.insertId;
};

const getMoodsByUser = async (userId) => {
  const [rows] = await pool.execute(
    "SELECT id, mood, date FROM Mood WHERE userId = ? ORDER BY date DESC",
    [userId]
  );
  return rows;
};

module.exports = { saveMood, getMoodsByUser };