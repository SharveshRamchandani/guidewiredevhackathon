const eventBus = require('./eventBus');
const notificationService = require('../services/notificationService');

// ============================================================================
// Notification Event Listeners
// These listeners decouple the action from the notification logic.
// They listen to domain events emitted by various services across the app.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. POLICY EVENTS
// ----------------------------------------------------------------------------
eventBus.on('policy:upgraded', async ({ workerId }) => {
    await notificationService.pushNotification(workerId, 'worker', 'Your GigShield plan has been upgraded successfully.', 'success');
    await notificationService.pushNotification('all_admins', 'admin', `Policy upgraded for worker ${workerId}.`, 'info');
});

eventBus.on('policy:renewed', async ({ workerId }) => {
    await notificationService.pushNotification(workerId, 'worker', 'Your policy has been auto-renewed.', 'success');
});

eventBus.on('premium:paid', async ({ workerId, amount }) => {
    await notificationService.pushNotification(workerId, 'worker', `Your weekly premium of ₹${amount} has been successfully deducted. Your policy is active.`, 'success');
});

eventBus.on('premium:deduction_failed', async ({ workerId }) => {
    await notificationService.pushNotification(workerId, 'worker', 'Warning: Premium deduction failed. Please top-up your wallet to maintain active GigShield coverage.', 'warning');
});

// ----------------------------------------------------------------------------
// 2. CLAIM LIFECYCLE EVENTS
// ----------------------------------------------------------------------------
eventBus.on('claim:raised', async ({ workerId, claimId }) => {
    await notificationService.pushNotification(workerId, 'worker', `Your claim ${claimId} has been submitted.`, 'info');
    await notificationService.pushNotification('all_admins', 'admin', `New claim ${claimId} submitted by worker ${workerId}.`, 'warning');
});

eventBus.on('claim:accepted', async ({ workerId, claimId }) => {
    await notificationService.pushNotification(workerId, 'worker', `Your claim ${claimId} has been approved.`, 'success');
});

eventBus.on('claim:rejected', async ({ workerId, claimId }) => {
    await notificationService.pushNotification(workerId, 'worker', `Your claim ${claimId} was rejected.`, 'alert');
});

eventBus.on('payout:completed', async ({ workerId, amount }) => {
    await notificationService.pushNotification(workerId, 'worker', `Payout of ₹${amount} has been credited to your account.`, 'success');
});

// ----------------------------------------------------------------------------
// 3. PROFILE EVENTS
// ----------------------------------------------------------------------------
eventBus.on('profile:updated', async ({ workerId }) => {
    await notificationService.pushNotification(workerId, 'worker', 'Your profile details have been updated.', 'info');
});

eventBus.on('profile:bank_updated', async ({ workerId }) => {
    await notificationService.pushNotification(workerId, 'worker', 'Your payout account has been updated.', 'info');
});

eventBus.on('profile:contact_updated', async ({ workerId }) => {
    await notificationService.pushNotification(workerId, 'worker', 'Your phone/email details have been updated.', 'info');
});

// ----------------------------------------------------------------------------
// 4. ADMIN ACTION EVENTS
// ----------------------------------------------------------------------------
eventBus.on('fraud:review_started', async ({ workerId, claimId }) => {
    await notificationService.pushNotification(workerId, 'worker', `Your claim ${claimId} is under manual review.`, 'warning');
    await notificationService.pushNotification('all_admins', 'admin', `Fraud review initiated for claim ${claimId} submitted by worker ${workerId}.`, 'warning');
});

eventBus.on('fraud:review_accepted', async ({ workerId, claimId }) => {
    await notificationService.pushNotification(workerId, 'worker', `Your claim ${claimId} passed review and was accepted.`, 'success');
    await notificationService.pushNotification('all_admins', 'admin', `Fraud review passed for claim ${claimId} (worker ${workerId}).`, 'info');
});

eventBus.on('fraud:review_rejected', async ({ workerId, claimId, penaltyCredits }) => {
    await notificationService.pushNotification(workerId, 'worker', `Your claim ${claimId} was rejected after review. ${penaltyCredits} trust credits deducted.`, 'alert');
    await notificationService.pushNotification('all_admins', 'admin', `Fraud review rejected claim ${claimId} (worker ${workerId}).`, 'alert');
});

eventBus.on('account:flagged', async ({ workerId }) => {
    await notificationService.pushNotification(workerId, 'worker', 'Your account has been flagged for suspicious activity.', 'alert');
    await notificationService.pushNotification('all_admins', 'admin', `Account ${workerId} has been manually flagged.`, 'alert');
});

// ----------------------------------------------------------------------------
// 5. ADMIN-ONLY EVENTS
// ----------------------------------------------------------------------------
eventBus.on('staff:added', async () => {
    await notificationService.pushNotification('all_admins', 'admin', 'A new staff member has been added to the system.', 'info');
});

eventBus.on('staff:role_changed', async ({ staffId, newRole }) => {
    await notificationService.pushNotification('all_admins', 'admin', `Staff role for ${staffId} updated to ${newRole}.`, 'info');
});

eventBus.on('system:distribution_payout_events', async ({ payoutCount, totalAmount }) => {
    await notificationService.pushNotification('all_admins', 'admin', `Mass distribution event executed: ${payoutCount} payouts totaling ₹${totalAmount}.`, 'info');
});

// ----------------------------------------------------------------------------
// 6. SYSTEM & ML EVENTS
// ----------------------------------------------------------------------------
eventBus.on('system:ml_training_completed', async () => {
    await notificationService.pushNotification('all_superadmins', 'superadmin', 'ML model training completed successfully.', 'success');
});

eventBus.on('system:funds_low', async () => {
    await notificationService.pushNotification('all_superadmins', 'superadmin', 'Platform alert: Reserve payout pool running low.', 'alert');
});

console.log('[NotificationEvents] All extended event listeners registered.');

module.exports = eventBus;
