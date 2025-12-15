const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const {
    createTimeCapsule,
    listTimeCapsules,
    getTimeCapsule,
    getUnlockedCapsules,
    deleteTimeCapsule
} = require('../controllers/timeCapsuleController');

router.use(authenticateToken);

router.post('/', createTimeCapsule);
router.get('/', listTimeCapsules);
router.get('/unlocked', getUnlockedCapsules);
router.get('/:id', getTimeCapsule);
router.delete('/:id', deleteTimeCapsule);

module.exports = router;
