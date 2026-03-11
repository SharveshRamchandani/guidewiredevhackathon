const { getRedisClient } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');

class NotificationService {
    /**
     * Pushes a new notification to a specific user's Redis cache
     * 
     * @param {string} userId - ID of the user (e.g., 'W-102', 'admin-1')
     * @param {string} role - 'worker', 'admin', or 'superadmin'
     * @param {string} message - Notification text
     * @param {string} type - 'info', 'alert', 'success', 'warning'
     */
    async pushNotification(userId, role, message, type = 'info') {
        try {
            const notification = {
                id: uuidv4(),
                message,
                type,
                timestamp: new Date().toISOString(),
                isRead: false,
                isFavorite: false,
                isArchived: false,
            };

            const r = await getRedisClient();
            if (!r) {
                console.warn('[NotificationService] Redis is offline. Skipping pushing notification.');
                return notification;
            }

            let key = `notifications:${role}`;
            if (userId) {
                key = `notifications:${role}:${userId}`;
            }

            await r.lPush(key, JSON.stringify(notification));
            await r.lTrim(key, 0, 49);

            console.log(`[NotificationService] Notification pushed to ${key}`);
            return notification;
        } catch (error) {
            console.error('[NotificationService] Error pushing notification:', error);
            throw error;
        }
    }

    /**
     * Fetches notifications for a user/role
     */
    async getNotifications(userId, role) {
        try {
            const r = await getRedisClient();
            if (!r) {
                console.warn('[NotificationService] Redis is offline. Returning empty notifications array.');
                return [];
            }

            let key = `notifications:${role}`;
            if (userId) {
                key = `notifications:${role}:${userId}`;
            }

            const data = await r.lRange(key, 0, -1);
            return data.map(item => JSON.parse(item));
        } catch (error) {
            console.error('[NotificationService] Error fetching notifications:', error);
            throw error;
            // Returning [] fallback could also be done here, but throwing alerts the controller
        }
    }
}

module.exports = new NotificationService();
