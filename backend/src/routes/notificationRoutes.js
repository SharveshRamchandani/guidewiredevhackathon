const express = require('express');
const router  = express.Router();

const notificationController = require('../controllers/notificationController');
const {
  requireWorkerAuth,
  requireAdminAuth,
  requireSuperAdmin,
} = require('../middleware/authMiddleware');

// ============================================================================
//  Notification Routes — /api/notifications
//
//  Auth-protected routes use JWT middleware which populates req.user = { id, role }
//  The /test route accepts ?userId=&role= query params for UI testing without auth.
// ============================================================================

// ─── Worker Routes ─────────────────────────────────────────────────────────────
// GET  /api/notifications/worker              → fetch all worker notifications
// GET  /api/notifications/worker/unread-count → unread badge count
// PATCH /api/notifications/worker/mark-all-read
// PATCH /api/notifications/worker/:id/read
// DELETE /api/notifications/worker/:id
// DELETE /api/notifications/worker/clear-all

router.get(   '/worker',                requireWorkerAuth, notificationController.getNotifications);
router.get(   '/worker/unread-count',   requireWorkerAuth, notificationController.getUnreadCount);
router.patch( '/worker/mark-all-read',  requireWorkerAuth, notificationController.markAllRead);
router.patch( '/worker/:id/read',       requireWorkerAuth, notificationController.markAsRead);
router.delete('/worker/clear-all',      requireWorkerAuth, notificationController.clearAll);
router.delete('/worker/:id',            requireWorkerAuth, notificationController.deleteNotification);

// ─── Admin Routes ─────────────────────────────────────────────────────────────
router.get(   '/admin',                 requireAdminAuth, notificationController.getNotifications);
router.get(   '/admin/unread-count',    requireAdminAuth, notificationController.getUnreadCount);
router.patch( '/admin/mark-all-read',   requireAdminAuth, notificationController.markAllRead);
router.patch( '/admin/:id/read',        requireAdminAuth, notificationController.markAsRead);
router.delete('/admin/clear-all',       requireAdminAuth, notificationController.clearAll);
router.delete('/admin/:id',             requireAdminAuth, notificationController.deleteNotification);

// ─── Super Admin Routes ───────────────────────────────────────────────────────
router.get(   '/superadmin',            requireSuperAdmin, notificationController.getNotifications);
router.get(   '/superadmin/unread-count', requireSuperAdmin, notificationController.getUnreadCount);
router.patch( '/superadmin/mark-all-read', requireSuperAdmin, notificationController.markAllRead);
router.patch( '/superadmin/:id/read',   requireSuperAdmin, notificationController.markAsRead);
router.delete('/superadmin/clear-all',  requireSuperAdmin, notificationController.clearAll);
router.delete('/superadmin/:id',        requireSuperAdmin, notificationController.deleteNotification);

// ─── Test / Dev Route (no auth required) ─────────────────────────────────────
// Usage: GET /api/notifications/test?userId=W-102&role=worker
// Usage: GET /api/notifications/test?userId=A-001&role=admin
router.get(   '/test',                  notificationController.getNotifications);
router.get(   '/test/unread-count',     notificationController.getUnreadCount);
router.patch( '/test/mark-all-read',    notificationController.markAllRead);
router.patch( '/test/:id/read',         notificationController.markAsRead);
router.delete('/test/clear-all',        notificationController.clearAll);
router.delete('/test/:id',              notificationController.deleteNotification);

module.exports = router;
