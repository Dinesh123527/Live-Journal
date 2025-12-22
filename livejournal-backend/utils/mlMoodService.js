const tf = require('@tensorflow/tfjs');
const use = require('@tensorflow-models/universal-sentence-encoder');
const Sentiment = require('sentiment');
const nlp = require('compromise');

const sentimentAnalyzer = new Sentiment();

let useModel = null;
let modelLoading = false;

const emotionKeywords = {
    happy: ['happy', 'joy', 'excited', 'delighted', 'thrilled', 'wonderful', 'amazing', 'fantastic', 'great', 'love', 'blessed', 'grateful', 'cheerful', 'elated', 'overjoyed', 'ecstatic', 'content', 'pleased', 'satisfied', 'proud'],
    sad: ['sad', 'depressed', 'unhappy', 'miserable', 'heartbroken', 'devastated', 'grief', 'sorrow', 'melancholy', 'lonely', 'hopeless', 'desperate', 'crying', 'tears', 'loss', 'disappointed', 'hurt', 'pain', 'suffering', 'gloomy'],
    anxious: ['anxious', 'worried', 'nervous', 'scared', 'afraid', 'fear', 'panic', 'terrified', 'uneasy', 'tense', 'restless', 'overthinking', 'dread', 'apprehensive', 'uncertain', 'insecure', 'paranoid', 'overwhelmed', 'stressed', 'freaking'],
    angry: ['angry', 'furious', 'rage', 'hate', 'frustrated', 'annoyed', 'irritated', 'mad', 'outraged', 'bitter', 'resentful', 'hostile', 'aggressive', 'infuriated', 'livid', 'enraged', 'pissed', 'fed up', 'disgusted', 'offended'],
    calm: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'zen', 'mindful', 'balanced', 'comfortable', 'at ease', 'harmonious', 'quiet', 'still', 'composed', 'collected', 'meditative', 'restful', 'soothing', 'gentle', 'patient'],
    stressed: ['stressed', 'overwhelmed', 'pressured', 'burnt out', 'exhausted', 'drained', 'overworked', 'tired', 'fatigue', 'deadline', 'too much', 'can\'t handle', 'breaking point', 'chaos', 'hectic', 'crazy', 'insane workload', 'swamped', 'stretched thin', 'no time'],
    neutral: ['okay', 'fine', 'alright', 'normal', 'regular', 'usual', 'average', 'nothing special', 'meh', 'so-so', 'neither', 'indifferent', 'whatever', 'routine', 'ordinary', 'typical', 'standard']
};

const moodEmojis = {
    happy: '😊',
    sad: '😢',
    anxious: '😰',
    angry: '😠',
    calm: '😌',
    stressed: '😫',
    neutral: '😐'
};

const moodDescriptions = {
    happy: 'Feeling joyful and positive',
    sad: 'Feeling down or melancholic',
    anxious: 'Feeling worried or uneasy',
    angry: 'Feeling frustrated or upset',
    calm: 'Feeling peaceful and relaxed',
    stressed: 'Feeling overwhelmed or pressured',
    neutral: 'Feeling balanced and stable'
};

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
        console.log('[mlMoodService] Loading Universal Sentence Encoder...');
        useModel = await use.load();
        console.log('[mlMoodService] ✅ Universal Sentence Encoder loaded');
        return useModel;
    } catch (err) {
        console.error('[mlMoodService] Failed to load USE model:', err.message);
        throw err;
    } finally {
        modelLoading = false;
    }
}

/**
 * Calculate keyword-based emotion scores
 * @param {string} text - Input text
 * @returns {Object} Emotion scores
 */
function calculateKeywordEmotions(text) {
    const lowerText = text.toLowerCase();
    const scores = {};

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        let count = 0;
        for (const keyword of keywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) count += matches.length;
        }
        scores[emotion] = count;
    }

    // Normalize scores
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    for (const emotion in scores) {
        scores[emotion] = scores[emotion] / total;
    }

    return scores;
}

/**
 * Use sentence embeddings to find similarity to emotion prototypes
 * @param {string} text - Input text
 * @param {Object} model - USE model
 * @returns {Promise<Object>} Emotion similarity scores
 */
async function calculateEmbeddingSimilarity(text, model) {
    const emotionPrototypes = {
        happy: 'I am feeling absolutely wonderful, joyful, and happy today. Everything is going great.',
        sad: 'I feel so sad, depressed, and heartbroken. Nothing seems to be going right.',
        anxious: 'I am very worried, anxious, and scared about what might happen. I cannot stop overthinking.',
        angry: 'I am so angry, frustrated, and furious. This situation is making me mad.',
        calm: 'I feel calm, peaceful, and relaxed. Everything is in harmony and I am at peace.',
        stressed: 'I am completely stressed out, overwhelmed, and exhausted. There is too much to handle.',
        neutral: 'Today was a normal day. Nothing special happened. Things are just okay.'
    };

    try {
        const allTexts = [text, ...Object.values(emotionPrototypes)];
        const embeddings = await model.embed(allTexts);
        const embeddingsArray = embeddings.arraySync();
        embeddings.dispose();

        const textEmbedding = embeddingsArray[0];
        const scores = {};

        const emotions = Object.keys(emotionPrototypes);
        for (let i = 0; i < emotions.length; i++) {
            const prototypeEmbedding = embeddingsArray[i + 1];

            // Cosine similarity
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            for (let j = 0; j < textEmbedding.length; j++) {
                dotProduct += textEmbedding[j] * prototypeEmbedding[j];
                normA += textEmbedding[j] * textEmbedding[j];
                normB += prototypeEmbedding[j] * prototypeEmbedding[j];
            }
            const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
            scores[emotions[i]] = (similarity + 1) / 2; // Normalize to 0-1
        }

        return scores;
    } catch (err) {
        console.error('[mlMoodService] Embedding similarity error:', err.message);
        return null;
    }
}

/**
 * Get sentiment analysis scores
 * @param {string} text - Input text
 * @returns {Object} Sentiment data
 */
function analyzeSentiment(text) {
    const result = sentimentAnalyzer.analyze(text);
    return {
        score: result.score,
        comparative: result.comparative,
        positive: result.positive,
        negative: result.negative
    };
}

/**
 * Map combined scores to final mood
 * @param {Object} keywordScores - Keyword-based emotion scores
 * @param {Object} embeddingScores - Embedding similarity scores
 * @param {Object} sentiment - Sentiment analysis result
 * @returns {Object} Final mood with label, score, and confidence
 */
function determineFinalMood(keywordScores, embeddingScores, sentiment) {
    const emotions = ['happy', 'sad', 'anxious', 'angry', 'calm', 'stressed', 'neutral'];
    const combinedScores = {};

    // Weight factors
    const keywordWeight = 0.3;
    const embeddingWeight = 0.5;
    const sentimentWeight = 0.2;

    for (const emotion of emotions) {
        let score = 0;

        // Keyword contribution
        if (keywordScores && keywordScores[emotion]) {
            score += keywordScores[emotion] * keywordWeight;
        }

        // Embedding contribution
        if (embeddingScores && embeddingScores[emotion]) {
            score += embeddingScores[emotion] * embeddingWeight;
        }

        combinedScores[emotion] = score;
    }

    // Sentiment adjustment
    if (sentiment && sentiment.comparative !== undefined) {
        const sentComp = sentiment.comparative;
        if (sentComp > 0.1) {
            combinedScores.happy += sentComp * sentimentWeight;
            combinedScores.calm += sentComp * sentimentWeight * 0.5;
        } else if (sentComp < -0.1) {
            combinedScores.sad += Math.abs(sentComp) * sentimentWeight;
            combinedScores.stressed += Math.abs(sentComp) * sentimentWeight * 0.3;
            combinedScores.anxious += Math.abs(sentComp) * sentimentWeight * 0.2;
        } else {
            combinedScores.neutral += 0.1;
        }
    }

    // Find dominant emotion
    let maxEmotion = 'neutral';
    let maxScore = combinedScores.neutral || 0;

    for (const [emotion, score] of Object.entries(combinedScores)) {
        if (score > maxScore) {
            maxScore = score;
            maxEmotion = emotion;
        }
    }

    // Calculate mood score (0-1 scale, where 0.5 is neutral)
    // Higher for positive emotions, lower for negative
    let moodScore = 0.5;
    switch (maxEmotion) {
        case 'happy':
            moodScore = 0.75 + (maxScore * 0.25);
            break;
        case 'calm':
            moodScore = 0.65 + (maxScore * 0.15);
            break;
        case 'neutral':
            moodScore = 0.5;
            break;
        case 'stressed':
            moodScore = 0.35 - (maxScore * 0.1);
            break;
        case 'anxious':
            moodScore = 0.30 - (maxScore * 0.1);
            break;
        case 'sad':
            moodScore = 0.25 - (maxScore * 0.1);
            break;
        case 'angry':
            moodScore = 0.20 - (maxScore * 0.1);
            break;
    }
    moodScore = Math.max(0, Math.min(1, moodScore));

    // Calculate confidence based on score differentiation
    const scoreValues = Object.values(combinedScores).sort((a, b) => b - a);
    const confidence = scoreValues.length >= 2
        ? Math.min(1, (scoreValues[0] - scoreValues[1]) * 3 + 0.5)
        : 0.5;

    return {
        mood_label: maxEmotion,
        mood_score: Number(moodScore.toFixed(3)),
        confidence: Number(confidence.toFixed(2)),
        emotions: combinedScores
    };
}

/**
 * Main mood detection function
 * @param {string} text - Journal entry text
 * @returns {Promise<Object>} Detected mood data
 */
async function detectMood(text) {
    if (!text || text.trim().length < 10) {
        return {
            mood_label: 'neutral',
            mood_score: 0.5,
            confidence: 0.3,
            emotions: {},
            emoji: moodEmojis.neutral,
            description: moodDescriptions.neutral
        };
    }

    try {
        // Step 1: Keyword-based analysis
        const keywordScores = calculateKeywordEmotions(text);

        // Step 2: Sentiment analysis
        const sentiment = analyzeSentiment(text);

        // Step 3: Embedding-based similarity (if model loads)
        let embeddingScores = null;
        try {
            const model = await initializeModel();
            embeddingScores = await calculateEmbeddingSimilarity(text, model);
        } catch (err) {
            console.warn('[mlMoodService] Skipping embedding analysis:', err.message);
        }

        // Step 4: Combine all signals
        const result = determineFinalMood(keywordScores, embeddingScores, sentiment);

        // Add emoji and description
        result.emoji = moodEmojis[result.mood_label] || moodEmojis.neutral;
        result.description = moodDescriptions[result.mood_label] || moodDescriptions.neutral;

        console.log(`[mlMoodService] Detected mood: ${result.mood_label} (score: ${result.mood_score}, confidence: ${result.confidence})`);

        return result;
    } catch (err) {
        console.error('[mlMoodService] detectMood error:', err.message);
        return {
            mood_label: 'neutral',
            mood_score: 0.5,
            confidence: 0.3,
            emotions: {},
            emoji: moodEmojis.neutral,
            description: moodDescriptions.neutral
        };
    }
}

/**
 * Warmup the model
 */
async function warmup() {
    try {
        await initializeModel();
        console.log('[mlMoodService] ✅ Model warmup complete');
    } catch (err) {
        console.warn('[mlMoodService] Model warmup failed:', err.message);
    }
}

module.exports = {
    detectMood,
    warmup,
    moodEmojis,
    moodDescriptions
};
