const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const {
  listEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  getPinnedEntries,
  getHighlights,
} = require('../controllers/entriesController');

router.use(authenticateToken);

router.get('/', listEntries);
router.get('/pinned', getPinnedEntries);
router.get('/highlights', getHighlights); // New highlights endpoint
router.get('/:id', getEntry);
router.post('/', createEntry);
router.put('/:id', updateEntry);
router.delete('/:id', deleteEntry); 

module.exports = router;