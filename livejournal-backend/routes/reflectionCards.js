const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const {
    getWeeklyStats,
    getMonthlyStats,
    getRandomQuote,
    getTopWords,
    getAllCardData
} = require('../controllers/reflectionCardsController');

// All routes require authentication
router.use(authenticateToken);

// GET /api/reflection-cards/weekly-stats
// Get writing statistics for the current week
router.get('/weekly-stats', getWeeklyStats);

// GET /api/reflection-cards/monthly-stats
// Get writing statistics for the current month
router.get('/monthly-stats', getMonthlyStats);

// GET /api/reflection-cards/random-quote
// Get a random inspiring quote from past entries
router.get('/random-quote', getRandomQuote);

// GET /api/reflection-cards/top-words
// Get most frequently used meaningful words
router.get('/top-words', getTopWords);

// GET /api/reflection-cards/all
// Get all card data in one call (optimized for the page)
router.get('/all', getAllCardData);

module.exports = router;
