const { pool } = require("../db");

const createChat = async (userId, chatId, chatTitle) => {
  const [result] = await pool.execute(
    "INSERT INTO Chat (userId, chatId, chatTitle) VALUES (?, ?, ?)",
    [userId, chatId, chatTitle]
  );
  return result.insertId;
};

const getChatByChatId = async (chatId) => {
  const [rows] = await pool.execute("SELECT * FROM Chat WHERE chatId = ?", [chatId]);
  return rows[0];
};

/**
 * Get all chats for a user, enriched with the latest message preview.
 * Returns: { chatId, chatTitle, lastMessage, lastMessageRole, updatedAt }
 */
const getChatsByUser = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT
       c.chatId,
       c.chatTitle,
       c.createdAt,
       COALESCE(c.updatedAt, c.createdAt) AS updatedAt,
       lm.text AS lastMessage,
       lm.role AS lastMessageRole
     FROM Chat c
     LEFT JOIN (
       SELECT m1.chatId, m1.text, m1.role
       FROM Messages m1
       INNER JOIN (
         SELECT chatId, MAX(id) AS maxId
         FROM Messages
         GROUP BY chatId
       ) m2 ON m1.chatId = m2.chatId AND m1.id = m2.maxId
     ) lm ON c.chatId = lm.chatId
     WHERE c.userId = ?
     ORDER BY COALESCE(c.updatedAt, c.createdAt) DESC`,
    [userId]
  );
  return rows;
};

/**
 * Update the chat's updatedAt timestamp (call after each new message).
 */
const updateChatTimestamp = async (chatId) => {
  await pool.execute(
    "UPDATE Chat SET updatedAt = CURRENT_TIMESTAMP WHERE chatId = ?",
    [chatId]
  );
};

/**
 * Update the chat title.
 */
const updateChatTitle = async (chatId, title) => {
  await pool.execute(
    "UPDATE Chat SET chatTitle = ? WHERE chatId = ?",
    [title, chatId]
  );
};

const deleteChat = async (chatId, userId) => {
  // Delete messages first (foreign key), then memory, then chat
  await pool.execute("DELETE FROM Messages WHERE chatId = ?", [chatId]);
  await pool.execute("DELETE FROM ConversationMemory WHERE chatId = ?", [chatId]);
  await pool.execute("DELETE FROM Chat WHERE chatId = ? AND userId = ?", [chatId, userId]);
};

module.exports = { createChat, getChatByChatId, getChatsByUser, updateChatTimestamp, updateChatTitle, deleteChat };