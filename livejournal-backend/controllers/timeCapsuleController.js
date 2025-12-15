require('dotenv').config();
const db = require('../db');

async function createTimeCapsule(req, res) {
    try {
        const userId = req.user.id;
        const { title, body, unlock_at, tags, is_private = 1 } = req.body;

        if (!body) {
            return res.status(400).json({ error: 'body is required' });
        }

        if (!unlock_at) {
            return res.status(400).json({ error: 'unlock_at date is required for time capsules' });
        }

        // Validate unlock_at is in the future
        const unlockDate = new Date(unlock_at);
        if (isNaN(unlockDate.getTime())) {
            return res.status(400).json({ error: 'Invalid unlock_at date format' });
        }

        if (unlockDate <= new Date()) {
            return res.status(400).json({ error: 'unlock_at must be a future date' });
        }

        // Normalize tags to JSON
        let tagsJson = null;
        if (tags) {
            if (Array.isArray(tags)) {
                tagsJson = JSON.stringify(tags);
            } else if (typeof tags === 'string') {
                try {
                    tagsJson = JSON.stringify(JSON.parse(tags));
                } catch {
                    tagsJson = JSON.stringify([tags]);
                }
            }
        }

        const [result] = await db.query(
            `INSERT INTO entries (user_id, title, body, tags, is_private, is_time_capsule, unlock_at) 
       VALUES (?, ?, ?, ?, ?, 1, ?)`,
            [userId, title || null, body, tagsJson, is_private ? 1 : 0, unlockDate]
        );

        const insertedId = result.insertId;
        const [rows] = await db.query('SELECT * FROM entries WHERE id = ?', [insertedId]);

        res.status(201).json({
            success: true,
            message: 'Time capsule created! It will unlock on ' + unlockDate.toLocaleDateString(),
            capsule: {
                id: rows[0].id,
                title: rows[0].title,
                unlock_at: rows[0].unlock_at,
                is_locked: true,
                created_at: rows[0].created_at
            }
        });
    } catch (err) {
        console.error('createTimeCapsule error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * List all time capsules for the user
 * GET /api/time-capsule
 */
async function listTimeCapsules(req, res) {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

        const [rows] = await db.query(
            `SELECT id, title, body, tags, is_private, unlock_at, created_at, updated_at,
              CASE WHEN unlock_at <= NOW() THEN 0 ELSE 1 END as is_locked
       FROM entries 
       WHERE user_id = ? AND is_time_capsule = 1
       ORDER BY unlock_at ASC
       LIMIT ? OFFSET ?`,
            [userId, Number(limit), Number(offset)]
        );

        // Hide body content for locked capsules
        const capsules = rows.map(row => {
            if (row.is_locked) {
                return {
                    ...row,
                    body: null, // Hide body for locked capsules
                    preview: '🔒 This time capsule is still locked...'
                };
            }
            return row;
        });

        // Get total count for pagination
        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) as total FROM entries WHERE user_id = ? AND is_time_capsule = 1',
            [userId]
        );

        res.json({
            success: true,
            data: capsules,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (err) {
        console.error('listTimeCapsules error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get a single time capsule (respects lock status)
 * GET /api/time-capsule/:id
 */
async function getTimeCapsule(req, res) {
    try {
        const userId = req.user.id;
        const capsuleId = req.params.id;

        const [rows] = await db.query(
            `SELECT id, title, body, tags, is_private, unlock_at, created_at, updated_at,
              CASE WHEN unlock_at <= NOW() THEN 0 ELSE 1 END as is_locked
       FROM entries 
       WHERE id = ? AND user_id = ? AND is_time_capsule = 1`,
            [capsuleId, userId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Time capsule not found' });
        }

        const capsule = rows[0];

        // If still locked, hide the body content
        if (capsule.is_locked) {
            const unlockDate = new Date(capsule.unlock_at);
            const now = new Date();
            const diffTime = unlockDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return res.json({
                success: true,
                capsule: {
                    id: capsule.id,
                    title: capsule.title,
                    body: null,
                    unlock_at: capsule.unlock_at,
                    is_locked: true,
                    days_remaining: diffDays,
                    message: `🔒 This time capsule will unlock in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
                    created_at: capsule.created_at
                }
            });
        }

        // Capsule is unlocked - return full content
        res.json({
            success: true,
            capsule: {
                ...capsule,
                message: '🔓 Time capsule unlocked!'
            }
        });
    } catch (err) {
        console.error('getTimeCapsule error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get all unlocked time capsules (ready to read)
 * GET /api/time-capsule/unlocked
 */
async function getUnlockedCapsules(req, res) {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `SELECT id, title, body, tags, is_private, unlock_at, created_at, updated_at
       FROM entries 
       WHERE user_id = ? AND is_time_capsule = 1 AND unlock_at <= NOW()
       ORDER BY unlock_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        console.error('getUnlockedCapsules error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

async function deleteTimeCapsule(req, res) {
    try {
        const userId = req.user.id;
        const capsuleId = req.params.id;

        const [existing] = await db.query(
            'SELECT id FROM entries WHERE id = ? AND user_id = ? AND is_time_capsule = 1',
            [capsuleId, userId]
        );

        if (!existing.length) {
            return res.status(404).json({ error: 'Time capsule not found' });
        }

        await db.query('DELETE FROM entries WHERE id = ?', [capsuleId]);

        res.json({
            success: true,
            message: 'Time capsule deleted successfully'
        });
    } catch (err) {
        console.error('deleteTimeCapsule error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    createTimeCapsule,
    listTimeCapsules,
    getTimeCapsule,
    getUnlockedCapsules,
    deleteTimeCapsule
};
