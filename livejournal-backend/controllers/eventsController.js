const db = require('../db');

// Helper to ensure dates
function normalizeDateRange(from, to) {
  if (!from || !to) return null;
  return [from, to];
}

// POST /api/events
async function createEvent(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, start_datetime, end_datetime, all_day } = req.body;
    if (!title || !start_datetime) {
      return res.status(400).json({ error: 'title and start_datetime are required' });
    }

    const [result] = await db.query(
      `INSERT INTO events (user_id, title, description, start_datetime, end_datetime, all_day)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title,
        description || null,
        start_datetime,
        end_datetime || null,
        all_day ? 1 : 0,
      ]
    );

    const [rows] = await db.query('SELECT * FROM events WHERE id = ?', [result.insertId]);
    res.status(201).json({ event: rows[0] });
  } catch (err) {
    console.error('createEvent error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/events?from=YYYY-MM-DD&to=YYYY-MM-DD
async function getEventsInRange(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { from, to } = req.query;
    const range = normalizeDateRange(from, to);
    if (!range) {
      return res.status(400).json({ error: 'from and to query params are required (YYYY-MM-DD)' });
    }

    const [rows] = await db.query(
      `SELECT *
       FROM events
       WHERE user_id = ?
         AND DATE(start_datetime) BETWEEN ? AND ?
       ORDER BY start_datetime ASC`,
      [userId, range[0], range[1]]
    );

    res.json({ events: rows });
  } catch (err) {
    console.error('getEventsInRange error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/events/:id
async function getEventById(req, res) {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await db.query(
      'SELECT * FROM events WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Event not found' });
    res.json({ event: rows[0] });
  } catch (err) {
    console.error('getEventById error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// PUT /api/events/:id
async function updateEvent(req, res) {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, description, start_datetime, end_datetime, all_day } = req.body;

    const [rows] = await db.query(
      'SELECT * FROM events WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Event not found' });

    const event = rows[0];

    const newTitle = title ?? event.title;
    const newDescription = description ?? event.description;
    const newStart = start_datetime ?? event.start_datetime;
    const newEnd = end_datetime ?? event.end_datetime;
    const newAllDay = typeof all_day === 'boolean' ? (all_day ? 1 : 0) : event.all_day;

    await db.query(
      `UPDATE events
       SET title = ?, description = ?, start_datetime = ?, end_datetime = ?, all_day = ?
       WHERE id = ? AND user_id = ?`,
      [newTitle, newDescription, newStart, newEnd, newAllDay, id, userId]
    );

    const [updated] = await db.query('SELECT * FROM events WHERE id = ?', [id]);
    res.json({ event: updated[0] });
  } catch (err) {
    console.error('updateEvent error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// DELETE /api/events/:id
async function deleteEvent(req, res) {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [rows] = await db.query(
      'SELECT id FROM events WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Event not found' });

    await db.query('DELETE FROM events WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteEvent error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  createEvent,
  getEventsInRange,
  getEventById,
  updateEvent,
  deleteEvent,
};
