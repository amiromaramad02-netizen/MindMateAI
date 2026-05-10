const { pool } = require("../db");

// Get conversation memory for a chat
const getMemory = async (chatId) => {
  const [rows] = await pool.execute(
    "SELECT summary, emotionTrend, messageCount, lastUpdated FROM ConversationMemory WHERE chatId = ?",
    [chatId]
  );
  return rows[0] || null;
};

// Create or update conversation memory
const upsertMemory = async (chatId, summary, emotionTrend, messageCount) => {
  await pool.execute(
    `INSERT INTO ConversationMemory (chatId, summary, emotionTrend, messageCount)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE summary = VALUES(summary), emotionTrend = VALUES(emotionTrend), messageCount = VALUES(messageCount)`,
    [chatId, summary, emotionTrend, messageCount]
  );
};

// Get recent memories across a user's chats (for cross-chat context)
const getRecentMemories = async (userId, limit = 3) => {
  const [rows] = await pool.execute(
    `SELECT cm.summary, cm.emotionTrend, cm.lastUpdated, c.chatTitle
     FROM ConversationMemory cm
     JOIN Chat c ON cm.chatId = c.chatId
     WHERE c.userId = ?
     ORDER BY cm.lastUpdated DESC
     LIMIT ?`,
    [userId, limit]
  );
  return rows;
};

module.exports = { getMemory, upsertMemory, getRecentMemories };
