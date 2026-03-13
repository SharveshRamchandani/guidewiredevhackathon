const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/adminController');
const { requireAdminAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');

// ─── Protected (admin JWT) ────────────────────────────────────────────────────
// NOTE: Login is handled by /api/admin/auth/* (adminAuthRoutes) — do NOT add /auth/login here.
router.use(requireAdminAuth);

router.post('/auth/logout', ctrl.logout);
router.get('/dashboard', ctrl.dashboard);

// Workers
router.get('/workers', ctrl.getWorkers);
router.patch('/workers/:id/kyc',
  [
    param('id').notEmpty().withMessage('Worker ID required'),
    body('kyc_status').isIn(['pending', 'verified']).withMessage('kyc_status must be pending or verified'),
  ],
  validate, ctrl.updateKyc
);

// ─── Scenario 4: Admin Action Events (Fraud Review + Flag) ───────────────────
// POST /api/admin/workers/:id/flag          → Flag worker account
router.post('/workers/:id/flag',
  [param('id').notEmpty().withMessage('Worker ID required')],
  validate, ctrl.flagWorker
);

// POST /api/admin/claims/:id/fraud-review/start    → Start fraud review
router.post('/claims/:id/fraud-review/start',
  [param('id').notEmpty().withMessage('Claim ID required'),
   body('worker_id').notEmpty().withMessage('worker_id required')],
  validate, ctrl.startFraudReview
);

// POST /api/admin/claims/:id/fraud-review/accept   → Accept after fraud review
router.post('/claims/:id/fraud-review/accept',
  [param('id').notEmpty().withMessage('Claim ID required'),
   body('worker_id').notEmpty().withMessage('worker_id required')],
  validate, ctrl.acceptFraudReview
);

// POST /api/admin/claims/:id/fraud-review/reject   → Reject after fraud review
router.post('/claims/:id/fraud-review/reject',
  [param('id').notEmpty().withMessage('Claim ID required'),
   body('worker_id').notEmpty().withMessage('worker_id required')],
  validate, ctrl.rejectFraudReview
);

// Policies
router.get('/policies', ctrl.getPolicies);

// Claims
router.get('/claims', ctrl.getClaims);
router.post('/claims/:id/approve',
  [param('id').notEmpty().withMessage('Claim ID required')],
  validate, ctrl.approveClaim
);
router.post('/claims/:id/reject',
  [
    param('id').notEmpty().withMessage('Claim ID required'),
    body('reason').optional().isString(),
  ],
  validate, ctrl.rejectClaim
);

// Events
router.get('/events', ctrl.getEvents);

// Analytics
router.get('/analytics', ctrl.getAnalytics);

// System config (trigger engine toggle)
router.get('/config', ctrl.getConfig);
router.patch('/config', ctrl.updateConfig);

module.exports = router;

