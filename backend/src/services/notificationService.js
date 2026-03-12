const { getRedisClient } = require('../config/redis');
const { v4: uuidv4 } = require('uuid');

// ============================================================================
//  NotificationService — Redis-backed notification cache
//
//  Graceful fallback: if Redis is offline an in-memory Map is used instead.
//  This keeps the hackathon demo working even without a live Redis instance.
//
//  Key pattern : notifications:{role}:{userId}
//  Redis       : LPUSH (newest first) + LTRIM 0 49 (max 50 per user)
//  In-memory   : plain Array, newest first, capped at 50
// ============================================================================

// ─── In-Memory Fallback Store ─────────────────────────────────────────────────
// Map<key, Notification[]>  (newest first, max 50 entries)
const memStore = new Map();

const MAX_NOTIFS = 50;

function memKey(role, userId) {
  return userId ? `notifications:${role}:${userId}` : `notifications:${role}`;
}

function memPush(role, userId, notification) {
  const k    = memKey(role, userId);
  const list = memStore.get(k) || [];
  list.unshift(notification);          // newest first
  if (list.length > MAX_NOTIFS) list.length = MAX_NOTIFS;
  memStore.set(k, list);
}

function memGet(role, userId) {
  return memStore.get(memKey(role, userId)) || [];
}

function memUpdate(role, userId, updater) {
  const k    = memKey(role, userId);
  const list = memStore.get(k) || [];
  memStore.set(k, updater(list));
}

// =============================================================================

class NotificationService {

  _key(role, userId) {
    return userId ? `notifications:${role}:${userId}` : `notifications:${role}`;
  }

  // ─── Push ──────────────────────────────────────────────────────────────────

  /**
   * Push a new notification. Falls back to in-memory if Redis is offline.
   *
   * @param {string} userId  - e.g. 'W-102', '42', 'all_admins'
   * @param {string} role    - 'worker' | 'admin' | 'superadmin'
   * @param {string} message - Human-readable text
   * @param {string} type    - 'info' | 'success' | 'warning' | 'alert'
   */
  async pushNotification(userId, role, message, type = 'info') {
    const notification = {
      id:         uuidv4(),
      message,
      role,
      userId,
      type,
      timestamp:  new Date().toISOString(),
      isRead:     false,
      isFavorite: false,
      isArchived: false,
    };

    try {
      const r = await getRedisClient();
      if (r) {
        // ── 1. Cache in Redis List ──────────────────────────────────────────
        const key = this._key(role, userId);
        await r.lPush(key, JSON.stringify(notification));
        await r.lTrim(key, 0, MAX_NOTIFS - 1);

        // ── 2. Publish for Real-time (Pub/Sub) ──────────────────────────────
        // We publish to two channels: 
        // a) specific user channel: notifications:${role}:${userId}
        // b) role broadcast channel: notifications:${role}:broadcast
        const pubChannel = `notifications:${role}:${userId}`;
        const bcastChannel = `notifications:${role}:broadcast`;
        
        await r.publish(pubChannel, JSON.stringify(notification));
        if (userId !== 'all_admins' && userId !== 'all_superadmins') {
          await r.publish(bcastChannel, JSON.stringify(notification));
        }

        console.log(`[Notifications] ✅ Redis → ${key} | Pub → ${pubChannel}`);
      } else {
        // ── In-memory path ──────────────────────────────────────────────────
        memPush(role, userId, notification);
        console.log(`[Notifications] 📦 In-memory → ${memKey(role, userId)} [${type}]`);
      }
    } catch (err) {
      // Absolute last-resort: still store in memory so the demo works
      memPush(role, userId, notification);
      console.warn('[Notifications] Redis error — stored in-memory:', err.message);
    }

    return notification;
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async getNotifications(userId, role) {
    try {
      const r = await getRedisClient();
      if (r) {
        const keys = [this._key(role, userId)];
        
        // Add group keys for admins and superadmins
        if (role === 'admin' || role === 'superadmin') {
          keys.push(this._key('admin', 'all_admins'));
        }
        if (role === 'superadmin') {
          keys.push(this._key('superadmin', 'all_superadmins'));
        }

        let allData = [];
        for (const key of keys) {
          const data = await r.lRange(key, 0, -1);
          allData = allData.concat(data.map(item => JSON.parse(item)));
        }

        // De-duplicate by ID and sort by timestamp (newest first)
        const unique = Array.from(new Map(allData.map(n => [n.id, n])).values());
        return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    } catch (err) {
      console.warn('[Notifications] Redis error in get — using memory:', err.message);
    }

    // In-memory path
    const results = [...memGet(role, userId)];
    if (role === 'admin' || role === 'superadmin') {
      results.push(...memGet('admin', 'all_admins'));
    }
    if (role === 'superadmin') {
      results.push(...memGet('superadmin', 'all_superadmins'));
    }
    
    const unique = Array.from(new Map(results.map(n => [n.id, n])).values());
    return unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // ─── Unread Count ──────────────────────────────────────────────────────────

  async getUnreadCount(userId, role) {
    try {
      const list = await this.getNotifications(userId, role);
      return list.filter(n => !n.isRead).length;
    } catch { return 0; }
  }

  // ─── Mark Single As Read ───────────────────────────────────────────────────

  async markAsRead(userId, role, notificationId) {
    try {
      const r = await getRedisClient();
      if (r) {
        const keys = [this._key(role, userId)];
        if (role === 'admin' || role === 'superadmin') {
          keys.push(this._key('admin', 'all_admins'));
        }
        if (role === 'superadmin') {
          keys.push(this._key('superadmin', 'all_superadmins'));
        }

        for (const key of keys) {
          const raw = await r.lRange(key, 0, -1);
          const notifications = raw.map(item => JSON.parse(item));
          const idx = notifications.findIndex(n => n.id === notificationId);
          
          if (idx !== -1) {
            notifications[idx].isRead = true;
            const pipeline = r.multi();
            pipeline.del(key);
            for (let i = notifications.length - 1; i >= 0; i--) {
              pipeline.lPush(key, JSON.stringify(notifications[i]));
            }
            pipeline.lTrim(key, 0, MAX_NOTIFS - 1);
            await pipeline.exec();
            return true;
          }
        }
      }
    } catch (err) {
      console.warn('[Notifications] markAsRead Redis error:', err.message);
    }

    // In-memory path
    // In-memory path
    const results = [memKey(role, userId)];
    if (role === 'admin' || role === 'superadmin') {
      results.push(memKey('admin', 'all_admins'));
    }
    if (role === 'superadmin') {
      results.push(memKey('superadmin', 'all_superadmins'));
    }

    for (const k of results) {
      const list = memStore.get(k) || [];
      const item = list.find(n => n.id === notificationId);
      if (item) {
        item.isRead = true;
        return true;
      }
    }
    return false;
  }

  // ─── Mark All Read ─────────────────────────────────────────────────────────

  async markAllRead(userId, role) {
    let totalUpdated = 0;
    try {
      const r = await getRedisClient();
      if (r) {
        const keys = [this._key(role, userId)];
        if (role === 'admin' || role === 'superadmin') {
          keys.push(this._key('admin', 'all_admins'));
        }
        if (role === 'superadmin') {
          keys.push(this._key('superadmin', 'all_superadmins'));
        }

        for (const key of keys) {
          const raw = await r.lRange(key, 0, -1);
          const notifications = raw.map(item => ({ ...JSON.parse(item), isRead: true }));
          
          if (notifications.length > 0) {
            const pipeline = r.multi();
            pipeline.del(key);
            for (let i = notifications.length - 1; i >= 0; i--) {
              pipeline.lPush(key, JSON.stringify(notifications[i]));
            }
            pipeline.lTrim(key, 0, MAX_NOTIFS - 1);
            await pipeline.exec();
            totalUpdated += notifications.length;
          }
        }
        return totalUpdated;
      }
    } catch (err) {
      console.warn('[Notifications] markAllRead Redis error:', err.message);
    }

    // In-memory path
    const results = [memKey(role, userId)];
    if (role === 'admin' || role === 'superadmin') {
      results.push(memKey('admin', 'all_admins'));
    }
    if (role === 'superadmin') {
      results.push(memKey('superadmin', 'all_superadmins'));
    }

    results.forEach(k => {
      const list = memStore.get(k) || [];
      list.forEach(n => { n.isRead = true; });
      totalUpdated += list.length;
    });
    return totalUpdated;
  }

  // ─── Delete Single ─────────────────────────────────────────────────────────

  async deleteNotification(userId, role, notificationId) {
    try {
      const r = await getRedisClient();
      if (r) {
        const keys = [this._key(role, userId)];
        if (role === 'admin' || role === 'superadmin') {
          keys.push(this._key('admin', 'all_admins'));
        }
        if (role === 'superadmin') {
          keys.push(this._key('superadmin', 'all_superadmins'));
        }

        for (const key of keys) {
          const raw = await r.lRange(key, 0, -1);
          const notifications = raw.map(item => JSON.parse(item));
          const filtered = notifications.filter(n => n.id !== notificationId);
          
          if (filtered.length !== notifications.length) {
            const pipeline = r.multi();
            pipeline.del(key);
            for (let i = filtered.length - 1; i >= 0; i--) {
              pipeline.lPush(key, JSON.stringify(filtered[i]));
            }
            if (filtered.length > 0) pipeline.lTrim(key, 0, MAX_NOTIFS - 1);
            await pipeline.exec();
            return true;
          }
        }
      }
    } catch (err) {
      console.warn('[Notifications] deleteNotification Redis error:', err.message);
    }

    // In-memory path
    const results = [memKey(role, userId)];
    if (role === 'admin' || role === 'superadmin') {
      results.push(memKey('admin', 'all_admins'));
    }
    if (role === 'superadmin') {
      results.push(memKey('superadmin', 'all_superadmins'));
    }

    for (const k of results) {
      const list = memStore.get(k) || [];
      const filtered = list.filter(n => n.id !== notificationId);
      if (filtered.length !== list.length) {
        memStore.set(k, filtered);
        return true;
      }
    }
    return false;
  }

  // ─── Clear All ─────────────────────────────────────────────────────────────

  async clearAll(userId, role) {
    try {
      const r = await getRedisClient();
      if (r) {
        await r.del(this._key(role, userId));
        return;
      }
    } catch (err) {
      console.warn('[Notifications] clearAll Redis error:', err.message);
    }
    memStore.delete(memKey(role, userId));
  }
}

module.exports = new NotificationService();
