const { pool } = require("../db");

const addMessage = async (chatId, role, text, emotion = null) => {
  const [result] = await pool.execute(
    "INSERT INTO Messages (chatId, role, text, emotion) VALUES (?, ?, ?, ?)",
    [chatId, role, text, emotion]
  );
  return result.insertId;
};

const getMessagesByChatId = async (chatId) => {
  const [rows] = await pool.execute(
    "SELECT id, role, text AS content, emotion, createdAt AS timestamp FROM Messages WHERE chatId = ? ORDER BY id ASC",
    [chatId]
  );
  return rows;
};

const getMessageCount = async (chatId) => {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) as count FROM Messages WHERE chatId = ?",
    [chatId]
  );
  return rows[0].count;
};

const getRecentMessages = async (chatId, limit = 10) => {
  const [rows] = await pool.execute(
    `SELECT role, text, emotion, createdAt FROM Messages WHERE chatId = ? ORDER BY id DESC LIMIT ${Number(limit)}`,
    [chatId]
  );
  return rows.reverse();
};

// Search messages across a user's chats
const searchMessages = async (userId, query) => {
  const [rows] = await pool.execute(
    `SELECT m.text AS content, m.role, m.createdAt AS timestamp, c.chatId, c.chatTitle
     FROM Messages m
     JOIN Chat c ON m.chatId = c.chatId
     WHERE c.userId = ? AND m.text LIKE ?
     ORDER BY m.createdAt DESC
     LIMIT 50`,
    [userId, `%${query}%`]
  );
  return rows;
};

const updateMessage = async (messageId, text) => {
  await pool.execute(
    "UPDATE Messages SET text = ? WHERE id = ?",
    [text, messageId]
  );
};

const deleteMessagesAfter = async (chatId, messageId) => {
  await pool.execute(
    "DELETE FROM Messages WHERE chatId = ? AND id > ?",
    [chatId, messageId]
  );
};

module.exports = { 
  addMessage, 
  getMessagesByChatId, 
  getMessageCount, 
  getRecentMessages, 
  searchMessages,
  updateMessage,
  deleteMessagesAfter
};
