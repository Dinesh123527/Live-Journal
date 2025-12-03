require("dotenv").config();
const mysql = require("mysql2/promise");

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

console.log("MySQL config:", { DB_HOST, DB_PORT, DB_USER, DB_NAME });

let pool;

async function init() {
  let tmpConn;
  try {
    tmpConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });

    await tmpConn.query(`USE \`${DB_NAME}\`;`);

    await tmpConn.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` 
       CHARACTER SET utf8mb4 
       COLLATE utf8mb4_unicode_ci;`
    );

    const createTables = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(120),
        email VARCHAR(180) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(500) NOT NULL,
        user_agent VARCHAR(500),
        ip VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (user_id)
      );

      CREATE TABLE IF NOT EXISTS entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255),
        body TEXT NOT NULL,
        mood_label VARCHAR(50),
        mood_score FLOAT,
        tags JSON NULL,
        is_private TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS moods_summary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        mood_agg JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_date (user_id, date)
      );

      CREATE TABLE IF NOT EXISTS drafts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NULL,
        body TEXT NULL,
        is_encrypted TINYINT(1) DEFAULT 0,
        encryption_meta JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (user_id),
        INDEX (updated_at)
      );

      CREATE TABLE IF NOT EXISTS draft_versions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        draft_id INT NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(255) NULL,
        body TEXT NULL,
        metadata JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (draft_id),
        INDEX (user_id)
      );

      CREATE TABLE IF NOT EXISTS draft_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        draft_id INT NOT NULL,
        user_id INT NOT NULL,
        filename VARCHAR(512) NULL,
        mime VARCHAR(128) NULL,
        url VARCHAR(1024) NULL,
        size BIGINT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (draft_id) REFERENCES drafts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (draft_id),
        INDEX (user_id)
      );

      CREATE TABLE IF NOT EXISTS entries_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entry_id INT NOT NULL,
        user_id INT NOT NULL,
        filename VARCHAR(512) NULL,
        mime VARCHAR(128) NULL,
        url VARCHAR(1024) NULL,
        size BIGINT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (entry_id),
        INDEX (user_id)
      );

       CREATE TABLE IF NOT EXISTS daily_mood_aggregates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        avg_mood_score FLOAT NULL,
        entries_count INT DEFAULT 0,
        dominant_mood VARCHAR(50) NULL,
        mood_counts JSON NULL,   -- optional map { "happy": 10, "sad": 2 }
        computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_date_aggregates (user_id, date),
        INDEX (user_id),
        INDEX (date),
        INDEX (avg_mood_score)
      );

      -- AI generated insights for a day or date range
      CREATE TABLE IF NOT EXISTS mood_insights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date_from DATE NULL,
        date_to DATE NULL,
        insight_type VARCHAR(100), -- e.g., "daily_summary", "trend", "streaks"
        insights JSON NULL,
        generated_by VARCHAR(100) NULL, -- service name or model id
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_date_range (user_id, date_from, date_to, insight_type),
        INDEX (user_id),
        INDEX (date_from),
        INDEX (date_to)
      );

      -- per-user tag-based mood aggregates (tags vs mood)
      CREATE TABLE IF NOT EXISTS tags_mood_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        tag VARCHAR(150) NOT NULL,
        occurrences INT DEFAULT 0,
        avg_mood_score FLOAT NULL,
        last_seen TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_tag (user_id, tag),
        INDEX (user_id),
        INDEX (tag)
      );

      -- cached trend buckets for faster chart rendering
      CREATE TABLE IF NOT EXISTS mood_trends_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        range_start DATE NOT NULL,
        range_end DATE NOT NULL,
        granularity VARCHAR(20) NOT NULL, -- e.g., "day", "week", "month"
        data JSON NULL, -- time-series array [{ date:"2025-11-01", avg:0.8 }, ...]
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_range_granularity (user_id, range_start, range_end, granularity),
        INDEX (user_id),
        INDEX (range_start),
        INDEX (range_end)
      );

      -- writing streaks (cached for quick dashboard)
      CREATE TABLE IF NOT EXISTS writing_streaks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        last_written_date DATE NULL,
        computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_streak (user_id),
        INDEX (user_id)
      );

      CREATE TABLE IF NOT EXISTS entry_tags (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entry_id INT NOT NULL,
        user_id INT NOT NULL,
        tag VARCHAR(150) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (tag),
        INDEX (entry_id),
        UNIQUE KEY uq_entry_tag (entry_id, tag)
      );
    `;

    await tmpConn.query(createTables);

    await tmpConn.end();

    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log("✅ Database initialized & tables ready");
    return pool;
  } catch (err) {
    if (tmpConn) {
      try {
        await tmpConn.end();
      } catch (e) {
        /* ignore */
      }
    }
    console.error("DB initialization failed:", err);
    throw err;
  }
}

const poolPromise = init();

module.exports = {
  query: async (...args) => {
    const p = await poolPromise;
    return p.query(...args);
  },
  getPool: async () => {
    if (!pool) {
      await poolPromise;
    }
    return pool;
  },
};
