const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const searchCtrl = require('../controllers/searchController');

router.use(authenticateToken);

router.get('/', searchCtrl.searchEntries);

module.exports = router;
