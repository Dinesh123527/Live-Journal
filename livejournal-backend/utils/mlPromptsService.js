/**
 * ML Writing Prompts Service
 * Uses TensorFlow.js to analyze user's past entries and generate personalized prompts
 * No external LLMs - fully local template-based generation
 */

const tf = require('@tensorflow/tfjs');
const use = require('@tensorflow-models/universal-sentence-encoder');
const nlp = require('compromise');
const db = require('../db');

// Shared USE model
let useModel = null;
let modelLoading = false;

// Prompt templates organized by category
const promptTemplates = {
    gratitude: [
        "What are three things you're grateful for right now?",
        "Who made a positive impact on your life recently?",
        "What small moment today brought you joy?",
        "What challenge are you grateful you overcame?",
        "What about your current life would your younger self be proud of?",
        "What simple pleasure did you enjoy today?",
        "Who deserves a thank you that you haven't given yet?",
        "What ability or skill are you thankful to have?"
    ],
    reflection: [
        "What lesson did you learn recently that changed your perspective?",
        "How have you grown as a person this year?",
        "What would you tell yourself a year ago?",
        "What patterns do you notice in your recent experiences?",
        "What's something you used to believe but no longer do?",
        "How do you handle setbacks differently now than before?",
        "What makes you feel most like yourself?",
        "What have you been avoiding that deserves attention?"
    ],
    goals: [
        "What's one step you can take today toward your biggest goal?",
        "Where do you see yourself in 5 years?",
        "What habit would you like to build or break?",
        "What's holding you back from pursuing your dreams?",
        "What would you attempt if you knew you couldn't fail?",
        "What skills do you want to develop?",
        "What does success look like to you?",
        "What's a goal you've been putting off?"
    ],
    emotions: [
        "How are you really feeling right now, and why?",
        "What emotion has been dominant for you lately?",
        "What brings you peace when you're stressed?",
        "When did you last feel truly happy?",
        "What are you worried about, and is it within your control?",
        "How do you typically cope with difficult emotions?",
        "What makes you feel understood?",
        "When do you feel most at ease?"
    ],
    relationships: [
        "Who do you wish you were closer to?",
        "What quality do you most admire in others?",
        "How have your relationships shaped who you are?",
        "Who has taught you the most about life?",
        "What conversation do you need to have but have been avoiding?",
        "How do you show love to the people in your life?",
        "What kind of friend are you trying to be?",
        "Who energizes you when you spend time with them?"
    ],
    creativity: [
        "If you could create anything without limitations, what would it be?",
        "What inspires your creativity?",
        "Describe a vivid dream you've had recently.",
        "Write a letter to your future self.",
        "If your life were a book, what would this chapter be titled?",
        "What story do you want your life to tell?",
        "Create a playlist for your current mood and explain each song.",
        "Describe your perfect day from start to finish."
    ],
    mindfulness: [
        "What do you notice about your surroundings right now?",
        "What sensations are you experiencing in your body?",
        "What sounds can you hear at this moment?",
        "Describe something beautiful you noticed today.",
        "What brought you to this present moment?",
        "What are you holding onto that you could let go of?",
        "How does your body feel when you're at peace?",
        "What would it mean to be fully present right now?"
    ],
    challenges: [
        "What obstacle are you currently facing?",
        "How have past difficulties made you stronger?",
        "What would you attempt if the fear of failure didn't exist?",
        "What's the hardest decision you've had to make recently?",
        "How do you typically respond to unexpected changes?",
        "What's a problem you've been avoiding?",
        "What would help you navigate your current challenge?",
        "What have you learned from your failures?"
    ]
};

// Categories with their weights for smart selection
const categoryWeights = {
    gratitude: { default: 0.15, morning: 0.25, happy: 0.2 },
    reflection: { default: 0.15, evening: 0.25, neutral: 0.2 },
    goals: { default: 0.10, morning: 0.2, calm: 0.15 },
    emotions: { default: 0.15, sad: 0.3, anxious: 0.3, stressed: 0.25 },
    relationships: { default: 0.10, neutral: 0.15 },
    creativity: { default: 0.10, happy: 0.15, calm: 0.15 },
    mindfulness: { default: 0.10, stressed: 0.25, anxious: 0.2 },
    challenges: { default: 0.05, stressed: 0.2, sad: 0.15 }
};

/**
 * Initialize USE model
 */
async function initializeModel() {
    if (useModel) return useModel;
    if (modelLoading) {
        while (modelLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return useModel;
    }

    modelLoading = true;
    try {
        console.log('[mlPromptsService] Loading Universal Sentence Encoder...');
        useModel = await use.load();
        console.log('[mlPromptsService] ✅ Universal Sentence Encoder loaded');
        return useModel;
    } catch (err) {
        console.error('[mlPromptsService] Failed to load USE model:', err.message);
        throw err;
    } finally {
        modelLoading = false;
    }
}

/**
 * Extract themes from user's recent entries
 * @param {number} userId - User ID
 * @param {number} days - Lookback period
 * @returns {Promise<Object>} Extracted themes and stats
 */
async function extractUserThemes(userId, days = 30) {
    try {
        const [entries] = await db.query(
            `SELECT title, body, mood_label, tags, created_at 
       FROM entries 
       WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY created_at DESC LIMIT 50`,
            [userId, days]
        );

        if (!entries.length) {
            return { themes: [], moodTrend: 'neutral', entryCount: 0 };
        }

        // Extract key nouns and topics using compromise NLP
        const allTopics = [];
        let moodCounts = {};

        for (const entry of entries) {
            // Extract nouns and topics from body
            const text = (entry.title || '') + ' ' + (entry.body || '');
            const doc = nlp(text);

            // Get nouns, topics, and places
            const nouns = doc.nouns().out('array');
            const topics = doc.topics().out('array');

            allTopics.push(...nouns.slice(0, 5), ...topics.slice(0, 3));

            // Count moods
            if (entry.mood_label) {
                moodCounts[entry.mood_label] = (moodCounts[entry.mood_label] || 0) + 1;
            }
        }

        // Find most common topics
        const topicFreq = {};
        for (const topic of allTopics) {
            const normalized = topic.toLowerCase().trim();
            if (normalized.length > 2) {
                topicFreq[normalized] = (topicFreq[normalized] || 0) + 1;
            }
        }

        const themes = Object.entries(topicFreq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([theme, count]) => ({ theme, count }));

        // Determine dominant mood
        let moodTrend = 'neutral';
        let maxMoodCount = 0;
        for (const [mood, count] of Object.entries(moodCounts)) {
            if (count > maxMoodCount) {
                maxMoodCount = count;
                moodTrend = mood;
            }
        }

        return { themes, moodTrend, entryCount: entries.length, moodCounts };
    } catch (err) {
        console.error('[mlPromptsService] extractUserThemes error:', err.message);
        return { themes: [], moodTrend: 'neutral', entryCount: 0 };
    }
}

/**
 * Get time-based context
 * @returns {Object} Time context
 */
function getTimeContext() {
    const hour = new Date().getHours();
    let timeOfDay = 'day';

    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return { timeOfDay, isWeekend, hour };
}

/**
 * Select categories based on context
 * @param {string} moodTrend - User's recent mood trend
 * @param {Object} timeContext - Time of day context
 * @returns {string[]} Selected categories
 */
function selectCategories(moodTrend, timeContext) {
    const weights = {};

    // Calculate weights for each category
    for (const [category, categoryWeight] of Object.entries(categoryWeights)) {
        let weight = categoryWeight.default;

        // Adjust by mood
        if (categoryWeight[moodTrend]) {
            weight += categoryWeight[moodTrend];
        }

        // Adjust by time
        if (categoryWeight[timeContext.timeOfDay]) {
            weight += categoryWeight[timeContext.timeOfDay];
        }

        weights[category] = weight;
    }

    // Sort categories by weight and select top ones with some randomness
    const sortedCategories = Object.entries(weights)
        .sort((a, b) => b[1] - a[1])
        .map(([cat]) => cat);

    // Select 3-4 categories with weighted randomness
    const selected = [];
    for (let i = 0; i < sortedCategories.length && selected.length < 4; i++) {
        // Higher chance for higher-weighted categories
        if (Math.random() < 0.6 + (0.1 * (sortedCategories.length - i))) {
            selected.push(sortedCategories[i]);
        }
    }

    // Ensure at least 3 categories
    while (selected.length < 3) {
        const remaining = sortedCategories.filter(c => !selected.includes(c));
        if (remaining.length > 0) {
            selected.push(remaining[Math.floor(Math.random() * remaining.length)]);
        } else {
            break;
        }
    }

    return selected;
}

/**
 * Personalize a prompt with user themes
 * @param {string} prompt - Base prompt
 * @param {Array} themes - User's themes
 * @returns {string} Personalized prompt
 */
function personalizePrompt(prompt, themes) {
    if (!themes || themes.length === 0) return prompt;

    // Some prompts can be personalized with user themes
    const themeWords = themes.slice(0, 3).map(t => t.theme);

    // Add theme suggestion to some prompts
    if (Math.random() < 0.3 && themeWords.length > 0) {
        const randomTheme = themeWords[Math.floor(Math.random() * themeWords.length)];
        return `${prompt} (Consider how this relates to "${randomTheme}")`;
    }

    return prompt;
}

/**
 * Generate personalized writing prompts for a user
 * @param {number} userId - User ID
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated prompts
 */
async function generatePrompts(userId, options = {}) {
    const { category = null, count = 5, refresh = false } = options;

    try {
        // Check cache first (unless refresh requested)
        if (!refresh) {
            const [cached] = await db.query(
                `SELECT prompts, generated_at FROM writing_prompts_cache 
         WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY generated_at DESC LIMIT 1`,
                [userId]
            );

            if (cached.length > 0) {
                const cacheAge = Date.now() - new Date(cached[0].generated_at).getTime();
                // Use cache if less than 1 hour old
                if (cacheAge < 60 * 60 * 1000) {
                    console.log('[mlPromptsService] Using cached prompts');
                    return {
                        prompts: JSON.parse(cached[0].prompts),
                        generated_at: cached[0].generated_at,
                        from_cache: true
                    };
                }
            }
        }

        // Extract user themes and context
        const userThemes = await extractUserThemes(userId, 30);
        const timeContext = getTimeContext();

        // Select categories
        let selectedCategories;
        if (category && promptTemplates[category]) {
            selectedCategories = [category];
        } else {
            selectedCategories = selectCategories(userThemes.moodTrend, timeContext);
        }

        // Generate prompts from selected categories
        const prompts = [];
        const usedPrompts = new Set();

        for (const cat of selectedCategories) {
            const categoryPrompts = promptTemplates[cat] || [];
            const shuffled = categoryPrompts.sort(() => Math.random() - 0.5);

            for (const prompt of shuffled) {
                if (prompts.length >= count) break;
                if (usedPrompts.has(prompt)) continue;

                usedPrompts.add(prompt);
                const personalizedPrompt = personalizePrompt(prompt, userThemes.themes);

                prompts.push({
                    text: personalizedPrompt,
                    category: cat,
                    id: `${cat}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                });
            }
        }

        // Fill remaining slots from random categories
        while (prompts.length < count) {
            const allCategories = Object.keys(promptTemplates);
            const randomCat = allCategories[Math.floor(Math.random() * allCategories.length)];
            const categoryPrompts = promptTemplates[randomCat];
            const randomPrompt = categoryPrompts[Math.floor(Math.random() * categoryPrompts.length)];

            if (!usedPrompts.has(randomPrompt)) {
                usedPrompts.add(randomPrompt);
                prompts.push({
                    text: randomPrompt,
                    category: randomCat,
                    id: `${randomCat}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
                });
            }
        }

        const result = {
            prompts: prompts.slice(0, count),
            generated_at: new Date().toISOString(),
            context: {
                moodTrend: userThemes.moodTrend,
                timeOfDay: timeContext.timeOfDay,
                entryCount: userThemes.entryCount
            },
            from_cache: false
        };

        // Cache the result
        try {
            await db.query(
                `INSERT INTO writing_prompts_cache (user_id, prompts, expires_at) 
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
         ON DUPLICATE KEY UPDATE prompts = VALUES(prompts), generated_at = NOW(), expires_at = VALUES(expires_at)`,
                [userId, JSON.stringify(result.prompts)]
            );
        } catch (cacheErr) {
            console.warn('[mlPromptsService] Failed to cache prompts:', cacheErr.message);
        }

        console.log(`[mlPromptsService] Generated ${prompts.length} prompts for user ${userId}`);
        return result;
    } catch (err) {
        console.error('[mlPromptsService] generatePrompts error:', err.message);

        // Return fallback prompts
        const fallbackPrompts = [
            { text: "What's on your mind today?", category: 'reflection', id: 'fallback_1' },
            { text: "What are you grateful for right now?", category: 'gratitude', id: 'fallback_2' },
            { text: "How are you feeling at this moment?", category: 'emotions', id: 'fallback_3' },
            { text: "What would make today great?", category: 'goals', id: 'fallback_4' },
            { text: "Describe your current state of mind.", category: 'mindfulness', id: 'fallback_5' }
        ];

        return {
            prompts: fallbackPrompts.slice(0, options.count || 5),
            generated_at: new Date().toISOString(),
            from_cache: false,
            fallback: true
        };
    }
}

/**
 * Get all available categories
 */
function getCategories() {
    return Object.keys(promptTemplates);
}

/**
 * Warmup
 */
async function warmup() {
    try {
        await initializeModel();
        console.log('[mlPromptsService] ✅ Model warmup complete');
    } catch (err) {
        console.warn('[mlPromptsService] Model warmup failed:', err.message);
    }
}

module.exports = {
    generatePrompts,
    extractUserThemes,
    getCategories,
    warmup,
    promptTemplates
};
