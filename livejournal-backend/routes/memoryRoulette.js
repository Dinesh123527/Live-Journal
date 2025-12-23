const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const {
    spinRoulette,
    getSameDayLastYear,
    saveReaction,
    getAchievements,
    getStats
} = require('../controllers/memoryRouletteController');


router.use(authenticateToken);

router.get('/spin', spinRoulette);
router.get('/same-day-last-year', getSameDayLastYear);
router.post('/reaction', saveReaction);
router.get('/achievements', getAchievements);
router.get('/stats', getStats);

module.exports = router;
