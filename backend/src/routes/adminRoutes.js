const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// ─── Public (no auth) ─────────────────────────────────────────────────────────
router.post('/auth/login',
  [body('email').isEmail().withMessage('Valid email required'),
   body('password').notEmpty().withMessage('Password required')],
  validate, ctrl.login
);

// ─── Protected (admin JWT) ────────────────────────────────────────────────────
router.use(authenticateAdmin);

router.post('/auth/logout', ctrl.logout);
router.get('/dashboard',    ctrl.dashboard);

// Workers
router.get('/workers', ctrl.getWorkers);
router.patch('/workers/:id/kyc',
  [
    param('id').notEmpty().withMessage('Worker ID required'),
    body('kyc_status').isIn(['pending', 'verified']).withMessage('kyc_status must be pending or verified'),
  ],
  validate, ctrl.updateKyc
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
router.get('/config',   ctrl.getConfig);
router.patch('/config', ctrl.updateConfig);

module.exports = router;
