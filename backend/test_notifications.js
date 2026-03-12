/**
 * test_notifications.js
 * 
 * Verifies the end-to-end event-to-notification flow.
 */
require('dotenv').config();
const eventBus = require('./src/events/notificationEvents');

async function runTest() {
  console.log('[Test] Emitting staff:added event...');
  
  // This should trigger the listener in notificationEvents.js
  // which calls notificationService.pushNotification('all_admins', 'admin', ...)
  eventBus.emit('staff:added', { staffName: 'Test Engineer' });
  
  console.log('[Test] Triggered! Check backend console for "[Notifications] ✅ Redis" or "[Notifications] 📦 In-memory"');
  
  // Wait a bit for async operations
  setTimeout(() => {
    console.log('[Test] Done.');
    process.exit(0);
  }, 2000);
}

runTest();
