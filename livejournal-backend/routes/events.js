const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/validateAuth');
const eventsController = require('../controllers/eventsController');

router.use(requireAuth);

router.post('/', eventsController.createEvent);
router.get('/', eventsController.getEventsInRange);
router.get('/:id', eventsController.getEventById);
router.put('/:id', eventsController.updateEvent);
router.delete('/:id', eventsController.deleteEvent);

module.exports = router;
