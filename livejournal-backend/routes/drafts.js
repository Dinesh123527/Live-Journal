// backend/routes/drafts.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/validateAuth');
const drafts = require('../controllers/draftsController');
const multer = require('multer');
const upload = multer({ dest: '/tmp/uploads' });

router.use(authenticateToken);

router.get('/', drafts.listDrafts);
router.get('/latest', drafts.getLatestDraft); // Add this BEFORE /:id route
router.get('/:id', drafts.getDraft);
router.post('/', drafts.createDraft);
router.put('/:id', drafts.updateDraft);
router.post('/autosave', drafts.autosaveDraft);
router.delete('/:id', drafts.deleteDraft);
router.post('/:id/publish', drafts.publishDraft);

router.get('/:id/versions', drafts.listDraftVersions);
router.get('/:id/versions/:vid', drafts.getDraftVersion);
router.post('/:id/revert', drafts.revertDraftToVersion);

router.post('/:id/attachments', upload.single('file'), drafts.uploadDraftAttachment);
router.get('/:id/attachments', drafts.listDraftAttachments);

module.exports = router;
