const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/policyController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.get('/plans', ctrl.getPlans); // public — list available plans

router.use(authenticate);

router.post('/quote',
  [body('plan_id').notEmpty().withMessage('plan_id (UUID) required')],
  validate, ctrl.getQuote
);
router.post('/create',
  [
    body('plan_id').notEmpty().withMessage('plan_id (UUID) required'),
    body('start_date').optional().isISO8601().withMessage('start_date must be YYYY-MM-DD'),
    body('auto_renew').optional().isBoolean(),
  ],
  validate, ctrl.createPolicy
);
router.get('/my',                                                     ctrl.getMyPolicies);
router.get('/:id', [param('id').notEmpty()],    validate,             ctrl.getPolicy);
router.post('/:id/renew', [param('id').notEmpty()], validate,         ctrl.renewPolicy);

module.exports = router;
