const { pool } = require("../db");

/**
 * Run all database migrations (idempotent — safe to run multiple times).
 * Called once on server startup.
 */
const runMigrations = async () => {
  const conn = await pool.getConnection();
  try {
    console.log("Running database migrations...");

    // ── Core tables ──────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS User (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        uid VARCHAR(255) UNIQUE,
        role VARCHAR(20) DEFAULT 'user',
        lastLogin TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS Chat (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        chatId VARCHAR(255) UNIQUE NOT NULL,
        chatTitle VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS Messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chatId VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        text TEXT NOT NULL,
        emotion VARCHAR(50) DEFAULT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS Mood (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        mood VARCHAR(50) NOT NULL,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── New tables ───────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ConversationMemory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chatId VARCHAR(255) NOT NULL,
        summary TEXT NOT NULL,
        emotionTrend VARCHAR(100),
        messageCount INT DEFAULT 0,
        lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_chatId (chatId)
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS FallbackResponses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        emotion VARCHAR(50) NOT NULL,
        response TEXT NOT NULL,
        isActive BOOLEAN DEFAULT true
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS Analytics (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event VARCHAR(255) NOT NULL,
        data JSON NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Safe ALTER TABLE additions (ignore errors if columns exist) ──
    const safeAddColumn = async (table, column, definition) => {
      try {
        await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`  Added ${table}.${column}`);
      } catch (err) {
        if (err.code === "ER_DUP_FIELDNAME") {
          // Column already exists — skip
        } else {
          throw err;
        }
      }
    };

    await safeAddColumn("User", "role", "VARCHAR(20) DEFAULT 'user'");
    await safeAddColumn("User", "password", "VARCHAR(255) NULL");
    await safeAddColumn("User", "lastLogin", "TIMESTAMP NULL");
    await safeAddColumn("User", "createdAt", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    await safeAddColumn("Messages", "emotion", "VARCHAR(50) DEFAULT NULL");
    await safeAddColumn("Messages", "createdAt", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
    await safeAddColumn("Chat", "updatedAt", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");

    // ── Foreign Keys ───────────────────────────────────────────────
    await conn.execute(`
      ALTER TABLE Chat
      ADD CONSTRAINT fk_chat_userId FOREIGN KEY (userId) REFERENCES User(uid)
      ON DELETE CASCADE
    `);

    await conn.execute(`
      ALTER TABLE Messages
      ADD CONSTRAINT fk_messages_chatId FOREIGN KEY (chatId) REFERENCES Chat(chatId)
      ON DELETE CASCADE
    `);

    await conn.execute(`
      ALTER TABLE Mood
      ADD CONSTRAINT fk_mood_userId FOREIGN KEY (userId) REFERENCES User(uid)
      ON DELETE CASCADE
    `);

    await conn.execute(`
      ALTER TABLE ConversationMemory
      ADD CONSTRAINT fk_memory_chatId FOREIGN KEY (chatId) REFERENCES Chat(chatId)
      ON DELETE CASCADE
    `);

    // ── Indexes (safe — CREATE INDEX IF NOT EXISTS not supported in all MySQL versions) ──
    const safeCreateIndex = async (name, table, columns) => {
      try {
        await conn.execute(`CREATE INDEX ${name} ON ${table} (${columns})`);
        console.log(`  Created index ${name}`);
      } catch (err) {
        if (err.code === "ER_DUP_KEYNAME") {
          // Index already exists — skip
        } else {
          throw err;
        }
      }
    };

    await safeCreateIndex("idx_chat_userId", "Chat", "userId");
    await safeCreateIndex("idx_messages_chatId", "Messages", "chatId");
    await safeCreateIndex("idx_mood_userId", "Mood", "userId");
    await safeCreateIndex("idx_user_uid", "User", "uid");
    await safeCreateIndex("idx_memory_chatId", "ConversationMemory", "chatId");

    console.log("Database migrations complete.");
  } catch (err) {
    console.error("Migration error:", err);
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { runMigrations };
