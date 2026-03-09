const policyService = require('../services/policyService');

async function getPlans(req, res, next) {
  try { res.json({ success: true, data: await policyService.listPlans() }); }
  catch (e) { next(e); }
}

async function getQuote(req, res, next) {
  try {
    const { plan_id } = req.body;
    res.json({ success: true, data: await policyService.generateQuote({ workerId: req.user.id, planId: plan_id }) });
  } catch (e) { next(e); }
}

async function createPolicy(req, res, next) {
  try {
    const { plan_id, start_date, auto_renew } = req.body;
    const policy = await policyService.createPolicy({ workerId: req.user.id, planId: plan_id, startDate: start_date, autoRenew: auto_renew });
    res.status(201).json({ success: true, message: 'Policy created.', data: policy });
  } catch (e) { next(e); }
}

async function getMyPolicies(req, res, next) {
  try { res.json({ success: true, data: await policyService.getWorkerPolicies(req.user.id) }); }
  catch (e) { next(e); }
}

async function getPolicy(req, res, next) {
  try { res.json({ success: true, data: await policyService.getPolicyById(req.params.id, req.user.id) }); }
  catch (e) { next(e); }
}

async function renewPolicy(req, res, next) {
  try { res.json({ success: true, message: 'Renewed.', data: await policyService.renewPolicy(req.params.id, req.user.id) }); }
  catch (e) { next(e); }
}

module.exports = { getPlans, getQuote, createPolicy, getMyPolicies, getPolicy, renewPolicy };
