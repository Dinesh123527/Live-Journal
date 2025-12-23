const db = require('../db');

// Common stop words to filter out
const STOP_WORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'it', 'its', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'you',
    'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'they',
    'them', 'their', 'what', 'which', 'who', 'whom', 'this', 'that',
    'these', 'those', 'am', 'been', 'being', 'having', 'doing', 'just',
    'very', 'really', 'so', 'too', 'also', 'now', 'then', 'here', 'there',
    'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own',
    'same', 'than', 'up', 'down', 'out', 'about', 'into', 'over', 'after',
    'before', 'between', 'under', 'again', 'further', 'once', 'got', 'get',
    'like', 'just', 'even', 'back', 'way', 'much', 'one', 'two', 'day',
    'today', 'feel', 'felt', 'feeling', 'think', 'thought', 'know', 'knew',
    'time', 'lot', 'still', 'went', 'going', 'go', 'going', 'make', 'made'
]);

/**
 * Helper to strip HTML tags from content
 */
function stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Helper to extract meaningful words from text
 */
function extractWords(text) {
    if (!text) return [];
    const cleanText = stripHtml(text).toLowerCase();
    const words = cleanText.match(/\b[a-z]{3,}\b/g) || [];
    return words.filter(word => !STOP_WORDS.has(word));
}

/**
 * GET /api/reflection-cards/weekly-stats
 * Get writing statistics for the current week
 */
async function getWeeklyStats(req, res) {
    try {
        const userId = req.user.id;

        // Get entries from the last 7 days
        const [entries] = await db.query(`
      SELECT id, title, body, mood_label, mood_score, created_at
      FROM entries
      WHERE user_id = ? 
        AND is_time_capsule = 0
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY created_at DESC
    `, [userId]);

        // Calculate stats
        let totalWords = 0;
        const moodCounts = {};
        let totalMoodScore = 0;
        let moodEntries = 0;

        entries.forEach(entry => {
            // Word count (strip HTML first)
            const text = stripHtml(entry.body);
            const words = text.split(/\s+/).filter(w => w.length > 0);
            totalWords += words.length;

            // Mood tracking
            if (entry.mood_label) {
                moodCounts[entry.mood_label] = (moodCounts[entry.mood_label] || 0) + 1;
            }
            if (entry.mood_score !== null) {
                totalMoodScore += entry.mood_score;
                moodEntries++;
            }
        });

        // Find dominant mood
        let dominantMood = null;
        let maxCount = 0;
        Object.entries(moodCounts).forEach(([mood, count]) => {
            if (count > maxCount) {
                maxCount = count;
                dominantMood = mood;
            }
        });

        res.json({
            period: 'week',
            entryCount: entries.length,
            wordCount: totalWords,
            avgWordsPerEntry: entries.length > 0 ? Math.round(totalWords / entries.length) : 0,
            avgMoodScore: moodEntries > 0 ? Math.round((totalMoodScore / moodEntries) * 100) : null,
            dominantMood,
            moodBreakdown: moodCounts,
            daysWithEntries: new Set(entries.map(e => new Date(e.created_at).toDateString())).size
        });

    } catch (err) {
        console.error('Weekly stats error:', err);
        res.status(500).json({ message: 'Failed to fetch weekly stats' });
    }
}

/**
 * GET /api/reflection-cards/monthly-stats
 * Get writing statistics for the current month
 */
async function getMonthlyStats(req, res) {
    try {
        const userId = req.user.id;

        // Get entries from the last 30 days
        const [entries] = await db.query(`
      SELECT id, title, body, mood_label, mood_score, created_at
      FROM entries
      WHERE user_id = ? 
        AND is_time_capsule = 0
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY created_at DESC
    `, [userId]);

        // Calculate stats
        let totalWords = 0;
        const moodCounts = {};
        let totalMoodScore = 0;
        let moodEntries = 0;

        entries.forEach(entry => {
            const text = stripHtml(entry.body);
            const words = text.split(/\s+/).filter(w => w.length > 0);
            totalWords += words.length;

            if (entry.mood_label) {
                moodCounts[entry.mood_label] = (moodCounts[entry.mood_label] || 0) + 1;
            }
            if (entry.mood_score !== null) {
                totalMoodScore += entry.mood_score;
                moodEntries++;
            }
        });

        // Find dominant mood
        let dominantMood = null;
        let maxCount = 0;
        Object.entries(moodCounts).forEach(([mood, count]) => {
            if (count > maxCount) {
                maxCount = count;
                dominantMood = mood;
            }
        });

        // Get streak info
        const [streakData] = await db.query(`
      SELECT current_streak, longest_streak 
      FROM writing_streaks 
      WHERE user_id = ?
    `, [userId]);

        res.json({
            period: 'month',
            entryCount: entries.length,
            wordCount: totalWords,
            avgWordsPerEntry: entries.length > 0 ? Math.round(totalWords / entries.length) : 0,
            avgMoodScore: moodEntries > 0 ? Math.round((totalMoodScore / moodEntries) * 100) : null,
            dominantMood,
            moodBreakdown: moodCounts,
            daysWithEntries: new Set(entries.map(e => new Date(e.created_at).toDateString())).size,
            currentStreak: streakData[0]?.current_streak || 0,
            longestStreak: streakData[0]?.longest_streak || 0
        });

    } catch (err) {
        console.error('Monthly stats error:', err);
        res.status(500).json({ message: 'Failed to fetch monthly stats' });
    }
}

/**
 * GET /api/reflection-cards/random-quote
 * Get a random inspiring sentence from past entries
 */
async function getRandomQuote(req, res) {
    try {
        const userId = req.user.id;

        // Get random entries with positive mood (>= 0.6 score) or happy moods
        const [entries] = await db.query(`
      SELECT id, title, body, mood_label, mood_score, created_at
      FROM entries
      WHERE user_id = ? 
        AND is_time_capsule = 0
        AND (mood_score >= 0.6 OR mood_label IN ('happy', 'excited', 'grateful', 'peaceful', 'hopeful', 'content', 'joyful'))
        AND LENGTH(body) > 100
      ORDER BY RAND()
      LIMIT 5
    `, [userId]);

        if (entries.length === 0) {
            // Fallback: get any entry with decent content
            const [fallbackEntries] = await db.query(`
        SELECT id, title, body, mood_label, created_at
        FROM entries
        WHERE user_id = ? 
          AND is_time_capsule = 0
          AND LENGTH(body) > 50
        ORDER BY RAND()
        LIMIT 5
      `, [userId]);

            if (fallbackEntries.length === 0) {
                return res.json({
                    quote: null,
                    message: 'Write more entries to see quotes!'
                });
            }

            entries.push(...fallbackEntries);
        }

        // Pick a random entry and extract a good sentence
        const entry = entries[Math.floor(Math.random() * entries.length)];
        const text = stripHtml(entry.body);

        // Split into sentences and pick one that's not too short or too long
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        const goodSentences = sentences.filter(s => s.trim().length >= 20 && s.trim().length <= 200);

        let quote = goodSentences.length > 0
            ? goodSentences[Math.floor(Math.random() * goodSentences.length)].trim()
            : text.substring(0, 150).trim() + '...';

        res.json({
            quote,
            entryId: entry.id,
            entryTitle: entry.title || 'Untitled',
            entryDate: entry.created_at,
            mood: entry.mood_label
        });

    } catch (err) {
        console.error('Random quote error:', err);
        res.status(500).json({ message: 'Failed to fetch random quote' });
    }
}

/**
 * GET /api/reflection-cards/top-words
 * Get the most frequently used meaningful words
 */
async function getTopWords(req, res) {
    try {
        const userId = req.user.id;
        const { period = 'month' } = req.query;

        const dateFilter = period === 'week'
            ? 'DATE_SUB(NOW(), INTERVAL 7 DAY)'
            : 'DATE_SUB(NOW(), INTERVAL 30 DAY)';

        // Get entries for the period
        const [entries] = await db.query(`
      SELECT body
      FROM entries
      WHERE user_id = ? 
        AND is_time_capsule = 0
        AND created_at >= ${dateFilter}
    `, [userId]);

        // Count word frequencies
        const wordCounts = {};
        entries.forEach(entry => {
            const words = extractWords(entry.body);
            words.forEach(word => {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            });
        });

        // Sort by frequency and get top 20
        const topWords = Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word, count]) => ({ word, count }));

        res.json({
            period,
            topWords,
            totalUniqueWords: Object.keys(wordCounts).length
        });

    } catch (err) {
        console.error('Top words error:', err);
        res.status(500).json({ message: 'Failed to fetch top words' });
    }
}

/**
 * GET /api/reflection-cards/all
 * Get all card data in one call for the reflection cards page
 */
async function getAllCardData(req, res) {
    try {
        const userId = req.user.id;

        // Parallel fetch all data
        const [weeklyEntries] = await db.query(`
      SELECT id, title, body, mood_label, mood_score, created_at
      FROM entries
      WHERE user_id = ? 
        AND is_time_capsule = 0
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ORDER BY created_at DESC
    `, [userId]);

        const [monthlyEntries] = await db.query(`
      SELECT id, title, body, mood_label, mood_score, created_at
      FROM entries
      WHERE user_id = ? 
        AND is_time_capsule = 0
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ORDER BY created_at DESC
    `, [userId]);

        const [streakData] = await db.query(`
      SELECT current_streak, longest_streak 
      FROM writing_streaks 
      WHERE user_id = ?
    `, [userId]);

        const [positiveEntries] = await db.query(`
      SELECT id, title, body, mood_label, created_at
      FROM entries
      WHERE user_id = ? 
        AND is_time_capsule = 0
        AND (mood_score >= 0.6 OR mood_label IN ('happy', 'excited', 'grateful', 'peaceful', 'hopeful'))
        AND LENGTH(body) > 100
      ORDER BY RAND()
      LIMIT 1
    `, [userId]);

        // Calculate weekly stats
        let weeklyWords = 0;
        const weeklyMoods = {};
        weeklyEntries.forEach(entry => {
            weeklyWords += stripHtml(entry.body).split(/\s+/).filter(w => w.length > 0).length;
            if (entry.mood_label) {
                weeklyMoods[entry.mood_label] = (weeklyMoods[entry.mood_label] || 0) + 1;
            }
        });

        // Calculate monthly stats
        let monthlyWords = 0;
        const monthlyMoods = {};
        const allWords = {};
        monthlyEntries.forEach(entry => {
            const text = stripHtml(entry.body);
            monthlyWords += text.split(/\s+/).filter(w => w.length > 0).length;
            if (entry.mood_label) {
                monthlyMoods[entry.mood_label] = (monthlyMoods[entry.mood_label] || 0) + 1;
            }
            extractWords(entry.body).forEach(word => {
                allWords[word] = (allWords[word] || 0) + 1;
            });
        });

        // Top words
        const topWords = Object.entries(allWords)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word, count]) => ({ word, count }));

        // Random quote
        let quote = null;
        if (positiveEntries.length > 0) {
            const entry = positiveEntries[0];
            const text = stripHtml(entry.body);
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
            const goodSentences = sentences.filter(s => s.trim().length >= 20 && s.trim().length <= 200);
            quote = {
                text: goodSentences.length > 0
                    ? goodSentences[Math.floor(Math.random() * goodSentences.length)].trim()
                    : text.substring(0, 150).trim() + '...',
                entryId: entry.id,
                entryDate: entry.created_at,
                mood: entry.mood_label
            };
        }

        res.json({
            weekly: {
                entryCount: weeklyEntries.length,
                wordCount: weeklyWords,
                moodBreakdown: weeklyMoods,
                daysActive: new Set(weeklyEntries.map(e => new Date(e.created_at).toDateString())).size
            },
            monthly: {
                entryCount: monthlyEntries.length,
                wordCount: monthlyWords,
                moodBreakdown: monthlyMoods,
                daysActive: new Set(monthlyEntries.map(e => new Date(e.created_at).toDateString())).size
            },
            streak: {
                current: streakData[0]?.current_streak || 0,
                longest: streakData[0]?.longest_streak || 0
            },
            topWords,
            quote
        });

    } catch (err) {
        console.error('All card data error:', err);
        res.status(500).json({ message: 'Failed to fetch card data' });
    }
}

module.exports = {
    getWeeklyStats,
    getMonthlyStats,
    getRandomQuote,
    getTopWords,
    getAllCardData
};
