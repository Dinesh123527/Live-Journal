require('dotenv').config();
const db = require('../db');
const aggregator = require('./moodAggregator');

async function backfill(days = 365) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  const startDate = start.toISOString().slice(0,10);
  const endDate = end.toISOString().slice(0,10);
  console.log(`[backfill] Backfilling from ${startDate} to ${endDate}`);
  await aggregator.computeForAllUsersForRange(startDate, endDate);
  console.log('[backfill] Done');
}

if (require.main === module) {
  const days = Number(process.argv[2] || process.env.BACKFILL_DAYS || 365);
  backfill(days).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { backfill };