const notificationService = require('../services/notificationService');

const notificationController = {
    /**
     * Fetch notifications from Redis for the current user
     * Expects req.user (from auth middleware) to have { id, role }
     */
    async getNotifications(req, res) {
        try {
            // Depending on your auth setup, you get role/ID here. 
            // Default to what the user sent if for mock testing, else use token data.
            const userId = req.user?.id || req.query.userId;
            const role = req.user?.role || req.query.role; // 'worker', 'admin', 'superadmin'

            if (!role) {
                return res.status(400).json({ error: 'Role is required to fetch notifications' });
            }

            const notifications = await notificationService.getNotifications(userId, role);
            res.json(notifications);

        } catch (error) {
            console.error('[NotificationController] Error fetching notifications:', error);
            res.status(500).json({ error: 'Server error fetching notifications' });
        }
    },

    /**
     * Additional REST endpoints could go here:
     * markAsRead(), deleteNotification(), markFavorite(), etc.
     */
};

module.exports = notificationController;
