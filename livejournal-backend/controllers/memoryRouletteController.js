const db = require('../db');

/**
 * Achievement definitions
 */
const ACHIEVEMENTS = {
    time_traveler: { name: 'Time Traveler', description: 'Revisited 10 entries', threshold: 10, icon: '🔮' },
    memory_lane_master: { name: 'Memory Lane Master', description: 'Revisited 50 entries', threshold: 50, icon: '🛤️' },
    nostalgia_king: { name: 'Nostalgia Monarch', description: 'Revisited 100 entries', threshold: 100, icon: '👑' },
    year_in_review: { name: 'Year in Review', description: 'Viewed a Same Day Last Year entry', threshold: 1, icon: '📅' },
    growth_mindset: { name: 'Growth Mindset', description: 'Used "I\'ve grown" reaction 10 times', threshold: 10, icon: '🌱' },
    still_me: { name: 'Consistent Soul', description: 'Used "Still relevant" reaction 10 times', threshold: 10, icon: '✨' },
    memory_keeper: { name: 'Memory Keeper', description: 'Used "I remember this!" reaction 10 times', threshold: 10, icon: '💭' },
};

/**
 * Helper to check and unlock achievements
 */
async function checkAndUnlockAchievements(userId) {
    const unlockedNow = [];

    try {
        // Get current stats
        const [reactionsCount] = await db.query(
            `SELECT COUNT(*) as total FROM memory_reactions WHERE user_id = ?`,
            [userId]
        );

        const [reactionsByType] = await db.query(
            `SELECT reaction_type, COUNT(*) as count 
       FROM memory_reactions 
       WHERE user_id = ? 
       GROUP BY reaction_type`,
            [userId]
        );

        const [existingAchievements] = await db.query(
            `SELECT achievement_type FROM roulette_achievements WHERE user_id = ?`,
            [userId]
        );

        const existing = new Set(existingAchievements.map(a => a.achievement_type));
        const reactionCounts = {};
        reactionsByType.forEach(r => { reactionCounts[r.reaction_type] = r.count; });
        const totalRevisits = reactionsCount[0]?.total || 0;

        // Check visit-based achievements
        if (totalRevisits >= 10 && !existing.has('time_traveler')) {
            await db.query(
                `INSERT INTO roulette_achievements (user_id, achievement_type, metadata) VALUES (?, 'time_traveler', ?)`,
                [userId, JSON.stringify({ count: totalRevisits })]
            );
            unlockedNow.push({ ...ACHIEVEMENTS.time_traveler, type: 'time_traveler' });
        }

        if (totalRevisits >= 50 && !existing.has('memory_lane_master')) {
            await db.query(
                `INSERT INTO roulette_achievements (user_id, achievement_type, metadata) VALUES (?, 'memory_lane_master', ?)`,
                [userId, JSON.stringify({ count: totalRevisits })]
            );
            unlockedNow.push({ ...ACHIEVEMENTS.memory_lane_master, type: 'memory_lane_master' });
        }

        if (totalRevisits >= 100 && !existing.has('nostalgia_king')) {
            await db.query(
                `INSERT INTO roulette_achievements (user_id, achievement_type, metadata) VALUES (?, 'nostalgia_king', ?)`,
                [userId, JSON.stringify({ count: totalRevisits })]
            );
            unlockedNow.push({ ...ACHIEVEMENTS.nostalgia_king, type: 'nostalgia_king' });
        }

        // Check reaction-type based achievements
        if ((reactionCounts['grown'] || 0) >= 10 && !existing.has('growth_mindset')) {
            await db.query(
                `INSERT INTO roulette_achievements (user_id, achievement_type, metadata) VALUES (?, 'growth_mindset', ?)`,
                [userId, JSON.stringify({ count: reactionCounts['grown'] })]
            );
            unlockedNow.push({ ...ACHIEVEMENTS.growth_mindset, type: 'growth_mindset' });
        }

        if ((reactionCounts['relevant'] || 0) >= 10 && !existing.has('still_me')) {
            await db.query(
                `INSERT INTO roulette_achievements (user_id, achievement_type, metadata) VALUES (?, 'still_me', ?)`,
                [userId, JSON.stringify({ count: reactionCounts['relevant'] })]
            );
            unlockedNow.push({ ...ACHIEVEMENTS.still_me, type: 'still_me' });
        }

        if ((reactionCounts['remember'] || 0) >= 10 && !existing.has('memory_keeper')) {
            await db.query(
                `INSERT INTO roulette_achievements (user_id, achievement_type, metadata) VALUES (?, 'memory_keeper', ?)`,
                [userId, JSON.stringify({ count: reactionCounts['remember'] })]
            );
            unlockedNow.push({ ...ACHIEVEMENTS.memory_keeper, type: 'memory_keeper' });
        }

    } catch (err) {
        console.error('Error checking achievements:', err);
    }

    return unlockedNow;
}

/**
 * GET /api/memory-roulette/spin?filter=week|month|year|random
 * Spin the roulette to get a random past entry
 */
async function spinRoulette(req, res) {
    try {
        const userId = req.user.id;
        const { filter = 'random' } = req.query;

        let dateCondition = '';
        const now = new Date();

        switch (filter) {
            case 'week':
                // Entries from around 1 week ago (6-8 days ago)
                dateCondition = `AND e.created_at BETWEEN DATE_SUB(NOW(), INTERVAL 8 DAY) AND DATE_SUB(NOW(), INTERVAL 6 DAY)`;
                break;
            case 'month':
                // Entries from around 1 month ago (28-32 days ago)
                dateCondition = `AND e.created_at BETWEEN DATE_SUB(NOW(), INTERVAL 32 DAY) AND DATE_SUB(NOW(), INTERVAL 28 DAY)`;
                break;
            case 'year':
                // Entries from around 1 year ago (360-370 days ago)
                dateCondition = `AND e.created_at BETWEEN DATE_SUB(NOW(), INTERVAL 370 DAY) AND DATE_SUB(NOW(), INTERVAL 360 DAY)`;
                break;
            case 'random':
            default:
                // Any entry older than 1 day
                dateCondition = `AND e.created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)`;
                break;
        }

        // Get a random entry matching the filter
        const [entries] = await db.query(`
      SELECT 
        e.id, e.title, e.body, e.mood_label, e.mood_score, 
        e.tags, e.is_private, e.created_at,
        mr.reaction_type as existing_reaction
      FROM entries e
      LEFT JOIN memory_reactions mr ON e.id = mr.entry_id AND mr.user_id = ?
      WHERE e.user_id = ? 
        AND e.is_time_capsule = 0
        ${dateCondition}
      ORDER BY RAND()
      LIMIT 1
    `, [userId, userId]);

        if (entries.length === 0) {
            // Try to find any older entry if the specific filter has no results
            const [fallbackEntries] = await db.query(`
        SELECT 
          e.id, e.title, e.body, e.mood_label, e.mood_score, 
          e.tags, e.is_private, e.created_at,
          mr.reaction_type as existing_reaction
        FROM entries e
        LEFT JOIN memory_reactions mr ON e.id = mr.entry_id AND mr.user_id = ?
        WHERE e.user_id = ? 
          AND e.is_time_capsule = 0
          AND e.created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)
        ORDER BY RAND()
        LIMIT 1
      `, [userId, userId]);

            if (fallbackEntries.length === 0) {
                return res.status(404).json({
                    message: 'No past entries found. Keep journaling to unlock memories!',
                    empty: true
                });
            }

            return res.json({
                entry: fallbackEntries[0],
                filter: 'random',
                fallback: true,
                message: `No entries from ${filter} ago. Here's a random memory instead!`
            });
        }

        res.json({ entry: entries[0], filter });

    } catch (err) {
        console.error('Spin roulette error:', err);
        res.status(500).json({ message: 'Failed to spin roulette' });
    }
}

/**
 * GET /api/memory-roulette/same-day-last-year
 * Get entry from the same day last year
 */
async function getSameDayLastYear(req, res) {
    try {
        const userId = req.user.id;

        // Get today's date components
        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        // Find entries from same date in previous years
        const [entries] = await db.query(`
      SELECT 
        e.id, e.title, e.body, e.mood_label, e.mood_score, 
        e.tags, e.is_private, e.created_at,
        YEAR(e.created_at) as entry_year,
        mr.reaction_type as existing_reaction
      FROM entries e
      LEFT JOIN memory_reactions mr ON e.id = mr.entry_id AND mr.user_id = ?
      WHERE e.user_id = ? 
        AND e.is_time_capsule = 0
        AND MONTH(e.created_at) = ?
        AND DAY(e.created_at) = ?
        AND YEAR(e.created_at) < YEAR(NOW())
      ORDER BY e.created_at DESC
    `, [userId, userId, month, day]);

        if (entries.length === 0) {
            return res.json({
                entries: [],
                message: `No entries found from ${today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} in previous years.`,
                empty: true
            });
        }

        // Check for year_in_review achievement
        const [existingAchievement] = await db.query(
            `SELECT id FROM roulette_achievements WHERE user_id = ? AND achievement_type = 'year_in_review'`,
            [userId]
        );

        let newAchievement = null;
        if (existingAchievement.length === 0) {
            await db.query(
                `INSERT INTO roulette_achievements (user_id, achievement_type, metadata) VALUES (?, 'year_in_review', ?)`,
                [userId, JSON.stringify({ first_view_date: today.toISOString() })]
            );
            newAchievement = { ...ACHIEVEMENTS.year_in_review, type: 'year_in_review' };
        }

        res.json({
            entries,
            today: { month, day },
            newAchievement
        });

    } catch (err) {
        console.error('Same day last year error:', err);
        res.status(500).json({ message: 'Failed to fetch memories' });
    }
}

/**
 * POST /api/memory-roulette/reaction
 * Save user's reaction to a revisited entry
 */
async function saveReaction(req, res) {
    try {
        const userId = req.user.id;
        const { entryId, reaction } = req.body;

        if (!entryId || !reaction) {
            return res.status(400).json({ message: 'Entry ID and reaction are required' });
        }

        if (!['remember', 'grown', 'relevant'].includes(reaction)) {
            return res.status(400).json({ message: 'Invalid reaction type' });
        }

        // Verify entry belongs to user
        const [entry] = await db.query(
            `SELECT id FROM entries WHERE id = ? AND user_id = ?`,
            [entryId, userId]
        );

        if (entry.length === 0) {
            return res.status(404).json({ message: 'Entry not found' });
        }

        // Insert or update reaction (UPSERT)
        await db.query(`
      INSERT INTO memory_reactions (user_id, entry_id, reaction_type) 
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE reaction_type = VALUES(reaction_type), created_at = CURRENT_TIMESTAMP
    `, [userId, entryId, reaction]);

        // Check for new achievements
        const newAchievements = await checkAndUnlockAchievements(userId);

        res.json({
            success: true,
            reaction,
            newAchievements
        });

    } catch (err) {
        console.error('Save reaction error:', err);
        res.status(500).json({ message: 'Failed to save reaction' });
    }
}

/**
 * GET /api/memory-roulette/achievements
 * Get all achievements for the user
 */
async function getAchievements(req, res) {
    try {
        const userId = req.user.id;

        // Get unlocked achievements
        const [unlocked] = await db.query(`
      SELECT achievement_type, unlocked_at, metadata
      FROM roulette_achievements 
      WHERE user_id = ?
      ORDER BY unlocked_at DESC
    `, [userId]);

        // Build full achievements list with unlock status
        const achievements = Object.entries(ACHIEVEMENTS).map(([type, data]) => {
            const unlockedData = unlocked.find(a => a.achievement_type === type);
            return {
                type,
                ...data,
                unlocked: !!unlockedData,
                unlockedAt: unlockedData?.unlocked_at || null,
                metadata: unlockedData?.metadata ? JSON.parse(unlockedData.metadata) : null
            };
        });

        res.json({
            achievements,
            totalUnlocked: unlocked.length,
            totalAchievements: Object.keys(ACHIEVEMENTS).length
        });

    } catch (err) {
        console.error('Get achievements error:', err);
        res.status(500).json({ message: 'Failed to fetch achievements' });
    }
}

/**
 * GET /api/memory-roulette/stats
 * Get roulette statistics for the user
 */
async function getStats(req, res) {
    try {
        const userId = req.user.id;

        // Total entries revisited
        const [totalRevisited] = await db.query(
            `SELECT COUNT(*) as count FROM memory_reactions WHERE user_id = ?`,
            [userId]
        );

        // Reactions breakdown
        const [reactionsBreakdown] = await db.query(`
      SELECT reaction_type, COUNT(*) as count 
      FROM memory_reactions 
      WHERE user_id = ?
      GROUP BY reaction_type
    `, [userId]);

        // Total entries available
        const [totalEntries] = await db.query(`
      SELECT COUNT(*) as count 
      FROM entries 
      WHERE user_id = ? AND is_time_capsule = 0 AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY)
    `, [userId]);

        // Recent revisits
        const [recentRevisits] = await db.query(`
      SELECT mr.reaction_type, mr.created_at, e.title
      FROM memory_reactions mr
      JOIN entries e ON mr.entry_id = e.id
      WHERE mr.user_id = ?
      ORDER BY mr.created_at DESC
      LIMIT 5
    `, [userId]);

        const reactions = {};
        reactionsBreakdown.forEach(r => { reactions[r.reaction_type] = r.count; });

        res.json({
            totalRevisited: totalRevisited[0]?.count || 0,
            totalAvailable: totalEntries[0]?.count || 0,
            reactions,
            recentRevisits
        });

    } catch (err) {
        console.error('Get stats error:', err);
        res.status(500).json({ message: 'Failed to fetch stats' });
    }
}

module.exports = {
    spinRoulette,
    getSameDayLastYear,
    saveReaction,
    getAchievements,
    getStats,
    ACHIEVEMENTS
};
