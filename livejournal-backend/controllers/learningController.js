const db = require('../db');

// simple categorizer (no AI for now)
function categorizeLearning(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('code') || t.includes('react') || t.includes('bug') || t.includes('deploy')) return 'tech';
  if (t.includes('team') || t.includes('meeting') || t.includes('manager')) return 'work';
  if (t.includes('family') || t.includes('friend') || t.includes('relationship')) return 'relationships';
  if (t.includes('health') || t.includes('sleep') || t.includes('exercise')) return 'health';
  if (t.includes('confidence') || t.includes('fear') || t.includes('stress')) return 'mindset';
  return 'general';
}

// POST /api/learning
// Body: { text, mood_label?, mood_score?, tags?, date? }
async function upsertTodayLearning(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let { text, mood_label, mood_score, tags, date } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    // default date = today (server local)
    const todayIso = new Date().toISOString().slice(0, 10);
    const effectiveDate = date || todayIso;

    let tagsJson = null;
    if (tags) {
      if (Array.isArray(tags)) tagsJson = JSON.stringify(tags);
      else if (typeof tags === 'string') {
        // comma separated
        tagsJson = JSON.stringify(
          tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      }
    }

    const category = categorizeLearning(text);

    const [existingRows] = await db.query(
      `SELECT id FROM learning_moments WHERE user_id = ? AND date = ?`,
      [userId, effectiveDate]
    );

    if (existingRows.length) {
      // update existing for that date
      const id = existingRows[0].id;
      await db.query(
        `UPDATE learning_moments
         SET text = ?, category = ?, mood_label = ?, mood_score = ?, tags = ?
         WHERE id = ?`,
        [
          text.trim(),
          category,
          mood_label || null,
          mood_score != null ? Number(mood_score) : null,
          tagsJson,
          id,
        ]
      );
    } else {
      await db.query(
        `INSERT INTO learning_moments
         (user_id, text, category, mood_label, mood_score, tags, date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          text.trim(),
          category,
          mood_label || null,
          mood_score != null ? Number(mood_score) : null,
          tagsJson,
          effectiveDate,
        ]
      );
    }

    const [rows] = await db.query(
      `SELECT * FROM learning_moments WHERE user_id = ? AND date = ?`,
      [userId, effectiveDate]
    );

    res.status(200).json({
      ok: true,
      learning: rows[0],
    });
  } catch (err) {
    console.error('upsertTodayLearning error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/learning/today
async function getTodayLearning(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await db.query(
      `SELECT * FROM learning_moments WHERE user_id = ? AND date = ?`,
      [userId, today]
    );

    res.json({
      hasLearning: rows.length > 0,
      learning: rows[0] || null,
    });
  } catch (err) {
    console.error('getTodayLearning error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/learning?from=&to=&limit=
async function listLearnings(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { from, to, limit } = req.query;
    const params = [userId];
    let where = 'WHERE user_id = ?';

    if (from && to) {
      where += ' AND date BETWEEN ? AND ?';
      params.push(from, to);
    }

    let sql = `
      SELECT *
      FROM learning_moments
      ${where}
      ORDER BY date DESC, created_at DESC
    `;

    if (limit) {
      sql += ' LIMIT ?';
      params.push(Number(limit));
    }

    const [rows] = await db.query(sql, params);
    res.json({ items: rows });
  } catch (err) {
    console.error('listLearnings error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/learning/streak
async function getLearningStreak(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await db.query(
      `SELECT date FROM learning_moments WHERE user_id = ? ORDER BY date DESC`,
      [userId]
    );

    if (!rows.length) {
      return res.json({
        current_streak: 0,
        longest_streak: 0,
        last_date: null,
      });
    }

    const dates = rows.map((r) => r.date.toISOString().slice(0, 10));

    // longest streak calc
    let longest = 1;
    let currentChain = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const cur = new Date(dates[i]);
      const diff = Math.round((prev - cur) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        currentChain++;
        if (currentChain > longest) longest = currentChain;
      } else {
        currentChain = 1;
      }
    }

    // current streak from today backwards
    const dateSet = new Set(dates);
    let curStreak = 0;
    let cursor = new Date();
    cursor.setHours(0, 0, 0, 0);

    while (dateSet.has(cursor.toISOString().slice(0, 10))) {
      curStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    res.json({
      current_streak: curStreak,
      longest_streak: longest,
      last_date: dates[0],
    });
  } catch (err) {
    console.error('getLearningStreak error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /api/learning/:id
async function deleteLearning(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Learning ID is required' });
    }

    // Check if the learning exists and belongs to the user
    const [existing] = await db.query(
      `SELECT id FROM learning_moments WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    if (!existing.length) {
      return res.status(404).json({ error: 'Learning entry not found' });
    }

    // Delete the learning entry
    await db.query(
      `DELETE FROM learning_moments WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    res.json({ ok: true, message: 'Learning entry deleted successfully' });
  } catch (err) {
    console.error('deleteLearning error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  upsertTodayLearning,
  getTodayLearning,
  listLearnings,
  getLearningStreak,
  deleteLearning,
};
