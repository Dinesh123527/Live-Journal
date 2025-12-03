const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const analytics = require('../controllers/analyticsController');

router.use(authenticateToken);

router.get('/happiest-day', analytics.happiestDay);
router.get('/lowest-day', analytics.lowestDay);
router.get('/trend', analytics.moodTrend);
router.get('/tags', analytics.tagsVsMood);
router.get('/streaks', analytics.streaks);
router.get('/insights', analytics.listInsights);
router.post('/insights', analytics.generateInsightsNow);
router.get('/today', analytics.todayMood);
router.get('/mood-highlights', analytics.getMoodHighlights); // New endpoint for highlights page

module.exports = router;
