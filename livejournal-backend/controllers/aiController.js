const ai = require('../utils/ai');

async function rewrite(req, res) {
  try {
    const { text, style } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const out = await ai.rewriteText(text, style || 'concise');
    res.json({ result: out });
  } catch (err) {
    console.error('AI rewrite error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function titleSuggestions(req, res) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const titles = await ai.suggestTitle(text);
    res.json({ titles });
  } catch (err) {
    console.error('titleSuggestions error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function tagsSuggestions(req, res) {
  try {
    const { text, limit } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    const tags = await ai.generateTags(text, Number(limit) || 8);
    res.json({ tags });
  } catch (err) {
    console.error('tagsSuggestions error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function advice(req, res) {
  try {
    const { mood_label, mood_score, context } = req.body;
    if (!mood_label) return res.status(400).json({ error: 'mood_label required' });
    const adv = await ai.adviceForMood(mood_label, Number(mood_score || 0.5), context || '');
    res.json({ advice: adv });
  } catch (err) {
    console.error('advice error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function habitDetect(req, res) {
  try {
    const userId = req.user.id;
    const { days } = req.query;
    const habits = await ai.detectHabits(userId, Number(days || 90));
    res.json({ habits });
  } catch (err) {
    console.error('habitDetect error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function welcomeGreeting(req, res) {
  try {
    const userId = req.user.id;
    const userName = req.user.name || req.user.email?.split('@')[0] || 'there';

    // Check if user is new (has no entries yet)
    const db = require('../db');
    const [entries] = await db.query(
      'SELECT COUNT(*) as count FROM entries WHERE user_id = ?',
      [userId]
    );
    const isNewUser = entries[0].count === 0;

    const greeting = await ai.generateWelcomeGreeting(userName, isNewUser, userId);
    res.json({ greeting, isNewUser });
  } catch (err) {
    console.error('welcomeGreeting error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function detectMood(req, res) {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });
    if (text.trim().length < 10) {
      return res.json({
        mood_label: 'neutral',
        mood_score: 0.5,
        confidence: 0.3,
        emoji: '😐',
        description: 'Feeling balanced and stable',
        message: 'Text too short for accurate detection'
      });
    }

    const result = await ai.detectMoodFromText(text);
    res.json(result);
  } catch (err) {
    console.error('detectMood error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getWritingPrompts(req, res) {
  try {
    const userId = req.user.id;
    const { category, count, refresh } = req.query;

    const options = {
      category: category || null,
      count: Number(count) || 5,
      refresh: refresh === 'true'
    };

    const result = await ai.generateWritingPrompts(userId, options);
    res.json(result);
  } catch (err) {
    console.error('getWritingPrompts error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getPromptCategories(req, res) {
  try {
    const categories = ai.getPromptCategories();
    res.json({ categories });
  } catch (err) {
    console.error('getPromptCategories error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  rewrite,
  titleSuggestions,
  tagsSuggestions,
  advice,
  habitDetect,
  welcomeGreeting,
  detectMood,
  getWritingPrompts,
  getPromptCategories
};