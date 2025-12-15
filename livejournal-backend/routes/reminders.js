const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/validateAuth');
const remindersController = require('../controllers/remindersController');

router.use(requireAuth);

router.post('/', remindersController.createReminder);
router.get('/upcoming', remindersController.getUpcomingReminders);
router.delete('/:id', remindersController.deleteReminder);

module.exports = router;
