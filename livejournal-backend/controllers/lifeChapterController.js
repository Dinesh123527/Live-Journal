require('dotenv').config();
const db = require('../db');

/**
 * CREATE LIFE CHAPTER
 * POST /api/life-chapters
 */
async function createLifeChapter(req, res) {
    try {
        const userId = req.user.id;
        const { title, description, start_date, end_date, is_active = 1 } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }

        // Helper to format date as YYYY-MM-DD for DATE column storage
        const formatDateForDB = (dateStr) => {
            if (!dateStr) return null;
            // If it's already in YYYY-MM-DD format, use it directly
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr;
            }
            // Otherwise extract just the date part
            return dateStr.substring(0, 10);
        };

        const formattedStartDate = formatDateForDB(start_date);
        const formattedEndDate = formatDateForDB(end_date);

        if (formattedStartDate && isNaN(new Date(formattedStartDate).getTime())) {
            return res.status(400).json({ error: 'Invalid start_date format' });
        }

        if (formattedEndDate && isNaN(new Date(formattedEndDate).getTime())) {
            return res.status(400).json({ error: 'Invalid end_date format' });
        }

        // If creating an active chapter → deactivate previous active one
        if (is_active) {
            await db.query(
                `UPDATE life_chapters SET is_active = 0 
         WHERE user_id = ? AND is_active = 1`,
                [userId]
            );
        }

        const [result] = await db.query(
            `INSERT INTO life_chapters 
       (user_id, title, description, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                title,
                description || null,
                formattedStartDate,
                formattedEndDate,
                is_active ? 1 : 0
            ]
        );

        const [rows] = await db.query(
            'SELECT * FROM life_chapters WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Life chapter created successfully',
            chapter: rows[0]
        });

    } catch (err) {
        console.error('createLifeChapter error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * LIST ALL LIFE CHAPTERS
 * GET /api/life-chapters
 */
async function listLifeChapters(req, res) {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `SELECT * FROM life_chapters
       WHERE user_id = ?
       ORDER BY 
         is_active DESC,
         start_date DESC,
         created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            count: rows.length,
            data: rows
        });

    } catch (err) {
        console.error('listLifeChapters error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * GET SINGLE LIFE CHAPTER
 * GET /api/life-chapters/:id
 */
async function getLifeChapter(req, res) {
    try {
        const userId = req.user.id;
        const chapterId = req.params.id;

        const [rows] = await db.query(
            `SELECT * FROM life_chapters 
       WHERE id = ? AND user_id = ?`,
            [chapterId, userId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Life chapter not found' });
        }

        res.json({
            success: true,
            chapter: rows[0]
        });

    } catch (err) {
        console.error('getLifeChapter error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * UPDATE LIFE CHAPTER
 * PUT /api/life-chapters/:id
 */
async function updateLifeChapter(req, res) {
    try {
        const userId = req.user.id;
        const chapterId = req.params.id;
        const { title, description, start_date, end_date, is_active } = req.body;

        // Helper to format date as YYYY-MM-DD for DATE column storage
        const formatDateForDB = (dateStr) => {
            if (!dateStr) return null;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return dateStr;
            }
            return dateStr.substring(0, 10);
        };

        const [existing] = await db.query(
            `SELECT * FROM life_chapters WHERE id = ? AND user_id = ?`,
            [chapterId, userId]
        );

        if (!existing.length) {
            return res.status(404).json({ error: 'Life chapter not found' });
        }

        // If setting this chapter active → deactivate others
        if (is_active === 1) {
            await db.query(
                `UPDATE life_chapters SET is_active = 0
         WHERE user_id = ? AND id != ?`,
                [userId, chapterId]
            );
        }

        const formattedStartDate = formatDateForDB(start_date);
        const formattedEndDate = formatDateForDB(end_date);

        await db.query(
            `UPDATE life_chapters SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        start_date = COALESCE(?, start_date),
        end_date = COALESCE(?, end_date),
        is_active = COALESCE(?, is_active)
       WHERE id = ? AND user_id = ?`,
            [
                title ?? null,
                description ?? null,
                formattedStartDate,
                formattedEndDate,
                typeof is_active === 'number' ? is_active : null,
                chapterId,
                userId
            ]
        );

        const [updated] = await db.query(
            'SELECT * FROM life_chapters WHERE id = ?',
            [chapterId]
        );

        res.json({
            success: true,
            message: 'Life chapter updated successfully',
            chapter: updated[0]
        });

    } catch (err) {
        console.error('updateLifeChapter error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * CLOSE LIFE CHAPTER
 * POST /api/life-chapters/:id/close
 */
async function closeLifeChapter(req, res) {
    try {
        const userId = req.user.id;
        const chapterId = req.params.id;

        const [existing] = await db.query(
            `SELECT * FROM life_chapters WHERE id = ? AND user_id = ?`,
            [chapterId, userId]
        );

        if (!existing.length) {
            return res.status(404).json({ error: 'Life chapter not found' });
        }

        await db.query(
            `UPDATE life_chapters 
       SET is_active = 0, end_date = CURDATE()
       WHERE id = ? AND user_id = ?`,
            [chapterId, userId]
        );

        res.json({
            success: true,
            message: 'Life chapter closed successfully'
        });

    } catch (err) {
        console.error('closeLifeChapter error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

/**
 * DELETE LIFE CHAPTER
 * DELETE /api/life-chapters/:id
 */
async function deleteLifeChapter(req, res) {
    try {
        const userId = req.user.id;
        const chapterId = req.params.id;

        const [existing] = await db.query(
            `SELECT id FROM life_chapters WHERE id = ? AND user_id = ?`,
            [chapterId, userId]
        );

        if (!existing.length) {
            return res.status(404).json({ error: 'Life chapter not found' });
        }

        await db.query(
            'DELETE FROM life_chapters WHERE id = ? AND user_id = ?',
            [chapterId, userId]
        );

        res.json({
            success: true,
            message: 'Life chapter deleted successfully'
        });

    } catch (err) {
        console.error('deleteLifeChapter error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

module.exports = {
    createLifeChapter,
    listLifeChapters,
    getLifeChapter,
    updateLifeChapter,
    closeLifeChapter,
    deleteLifeChapter
};