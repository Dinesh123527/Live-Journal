require('dotenv').config();
const cron = require('node-cron');
const db = require('../db');

const DRAFT_RETENTION_DAYS = Number(process.env.DRAFT_RETENTION_DAYS || 180);
const VERSION_RETENTION_DAYS = Number(process.env.VERSION_RETENTION_DAYS || 365);
const CRON_SCHEDULE = process.env.CLEANUP_CRON || '0 3 * * *';

let running = false;

async function runCleanup() {
  if (running) {
    console.log('[cleanupDrafts] Previous run still in progress — skipping this tick.');
    return;
  }
  running = true;

  const startedAt = new Date();
  console.log(`[cleanupDrafts] Starting cleanup at ${startedAt.toISOString()}`);
  try {
    // Delete drafts older than retention
    const deleteDraftsSql = 'DELETE FROM drafts WHERE updated_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
    const [draftsRes] = await db.query(deleteDraftsSql, [DRAFT_RETENTION_DAYS]);
    const deletedDrafts = draftsRes?.affectedRows ?? 0;

    // Delete draft_versions older than retention
    const deleteVersionsSql = 'DELETE FROM draft_versions WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
    const [versionsRes] = await db.query(deleteVersionsSql, [VERSION_RETENTION_DAYS]);
    const deletedVersions = versionsRes?.affectedRows ?? 0;

    // Delete orphaned draft_attachments (metadata cleanup)
    const deleteOrphanAttachmentsSql = `
      DELETE da FROM draft_attachments da
      LEFT JOIN drafts d ON d.id = da.draft_id
      WHERE d.id IS NULL
    `;
    const [orphanRes] = await db.query(deleteOrphanAttachmentsSql);
    const deletedOrphanAttachments = orphanRes?.affectedRows ?? 0;

    const finishedAt = new Date();
    console.log(
      `[cleanupDrafts] Completed at ${finishedAt.toISOString()}: drafts=${deletedDrafts}, versions=${deletedVersions}, orphan_attachments=${deletedOrphanAttachments}`
    );
  } catch (err) {
    console.error('[cleanupDrafts] Cleanup job failed:', err);
  } finally {
    running = false;
  }
}

function start() {
  // Run once immediately (safe on startup)
  runCleanup().catch((e) => {
    console.error('[cleanupDrafts] Initial run failed:', e);
  });

  // Schedule future runs using cron expression
  try {
    const task = cron.schedule(
      CRON_SCHEDULE,
      () => {
        runCleanup().catch((e) => {
          console.error('[cleanupDrafts] Scheduled run error:', e);
        });
      },
      {
        scheduled: true,
        timezone: process.env.CLEANUP_TIMEZONE || undefined,
      }
    );
    console.log(`[cleanupDrafts] Scheduled cleanup with cron "${CRON_SCHEDULE}"`);
    return task;
  } catch (err) {
    console.error('[cleanupDrafts] Invalid cron schedule:', CRON_SCHEDULE, err);
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const intervalId = setInterval(() => {
      runCleanup().catch((e) => console.error('[cleanupDrafts] Interval run error:', e));
    }, ONE_DAY_MS);
    console.log('[cleanupDrafts] Fallback scheduled cleanup using setInterval (daily).');
    return {
      stop: () => clearInterval(intervalId),
    };
  }
}

module.exports = { start, runCleanup };