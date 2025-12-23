require('dotenv').config();
const db = require('../db');
const { updateUserStreak } = require('../utils/streakCalculator');
const { moodToCategory } = require('./gardenController');
let analyzeMoodForText = null;

// Try to load optional AI util (safe if missing)
try {
  const ai = require('../utils/ai');
  if (typeof ai.analyzeMoodForText === 'function') analyzeMoodForText = ai.analyzeMoodForText;
} catch (e) {
  console.error('AI mood analysis module not found, skipping mood analysis.');
}

const sanitize = (v) => (v === undefined ? null : v);

function normalizeTags(tags) {
  if (tags === undefined || tags === null) return null;
  if (Array.isArray(tags)) return JSON.stringify(tags);
  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch (e) {
      // not JSON: split by commas
      const arr = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      return JSON.stringify(arr);
    }
  }
  // fallback
  return null;
}

// rounding helper (2 digits now)
function roundScore(v, digits = 2) {
  if (v === null || v === undefined) return v;
  const n = Number(v);
  if (!isFinite(n)) return v;
  const pow = Math.pow(10, digits);
  return Math.round(n * pow) / pow;
}

// LIST entries (GET /api/entries)
async function listEntries(req, res) {
  try {
    const userId = req.user.id;
    const {
      page = 1, limit = 20, start, end, mood, tag, q
    } = req.query;

    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

    let where = 'WHERE user_id = ?';
    const params = [userId];

    if (start) {
      where += ' AND created_at >= ?';
      params.push(start);
    }
    if (end) {
      where += ' AND created_at <= ?';
      params.push(end + ' 23:59:59');
    }
    if (mood) {
      where += ' AND mood_label = ?';
      params.push(mood);
    }
    if (tag) {
      // JSON_CONTAINS(tags, '"tag"')
      where += ' AND JSON_CONTAINS(tags, ?)';
      params.push(JSON.stringify(tag));
    }
    if (q) {
      // basic search in title/body (use LIKE). For production, add FULLTEXT index.
      where += ' AND (title LIKE ? OR body LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like);
    }

    const [rows] = await db.query(
      `SELECT id, title, body, mood_label, mood_score, tags, is_private, created_at, updated_at
       FROM entries ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), Number(offset)]
    );

    // Round scores for response (2 decimals)
    for (const r of rows) {
      if (r.mood_score !== null && r.mood_score !== undefined) {
        r.mood_score = roundScore(r.mood_score, 2);
      }
    }

    res.json({ data: rows });
  } catch (err) {
    console.error('listEntries error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET single entry (GET /api/entries/:id)
async function getEntry(req, res) {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const [rows] = await db.query('SELECT * FROM entries WHERE id = ? AND user_id = ?', [id, userId]);
    if (!rows.length) return res.status(404).json({ error: 'Entry not found' });

    const entry = rows[0];
    if (entry.mood_score !== null && entry.mood_score !== undefined) {
      entry.mood_score = roundScore(entry.mood_score, 2);
    }

    res.json(entry);
  } catch (err) {
    console.error('getEntry error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// CREATE entry (POST /api/entries)
async function createEntry(req, res) {
  try {
    const userId = req.user.id;
    const { title, body, tags, is_private = 1 } = req.body;
    if (!body) return res.status(400).json({ error: 'body is required' });

    // Check duplicate — same user, same title, same body
    const [dups] = await db.query('SELECT id FROM entries WHERE user_id = ? AND title = ? AND body = ?', [
      userId,
      title || null,
      body,
    ]);
    if (dups.length) {
      // As requested: return status code 200 with message
      return res.status(200).json({ status: 200, message: 'Entry already exists' });
    }

    let mood_label = null;
    let mood_score = null;
    let analysis = null;

    // optional mood analysis (non-blocking failure allowed)
    if (analyzeMoodForText) {
      try {
        analysis = await analyzeMoodForText(body);
        if (analysis) {
          mood_label = analysis.mood_label ?? null;
          // round score immediately for storage/consistency (2 decimals)
          mood_score = typeof analysis.mood_score !== 'undefined' && analysis.mood_score !== null
            ? roundScore(analysis.mood_score, 2)
            : null;

          // make sure analysis returned also uses rounded score for response
          if (analysis.mood_score !== undefined && analysis.mood_score !== null) {
            analysis.mood_score = roundScore(analysis.mood_score, 2);
          }
        }
      } catch (e) {
        console.warn('mood analysis failed', e);
      }
    }

    const tagsJson = normalizeTags(tags);

    const [result] = await db.query(
      'INSERT INTO entries (user_id, title, body, mood_label, mood_score, tags, is_private) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, sanitize(title), body, mood_label, mood_score, tagsJson, is_private ? 1 : 0]
    );

    const insertedId = result.insertId;
    const [rows] = await db.query('SELECT * FROM entries WHERE id = ?', [insertedId]);

    if (rows[0].mood_score !== null && rows[0].mood_score !== undefined) {
      rows[0].mood_score = roundScore(rows[0].mood_score, 2);
    }

    // Update writing streak in real-time (non-blocking)
    updateUserStreak(userId).catch(err => {
      console.error('Failed to update streak:', err);
      // Don't fail the request if streak update fails
    });

    // Auto-plant a flower in the garden based on entry mood (non-blocking)
    if (mood_label) {
      plantFlowerForEntry(userId, insertedId, mood_label).catch(err => {
        console.error('Failed to plant garden flower:', err);
        // Don't fail the request if garden planting fails
      });
    }

    res.status(201).json({ entry: rows[0], analysis });
  } catch (err) {
    console.error('createEntry error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Helper: Plant a flower in the user's garden when they create an entry
 */
async function plantFlowerForEntry(userId, entryId, moodLabel) {
  try {
    // Get or create garden
    const [gardens] = await db.query(`SELECT * FROM user_gardens WHERE user_id = ?`, [userId]);
    let garden;

    if (gardens.length === 0) {
      await db.query(`INSERT INTO user_gardens (user_id) VALUES (?)`, [userId]);
      const [newGarden] = await db.query(`SELECT * FROM user_gardens WHERE user_id = ?`, [userId]);
      garden = newGarden[0];
    } else {
      garden = gardens[0];
    }

    // Determine plant category from mood
    const category = moodToCategory(moodLabel);

    // Get available plants for this category (weighted by rarity)
    const [availablePlants] = await db.query(
      `SELECT * FROM garden_plant_types WHERE category = ?`,
      [category]
    );

    if (availablePlants.length === 0) {
      console.log(`No plants found for category: ${category}`);
      return;
    }

    // Weighted random selection based on rarity
    const weights = { common: 60, uncommon: 25, rare: 10, legendary: 5 };
    const weightedPlants = [];
    availablePlants.forEach(plant => {
      const weight = weights[plant.rarity] || 10;
      for (let i = 0; i < weight; i++) {
        weightedPlants.push(plant);
      }
    });

    const selectedPlant = weightedPlants[Math.floor(Math.random() * weightedPlants.length)];

    // Calculate grid position
    const posX = garden.total_plants % 10;
    const posY = Math.floor(garden.total_plants / 10);

    // Insert the plant
    await db.query(
      `INSERT INTO garden_plants (user_id, plant_type_id, entry_id, position_x, position_y) VALUES (?, ?, ?, ?, ?)`,
      [userId, selectedPlant.id, entryId, posX, posY]
    );

    // Update garden stats
    const newXp = garden.total_xp + selectedPlant.xp_value;
    await db.query(
      `UPDATE user_gardens SET total_xp = ?, total_plants = total_plants + 1, updated_at = NOW() WHERE user_id = ?`,
      [newXp, userId]
    );

    console.log(`🌱 Planted ${selectedPlant.name} (${selectedPlant.emoji}) for user ${userId}`);
  } catch (err) {
    console.error('plantFlowerForEntry error:', err);
    throw err;
  }
}

// UPDATE entry (PUT /api/entries/:id)
async function updateEntry(req, res) {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const { title, body, tags, is_private } = req.body;

    // check ownership
    const [existing] = await db.query('SELECT id FROM entries WHERE id = ? AND user_id = ?', [id, userId]);
    if (!existing.length) return res.status(404).json({ error: 'Entry not found' });

    let mood_label = null;
    let mood_score = null;
    let analysis = null;

    if (typeof body !== 'undefined' && analyzeMoodForText) {
      try {
        analysis = await analyzeMoodForText(body);
        if (analysis) {
          mood_label = analysis.mood_label ?? null;
          mood_score = typeof analysis.mood_score !== 'undefined' && analysis.mood_score !== null
            ? roundScore(analysis.mood_score, 2)
            : null;

          if (analysis.mood_score !== undefined && analysis.mood_score !== null) {
            analysis.mood_score = roundScore(analysis.mood_score, 2);
          }
        }
      } catch (e) {
        console.warn('mood analysis failed', e);
      }
    }

    const tagsJson = tags !== undefined ? normalizeTags(tags) : null;

    await db.query(
      `UPDATE entries
       SET title = COALESCE(?, title),
           body = COALESCE(?, body),
           mood_label = COALESCE(?, mood_label),
           mood_score = COALESCE(?, mood_score),
           tags = COALESCE(?, tags),
           is_private = COALESCE(?, is_private)
       WHERE id = ? AND user_id = ?`,
      [
        sanitize(title),
        typeof body !== 'undefined' ? body : null,
        mood_label,
        mood_score,
        tagsJson,
        typeof is_private !== 'undefined' ? (is_private ? 1 : 0) : null,
        id,
        userId
      ]
    );

    const [rows] = await db.query('SELECT * FROM entries WHERE id = ? AND user_id = ?', [id, userId]);
    if (!rows.length) return res.status(404).json({ error: 'Entry not found' });

    if (rows[0].mood_score !== null && rows[0].mood_score !== undefined) {
      rows[0].mood_score = roundScore(rows[0].mood_score, 2);
    }

    res.json({ entry: rows[0], analysis });
  } catch (err) {
    console.error('updateEntry error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE entry (DELETE /api/entries/:id)
async function deleteEntry(req, res) {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const [result] = await db.query('DELETE FROM entries WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Entry not found' });

    // Update writing streak after deletion (non-blocking)
    updateUserStreak(userId).catch(err => {
      console.error('Failed to update streak after deletion:', err);
      // Don't fail the request if streak update fails
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('deleteEntry error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/entries/pinned
 * Get pinned/highlighted entries for dashboard
 */
async function getPinnedEntries(req, res) {
  try {
    const userId = req.user.id;
    const limit = Number(req.query.limit) || 3;

    // For now, return most recent entries with highest mood scores
    // In future, you can add an 'is_pinned' column to entries table
    const [rows] = await db.query(
      `SELECT id, title, body, mood_label, mood_score, tags, created_at, updated_at
       FROM entries 
       WHERE user_id = ? AND mood_score IS NOT NULL
       ORDER BY mood_score DESC, created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    // Round scores
    for (const r of rows) {
      if (r.mood_score !== null && r.mood_score !== undefined) {
        r.mood_score = roundScore(r.mood_score, 2);
      }
    }

    res.json({ data: rows });
  } catch (err) {
    console.error('getPinnedEntries error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/entries/highlights
 * Get all pinned/favorite entries for the dedicated highlights page
 */
async function getHighlights(req, res) {
  try {
    const userId = req.user.id;
    const limit = Number(req.query.limit) || 20;

    // Return top mood entries as highlights
    // TODO: Add 'is_pinned' column to entries table for user-selected highlights
    const [rows] = await db.query(
      `SELECT id, title, body, mood_label, mood_score, tags, is_private, created_at, updated_at
       FROM entries 
       WHERE user_id = ? AND mood_score IS NOT NULL
       ORDER BY mood_score DESC, created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    // Round scores
    for (const r of rows) {
      if (r.mood_score !== null && r.mood_score !== undefined) {
        r.mood_score = roundScore(r.mood_score, 2);
      }
    }

    res.json({ entries: rows });
  } catch (err) {
    console.error('getHighlights error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  listEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  getPinnedEntries,
  getHighlights,
};