const notificationService = require('../services/notificationService');

// ============================================================================
//  NotificationController
//  Bridges HTTP requests to the NotificationService (Redis-backed cache).
//
//  All authenticated routes populate req.user = { id, role }
//  via auth middleware. Test routes fall back to query params.
// ============================================================================

// ─── Helper ──────────────────────────────────────────────────────────────────

function resolveUserRole(req) {
  const userId = req.user?.id || req.admin?.id || req.worker?.id || req.query.userId;
  // Normalize super_admin (DB name) to superadmin (frontend/logic name)
  let role = req.user?.role || req.admin?.role || req.worker?.role || req.query.role;
  if (role === 'super_admin') role = 'superadmin';
  return { userId, role };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * GET /api/notifications/:roleGroup
 * Fetch all notifications for the authenticated user.
 */
async function getNotifications(req, res) {
  try {
    const { userId, role } = resolveUserRole(req);
    if (!role) return res.status(400).json({ success: false, error: 'Role is required.' });

    const notifications = await notificationService.getNotifications(userId, role);
    return res.json({ success: true, count: notifications.length, data: notifications });
  } catch (err) {
    console.error('[NotificationController] getNotifications error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications.' });
  }
}

/**
 * GET /api/notifications/unread-count
 * Return the count of unread notifications for the user.
 */
async function getUnreadCount(req, res) {
  try {
    const { userId, role } = resolveUserRole(req);
    if (!role) return res.status(400).json({ success: false, error: 'Role is required.' });

    const count = await notificationService.getUnreadCount(userId, role);
    return res.json({ success: true, unreadCount: count });
  } catch (err) {
    console.error('[NotificationController] getUnreadCount error:', err);
    return res.status(500).json({ success: false, error: 'Failed to get unread count.' });
  }
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
async function markAsRead(req, res) {
  try {
    const { userId, role } = resolveUserRole(req);
    if (!role) return res.status(400).json({ success: false, error: 'Role is required.' });

    const notificationId = req.params.id;
    const found = await notificationService.markAsRead(userId, role, notificationId);

    if (!found) return res.status(404).json({ success: false, error: 'Notification not found.' });
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('[NotificationController] markAsRead error:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark as read.' });
  }
}

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all user notifications as read.
 */
async function markAllRead(req, res) {
  try {
    const { userId, role } = resolveUserRole(req);
    if (!role) return res.status(400).json({ success: false, error: 'Role is required.' });

    const count = await notificationService.markAllRead(userId, role);
    return res.json({ success: true, message: `${count} notification(s) marked as read.` });
  } catch (err) {
    console.error('[NotificationController] markAllRead error:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark all as read.' });
  }
}

/**
 * DELETE /api/notifications/:id
 * Delete a single notification by id.
 */
async function deleteNotification(req, res) {
  try {
    const { userId, role } = resolveUserRole(req);
    if (!role) return res.status(400).json({ success: false, error: 'Role is required.' });

    const notificationId = req.params.id;
    const removed = await notificationService.deleteNotification(userId, role, notificationId);

    if (!removed) return res.status(404).json({ success: false, error: 'Notification not found.' });
    return res.json({ success: true, message: 'Notification deleted.' });
  } catch (err) {
    console.error('[NotificationController] deleteNotification error:', err);
    return res.status(500).json({ success: false, error: 'Failed to delete notification.' });
  }
}

/**
 * DELETE /api/notifications/clear-all
 * Clear all notifications for the authenticated user.
 */
async function clearAll(req, res) {
  try {
    const { userId, role } = resolveUserRole(req);
    if (!role) return res.status(400).json({ success: false, error: 'Role is required.' });

    await notificationService.clearAll(userId, role);
    return res.json({ success: true, message: 'All notifications cleared.' });
  } catch (err) {
    console.error('[NotificationController] clearAll error:', err);
    return res.status(500).json({ success: false, error: 'Failed to clear notifications.' });
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  deleteNotification,
  clearAll,
};
