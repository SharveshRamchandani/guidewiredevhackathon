const express = require('express');
const router  = express.Router();

const profileController = require('../controllers/profileController');
const { requireWorkerAuth } = require('../middleware/authMiddleware');

// ============================================================================
//  Profile Routes — /api/profile
//  All routes require a valid worker JWT (requireWorkerAuth sets req.user).
// ============================================================================

// GET  /api/profile              → get own profile
router.get(   '/',        requireWorkerAuth, profileController.getProfile);

// PATCH /api/profile             → update general details (name, city, etc.)
router.patch( '/',        requireWorkerAuth, profileController.updateProfile);

// PATCH /api/profile/bank        → update UPI / payout account
router.patch( '/bank',    requireWorkerAuth, profileController.updateBankDetails);

// PATCH /api/profile/contact     → update phone or email
router.patch( '/contact', requireWorkerAuth, profileController.updateContactDetails);

module.exports = router;
