const db = require('../db');

/**
 * Update writing streaks for a user in real-time
 * Called whenever a new entry is created
 */
async function updateUserStreak(userId) {
  try {
    // Get all distinct dates the user has written entries
    const [rows] = await db.query(
      `SELECT DISTINCT DATE(created_at) as d FROM entries WHERE user_id = ? ORDER BY d DESC`,
      [userId]
    );

    const dates = rows.map(r => r.d ? r.d.toISOString().slice(0, 10) : null).filter(Boolean);

    if (dates.length === 0) {
      // No entries, reset streaks
      await db.query(
        `INSERT INTO writing_streaks (user_id, current_streak, longest_streak, last_written_date)
         VALUES (?, 0, 0, NULL)
         ON DUPLICATE KEY UPDATE 
           current_streak = VALUES(current_streak), 
           longest_streak = VALUES(longest_streak), 
           last_written_date = VALUES(last_written_date)`,
        [userId]
      );
      return { current_streak: 0, longest_streak: 0, last_written_date: null };
    }

    // Calculate current streak (consecutive days from today backward)
    let current_streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dateSet = new Set(dates);
    let checkDate = new Date(today);

    // Check if user wrote today or yesterday (streak is still active)
    const todayStr = checkDate.toISOString().slice(0, 10);
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().slice(0, 10);

    // Start checking from today or yesterday
    if (dateSet.has(todayStr)) {
      checkDate = new Date(today);
    } else if (dateSet.has(yesterdayStr)) {
      checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // Streak is broken, reset to 0
      current_streak = 0;
      checkDate = null;
    }

    // Count consecutive days
    if (checkDate) {
      while (dateSet.has(checkDate.toISOString().slice(0, 10))) {
        current_streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Calculate longest streak in history
    let longest_streak = 0;
    let temp_streak = 1;

    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i]);
      const next = new Date(dates[i + 1]);

      // Calculate difference in days
      const diffTime = current - next;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        temp_streak++;
      } else {
        // Streak broken
        longest_streak = Math.max(longest_streak, temp_streak);
        temp_streak = 1;
      }
    }

    // Don't forget to check the last streak
    longest_streak = Math.max(longest_streak, temp_streak);

    // Longest streak should be at least as long as current streak
    longest_streak = Math.max(longest_streak, current_streak);

    const last_written_date = dates[0]; // Most recent date

    // Update the database
    await db.query(
      `INSERT INTO writing_streaks (user_id, current_streak, longest_streak, last_written_date)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         current_streak = VALUES(current_streak), 
         longest_streak = GREATEST(longest_streak, VALUES(longest_streak)), 
         last_written_date = VALUES(last_written_date)`,
      [userId, current_streak, longest_streak, last_written_date]
    );

    return { current_streak, longest_streak, last_written_date };
  } catch (error) {
    console.error('Error updating user streak:', error);
    throw error;
  }
}

/**
 * Get current streak data for a user
 */
async function getUserStreak(userId) {
  try {
    const [rows] = await db.query(
      'SELECT current_streak, longest_streak, last_written_date FROM writing_streaks WHERE user_id = ?',
      [userId]
    );

    if (!rows.length) {
      return { current_streak: 0, longest_streak: 0, last_written_date: null };
    }

    return rows[0];
  } catch (error) {
    console.error('Error getting user streak:', error);
    throw error;
  }
}

module.exports = {
  updateUserStreak,
  getUserStreak
};

