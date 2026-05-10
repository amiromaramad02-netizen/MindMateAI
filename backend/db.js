const mysql = require("mysql2/promise");

const poolOptions = process.env.DATABASE_URL
  ? { uri: process.env.DATABASE_URL }
  : {
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "mindmate",
    };

const pool = mysql.createPool({
  ...poolOptions,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000, // 10 seconds
});

const testConnection = async () => {
  let retries = 5;
  while (retries) {
    try {
      const connection = await pool.getConnection();
      console.log("MySQL Database Connected");
      connection.release();
      break;
    } catch (err) {
      retries -= 1;
      if (!retries) {
        throw new Error(`MySQL connection failed after retries: ${err.message}`);
      }
      await new Promise((res) => setTimeout(res, 5000)); // Wait 5 seconds before retrying
    }
  }
};

module.exports = { pool, testConnection };
