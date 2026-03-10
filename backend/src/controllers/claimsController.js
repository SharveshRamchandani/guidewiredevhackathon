const claimsService = require('../services/claimsService');

async function autoInitiate(req, res, next) {
  try {
    const { policy_id, event_id, type, description } = req.body;
    const claim = await claimsService.initiateClaimAuto({
      workerId: req.user.id, policyId: policy_id,
      eventId: event_id, type, description,
    });
    res.status(201).json({ success: true, message: 'Claim initiated.', data: claim });
  } catch (e) { next(e); }
}

async function getWorkerClaims(req, res, next) {
  try { res.json({ success: true, data: await claimsService.getClaimsByWorker(req.params.id) }); }
  catch (e) { next(e); }
}

async function getMyClaims(req, res, next) {
  try { res.json({ success: true, data: await claimsService.getClaimsByWorker(req.user.id) }); }
  catch (e) { next(e); }
}

async function getClaimStatus(req, res, next) {
  try { res.json({ success: true, data: await claimsService.getClaimStatus(req.params.id, req.user.id) }); }
  catch (e) { next(e); }
}

// Kept for compatibility — admin approve/reject lives in adminController
async function approveClaim(req, res, next) {
  try { res.json({ success: true, message: 'Approved.', data: await claimsService.approveClaim(req.params.id) }); }
  catch (e) { next(e); }
}

async function rejectClaim(req, res, next) {
  try { res.json({ success: true, message: 'Rejected.', data: await claimsService.rejectClaim(req.params.id, req.body.reason) }); }
  catch (e) { next(e); }
}

module.exports = { autoInitiate, getWorkerClaims, getMyClaims, getClaimStatus, approveClaim, rejectClaim };
