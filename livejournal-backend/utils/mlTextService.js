const tf = require('@tensorflow/tfjs');
const use = require('@tensorflow-models/universal-sentence-encoder');
const nlp = require('compromise');
const Sentiment = require('sentiment');


const sentimentAnalyzer = new Sentiment();

let useModel = null;
let modelLoading = false;

/**
 * Initialize the Universal Sentence Encoder model
 * @returns {Promise<Object>} The USE model
 */
async function initializeModel() {
    if (useModel) return useModel;
    if (modelLoading) {
        // Wait for model to finish loading
        while (modelLoading) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return useModel;
    }

    modelLoading = true;
    try {
        console.log('[mlTextService] Loading Universal Sentence Encoder...');
        useModel = await use.load();
        console.log('[mlTextService] ✅ Universal Sentence Encoder loaded successfully');
        return useModel;
    } catch (err) {
        console.error('[mlTextService] Failed to load USE model:', err.message);
        throw err;
    } finally {
        modelLoading = false;
    }
}

/**
 * Split text into sentences
 * @param {string} text - Input text
 * @returns {string[]} Array of sentences
 */
function splitIntoSentences(text) {
    if (!text) return [];
    // Use compromise for better sentence splitting
    const doc = nlp(text);
    const sentences = doc.sentences().out('array');
    return sentences.filter(s => s && s.trim().length > 0);
}

/**
 * Calculate sentence importance scores using embeddings
 * @param {string[]} sentences - Array of sentences
 * @param {tf.Tensor} embeddings - Sentence embeddings tensor
 * @returns {number[]} Importance scores for each sentence
 */
function calculateSentenceImportance(sentences, embeddings) {
    const scores = [];
    const embeddingsArray = embeddings.arraySync();

    // Calculate average embedding (document centroid)
    const avgEmbedding = embeddingsArray.reduce((acc, emb) => {
        return acc.map((v, i) => v + emb[i] / embeddingsArray.length);
    }, new Array(512).fill(0));

    // Score each sentence by similarity to document centroid + position bias
    for (let i = 0; i < sentences.length; i++) {
        const sentenceEmb = embeddingsArray[i];

        // Cosine similarity to centroid
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let j = 0; j < 512; j++) {
            dotProduct += sentenceEmb[j] * avgEmbedding[j];
            normA += sentenceEmb[j] * sentenceEmb[j];
            normB += avgEmbedding[j] * avgEmbedding[j];
        }
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);

        // Position bias: first and last sentences are often important
        const positionBias = (i === 0 || i === sentences.length - 1) ? 0.1 : 0;

        // Length penalty: very short sentences less important
        const lengthPenalty = sentences[i].length < 20 ? -0.1 : 0;

        scores.push(similarity + positionBias + lengthPenalty);
    }

    return scores;
}

/**
 * Rewrite text to be more concise
 * Uses sentence embeddings to select most important sentences
 * @param {string} text - Input text
 * @returns {Promise<string>} Concise version of text
 */
async function rewriteConcise(text) {
    if (!text || text.trim().length < 20) return text;

    const sentences = splitIntoSentences(text);
    if (sentences.length <= 2) return text;

    try {
        const model = await initializeModel();
        const embeddings = await model.embed(sentences);

        const scores = calculateSentenceImportance(sentences, embeddings);

        // Dispose tensor to free memory
        embeddings.dispose();

        // Get top 2-3 sentences based on scores while maintaining order
        const targetCount = Math.min(3, Math.max(2, Math.ceil(sentences.length * 0.4)));
        const indexedScores = scores.map((score, idx) => ({ score, idx }));
        indexedScores.sort((a, b) => b.score - a.score);

        const topIndices = indexedScores
            .slice(0, targetCount)
            .map(item => item.idx)
            .sort((a, b) => a - b); // Maintain original order

        const result = topIndices.map(idx => sentences[idx]).join(' ');
        return result.trim();
    } catch (err) {
        console.error('[mlTextService] rewriteConcise error:', err.message);
        // Fallback: just take first 2 sentences
        return sentences.slice(0, 2).join(' ');
    }
}

/**
 * Positive word replacements mapping
 */
const positiveReplacements = {
    // Negative -> Positive transformations
    'i am not': 'i am becoming',
    "i'm not": "i'm becoming",
    'i cannot': 'i am learning to',
    "i can't": 'i am learning to',
    'i failed': 'i learned from',
    'i hate': 'i prefer not to',
    'terrible': 'challenging',
    'horrible': 'difficult',
    'awful': 'tough',
    'bad': 'less than ideal',
    'worst': 'most challenging',
    'never': 'not yet',
    'nothing': 'not much yet',
    'nobody': 'few people',
    'hopeless': 'awaiting improvement',
    'useless': 'underutilized',
    'worthless': 'unappreciated',
    'stupid': 'still learning',
    'ugly': 'unique',
    'weak': 'developing strength',
    'scared': 'cautious',
    'afraid': 'careful',
    'worried': 'mindful',
    'stressed': 'focused',
    'anxious': 'alert',
    'depressed': 'going through a tough time',
    'angry': 'frustrated',
    'hate myself': 'still growing',
    'give up': 'take a break',
    'quit': 'pause',
    'problem': 'challenge',
    'mistake': 'learning opportunity',
    'failure': 'experience'
};

/**
 * Rewrite text to be more positive
 * Replaces negative phrases with positive alternatives
 * @param {string} text - Input text
 * @returns {Promise<string>} Positive version of text
 */
async function rewritePositive(text) {
    if (!text) return text;

    let result = text.toLowerCase();

    // Analyze sentiment first
    const sentiment = sentimentAnalyzer.analyze(text);

    // Apply positive replacements
    for (const [negative, positive] of Object.entries(positiveReplacements)) {
        const regex = new RegExp(negative, 'gi');
        result = result.replace(regex, positive);
    }

    // Use compromise to restructure sentences for positivity
    const doc = nlp(result);

    // Add positive framing if sentiment is very negative
    if (sentiment.score < -2) {
        result = 'Looking at the bright side, ' + result;
    }

    // Capitalize first letter of each sentence
    const sentences = splitIntoSentences(result);
    result = sentences.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');

    return result.trim();
}

/**
 * Reflective phrases to add introspection
 */
const reflectivePhrases = [
    'I realize that',
    'Looking back,',
    'Upon reflection,',
    'I understand now that',
    'This makes me think that',
    'I notice that',
    'I am aware that'
];

/**
 * Rewrite text to be more reflective
 * Adds introspective framing and personal insight markers
 * @param {string} text - Input text
 * @returns {Promise<string>} Reflective version of text
 */
async function rewriteReflective(text) {
    if (!text) return text;

    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return text;

    // Use compromise for NLP processing
    const doc = nlp(text);

    // Find key topics/nouns in the text
    const topics = doc.nouns().out('array').slice(0, 3);

    const result = [];

    // Add reflective framing to first sentence
    const randomPhrase = reflectivePhrases[Math.floor(Math.random() * reflectivePhrases.length)];

    // First sentence with reflective opener
    const firstSentence = sentences[0].trim();
    const lowercaseFirst = firstSentence.charAt(0).toLowerCase() + firstSentence.slice(1);
    result.push(`${randomPhrase} ${lowercaseFirst}`);

    // Process middle sentences - add some introspective markers
    for (let i = 1; i < sentences.length - 1; i++) {
        const sentence = sentences[i].trim();
        // Occasionally add introspective phrases
        if (i % 2 === 0 && result.length < 5) {
            const marker = ['I find myself thinking about', 'This reminds me that', 'I can see that'][i % 3];
            const lower = sentence.charAt(0).toLowerCase() + sentence.slice(1);
            result.push(`${marker} ${lower}`);
        } else {
            result.push(sentence);
        }
    }

    // Last sentence with closing reflection
    if (sentences.length > 1) {
        const lastSentence = sentences[sentences.length - 1].trim();
        if (topics.length > 0) {
            result.push(`${lastSentence} This helps me understand more about ${topics[0]}.`);
        } else {
            result.push(`${lastSentence} This is something I want to remember.`);
        }
    }

    return result.join(' ').trim();
}

/**
 * Main rewrite function - routes to appropriate algorithm
 * @param {string} text - Input text
 * @param {string} style - 'concise' | 'positive' | 'reflective'
 * @returns {Promise<string|null>} Rewritten text or null if failed
 */
async function rewriteText(text, style = 'concise') {
    if (!text || text.trim().length < 10) return null;

    try {
        switch (style) {
            case 'concise':
                return await rewriteConcise(text);
            case 'positive':
                return await rewritePositive(text);
            case 'reflective':
                return await rewriteReflective(text);
            default:
                return await rewriteConcise(text);
        }
    } catch (err) {
        console.error(`[mlTextService] rewriteText(${style}) error:`, err.message);
        return null;
    }
}

async function warmup() {
    try {
        await initializeModel();
        console.log('[mlTextService] ✅ Model warmup complete');
    } catch (err) {
        console.warn('[mlTextService] Model warmup failed:', err.message);
    }
}

module.exports = {
    rewriteText,
    rewriteConcise,
    rewritePositive,
    rewriteReflective,
    warmup,
    initializeModel
};
