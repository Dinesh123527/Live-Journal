
const db = require('../db');

// POST /api/reminders
async function createReminder(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, remind_at, event_id, repeat_rule, channel } = req.body;
    if (!title || !remind_at) {
      return res.status(400).json({ error: 'title and remind_at required' });
    }

    const [result] = await db.query(
      `INSERT INTO reminders (user_id, event_id, title, remind_at, repeat_rule, channel)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        event_id || null,
        title,
        remind_at,
        repeat_rule || 'none',
        channel || 'in_app',
      ]
    );

    const [rows] = await db.query('SELECT * FROM reminders WHERE id = ?', [result.insertId]);
    res.status(201).json({ reminder: rows[0] });
  } catch (err) {
    console.error('createReminder error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/reminders/upcoming?days=7
async function getUpcomingReminders(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const days = Number(req.query.days || 7);
    const [rows] = await db.query(
      `SELECT *
       FROM reminders
       WHERE user_id = ?
         AND is_active = 1
         AND remind_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL ? DAY)
       ORDER BY remind_at ASC`,
      [userId, days]
    );

    res.json({ reminders: rows });
  } catch (err) {
    console.error('getUpcomingReminders error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /api/reminders/:id
async function deleteReminder(req, res) {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await db.query(
      'SELECT id FROM reminders WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Reminder not found' });

    await db.query('DELETE FROM reminders WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteReminder error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  createReminder,
  getUpcomingReminders,
  deleteReminder,
};
