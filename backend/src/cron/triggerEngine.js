const cron = require('node-cron');
const { runAllTriggers }    = require('../services/triggerService');
const { processPayoutQueue } = require('../services/payoutService');

function startTriggerEngine() {
  const schedule = process.env.TRIGGER_CRON_INTERVAL || '*/15 * * * *';

  if (!cron.validate(schedule)) {
    console.error(`[Trigger Engine] Invalid cron: "${schedule}"`); return;
  }

  console.log(`\n⚙️   Trigger Engine  →  schedule: "${schedule}"`);

  // Main trigger check — weather / AQI / alerts per zone
  cron.schedule(schedule, async () => {
    try { await runAllTriggers(); }
    catch (e) { console.error('[Trigger Engine] Error:', e.message); }
  });

  // Payout queue processor — every 30 seconds
  cron.schedule('*/30 * * * * *', async () => {
    try { await processPayoutQueue(); }
    catch (e) { console.error('[Payout Queue] Error:', e.message); }
  });
}

module.exports = { startTriggerEngine };
