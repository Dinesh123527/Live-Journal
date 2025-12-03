require('dotenv').config();
const db = require('../db');
const multer = require('multer');
const upload = multer({ dest: '/tmp/uploads' });
const path = require('path');
const fs = require('fs').promises;

let analyzeMoodForText = null;
try {
  const ai = require('../utils/ai');
  if (typeof ai.analyzeMoodForText === 'function') analyzeMoodForText = ai.analyzeMoodForText;
} catch (e) {
  console.error('AI mood analysis module not found, skipping mood analysis.');
}

const sanitize = (v) => (v === undefined ? null : v);

function roundScore(v, digits = 2) {
  if (v === null || v === undefined) return v;
  const n = Number(v);
  if (!isFinite(n)) return v;
  const pow = Math.pow(10, digits);
  return Math.round(n * pow) / pow;
}

function keywordMood(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/\b(stress|stressed|overwhelmed|anxious|anxiety|burnout)\b/.test(t)) {
    return { mood_label: 'stressed', mood_score: 0.25, source: 'keywords' };
  }
  if (/\b(sad|sadness|depress|lonely)\b/.test(t)) {
    return { mood_label: 'sad', mood_score: 0.18, source: 'keywords' };
  }
  if (/\b(angry|anger|mad|furious)\b/.test(t)) {
    return { mood_label: 'angry', mood_score: 0.12, source: 'keywords' };
  }
  if (/\b(happy|joy|joyful|glad|excited|productive|proud)\b/.test(t)) {
    return { mood_label: 'happy', mood_score: 0.82, source: 'keywords' };
  }
  return null;
}

async function saveDraftVersion(userId, draftId, title, body, metadata = null) {
  try {
    await db.query(
      'INSERT INTO draft_versions (draft_id, user_id, title, body, metadata) VALUES (?, ?, ?, ?, ?)',
      [draftId, userId, title, body, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error('saveDraftVersion failed', err);
  }
}

/**
 * Attachments helper: store metadata in DB. Actual file storage should be S3/Cloudinary.
 */
async function addDraftAttachment(userId, draftId, { filename, mime, url, size }) {
  const [result] = await db.query(
    'INSERT INTO draft_attachments (draft_id, user_id, filename, mime, url, size) VALUES (?, ?, ?, ?, ?, ?)',
    [draftId, userId, filename, mime, url, size]
  );
  const [rows] = await db.query('SELECT * FROM draft_attachments WHERE id = ?', [result.insertId]);
  return rows[0];
}

/* -------------------------
   Endpoints
   ------------------------- */

/**
 * GET /api/drafts
 */
async function listDrafts(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      'SELECT id, title, body, created_at, updated_at FROM drafts WHERE user_id = ? ORDER BY updated_at DESC',
      [userId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('listDrafts error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/drafts/:id
 */
async function getDraft(req, res) {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const [rows] = await db.query('SELECT id, title, body, is_encrypted, encryption_meta, created_at, updated_at FROM drafts WHERE id = ? AND user_id = ?', [
      id,
      userId,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Draft not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('getDraft error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/drafts
 * create new draft + version snapshot
 */
async function createDraft(req, res) {
  try {
    const userId = req.user.id;
    const { title, body, is_encrypted = 0, encryption_meta = null } = req.body;

    const [result] = await db.query('INSERT INTO drafts (user_id, title, body, is_encrypted, encryption_meta) VALUES (?, ?, ?, ?, ?)', [
      userId,
      sanitize(title),
      sanitize(body),
      is_encrypted ? 1 : 0,
      encryption_meta ? JSON.stringify(encryption_meta) : null,
    ]);
    const draftId = result.insertId;

    // Save first version snapshot
    await saveDraftVersion(userId, draftId, title, body, { is_encrypted: !!is_encrypted, encryption_meta: encryption_meta ?? null });

    const [rows] = await db.query('SELECT id, title, body, is_encrypted, encryption_meta, created_at, updated_at FROM drafts WHERE id = ?', [draftId]);
    res.status(201).json({ draft: rows[0] });
  } catch (err) {
    console.error('createDraft error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * PUT /api/drafts/:id
 * update an existing draft (writes version)
 * Accepts client_updated_at for optimistic conflict detection (ISO string)
 */
async function updateDraft(req, res) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const { title, body, client_updated_at } = req.body;

    // ownership
    const [exists] = await db.query('SELECT id, updated_at FROM drafts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!exists.length) return res.status(404).json({ error: 'Draft not found' });

    // optimistic conflict detection
    if (client_updated_at) {
      const serverUpdatedAt = new Date(exists[0].updated_at).getTime();
      const clientTs = new Date(client_updated_at).getTime();
      // if server has a newer update than client, respond with conflict info
      if (serverUpdatedAt > clientTs + 500) {
        const [latest] = await db.query('SELECT id, title, body, created_at, updated_at FROM drafts WHERE id = ?', [id]);
        return res.status(409).json({ error: 'Conflict', serverDraft: latest[0] });
      }
    }

    await db.query(
      'UPDATE drafts SET title = COALESCE(?, title), body = COALESCE(?, body), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [sanitize(title), sanitize(body), id, userId]
    );

    // save version snapshot after update
    await saveDraftVersion(userId, id, title ?? null, body ?? null, null);

    const [rows] = await db.query('SELECT id, title, body, created_at, updated_at FROM drafts WHERE id = ?', [id]);
    res.json({ draft: rows[0] });
  } catch (err) {
    console.error('updateDraft error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/drafts/autosave
 * autosave: create or update and always write a version
 */
async function autosaveDraft(req, res) {
  try {
    const userId = req.user.id;
    const { id, title, body, client_updated_at } = req.body;

    if (id) {
      // attempt update; check ownership
      const [exists] = await db.query('SELECT id, updated_at FROM drafts WHERE id = ? AND user_id = ?', [id, userId]);
      if (exists.length) {
        // optimistic conflict detection (non-fatal for autosave)
        if (client_updated_at) {
          const serverUpdatedAt = new Date(exists[0].updated_at).getTime();
          const clientTs = new Date(client_updated_at).getTime();
          if (serverUpdatedAt > clientTs + 500) {
            const [latest] = await db.query('SELECT id, title, body, created_at, updated_at FROM drafts WHERE id = ?', [id]);
            return res.status(409).json({ error: 'Conflict', serverDraft: latest[0] });
          }
        }

        await db.query(
          'UPDATE drafts SET title = COALESCE(?, title), body = COALESCE(?, body), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
          [sanitize(title), sanitize(body), id, userId]
        );

        // save version snapshot
        await saveDraftVersion(userId, id, title ?? null, body ?? null, { autosave: true });

        const [rows] = await db.query('SELECT id, title, body, created_at, updated_at FROM drafts WHERE id = ?', [id]);
        return res.json({ draft: rows[0] });
      }
    }

    // create new draft
    const [result] = await db.query('INSERT INTO drafts (user_id, title, body) VALUES (?, ?, ?)', [
      userId,
      sanitize(title),
      sanitize(body),
    ]);
    const draftId = result.insertId;

    await saveDraftVersion(userId, draftId, title ?? null, body ?? null, { autosave: true });

    const [rows] = await db.query('SELECT id, title, body, created_at, updated_at FROM drafts WHERE id = ?', [draftId]);
    return res.json({ draft: rows[0] });
  } catch (err) {
    console.error('autosaveDraft error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * DELETE /api/drafts/:id
 */
async function deleteDraft(req, res) {
  try {
    const userId = req.user.id;
    const id = req.params.id;
    const [result] = await db.query('DELETE FROM drafts WHERE id = ? AND user_id = ?', [id, userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Draft not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('deleteDraft error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/drafts/:id/publish
 * publish draft -> entry, delete draft, move attachments -> entries_attachments
 */
async function publishDraft(req, res) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const { title: overrideTitle, tags, is_private = 1 } = req.body;

    // find draft
    const [rows] = await db.query('SELECT id, title, body FROM drafts WHERE id = ? AND user_id = ?', [id, userId]);
    if (!rows.length) return res.status(404).json({ error: 'Draft not found' });

    const draft = rows[0];
    const finalTitle = overrideTitle ?? draft.title ?? null;
    const finalBody = draft.body ?? '';

    // duplicate check
    const [dups] = await db.query('SELECT id FROM entries WHERE user_id = ? AND title <=> ? AND body = ?', [
      userId,
      finalTitle,
      finalBody,
    ]);
    if (dups.length) {
      // delete draft still (user saved something already)
      await db.query('DELETE FROM drafts WHERE id = ?', [id]);
      return res.status(200).json({ status: 200, message: 'Entry already exists' });
    }

    // mood analysis & rounding
    let mood_label = null;
    let mood_score = null;
    let analysis = null;
    if (analyzeMoodForText) {
      try {
        analysis = await analyzeMoodForText(finalBody);
      } catch (e) {
        console.warn('mood analysis failed', e);
      }
    }

    // keyword override
    const kw = keywordMood(finalBody);
    if (kw) {
      mood_label = kw.mood_label;
      mood_score = roundScore(kw.mood_score, 2);
      analysis = { ...analysis, source: 'keywords', mood_label: mood_label, mood_score: mood_score };
    } else if (analysis) {
      mood_label = analysis.mood_label ?? null;
      mood_score =
        typeof analysis.mood_score !== 'undefined' && analysis.mood_score !== null ? roundScore(analysis.mood_score, 2) : null;
      if (analysis.mood_score !== undefined && analysis.mood_score !== null) {
        analysis.mood_score = roundScore(analysis.mood_score, 2);
      }
    }

    // normalize tags
    let tagsJson = null;
    if (tags !== undefined) {
      if (Array.isArray(tags)) tagsJson = JSON.stringify(tags);
      else if (typeof tags === 'string') {
        try {
          const parsed = JSON.parse(tags);
          if (Array.isArray(parsed)) tagsJson = JSON.stringify(parsed);
        } catch (e) {
          const arr = tags.split(',').map((s) => s.trim()).filter(Boolean);
          tagsJson = JSON.stringify(arr);
        }
      }
    }

    // create entry
    const [result] = await db.query(
      'INSERT INTO entries (user_id, title, body, mood_label, mood_score, tags, is_private) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, finalTitle, finalBody, mood_label, mood_score, tagsJson, is_private ? 1 : 0]
    );
    const entryId = result.insertId;

    // move attachments: copy draft_attachments -> entries_attachments then delete draft_attachments
    try {
      const [atts] = await db.query('SELECT * FROM draft_attachments WHERE draft_id = ?', [id]);
      for (const a of atts) {
        await db.query(
          'INSERT INTO entries_attachments (entry_id, user_id, filename, mime, url, size) VALUES (?, ?, ?, ?, ?, ?)',
          [entryId, userId, a.filename, a.mime, a.url, a.size]
        );
      }
      // delete draft attachments
      await db.query('DELETE FROM draft_attachments WHERE draft_id = ?', [id]);
    } catch (e) {
      console.warn('attachment migration failed', e);
    }

    // save a final version snapshot representing the published state
    await saveDraftVersion(userId, id, finalTitle, finalBody, { published_entry_id: entryId });

    // delete draft
    await db.query('DELETE FROM drafts WHERE id = ?', [id]);

    // fetch created entry for response
    const [entryRows] = await db.query('SELECT * FROM entries WHERE id = ?', [entryId]);
    if (entryRows[0] && entryRows[0].mood_score !== null && entryRows[0].mood_score !== undefined) {
      entryRows[0].mood_score = roundScore(entryRows[0].mood_score, 2);
    }

    return res.status(201).json({ entry: entryRows[0], analysis });
  } catch (err) {
    console.error('publishDraft error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/drafts/latest
 * Get the most recently updated draft for dashboard
 */
async function getLatestDraft(req, res) {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      'SELECT id, title, body, created_at, updated_at FROM drafts WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    if (!rows.length) return res.json({ draft: null });
    res.json({ draft: rows[0] });
  } catch (err) {
    console.error('getLatestDraft error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/* -------------------------
   Versioning endpoints
   ------------------------- */

/**
 * GET /api/drafts/:id/versions
 */
async function listDraftVersions(req, res) {
  try {
    const userId = req.user.id;
    const draftId = Number(req.params.id);
    const [rows] = await db.query(
      'SELECT id, title, JSON_LENGTH(metadata) as metadata_len, created_at FROM draft_versions WHERE draft_id = ? AND user_id = ? ORDER BY created_at DESC',
      [draftId, userId]
    );
    res.json({ data: rows });
  } catch (err) {
    console.error('listDraftVersions error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/drafts/:id/versions/:vid
 */
async function getDraftVersion(req, res) {
  try {
    const userId = req.user.id;
    const draftId = Number(req.params.id);
    const vid = Number(req.params.vid);
    const [rows] = await db.query('SELECT id, title, body, metadata, created_at FROM draft_versions WHERE id = ? AND draft_id = ? AND user_id = ?', [
      vid,
      draftId,
      userId,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Version not found' });
    const v = rows[0];
    if (v.metadata) {
      try {
        v.metadata = JSON.parse(v.metadata);
      } catch (e) {
        // ignore
      }
    }
    res.json(v);
  } catch (err) {
    console.error('getDraftVersion error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/drafts/:id/revert
 * body: { versionId }
 * Replaces current draft content with the chosen version and writes a new version entry
 */
async function revertDraftToVersion(req, res) {
  try {
    const userId = req.user.id;
    const draftId = Number(req.params.id);
    const { versionId } = req.body;
    const [rows] = await db.query('SELECT id, title, body FROM draft_versions WHERE id = ? AND draft_id = ? AND user_id = ?', [
      versionId,
      draftId,
      userId,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Version not found' });

    const v = rows[0];
    await db.query('UPDATE drafts SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?', [
      v.title,
      v.body,
      draftId,
      userId,
    ]);

    // save a new version representing the revert action
    await saveDraftVersion(userId, draftId, v.title, v.body, { reverted_from_version: versionId });

    const [updated] = await db.query('SELECT id, title, body, created_at, updated_at FROM drafts WHERE id = ?', [draftId]);
    return res.json({ draft: updated[0] });
  } catch (err) {
    console.error('revertDraftToVersion error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/* -------------------------
   Attachments endpoints
   ------------------------- */

/**
 * POST /api/drafts/:id/attachments
 * Accepts form-data file upload (multer) or a JSON body with `url` if you uploaded to cloud from client.
 */
async function uploadDraftAttachment(req, res) {
  try {
    const userId = req.user.id;
    const draftId = Number(req.params.id);

    // check ownership
    const [exists] = await db.query('SELECT id FROM drafts WHERE id = ? AND user_id = ?', [draftId, userId]);
    if (!exists.length) return res.status(404).json({ error: 'Draft not found' });

    // If client sends a remote URL instead of file
    if (req.body && req.body.url) {
      const { url, filename, mime, size } = req.body;
      const attach = await addDraftAttachment(userId, draftId, { filename: filename ?? path.basename(url), mime: mime ?? null, url, size: size ?? null });
      return res.status(201).json({ attachment: attach });
    }

    // If multer uploaded a file to /tmp/uploads
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file provided. Provide `url` or multipart file.' });

    // Here you should upload file.path to S3 and get remoteUrl, for demo we will use local path
    const remoteUrl = `file://${file.path}`;
    const attach = await addDraftAttachment(userId, draftId, { filename: file.originalname, mime: file.mimetype, url: remoteUrl, size: file.size });

    return res.status(201).json({ attachment: attach });
  } catch (err) {
    console.error('uploadDraftAttachment error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/drafts/:id/attachments
 */
async function listDraftAttachments(req, res) {
  try {
    const userId = req.user.id;
    const draftId = Number(req.params.id);
    const [rows] = await db.query('SELECT id, filename, mime, url, size, created_at FROM draft_attachments WHERE draft_id = ? AND user_id = ?', [
      draftId,
      userId,
    ]);
    res.json({ data: rows });
  } catch (err) {
    console.error('listDraftAttachments error', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  listDrafts,
  getDraft,
  createDraft,
  updateDraft,
  autosaveDraft,
  deleteDraft,
  publishDraft,
  listDraftVersions,
  getDraftVersion,
  revertDraftToVersion,
  uploadDraftAttachment,
  listDraftAttachments,
  getLatestDraft,
};

