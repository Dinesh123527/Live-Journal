const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const {
  createLifeChapter,
  listLifeChapters,
  getLifeChapter,
  updateLifeChapter,
  closeLifeChapter,
  deleteLifeChapter
} = require('../controllers/lifeChapterController');

router.use(authenticateToken);

router.post('/', createLifeChapter);
router.get('/', listLifeChapters);
router.get('/:id', getLifeChapter);
router.put('/:id', updateLifeChapter);
router.post('/:id/close', closeLifeChapter);
router.delete('/:id', deleteLifeChapter);

module.exports = router;