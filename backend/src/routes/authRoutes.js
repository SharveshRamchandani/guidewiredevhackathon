const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('phone').trim().notEmpty().withMessage('Phone required'),
    body('password').isLength({ min: 6 }).withMessage('Min 6 characters'),
    body('platform').trim().notEmpty().withMessage('Platform required (Swiggy/Zomato)'),
    body('zone_id').optional().isInt(),
    body('city_id').optional().isInt(),
    body('upi').optional().trim(),
  ],
  validate, ctrl.register
);

router.post('/login',
  [
    body('phone').trim().notEmpty().withMessage('Phone required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate, ctrl.login
);

router.get('/me',      authenticate, ctrl.me);
router.post('/logout', authenticate, ctrl.logout);

module.exports = router;
