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
        is_time_capsule TINYINT(1) DEFAULT 0,
        unlock_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (user_id),
        INDEX (is_time_capsule),
        INDEX (unlock_at)
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

      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        start_datetime DATETIME NOT NULL,
        end_datetime DATETIME NULL,
        all_day TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (user_id),
        INDEX (start_datetime),
        INDEX (end_datetime)
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        event_id INT NULL,
        title VARCHAR(255) NOT NULL,
        remind_at DATETIME NOT NULL,
        repeat_rule VARCHAR(50) DEFAULT 'none', -- none, daily, weekly, monthly, yearly
        channel VARCHAR(50) DEFAULT 'in_app',   -- in_app for now
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        INDEX (user_id),
        INDEX (remind_at),
        INDEX (is_active)
      );
      
      CREATE TABLE IF NOT EXISTS learning_moments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        text VARCHAR(300) NOT NULL,
        category VARCHAR(50) NULL,
        mood_label VARCHAR(50),
        mood_score FLOAT,
        tags JSON NULL,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_date (user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS life_chapters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(150) NOT NULL,
        description TEXT NULL,
        start_date DATE NOT NULL,
        end_date DATE NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (user_id),
        INDEX (is_active),
        INDEX (start_date),
        INDEX (end_date)
      );

      CREATE TABLE IF NOT EXISTS letters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NULL,
        body TEXT NOT NULL,
        recipient ENUM('past', 'future', 'present') DEFAULT 'future',
        unlock_type ENUM('date', 'life_event', 'immediate') DEFAULT 'date',
        unlock_at DATETIME NULL,
        life_event VARCHAR(50) NULL,
        is_opened TINYINT(1) DEFAULT 0,
        opened_at DATETIME NULL,
        tags JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX (user_id),
        INDEX (unlock_type),
        INDEX (unlock_at),
        INDEX (life_event),
        INDEX (is_opened)
      );

      -- Cache user-specific writing prompts (for AI prompts feature)
      CREATE TABLE IF NOT EXISTS writing_prompts_cache (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        prompts JSON NOT NULL,
        prompt_category VARCHAR(50) NULL,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_prompts (user_id),
        INDEX (user_id),
        INDEX (expires_at)
      );

      -- Store discovered themes per user for personalization
      CREATE TABLE IF NOT EXISTS user_themes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        theme VARCHAR(100) NOT NULL,
        relevance_score FLOAT DEFAULT 0.5,
        occurrences INT DEFAULT 1,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_theme (user_id, theme),
        INDEX (user_id),
        INDEX (relevance_score)
      );

      -- Memory Roulette: reactions when users revisit entries
      CREATE TABLE IF NOT EXISTS memory_reactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        entry_id INT NOT NULL,
        reaction_type ENUM('remember', 'grown', 'relevant') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_entry_reaction (user_id, entry_id),
        INDEX (user_id),
        INDEX (entry_id),
        INDEX (reaction_type)
      );

      -- Memory Roulette: achievements tracking
      CREATE TABLE IF NOT EXISTS roulette_achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        achievement_type VARCHAR(50) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSON NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_achievement (user_id, achievement_type),
        INDEX (user_id),
        INDEX (achievement_type)
      );

      -- Gratitude Garden: plant type definitions
      CREATE TABLE IF NOT EXISTS garden_plant_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL,
        emoji VARCHAR(20) NOT NULL,
        category ENUM('happy', 'sad', 'calm', 'excited', 'grateful', 'neutral') NOT NULL,
        rarity ENUM('common', 'uncommon', 'rare', 'legendary') DEFAULT 'common',
        description TEXT NULL,
        grow_time_hours INT DEFAULT 24,
        xp_value INT DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Gratitude Garden: user garden metadata
      CREATE TABLE IF NOT EXISTS user_gardens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        level INT DEFAULT 1,
        total_xp INT DEFAULT 0,
        total_plants INT DEFAULT 0,
        current_streak INT DEFAULT 0,
        longest_streak INT DEFAULT 0,
        last_watered_at TIMESTAMP NULL,
        garden_theme ENUM('spring', 'summer', 'autumn', 'winter') DEFAULT 'spring',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_garden (user_id),
        INDEX (user_id),
        INDEX (level)
      );

      -- Gratitude Garden: user's planted flowers
      CREATE TABLE IF NOT EXISTS garden_plants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        plant_type_id INT NOT NULL,
        entry_id INT NULL,
        growth_stage ENUM('seed', 'sprout', 'growing', 'bloomed') DEFAULT 'seed',
        health INT DEFAULT 100,
        position_x INT DEFAULT 0,
        position_y INT DEFAULT 0,
        planted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        bloomed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (plant_type_id) REFERENCES garden_plant_types(id) ON DELETE CASCADE,
        FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE SET NULL,
        INDEX (user_id),
        INDEX (plant_type_id),
        INDEX (growth_stage),
        INDEX (health)
      );

      -- Gratitude Garden: achievements
      CREATE TABLE IF NOT EXISTS garden_achievements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        achievement_type VARCHAR(50) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSON NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_garden_achievement (user_id, achievement_type),
        INDEX (user_id),
        INDEX (achievement_type)
      );
    `;

    await tmpConn.query(createTables);

    // Run migrations to update existing tables
    try {
      // Add 'present' to recipient ENUM and 'immediate' to unlock_type ENUM
      await tmpConn.query(`
        ALTER TABLE letters 
        MODIFY COLUMN recipient ENUM('past', 'future', 'present') DEFAULT 'future',
        MODIFY COLUMN unlock_type ENUM('date', 'life_event', 'immediate') DEFAULT 'date'
      `);
      console.log("✅ Letters table schema updated");
    } catch (migrationErr) {
      // Ignore if columns are already updated
      if (migrationErr.code !== 'ER_DUP_ENTRY') {
        console.log("Migration note:", migrationErr.message);
      }
    }

    // Add reset token columns to users table for password reset
    try {
      // Check if reset_token column exists
      const [columns] = await tmpConn.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'reset_token'
      `, [DB_NAME]);

      if (columns.length === 0) {
        await tmpConn.query(`ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) NULL`);
        await tmpConn.query(`ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL`);
        console.log("✅ Users table reset token columns added");
      } else {
        console.log("✅ Users table reset token columns already exist");
      }
    } catch (migrationErr) {
      console.log("Reset token migration note:", migrationErr.message);
    }

    // Seed Gratitude Garden plant types
    try {
      const [plantTypes] = await tmpConn.query(`SELECT COUNT(*) as count FROM garden_plant_types`);

      if (plantTypes[0].count === 0) {
        const plantTypesData = `
          INSERT INTO garden_plant_types (name, emoji, category, rarity, description, grow_time_hours, xp_value) VALUES
          -- Happy plants
          ('Sunflower', '🌻', 'happy', 'common', 'A bright and cheerful flower that follows the sun', 24, 10),
          ('Rose', '🌹', 'happy', 'uncommon', 'A classic symbol of love and joy', 24, 25),
          ('Cherry Blossom', '🌸', 'happy', 'rare', 'Delicate pink petals that celebrate happiness', 24, 50),
          ('Hibiscus', '🌺', 'happy', 'legendary', 'A tropical treasure of pure joy', 24, 100),
          
          -- Sad plants (calming)
          ('Fern', '🌿', 'sad', 'common', 'A gentle fern that brings peace', 24, 10),
          ('Lavender', '💜', 'sad', 'uncommon', 'Soothing purple blooms for comfort', 24, 25),
          ('Iris', '🪻', 'sad', 'rare', 'A graceful flower representing hope', 24, 50),
          ('Willow', '🍃', 'sad', 'legendary', 'A wise tree that understands sorrow', 24, 100),
          
          -- Calm plants
          ('Clover', '🍀', 'calm', 'common', 'A lucky charm for peaceful days', 24, 10),
          ('Lotus', '🪷', 'calm', 'uncommon', 'Symbol of purity and tranquility', 24, 25),
          ('Bamboo', '🎋', 'calm', 'rare', 'Represents strength in flexibility', 24, 50),
          ('Bonsai', '🌳', 'calm', 'legendary', 'Ancient wisdom in miniature form', 24, 100),
          
          -- Excited plants
          ('Tulip', '🌷', 'excited', 'common', 'Vibrant colors bursting with energy', 24, 10),
          ('Daisy', '🌼', 'excited', 'uncommon', 'Simple joy in petal form', 24, 25),
          ('Wheat', '🌾', 'excited', 'rare', 'Abundance and prosperity', 24, 50),
          ('Pine', '🎄', 'excited', 'legendary', 'Evergreen celebration of life', 24, 100),
          
          -- Grateful plants (special golden)
          ('Golden Sprout', '✨', 'grateful', 'common', 'A magical sprout of gratitude', 24, 15),
          ('Star Flower', '🌟', 'grateful', 'uncommon', 'Radiates thankfulness', 24, 30),
          ('Moon Blossom', '💫', 'grateful', 'rare', 'Blooms with cosmic appreciation', 24, 60),
          ('Crown Lily', '👑', 'grateful', 'legendary', 'The rarest flower of deep gratitude', 24, 120),
          
          -- Neutral plants
          ('Grass', '🌱', 'neutral', 'common', 'Simple and steady growth', 24, 10),
          ('Cactus', '🌵', 'neutral', 'uncommon', 'Resilient through all conditions', 24, 25),
          ('Succulent', '🪴', 'neutral', 'rare', 'Thrives with minimal care', 24, 50),
          ('Evergreen', '🌲', 'neutral', 'legendary', 'Eternal and unchanging', 24, 100)
        `;
        await tmpConn.query(plantTypesData);
        console.log("✅ Garden plant types seeded (24 plants)");
      } else {
        console.log("✅ Garden plant types already exist");
      }
    } catch (migrationErr) {
      console.log("Garden plant types seeding note:", migrationErr.message);
    }

    // Add opened_at column to entries table for time capsules
    try {
      const [columns] = await tmpConn.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'entries' AND COLUMN_NAME = 'opened_at'
      `, [DB_NAME]);

      if (columns.length === 0) {
        await tmpConn.query(`ALTER TABLE entries ADD COLUMN opened_at DATETIME NULL`);
        console.log("✅ Entries table opened_at column added");
      } else {
        console.log("✅ Entries table opened_at column already exists");
      }
    } catch (migrationErr) {
      console.log("Opened_at migration note:", migrationErr.message);
    }

    // Backfill opened_at for already-unlocked time capsules
    try {
      const [result] = await tmpConn.query(`
        UPDATE entries 
        SET opened_at = unlock_at 
        WHERE is_time_capsule = 1 
          AND unlock_at <= NOW() 
          AND opened_at IS NULL
      `);
      if (result.affectedRows > 0) {
        console.log(`✅ Backfilled opened_at for ${result.affectedRows} already-unlocked time capsules`);
      }
    } catch (migrationErr) {
      console.log("Opened_at backfill note:", migrationErr.message);
    }

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
