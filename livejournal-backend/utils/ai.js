require('dotenv').config();
const axios = require('axios');
const db = require('../db');

const API_KEY = process.env.NLP_CLOUD_API_KEY || null;
const MODEL = process.env.NLP_CLOUD_MODEL || 'distilbert-base-uncased-emotion';
const INSIGHT_MODEL = process.env.AI_INSIGHTS_MODEL || 'flan-t5-base'; 
const INSIGHT_ENABLED = !!(API_KEY && INSIGHT_MODEL);

if (!API_KEY) {
  console.warn('NLP Cloud API key not found in .env (NLP_CLOUD_API_KEY). AI fallback = neutral and insights fallback to local summarizer.');
}
console.log(`NLP Cloud sentiment model: ${MODEL}`);

if (INSIGHT_MODEL) console.log(`NLP Cloud insight/generation model: ${INSIGHT_MODEL}`);

function clamp01(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return 0.5;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function normalizeNlpCloudResponse(data) {
  if (!data) return { label: null, score: null };

  if (typeof data.sentiment === 'string') return { label: data.sentiment, score: null };

  if (typeof data.label === 'string') return { label: data.label, score: data.score ?? null };

  if (Array.isArray(data.scored_labels) && data.scored_labels.length) {
    const top = data.scored_labels.reduce((a, b) => (a.score >= b.score ? a : b));
    return { label: top.label, score: top.score ?? null };
  }

  if (Array.isArray(data.predictions) && data.predictions.length) {
    const p = data.predictions[0];
    if (typeof p === 'string') return { label: p, score: null };
    if (p && p.label) return { label: p.label, score: p.score ?? null };
  }

  return { label: null, score: null };
}

function mapLabelToMood(label, rawScore) {
  if (!label) return { mood_label: 'neutral', mood_score: 0.5 };

  const l = String(label).toLowerCase();

  if (l.includes('pos') || l.includes('positive')) return { mood_label: 'happy', mood_score: rawScore != null ? clamp01(rawScore) : 0.82 };
  if (l.includes('neg') || l.includes('negative')) return { mood_label: 'sad', mood_score: rawScore != null ? clamp01(rawScore) : 0.18 };
  if (l.includes('neutral')) return { mood_label: 'neutral', mood_score: rawScore != null ? clamp01(rawScore) : 0.5 };

  if (l.includes('joy') || l.includes('happy') || l.includes('excited') || l.includes('love')) return { mood_label: 'happy', mood_score: rawScore != null ? clamp01(rawScore) : 0.85 };
  if (l.includes('anger') || l.includes('angry')) return { mood_label: 'angry', mood_score: rawScore != null ? clamp01(rawScore) : 0.15 };
  if (l.includes('fear') || l.includes('anxious') || l.includes('anxiety')) return { mood_label: 'anxious', mood_score: rawScore != null ? clamp01(rawScore) : 0.25 };
  if (l.includes('sad') || l.includes('sadness') || l.includes('depress')) return { mood_label: 'sad', mood_score: rawScore != null ? clamp01(rawScore) : 0.2 };
  if (l.includes('calm') || l.includes('relaxed')) return { mood_label: 'calm', mood_score: rawScore != null ? clamp01(rawScore) : 0.65 };
  if (l.includes('stressed') || l.includes('stress') || l.includes('burnout')) return { mood_label: 'stressed', mood_score: rawScore != null ? clamp01(rawScore) : 0.3 };

  return { mood_label: 'neutral', mood_score: rawScore != null ? clamp01(rawScore) : 0.5 };
}

//
// Model generation wrapper (try NLP Cloud generation model if configured)
//
async function generateTextWithModel(prompt, max_length = 180) {
  if (!API_KEY || !INSIGHT_MODEL) return null;

  // Don't use encodeURIComponent - just use the model name directly
  const genUrl = `https://api.nlpcloud.io/v1/${INSIGHT_MODEL}/generation`;
  
  try {
    const resp = await axios.post(
      genUrl,
      { 
        text: prompt,
        max_length,
        remove_input: true,
        num_return_sequences: 1,
        length_no_input: true
      },
      {
        headers: { 
          Authorization: `Token ${API_KEY}`, 
          'Content-Type': 'application/json' 
        },
        timeout: 15000,
      }
    );

    if (!resp || !resp.data) return null;
    
    // NLP Cloud returns generated_text for generation models
    if (typeof resp.data.generated_text === 'string') {
      return resp.data.generated_text.trim();
    }
    if (typeof resp.data.text === 'string') {
      return resp.data.text.trim();
    }
    
    console.warn('[ai.generateTextWithModel] Unexpected response format:', resp.data);
    return null;
  } catch (err) {
    if (err.response) {
      console.error('[ai.generateTextWithModel] NLP Cloud error:', {
        status: err.response.status,
        data: err.response.data,
        url: genUrl,
        model: INSIGHT_MODEL
      });
    } else {
      console.warn('[ai.generateTextWithModel] generation failed', err.message);
    }
    return null;
  }
}

//
// analyzeMoodForText: sentiment -> mood_label + mood_score
//
async function analyzeMoodForText(text) {
  if (!text || !text.trim()) return { mood_label: 'neutral', mood_score: 0.5 };
  if (!API_KEY) return { mood_label: 'neutral', mood_score: 0.5 };

  const url = `https://api.nlpcloud.io/v1/${encodeURIComponent(MODEL)}/sentiment`;
  try {
    const resp = await axios.post(
      url,
      { text },
      {
        headers: { Authorization: `Token ${API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      }
    );

    const normalized = normalizeNlpCloudResponse(resp.data);
    const mapped = mapLabelToMood(normalized.label, normalized.score);
    mapped.mood_score = clamp01(mapped.mood_score);
    return mapped;
  } catch (err) {
    if (err.response) {
      console.error('NLP Cloud error:', err.response.status, err.response.data);
    } else {
      console.error('NLP Cloud request failure:', err.message);
    }
    return { mood_label: 'neutral', mood_score: 0.5 };
  }
}

//
// generateMoodInsights (your existing function, preserved and slightly hardened)
//
async function generateMoodInsights(userId, dateFrom, dateTo) {
  if (!userId || !dateFrom || !dateTo) {
    throw new Error('generateMoodInsights requires userId, dateFrom and dateTo');
  }

  const [dailyRows] = await db.query(
    `SELECT date, avg_mood_score, entries_count, dominant_mood, mood_counts
     FROM daily_mood_aggregates
     WHERE user_id = ? AND date BETWEEN ? AND ?
     ORDER BY date ASC`,
    [userId, dateFrom, dateTo]
  );

  let daily = dailyRows.map(r => ({
    date: r.date ? (typeof r.date === 'string' ? r.date : r.date.toISOString().slice(0,10)) : null,
    avg_mood_score: r.avg_mood_score !== null ? Number(r.avg_mood_score) : null,
    entries_count: Number(r.entries_count || 0),
    dominant_mood: r.dominant_mood || null,
    mood_counts: r.mood_counts ? (typeof r.mood_counts === 'string' ? JSON.parse(r.mood_counts) : r.mood_counts) : {}
  }));

  if (!daily.length) {
    const [entries] = await db.query(
      `SELECT DATE(created_at) as date, AVG(mood_score) as avg_mood_score, COUNT(*) as entries_count
       FROM entries
       WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [userId, dateFrom, dateTo]
    );
    daily = entries.map(r => ({
      date: r.date ? (typeof r.date === 'string' ? r.date : r.date.toISOString().slice(0,10)) : null,
      avg_mood_score: r.avg_mood_score !== null ? Number(r.avg_mood_score) : null,
      entries_count: Number(r.entries_count || 0),
      dominant_mood: null,
      mood_counts: {}
    }));
  }

  let total = 0, totalCount = 0;
  let happiest = null, lowest = null;
  for (const d of daily) {
    if (typeof d.avg_mood_score === 'number') {
      total += d.avg_mood_score;
      totalCount++;
      if (!happiest || d.avg_mood_score > happiest.avg_mood_score) happiest = d;
      if (!lowest || d.avg_mood_score < lowest.avg_mood_score) lowest = d;
    }
  }
  const overallAvg = totalCount ? (total / totalCount) : null;

  let trend = { direction: 'flat', change: 0 };
  if (daily.length >= 2) {
    const first = daily.find(d => typeof d.avg_mood_score === 'number');
    const last = [...daily].reverse().find(d => typeof d.avg_mood_score === 'number');
    if (first && last) {
      const change = last.avg_mood_score - first.avg_mood_score;
      trend.change = change;
      trend.direction = Math.abs(change) < 0.02 ? 'flat' : (change > 0 ? 'up' : 'down');
    }
  }

  const [tagRows] = await db.query(
    `SELECT tag, occurrences, avg_mood_score, last_seen FROM tags_mood_stats WHERE user_id = ? ORDER BY occurrences DESC LIMIT 10`,
    [userId]
  );

  const topTags = tagRows.map(r => ({ tag: r.tag, occurrences: Number(r.occurrences), avg_mood_score: r.avg_mood_score !== null ? Number(r.avg_mood_score) : null, last_seen: r.last_seen }));
  const [streakRows] = await db.query(`SELECT current_streak, longest_streak, last_written_date FROM writing_streaks WHERE user_id = ?`, [userId]);
  const streaks = streakRows.length ? { ...streakRows[0] } : { current_streak: 0, longest_streak: 0, last_written_date: null };

  const insightObj = {
    date_from: dateFrom,
    date_to: dateTo,
    overall: {
      average_mood_score: overallAvg !== null ? Number(overallAvg.toFixed(3)) : null,
      datapoints: daily.length,
    },
    happiest: happiest ? { date: happiest.date, avg_mood_score: happiest.avg_mood_score, entries_count: happiest.entries_count } : null,
    lowest: lowest ? { date: lowest.date, avg_mood_score: lowest.avg_mood_score, entries_count: lowest.entries_count } : null,
    trend,
    topTags,
    streaks,
    daily
  };

  let summaryText = null;
  if (INSIGHT_ENABLED) {
    try {
      const promptParts = [];
      promptParts.push(`Provide a short user-facing insight summary for the user's mood between ${dateFrom} and ${dateTo}.`);
      promptParts.push(`Overall average mood score: ${insightObj.overall.average_mood_score !== null ? insightObj.overall.average_mood_score.toFixed(2) : 'N/A'}.`);
      if (insightObj.happiest) promptParts.push(`Happiest day: ${insightObj.happiest.date} (avg ${insightObj.happiest.avg_mood_score?.toFixed(2)}).`);
      if (insightObj.lowest) promptParts.push(`Lowest day: ${insightObj.lowest.date} (avg ${insightObj.lowest.avg_mood_score?.toFixed(2)}).`);
      if (insightObj.topTags && insightObj.topTags.length) {
        const tagPreview = insightObj.topTags.slice(0,3).map(t => `${t.tag} (${t.occurrences})`).join(', ');
        promptParts.push(`Top tags: ${tagPreview}.`);
      }
      promptParts.push(`Trend direction: ${insightObj.trend.direction} (change ${insightObj.trend.change?.toFixed(3)}).`);
      promptParts.push('Give 3 short, actionable suggestions for the user based on these facts.');
      const prompt = promptParts.join(' ');
      const genText = await generateTextWithModel(prompt, 256);
      if (genText) summaryText = genText.trim();
    } catch (err) {
      console.warn('[ai.generateMoodInsights] NLP Cloud generation failed, falling back to local summary.', err && (err.message || err));
    }
  }

  if (!summaryText) {
    const parts = [];
    parts.push(`From ${dateFrom} to ${dateTo}:`);
    if (insightObj.overall.average_mood_score !== null) parts.push(`average mood ${insightObj.overall.average_mood_score.toFixed(2)} over ${insightObj.daily.length} days.`);
    if (insightObj.happiest) parts.push(`Happiest day: ${insightObj.happiest.date} (avg ${insightObj.happiest.avg_mood_score?.toFixed(2)}).`);
    if (insightObj.lowest) parts.push(`Lowest day: ${insightObj.lowest.date} (avg ${insightObj.lowest.avg_mood_score?.toFixed(2)}).`);
    if (insightObj.topTags && insightObj.topTags.length) {
      parts.push(`Top tags: ${insightObj.topTags.slice(0,3).map(t => t.tag).join(', ')}.`);
    }
    if (insightObj.trend && insightObj.trend.direction) parts.push(`Trend: ${insightObj.trend.direction} ${insightObj.trend.change ? `(change ${insightObj.trend.change.toFixed(3)})` : ''}.`);
    if (insightObj.streaks) parts.push(`Writing streak: ${insightObj.streaks.current_streak} days (longest ${insightObj.streaks.longest_streak}).`);
    parts.push('Suggestions: Try to keep a short reflection on low days and note activities associated with high-mood days.');
    summaryText = parts.join(' ');
  }

  try {
    await db.query(
      `INSERT INTO mood_insights (user_id, date_from, date_to, insight_type, insights, generated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         insights = VALUES(insights),
         generated_by = VALUES(generated_by),
         generated_at = CURRENT_TIMESTAMP`,
      [userId, dateFrom, dateTo, 'auto_generated', JSON.stringify({ structured: insightObj, summary: summaryText }), INSIGHT_MODEL || 'local']
    );
  } catch (err) {
    console.warn('[ai.generateMoodInsights] failed to persist insight:', err && (err.message || err));
  }

  return { summary: summaryText, structured: insightObj };
}

//
// --- AI Assistant helpers ---
//

/**
 * rewriteText(text, style) - style: 'concise' | 'positive' | 'reflective'
 */
async function rewriteText(text, style = 'concise') {
  if (!text) return text;

  const styleMap = {
    positive: 'Rewrite the following text to sound more positive and encouraging.',
    concise: 'Rewrite the following text to be concise and clearer in 2-3 sentences.',
    reflective: 'Rewrite the following text to sound more reflective and introspective.',
  };
  const prompt = `${styleMap[style] || styleMap.concise}\n\nText:\n${text}\n\nRewrite:`;
  const ai = await generateTextWithModel(prompt, 160);
  if (ai) return ai;
  // Local fallback heuristics
  if (style === 'concise') {
    const sentences = text.split(/(?<=[.?!])\s+/);
    return (sentences.slice(0, 2).join(' ')).slice(0, 400);
  }
  if (style === 'positive') {
    return text.replace(/\b(I am|I'm|I feel)\b/gi, 'I appreciate').slice(0, 800);
  }
  if (style === 'reflective') {
    return `Reflecting: ${text.slice(0,600)}`;
  }
  return text;
}

/**
 * suggestTitle(text) - returns array of suggested titles (1-3)
 */
async function suggestTitle(text) {
  if (!text) return [];
  const prompt = `Give 3 short, creative titles (max 8 words each) for this journal text:\n\n${text}\n\nTitles:\n1.`;
  const ai = await generateTextWithModel(prompt, 80);
  if (ai) {
    const lines = ai.split(/\r?\n/).map(l => l.replace(/^\d+[\).\s-]*/, '').trim()).filter(Boolean);
    if (lines.length) return lines.slice(0,3);
  }
  // fallback: use first clause
  const candidate = text.split(/[.?!]/)[0].slice(0,50).trim();
  return [candidate || 'Untitled'];
}

/**
 * generateTags(text, limit=8) - returns array of tags (strings)
 */
async function generateTags(text, limit = 8) {
  if (!text) return [];
  const prompt = `Return up to ${limit} short single-word tags (comma separated) relevant to this journal text:\n\n${text}\n\nTags:`;
  const ai = await generateTextWithModel(prompt, 60);
  if (ai) {
    const parts = ai.split(/[,;\n]/).map(p => p.trim().toLowerCase()).filter(Boolean);
    return Array.from(new Set(parts)).slice(0, limit);
  }
  // local fallback keyword extraction
  const stop = new Set(['the','a','and','i','to','it','was','is','in','of','my','on','for','with','that','this','but','at','you']);
  const words = (text || '').toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freq = {};
  for (const w of words) if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1;
  const tags = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(x=>x[0]);
  return tags;
}

/**
 * adviceForMood(mood_label, mood_score, contextText)
 */
async function adviceForMood(mood_label, mood_score = 0.5, contextText = '') {
  const base = {
    happy: ['Keep doing what makes you happy. Consider noting why this day felt good.'],
    calm: ['Nice—keep this up. A short breathing exercise 5 minutes helps keep this state.'],
    sad: ['I\'m sorry you felt low. Try writing one small thing you are grateful for today.'],
    anxious: ['Try a 5-minute breathing break and note triggers. Consider a short walk.'],
    stressed: ['Break tasks into small steps. Consider scheduling a short break.'],
    neutral: ['Not much change — consider exploring a small mood experiment today.']
  };

  if (INSIGHT_MODEL) {
    const prompt = `You are a short empathetic assistant. Provide 3 short (1-2 line) actionable suggestions for a user with mood "${mood_label}" (score ${Number(mood_score).toFixed ? Number(mood_score).toFixed(2) : mood_score}). Context: ${contextText}\n\nSuggestions:`;
    const ai = await generateTextWithModel(prompt, 140);
    if (ai) return ai.split(/\r?\n/).filter(Boolean).slice(0,3).join(' ');
  }
  return (base[mood_label] || base['neutral']).join(' ');
}

/**
 * detectHabits(userId, lookbackDays=90) - returns array of pattern objects
 */
async function detectHabits(userId, lookbackDays = 90) {
  const [rows] = await db.query(
    `SELECT DATE(created_at) as date, mood_label, mood_score FROM entries WHERE user_id = ? AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY) ORDER BY created_at ASC`,
    [userId, lookbackDays]
  );
  if (!rows.length) return [];
  const weekdayStats = {};
  for (const r of rows) {
    let d = r.date;
    if (!d) continue;
    // ensure YYYY-MM-DD string
    const dateStr = (typeof d === 'string') ? d.slice(0,10) : (d.toISOString().slice(0,10));
    const wd = new Date(dateStr).getDay();
    weekdayStats[wd] = weekdayStats[wd] || { count:0, lowMoodCount:0, sumScore:0 };
    weekdayStats[wd].count++;
    if (r.mood_score !== null && r.mood_score !== undefined && Number(r.mood_score) < 0.45) weekdayStats[wd].lowMoodCount++;
    weekdayStats[wd].sumScore += (r.mood_score !== null ? Number(r.mood_score) : 0.5);
  }

  const habits = [];
  const names = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  for (let i=0;i<7;i++) {
    const s = weekdayStats[i];
    if (!s || s.count < 5) continue;
    const lowRatio = s.lowMoodCount / s.count;
    if (lowRatio >= 0.4) {
      habits.push({ pattern: `${names[i]} low mood`, weekday: i, lowRatio: Number(lowRatio.toFixed(2)), count: s.count });
    }
  }
  return habits;
}

/**
 * generateWelcomeGreeting(userName, isNewUser) - returns personalized AI greeting for welcome screen
 */
async function generateWelcomeGreeting(userName, isNewUser = false, userId = null) {
  const name = userName || 'there';

  // Get time-based greeting
  const hour = new Date().getHours();
  let timeGreeting = 'Hello';
  if (hour >= 5 && hour < 12) timeGreeting = 'Good morning';
  else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
  else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening';
  else timeGreeting = 'Good night';

  // If AI is enabled, generate personalized greeting
  if (INSIGHT_MODEL) {
    try {
      let context = '';

      // If not a new user and we have userId, check their recent activity
      if (!isNewUser && userId) {
        const [recentEntries] = await db.query(
          `SELECT COUNT(*) as count, AVG(mood_score) as avg_mood 
           FROM entries 
           WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
          [userId]
        );

        if (recentEntries[0].count > 0) {
          const avgMood = Number(recentEntries[0].avg_mood);
          const moodDesc = avgMood > 0.7 ? 'positive' : avgMood < 0.4 ? 'challenging' : 'balanced';
          context = ` The user has written ${recentEntries[0].count} entries in the past week with a ${moodDesc} mood trend.`;
        }
      }

      const prompt = isNewUser
        ? `Write a warm, encouraging welcome message (2-3 sentences, max 150 characters) for a new journaling app user. Start with "${timeGreeting}, ${name}!" and make it friendly, supportive, and mention the journey of self-discovery ahead.`
        : `Write a warm, personalized greeting (2-3 sentences, max 150 characters) for returning user. Start with "${timeGreeting}, ${name}!" and be encouraging about their journaling journey.${context}`;

      const greeting = await generateTextWithModel(prompt, 150);
      if (greeting) {
        // Ensure the greeting starts with the time-based greeting
        const trimmed = greeting.trim();
        if (!trimmed.toLowerCase().startsWith(timeGreeting.toLowerCase())) {
          return `${timeGreeting}, ${name}! ${trimmed}`;
        }
        return trimmed;
      }
    } catch (err) {
      console.warn('[ai.generateWelcomeGreeting] AI generation failed, using fallback', err.message);
    }
  }

  // Fallback greetings based on time of day and user status

  if (isNewUser) {
    const newUserGreetings = [
      `${timeGreeting}, ${name}! Welcome to your personal sanctuary. I'm here to help you capture your thoughts, track your mood, and discover insights about yourself. Let's begin this beautiful journey together.`,
      `${timeGreeting}, ${name}! I'm thrilled to be your journaling companion. This is a safe space for your thoughts and feelings. Together, we'll explore your inner world and help you grow.`,
      `Welcome, ${name}! ${timeGreeting} and thank you for joining. I'm here to support your self-reflection journey. Let's make journaling a meaningful part of your daily routine.`
    ];
    return newUserGreetings[Math.floor(Math.random() * newUserGreetings.length)];
  } else {
    const returningGreetings = [
      `${timeGreeting}, ${name}! Welcome back to your personal space. Ready to capture today's thoughts and reflections?`,
      `${timeGreeting}, ${name}! It's wonderful to see you again. Let's continue your journaling journey together.`,
      `Welcome back, ${name}! ${timeGreeting}. Your thoughts and experiences are waiting to be explored. Let's dive in.`
    ];
    return returningGreetings[Math.floor(Math.random() * returningGreetings.length)];
  }
}

module.exports = {
  analyzeMoodForText,
  generateMoodInsights,
  generateTextWithModel,
  rewriteText,
  suggestTitle,
  generateTags,
  adviceForMood,
  detectHabits,
  generateWelcomeGreeting
};