const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/claimsController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.post('/auto-initiate',
  [
    body('policy_id').notEmpty().withMessage('policy_id required'),
    body('type').optional().isString(),
    body('description').optional().isString(),
  ],
  validate, ctrl.autoInitiate
);
router.get('/my',                                                    ctrl.getMyClaims);
router.get('/worker/:id', [param('id').notEmpty()], validate,        ctrl.getWorkerClaims);
router.get('/:id/status', [param('id').notEmpty()], validate,        ctrl.getClaimStatus);
router.post('/:id/approve', [param('id').notEmpty()], validate,      ctrl.approveClaim);
router.post('/:id/reject',
  [
    param('id').notEmpty(),
    body('reason').optional().isString(),
  ],
  validate, ctrl.rejectClaim
);

module.exports = router;
