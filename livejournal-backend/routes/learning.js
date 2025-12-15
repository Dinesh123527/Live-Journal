const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/validateAuth');
const learningController = require('../controllers/learningController');

router.use(requireAuth);

router.post('/', learningController.upsertTodayLearning);
router.get('/today', learningController.getTodayLearning);
router.get('/streak', learningController.getLearningStreak);
router.get('/', learningController.listLearnings);
router.delete('/:id', learningController.deleteLearning);

module.exports = router;
