const express = require('express');
const router = express.Router();
const { sendFeedbackEmail } = require('../controllers/feedbackController');

// POST /api/feedback - Submit logout feedback (public endpoint)
router.post('/', sendFeedbackEmail);

module.exports = router;
