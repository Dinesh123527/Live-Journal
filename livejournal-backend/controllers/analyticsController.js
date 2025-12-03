const db = require('../db');
const aggregator = require('../jobs/moodAggregator');

async function happiestDay(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT date, avg_mood_score FROM daily_mood_aggregates WHERE user_id = ? AND avg_mood_score IS NOT NULL ORDER BY avg_mood_score DESC LIMIT 1`,
      [userId]
    );
    if (!rows.length) return res.json({ data: null });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('happiestDay error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function lowestDay(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT date, avg_mood_score FROM daily_mood_aggregates WHERE user_id = ? AND avg_mood_score IS NOT NULL ORDER BY avg_mood_score ASC LIMIT 1`,
      [userId]
    );
    if (!rows.length) return res.json({ data: null });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('lowestDay error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function moodTrend(req, res) {
  try {
    const userId = req.user.id;
    const { from, to } = req.query; // e.g. ?from=2025-11-01&to=2025-11-23
    const rangeStart = from || (() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })();
    const rangeEnd = to || new Date().toISOString().slice(0,10);

    // try to use cached trends
    const [cached] = await db.query(
      `SELECT data FROM mood_trends_cache WHERE user_id = ? AND range_start = ? AND range_end = ? AND granularity = 'day'`,
      [userId, rangeStart, rangeEnd]
    );
    if (cached.length && cached[0].data) {
      try {
        const parsedData = typeof cached[0].data === 'string'
          ? JSON.parse(cached[0].data)
          : cached[0].data;
        return res.json({ data: parsedData });
      } catch (e) {
        console.warn('Failed to parse cached data, generating fresh:', e);
      }
    }

    // If cache doesn't exist or parse failed, fetch from daily_mood_aggregates directly
    const [rows] = await db.query(
      `SELECT date, avg_mood_score FROM daily_mood_aggregates 
       WHERE user_id = ? AND date BETWEEN ? AND ? 
       ORDER BY date ASC`,
      [userId, rangeStart, rangeEnd]
    );

    // If no data, return empty array
    if (!rows.length) {
      return res.json({ data: [] });
    }

    res.json({ data: rows });
  } catch (err) {
    console.error('moodTrend error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function tagsVsMood(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      `SELECT tag, occurrences, avg_mood_score, last_seen FROM tags_mood_stats WHERE user_id = ? ORDER BY occurrences DESC LIMIT 50`,
      [userId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('tagsVsMood error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function streaks(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT current_streak, longest_streak, last_written_date FROM writing_streaks WHERE user_id = ?', [userId]);
    if (!rows.length) return res.json({ data: { current_streak: 0, longest_streak: 0, last_written_date: null } });
    res.json({ data: rows[0] });
  } catch (err) {
    console.error('streaks error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function listInsights(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT id, date_from, date_to, insight_type, insights, generated_at FROM mood_insights WHERE user_id = ? ORDER BY generated_at DESC LIMIT 20', [userId]);
    const parsed = rows.map(r => ({ ...r, insights: r.insights ? JSON.parse(r.insights) : null }));
    res.json({ data: parsed });
  } catch (err) {
    console.error('listInsights error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function generateInsightsNow(req, res) {
  try {
    const userId = req.user.id;
    const { from, to } = req.body; // { from: "2025-11-01", to: "2025-11-23" }
    if (!from || !to) return res.status(400).json({ error: 'from/to required' });

    const insights = await aggregator.generateAiInsights(userId, from, to);
    res.json({ ok: true, insights });
  } catch (err) {
    console.error('generateInsightsNow error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/mood/today
 * Get today's mood summary for dashboard
 */
async function todayMood(req, res) {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    // First, count today's entries directly from entries table
    const [countRows] = await db.query(
      'SELECT COUNT(*) as entry_count FROM entries WHERE user_id = ? AND DATE(created_at) = ?',
      [userId, today]
    );
    const entryCount = countRows[0]?.entry_count || 0;

    // Get today's aggregate from daily_mood_aggregates (might not exist yet)
    const [rows] = await db.query(
      'SELECT date, avg_mood_score, mood_counts FROM daily_mood_aggregates WHERE user_id = ? AND date = ?',
      [userId, today]
    );

    if (!rows.length || rows[0].avg_mood_score === null) {
      // No aggregate data yet, calculate from today's entries directly
      const [entries] = await db.query(
        'SELECT mood_score, mood_label FROM entries WHERE user_id = ? AND DATE(created_at) = ? AND mood_score IS NOT NULL',
        [userId, today]
      );

      if (entries.length === 0) {
        // No entries with mood scores yet
        return res.json({
          data: {
            date: today,
            avg_mood_score: null,
            mood_counts: null,
            entry_count: entryCount
          }
        });
      }

      // Calculate average mood score
      const totalScore = entries.reduce((sum, entry) => sum + (entry.mood_score || 0), 0);
      const avgMoodScore = totalScore / entries.length;

      // Calculate mood counts
      const moodCounts = {};
      entries.forEach(entry => {
        if (entry.mood_label) {
          moodCounts[entry.mood_label] = (moodCounts[entry.mood_label] || 0) + 1;
        }
      });

      return res.json({
        data: {
          date: today,
          avg_mood_score: avgMoodScore,
          mood_counts: Object.keys(moodCounts).length > 0 ? moodCounts : null,
          entry_count: entryCount
        }
      });
    }

    const result = rows[0];
    result.entry_count = entryCount;

    // Parse mood_counts if it's JSON string
    if (result.mood_counts && typeof result.mood_counts === 'string') {
      try {
        result.mood_counts = JSON.parse(result.mood_counts);
      } catch (e) {
        console.warn('Failed to parse mood_counts:', e);
        result.mood_counts = null;
      }
    }

    res.json({ data: result });
  } catch (err) {
    console.error('todayMood error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/mood/trend
 * Enhanced to support range parameter like ?range=7d
 */
async function moodTrendEnhanced(req, res) {
  try {
    const userId = req.user.id;
    let { from, to, range } = req.query;

    // Support range shortcuts like 7d, 30d
    if (range) {
      const days = parseInt(range.replace('d', ''));
      if (!isNaN(days)) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        from = startDate.toISOString().slice(0, 10);
        to = endDate.toISOString().slice(0, 10);
      }
    }

    const rangeStart = from || (() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().slice(0,10); })();
    const rangeEnd = to || new Date().toISOString().slice(0,10);

    // Try to use cached trends
    const [cached] = await db.query(
      `SELECT data FROM mood_trends_cache WHERE user_id = ? AND range_start = ? AND range_end = ? AND granularity = 'day'`,
      [userId, rangeStart, rangeEnd]
    );

    if (cached.length && cached[0].data) {
      try {
        const parsedData = typeof cached[0].data === 'string'
          ? JSON.parse(cached[0].data)
          : cached[0].data;
        return res.json({ data: parsedData });
      } catch (e) {
        console.warn('Failed to parse cached data, generating fresh:', e);
      }
    }

    // If cache doesn't exist or parse failed, fetch from daily_mood_aggregates directly
    const [rows] = await db.query(
      `SELECT date, avg_mood_score FROM daily_mood_aggregates 
       WHERE user_id = ? AND date BETWEEN ? AND ? 
       ORDER BY date ASC`,
      [userId, rangeStart, rangeEnd]
    );

    // If no data, return empty array
    if (!rows.length) {
      return res.json({ data: [] });
    }

    res.json({ data: rows });
  } catch (err) {
    console.error('moodTrend error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/analytics/mood-highlights
 * Get mood highlights for the highlights page including:
 * - Happiest days recently
 * - Top positive tags
 * - AI insight summary
 */
async function getMoodHighlights(req, res) {
  try {
    const userId = req.user.id;

    // Get top 5 happiest days from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateFrom = thirtyDaysAgo.toISOString().slice(0, 10);
    const dateNow = new Date().toISOString().slice(0, 10);

    const [happiestDays] = await db.query(
      `SELECT 
        dma.date, 
        dma.avg_mood_score,
        COUNT(e.id) as entries_count
       FROM daily_mood_aggregates dma
       LEFT JOIN entries e ON DATE(e.created_at) = dma.date AND e.user_id = dma.user_id
       WHERE dma.user_id = ? 
         AND dma.date BETWEEN ? AND ?
         AND dma.avg_mood_score IS NOT NULL
       GROUP BY dma.date, dma.avg_mood_score
       ORDER BY dma.avg_mood_score DESC 
       LIMIT 5`,
      [userId, dateFrom, dateNow]
    );

    // Get top positive tags (tags with highest average mood scores)
    const [topPositiveTags] = await db.query(
      `SELECT 
        tag, 
        avg_mood_score,
        occurrences as usage_count
       FROM tags_mood_stats 
       WHERE user_id = ? 
         AND avg_mood_score IS NOT NULL
         AND occurrences >= 2
       ORDER BY avg_mood_score DESC, occurrences DESC 
       LIMIT 10`,
      [userId]
    );

    // Generate AI insight based on the data
    let aiInsight = '';

    if (topPositiveTags.length > 0 && happiestDays.length > 0) {
      const topTag = topPositiveTags[0];
      const topMoodPercent = Math.round(topTag.avg_mood_score * 100);

      aiInsight = `You feel best when writing about "${topTag.tag}" (${topMoodPercent}% average mood). Your happiest entries often revolve around this topic!`;
    } else if (topPositiveTags.length > 0) {
      const topTag = topPositiveTags[0];
      const topMoodPercent = Math.round(topTag.avg_mood_score * 100);

      aiInsight = `Your most positive topic is "${topTag.tag}" with ${topMoodPercent}% average mood. Keep exploring what makes you happy!`;
    } else if (happiestDays.length > 0) {
      const happiestDay = happiestDays[0];
      const moodPercent = Math.round(happiestDay.avg_mood_score * 100);

      aiInsight = `Your best day recently had a ${moodPercent}% mood score. Keep up the positive journaling!`;
    } else {
      aiInsight = 'Keep writing to discover your happiness patterns! The more you journal, the more insights you\'ll gain.';
    }

    res.json({
      data: {
        happiest_days: happiestDays,
        top_positive_tags: topPositiveTags,
        ai_insight: aiInsight
      }
    });
  } catch (err) {
    console.error('getMoodHighlights error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  happiestDay,
  lowestDay,
  moodTrend: moodTrendEnhanced,
  tagsVsMood,
  streaks,
  listInsights,
  generateInsightsNow,
  todayMood,
  getMoodHighlights,
};