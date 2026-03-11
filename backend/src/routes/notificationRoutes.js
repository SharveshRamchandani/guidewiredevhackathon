const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireWorkerAuth, requireAdminAuth, requireSuperAdmin } = require('../middleware/authMiddleware');

// Get notifications based on token data. This requires authentication middleware.
// For testing purposes during hackathon, you could remove middleware temporarily, but ideally keep it.
// Assuming auth middlewares populate req.user = { id: '...', role: '...' }

// Route for workers to get their notifications
router.get('/worker', requireWorkerAuth, notificationController.getNotifications);

// Route for admins to get their notifications
router.get('/admin', requireAdminAuth, notificationController.getNotifications);

// Route for superadmins to get their notifications
router.get('/superadmin', requireSuperAdmin, notificationController.getNotifications);

// Fallback/Test Route that uses Query arguments instead of strict JWT matching
// Useful for early testing before auth is fully plugged into the frontend HTTP calls
router.get('/test', notificationController.getNotifications);

module.exports = router;
