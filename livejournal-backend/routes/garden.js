const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const {
    getGarden,
    plantFlower,
    waterGarden,
    getGardenAchievements,
    getPlantTypes
} = require('../controllers/gardenController');

// All routes require authentication
router.use(authenticateToken);

// GET /api/garden - Get user's garden with all plants
router.get('/', getGarden);

// POST /api/garden/plant - Plant a new flower
router.post('/plant', plantFlower);

// POST /api/garden/water - Water the garden
router.post('/water', waterGarden);

// GET /api/garden/achievements - Get garden achievements
router.get('/achievements', getGardenAchievements);

// GET /api/garden/plant-types - Get all available plant types
router.get('/plant-types', getPlantTypes);

module.exports = router;
