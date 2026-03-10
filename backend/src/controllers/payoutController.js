const payoutService = require('../services/payoutService');

async function initiatePayout(req, res, next) {
  try {
    const payout = await payoutService.initiatePayout({ claimId: req.body.claim_id, workerId: req.user.id });
    res.status(201).json({ success: true, message: 'Payout initiated.', data: payout });
  } catch (e) { next(e); }
}

async function getWorkerPayouts(req, res, next) {
  try { res.json({ success: true, data: await payoutService.getPayoutsByWorker(req.params.id) }); }
  catch (e) { next(e); }
}

async function getMyPayouts(req, res, next) {
  try { res.json({ success: true, data: await payoutService.getPayoutsByWorker(req.user.id) }); }
  catch (e) { next(e); }
}

async function getPayoutStatus(req, res, next) {
  try { res.json({ success: true, data: await payoutService.getPayoutStatus(req.params.id, req.user.id) }); }
  catch (e) { next(e); }
}

module.exports = { initiatePayout, getWorkerPayouts, getMyPayouts, getPayoutStatus };
