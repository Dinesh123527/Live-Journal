require('dotenv').config();
const cron = require('node-cron');
const db = require('../db');
const aiUtils = require('../utils/ai');

const AGGREGATOR_CRON = process.env.AGGREGATOR_CRON || '0 2 * * *'; // daily 02:00 by default
const AGGREGATOR_WINDOW_DAYS = Number(process.env.AGGREGATOR_WINDOW_DAYS || 7); // how many days to compute on each run
const INSIGHTS_ENABLED = process.env.AI_INSIGHTS_ENABLED === 'true';

async function computeDailyAggregatesForDate(userId, dateStr) {
  // dateStr in 'YYYY-MM-DD'
  // compute avg mood_score, counts per mood, entries count
  const sql = `
    SELECT
      COUNT(*) AS cnt,
      AVG(mood_score) AS avg_score
    FROM entries
    WHERE user_id = ? AND DATE(created_at) = ? AND mood_score IS NOT NULL
  `;
  const [rows] = await db.query(sql, [userId, dateStr]);
  const cnt = rows[0].cnt || 0;
  const avg = rows[0].avg_score === null ? null : Number(rows[0].avg_score);

  // mood counts
  const [moodRows] = await db.query(
    `SELECT mood_label, COUNT(*) AS cnt FROM entries WHERE user_id = ? AND DATE(created_at) = ? GROUP BY mood_label`,
    [userId, dateStr]
  );

  const mood_counts = {};
  for (const r of moodRows) {
    mood_counts[r.mood_label || 'unknown'] = Number(r.cnt);
  }

  // dominant mood (highest count)
  let dominant = null;
  let best = -1;
  for (const [k, v] of Object.entries(mood_counts)) {
    if (v > best) {
      best = v;
      dominant = k;
    }
  }

  // upsert into daily_mood_aggregates
  const upsertSql = `
    INSERT INTO daily_mood_aggregates (user_id, date, avg_mood_score, entries_count, dominant_mood, mood_counts)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      avg_mood_score = VALUES(avg_mood_score),
      entries_count = VALUES(entries_count),
      dominant_mood = VALUES(dominant_mood),
      mood_counts = VALUES(mood_counts),
      computed_at = CURRENT_TIMESTAMP
  `;
  await db.query(upsertSql, [
    userId,
    dateStr,
    avg,
    cnt,
    dominant,
    Object.keys(mood_counts).length ? JSON.stringify(mood_counts) : null,
  ]);

  return { date: dateStr, avg_mood_score: avg, entries_count: cnt, dominant_mood: dominant, mood_counts };
}

async function computeTagsMoodStatsForUser(userId) {
  const [rows] = await db.query('SELECT tags, mood_score FROM entries WHERE user_id = ? AND tags IS NOT NULL', [userId]);
  const tagMap = new Map();
  for (const r of rows) {
    let tagsArr = [];
    try { tagsArr = Array.isArray(r.tags) ? r.tags : JSON.parse(r.tags || '[]'); } catch (e) { tagsArr = []; }
    for (const t of tagsArr) {
      const key = String(t).toLowerCase();
      const stat = tagMap.get(key) || { occurrences: 0, sumScore: 0, countScore: 0, lastSeen: null };
      stat.occurrences++;
      if (r.mood_score !== null && r.mood_score !== undefined) {
        stat.sumScore += Number(r.mood_score);
        stat.countScore++;
      }
      stat.lastSeen = new Date().toISOString().slice(0,10); // approximate
      tagMap.set(key, stat);
    }
  }

  // upsert into tags_mood_stats
  for (const [tag, stat] of tagMap.entries()) {
    const avg = stat.countScore ? stat.sumScore / stat.countScore : null;
    await db.query(
      `INSERT INTO tags_mood_stats (user_id, tag, occurrences, avg_mood_score, last_seen)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         occurrences = VALUES(occurrences),
         avg_mood_score = VALUES(avg_mood_score),
         last_seen = VALUES(last_seen)`,
      [userId, tag, stat.occurrences, avg, stat.lastSeen]
    );
  }
}

async function computeWritingStreaksForUser(userId) {
  // Determine current streak and longest streak using entries dates
  // We'll fetch distinct dates user wrote
  const [rows] = await db.query(`SELECT DISTINCT DATE(created_at) as d FROM entries WHERE user_id = ? ORDER BY d DESC`, [userId]);
  const dates = rows.map(r => r.d ? r.d.toISOString().slice(0,10) : null).filter(Boolean);

  if (dates.length === 0) {
    await db.query(
      `INSERT INTO writing_streaks (user_id, current_streak, longest_streak, last_written_date)
       VALUES (?, 0, 0, NULL)
       ON DUPLICATE KEY UPDATE current_streak=VALUES(current_streak), longest_streak=VALUES(longest_streak), last_written_date=VALUES(last_written_date)`,
      [userId]
    );
    return { current_streak: 0, longest_streak: 0, last_written_date: null };
  }

  // compute streaks
  const today = new Date();
  const isoToday = today.toISOString().slice(0,10);

  let longest = 0;
  let current = 0;
  let seq = 0;
  let prevDate = null;

  // convert strings to Date objects for comparisons
  const dateObjs = dates.map(s => new Date(s));
  for (let i = 0; i < dateObjs.length; i++) {
    if (i === 0) {
      seq = 1;
      prevDate = dateObjs[i];
    } else {
      const cur = dateObjs[i];
      const diffDays = Math.round((prevDate - cur) / (1000*60*60*24));
      if (diffDays === 1) {
        seq++;
      } else {
        if (seq > longest) longest = seq;
        seq = 1;
      }
      prevDate = cur;
    }
    if (i === dateObjs.length -1 && seq > longest) longest = seq;
  }

  // determine current streak: count consecutive days up to today
  current = 0;
  for (let i = 0; i < dateObjs.length; i++) {
    // iterate descending: dateObjs[0] is latest
    const d = dateObjs[i];
    const expected = new Date();
    expected.setHours(0,0,0,0);
    expected.setDate(expected.getDate() - i);
  }
  // simpler approach: compute current streak by checking consecutive dates from today backward
  let curDate = new Date();
  curDate.setHours(0,0,0,0);
  const dateSet = new Set(dates); // "YYYY-MM-DD"
  while (dateSet.has(curDate.toISOString().slice(0,10))) {
    current++;
    curDate.setDate(curDate.getDate() - 1);
  }

  const last_written_date = dates[0];

  await db.query(
    `INSERT INTO writing_streaks (user_id, current_streak, longest_streak, last_written_date)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE current_streak=VALUES(current_streak), longest_streak=GREATEST(longest_streak, VALUES(longest_streak)), last_written_date=VALUES(last_written_date)`,
    [userId, current, Math.max(longest, current), last_written_date]
  );

  return { current_streak: current, longest_streak: Math.max(longest, current), last_written_date };
}

async function computeMoodTrendsCacheForRange(userId, startDate, endDate, granularity = 'day') {
  // produce array of { date, avg } for each date between startDate and endDate
  const [rows] = await db.query(
    `SELECT DATE(created_at) as date, AVG(mood_score) as avg_score
     FROM entries
     WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at)`,
    [userId, startDate, endDate]
  );

  const data = rows.map(r => ({ date: r.date ? r.date.toISOString().slice(0,10) : null, avg: r.avg_score === null ? null : Number(r.avg_score) }));

  await db.query(
    `INSERT INTO mood_trends_cache (user_id, range_start, range_end, granularity, data)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE data = VALUES(data), generated_at = CURRENT_TIMESTAMP`,
    [userId, startDate, endDate, granularity, JSON.stringify(data)]
  );

  return data;
}

async function generateAiInsights(userId, date_from, date_to) {
    if (!INSIGHTS_ENABLED) return null;
  
    try {
      if (aiUtils && typeof aiUtils.generateMoodInsights === 'function') {
        const result = await aiUtils.generateMoodInsights(userId, date_from, date_to);
        return result;
      } else {
        console.warn('[moodAggregator] aiUtils.generateMoodInsights not available');
      }
    } catch (err) {
      console.warn('[moodAggregator] AI insights generation failed', err && (err.message || err));
    }
    return null;
}

async function computeForAllUsersForRange(startDate, endDate) {
  // get list of users
  const [users] = await db.query('SELECT id FROM users');
  for (const u of users) {
    const userId = u.id;
    // compute daily aggregates for each day in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0,10);
      try {
        await computeDailyAggregatesForDate(userId, iso);
      } catch (e) {
        console.error('[moodAggregator] computeDailyAggregatesForDate error', e);
      }
    }
    try {
      await computeTagsMoodStatsForUser(userId);
    } catch (e) {
      console.error('[moodAggregator] computeTagsMoodStatsForUser error', e);
    }
    try {
      await computeWritingStreaksForUser(userId);
    } catch (e) {
      console.error('[moodAggregator] computeWritingStreaksForUser error', e);
    }
    try {
      // compute trend cache for the last AGGREGATOR_WINDOW_DAYS
      await computeMoodTrendsCacheForRange(
        userId,
        startDate,
        endDate,
        'day'
      );
    } catch (e) {
      console.error('[moodAggregator] computeMoodTrendsCacheForRange error', e);
    }

    // optional AI insights for the last window
    if (INSIGHTS_ENABLED) {
      try {
        await generateAiInsights(userId, startDate, endDate);
      } catch (e) {
        console.warn('[moodAggregator] generateAiInsights error', e);
      }
    }
  }
}

// Run aggregator once for recent days (default window)
async function runAggregatorOnce() {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (AGGREGATOR_WINDOW_DAYS - 1));
    const startDate = start.toISOString().slice(0,10);
    const endDate = end.toISOString().slice(0,10);
    console.log(`[moodAggregator] Running aggregator for ${startDate} -> ${endDate}`);
    await computeForAllUsersForRange(startDate, endDate);
    console.log('[moodAggregator] Aggregation completed');
  } catch (err) {
    console.error('[moodAggregator] Aggregation failed', err);
  }
}

function start() {
  // run immediately
  runAggregatorOnce().catch(e => console.error('[moodAggregator] initial run failed', e));

  // schedule
  try {
    const task = cron.schedule(AGGREGATOR_CRON, () => {
      runAggregatorOnce().catch(e => console.error('[moodAggregator] scheduled run failed', e));
    }, { scheduled: true, timezone: process.env.AGGREGATOR_TZ || undefined });
    console.log(`[moodAggregator] Scheduled with cron "${AGGREGATOR_CRON}"`);
    return task;
  } catch (err) {
    console.error('[moodAggregator] Invalid cron, not scheduled:', err);
    return null;
  }
}

module.exports = { start, runNow: runAggregatorOnce, computeDailyAggregatesForDate, computeTagsMoodStatsForUser, computeWritingStreaksForUser, computeMoodTrendsCacheForRange, generateAiInsights };