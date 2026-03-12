// ============================================================
// GigShield — Policy Routes
// Base: /api/policy
// ============================================================

const express = require('express');
const router = express.Router();
const policyService = require('../services/policyService'); // adjust path
const { requireWorkerAuth } = require('../middleware/authMiddleware'); // adjust path
const { query } = require('../config/db');

// ─────────────────────────────────────────
// ERROR HANDLER WRAPPER
// ─────────────────────────────────────────
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((err) => {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    res.status(status).json({ success: false, message });
  });

// ─────────────────────────────────────────
// PUBLIC ROUTES (no auth needed)
// ─────────────────────────────────────────

// GET /api/policy/plans
// List all available plans
router.get('/plans', asyncHandler(async (req, res) => {
  const plans = await policyService.listPlans();
  res.json({ success: true, plans });
}));

// ─────────────────────────────────────────
// PROTECTED ROUTES (worker must be logged in)
// ─────────────────────────────────────────

// POST /api/policy/quote
// Get a personalised quote for a plan
// Body: { plan_id }
router.post('/quote', requireWorkerAuth, asyncHandler(async (req, res) => {
  const { plan_id } = req.body;
  if (!plan_id) {
    return res.status(400).json({ success: false, message: 'plan_id is required' });
  }
  const quote = await policyService.generateQuote(req.worker.id, plan_id);
  res.json({ success: true, quote });
}));

// POST /api/policy/create
// Purchase a policy
// Body: { plan_id }
router.post('/create', requireWorkerAuth, asyncHandler(async (req, res) => {
  const { plan_id } = req.body;
  if (!plan_id) {
    return res.status(400).json({ success: false, message: 'plan_id is required' });
  }
  const result = await policyService.createPolicy(req.worker.id, plan_id);
  res.status(201).json({ success: true, ...result });
}));

// GET /api/policy/my
// Get all policies for logged in worker
router.get('/my', requireWorkerAuth, asyncHandler(async (req, res) => {
  const policies = await policyService.getWorkerPolicies(req.worker.id);
  res.json({ success: true, policies });
}));

// GET /api/policy/:id
// Get specific policy by ID
router.get('/:id', requireWorkerAuth, asyncHandler(async (req, res) => {
  const policy = await policyService.getPolicyById(req.params.id, req.worker.id);
  res.json({ success: true, policy });
}));

// POST /api/policy/:id/renew
// Renew an expired/cancelled policy
router.post('/:id/renew', requireWorkerAuth, asyncHandler(async (req, res) => {
  const result = await policyService.renewPolicy(req.params.id, req.worker.id);
  res.json({ success: true, ...result });
}));

// POST /api/policy/:id/cancel
// Cancel an active policy
router.post('/:id/cancel', requireWorkerAuth, asyncHandler(async (req, res) => {
  const result = await policyService.cancelPolicy(req.params.id, req.worker.id);
  res.json({ success: true, ...result });
}));

// PATCH /api/policy/:id/auto-renew
// Toggle auto-renew on an active policy
// Body: { auto_renew: boolean }
router.patch('/:id/auto-renew', requireWorkerAuth, asyncHandler(async (req, res) => {
  const { auto_renew } = req.body;
  if (typeof auto_renew !== 'boolean') {
    return res.status(400).json({ success: false, message: 'auto_renew must be a boolean' });
  }
  const { rows } = await query(
    `UPDATE policies SET auto_renew = $1, updated_at = NOW()
     WHERE id = $2 AND worker_id = $3 AND status = 'active'
     RETURNING *`,
    [auto_renew, req.params.id, req.worker.id]
  );
  if (!rows.length) {
    return res.status(404).json({ success: false, message: 'Active policy not found' });
  }
  res.json({ success: true, policy: rows[0], message: `Auto-renew ${auto_renew ? 'enabled' : 'disabled'}` });
}));

module.exports = router;
