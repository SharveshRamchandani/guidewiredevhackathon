const router = require('express').Router();
const { body, param } = require('express-validator');
const ctrl = require('../controllers/payoutController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.use(authenticate);

router.post('/initiate',
  [body('claim_id').notEmpty().withMessage('claim_id required')],
  validate, ctrl.initiatePayout
);
router.get('/my',                                                     ctrl.getMyPayouts);
router.get('/worker/:id', [param('id').notEmpty()], validate,         ctrl.getWorkerPayouts);
router.get('/:id/status', [param('id').notEmpty()], validate,         ctrl.getPayoutStatus);

module.exports = router;
