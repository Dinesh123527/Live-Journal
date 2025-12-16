require('dotenv').config();
const db = require('../db');

// Life events that can trigger letter unlock
const LIFE_EVENTS = [
    'birthday',
    'new_year',
    'graduation',
    'got_job',
    'moved_city',
    'got_married',
    'had_baby',
    'milestone_entries'
];

/**
 * Create a new letter to yourself
 * POST /api/letters
 */
async function createLetter(req, res) {
    try {
        const userId = req.user.id;
        const {
            title,
            body,
            recipient = 'future',
            unlock_type = 'date',
            unlock_at,
            life_event,
            tags
        } = req.body;

        if (!body) {
            return res.status(400).json({ error: 'Letter body is required' });
        }

        if (!title || !title.trim()) {
            return res.status(400).json({ error: 'Letter title is required' });
        }

        if (!['present', 'future'].includes(recipient)) {
            return res.status(400).json({ error: 'Recipient must be "present" or "future"' });
        }

        // For "present" letters, skip unlock validation - they're immediately accessible
        const isPresent = recipient === 'present';

        // Validate unlock conditions only for future letters
        if (!isPresent) {
            if (unlock_type === 'date') {
                if (!unlock_at) {
                    return res.status(400).json({ error: 'unlock_at date is required for date-based letters' });
                }
                const unlockDate = new Date(unlock_at);
                if (isNaN(unlockDate.getTime())) {
                    return res.status(400).json({ error: 'Invalid unlock_at date format' });
                }
                if (unlockDate <= new Date()) {
                    return res.status(400).json({ error: 'unlock_at must be a future date' });
                }
            } else if (unlock_type === 'life_event') {
                if (!life_event || !LIFE_EVENTS.includes(life_event)) {
                    return res.status(400).json({
                        error: 'Valid life_event is required for event-based letters',
                        valid_events: LIFE_EVENTS
                    });
                }
            }
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

        // Generate default title based on recipient
        const getDefaultTitle = () => {
            if (recipient === 'future') return 'Dear Future Me';
            if (recipient === 'present') return 'Dear Present Me';
            return 'Dear Me';
        };

        const [result] = await db.query(
            `INSERT INTO letters (user_id, title, body, recipient, unlock_type, unlock_at, life_event, tags, is_opened, opened_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                userId,
                title || getDefaultTitle(),
                body,
                recipient,
                isPresent ? 'immediate' : unlock_type,
                !isPresent && unlock_type === 'date' ? new Date(unlock_at) : null,
                !isPresent && unlock_type === 'life_event' ? life_event : null,
                tagsJson,
                isPresent ? 1 : 0,  // Present letters are immediately opened
                isPresent ? new Date() : null
            ]
        );

        const insertedId = result.insertId;
        const [rows] = await db.query('SELECT * FROM letters WHERE id = ?', [insertedId]);

        // Generate appropriate success message
        let successMessage;
        if (isPresent) {
            successMessage = 'Letter saved! You can read it anytime 🌟';
        } else if (unlock_type === 'date') {
            successMessage = `Letter sealed! It will open on ${new Date(unlock_at).toLocaleDateString()}`;
        } else {
            successMessage = `Letter sealed! It will open when you trigger "${life_event}"`;
        }

        res.status(201).json({
            success: true,
            message: successMessage,
            letter: {
                id: rows[0].id,
                title: rows[0].title,
                recipient: rows[0].recipient,
                unlock_type: rows[0].unlock_type,
                unlock_at: rows[0].unlock_at,
                life_event: rows[0].life_event,
                is_sealed: !isPresent,
                is_opened: isPresent,
                created_at: rows[0].created_at
            }
        });
    } catch (err) {
        console.error('createLetter error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * List all letters for the user
 * GET /api/letters
 */
async function listLetters(req, res) {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, filter = 'all' } = req.query;
        const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

        let filterClause = '';
        if (filter === 'sealed') {
            filterClause = 'AND is_opened = 0';
        } else if (filter === 'opened') {
            filterClause = 'AND is_opened = 1';
        }

        const [rows] = await db.query(
            `SELECT id, title, body, recipient, unlock_type, unlock_at, life_event, 
                    is_opened, opened_at, tags, created_at, updated_at,
             CASE 
               WHEN is_opened = 1 THEN 0
               WHEN unlock_type = 'date' AND unlock_at <= NOW() THEN 0
               ELSE 1 
             END as is_sealed
             FROM letters 
             WHERE user_id = ? ${filterClause}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, Number(limit), Number(offset)]
        );

        // Hide body content for sealed letters
        const letters = rows.map(row => {
            if (row.is_sealed && !row.is_opened) {
                return {
                    ...row,
                    body: null,
                    preview: '✉️ This letter is still sealed...'
                };
            }
            return row;
        });

        // Get total count for pagination
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM letters WHERE user_id = ? ${filterClause.replace('AND', 'AND')}`,
            [userId]
        );

        res.json({
            success: true,
            data: letters,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (err) {
        console.error('listLetters error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get a single letter (respects sealed status)
 * GET /api/letters/:id
 */
async function getLetter(req, res) {
    try {
        const userId = req.user.id;
        const letterId = req.params.id;

        const [rows] = await db.query(
            `SELECT id, title, body, recipient, unlock_type, unlock_at, life_event,
                    is_opened, opened_at, tags, created_at, updated_at,
             CASE 
               WHEN is_opened = 1 THEN 0
               WHEN unlock_type = 'date' AND unlock_at <= NOW() THEN 0
               ELSE 1 
             END as is_sealed
             FROM letters 
             WHERE id = ? AND user_id = ?`,
            [letterId, userId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Letter not found' });
        }

        const letter = rows[0];

        // If still sealed, hide the body content
        if (letter.is_sealed && !letter.is_opened) {
            const response = {
                id: letter.id,
                title: letter.title,
                recipient: letter.recipient,
                body: null,
                unlock_type: letter.unlock_type,
                unlock_at: letter.unlock_at,
                life_event: letter.life_event,
                is_sealed: true,
                created_at: letter.created_at
            };

            if (letter.unlock_type === 'date') {
                const unlockDate = new Date(letter.unlock_at);
                const now = new Date();
                const diffTime = unlockDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                response.days_remaining = diffDays;
                response.message = `✉️ This letter will open in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
            } else {
                response.message = `✉️ This letter will open when you experience: ${letter.life_event}`;
            }

            return res.json({ success: true, letter: response });
        }

        // Letter is ready to open or already opened
        // If date-based and ready but not opened yet, mark as opened
        if (!letter.is_opened && letter.unlock_type === 'date') {
            await db.query(
                'UPDATE letters SET is_opened = 1, opened_at = NOW() WHERE id = ?',
                [letterId]
            );
            letter.is_opened = 1;
            letter.opened_at = new Date();
        }

        res.json({
            success: true,
            letter: {
                ...letter,
                is_sealed: false,
                message: '📬 Letter opened!'
            }
        });
    } catch (err) {
        console.error('getLetter error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get all opened/ready letters
 * GET /api/letters/ready
 */
async function getReadyLetters(req, res) {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `SELECT id, title, body, recipient, unlock_type, unlock_at, life_event,
                    is_opened, opened_at, tags, created_at, updated_at
             FROM letters 
             WHERE user_id = ? 
               AND (is_opened = 1 OR (unlock_type = 'date' AND unlock_at <= NOW()))
             ORDER BY opened_at DESC, unlock_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        console.error('getReadyLetters error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Trigger a life event to unlock letters
 * POST /api/letters/trigger-event
 */
async function triggerLifeEvent(req, res) {
    try {
        const userId = req.user.id;
        const { event } = req.body;

        if (!event || !LIFE_EVENTS.includes(event)) {
            return res.status(400).json({
                error: 'Invalid life event',
                valid_events: LIFE_EVENTS
            });
        }

        // Find and unlock all letters with this life event
        const [result] = await db.query(
            `UPDATE letters 
             SET is_opened = 1, opened_at = NOW() 
             WHERE user_id = ? AND life_event = ? AND is_opened = 0`,
            [userId, event]
        );

        const unlockedCount = result.affectedRows;

        if (unlockedCount === 0) {
            return res.json({
                success: true,
                message: `No sealed letters waiting for "${event}"`,
                unlocked: 0
            });
        }

        // Get the unlocked letters
        const [letters] = await db.query(
            `SELECT id, title, recipient, life_event, opened_at 
             FROM letters 
             WHERE user_id = ? AND life_event = ? AND is_opened = 1
             ORDER BY opened_at DESC
             LIMIT ?`,
            [userId, event, unlockedCount]
        );

        res.json({
            success: true,
            message: `🎉 ${unlockedCount} letter${unlockedCount > 1 ? 's' : ''} unlocked!`,
            unlocked: unlockedCount,
            letters
        });
    } catch (err) {
        console.error('triggerLifeEvent error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Delete a letter
 * DELETE /api/letters/:id
 */
async function deleteLetter(req, res) {
    try {
        const userId = req.user.id;
        const letterId = req.params.id;

        const [existing] = await db.query(
            'SELECT id FROM letters WHERE id = ? AND user_id = ?',
            [letterId, userId]
        );

        if (!existing.length) {
            return res.status(404).json({ error: 'Letter not found' });
        }

        await db.query('DELETE FROM letters WHERE id = ?', [letterId]);

        res.json({
            success: true,
            message: 'Letter deleted successfully'
        });
    } catch (err) {
        console.error('deleteLetter error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * Get available life events
 * GET /api/letters/life-events
 */
async function getLifeEvents(req, res) {
    try {
        res.json({
            success: true,
            events: LIFE_EVENTS.map(event => ({
                id: event,
                label: event.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                description: getEventDescription(event)
            }))
        });
    } catch (err) {
        console.error('getLifeEvents error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

function getEventDescription(event) {
    const descriptions = {
        'birthday': 'Opens on your next birthday',
        'new_year': 'Opens on January 1st',
        'graduation': 'Opens when you graduate',
        'got_job': 'Opens when you get a new job',
        'moved_city': 'Opens when you move to a new city',
        'got_married': 'Opens when you get married',
        'had_baby': 'Opens when you have a baby',
        'milestone_entries': 'Opens after reaching an entry milestone'
    };
    return descriptions[event] || 'Opens on this life event';
}

module.exports = {
    createLetter,
    listLetters,
    getLetter,
    getReadyLetters,
    triggerLifeEvent,
    deleteLetter,
    getLifeEvents
};
