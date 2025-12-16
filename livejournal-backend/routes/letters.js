const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const {
    createLetter,
    listLetters,
    getLetter,
    getReadyLetters,
    triggerLifeEvent,
    deleteLetter,
    getLifeEvents
} = require('../controllers/lettersController');

router.use(authenticateToken);

// Get available life events
router.get('/life-events', getLifeEvents);

// Get ready/opened letters
router.get('/ready', getReadyLetters);

// Trigger a life event
router.post('/trigger-event', triggerLifeEvent);

// CRUD operations
router.post('/', createLetter);
router.get('/', listLetters);
router.get('/:id', getLetter);
router.delete('/:id', deleteLetter);

module.exports = router;
