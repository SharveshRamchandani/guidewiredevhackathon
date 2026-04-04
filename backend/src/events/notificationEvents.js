/**
 * notificationEvents.js
 *
 * Central RBA (Rule-Based Actions) notification listener registry.
 * Each listener subscribes to a domain event emitted by a service or controller,
 * then calls notificationService.pushNotification() to cache it in Redis.
 *
 * Event → Redis key mapping:
 *   worker    → notifications:worker:{workerId}
 *   admin     → notifications:admin:{adminId}  OR  notifications:admin:all_admins
 *   superadmin→ notifications:superadmin:all_superadmins
 *
 * Import this module ONCE in app.js to activate all listeners.
 */

const eventBus           = require('./eventBus');
const notificationService = require('../services/notificationService');

// ============================================================================
//  SCENARIO 1 — POLICY EVENTS  (Worker + Admin)
// ============================================================================

// policy:upgraded  { workerId, planName? }
eventBus.on('policy:upgraded', async ({ workerId, adminId, planName }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Your GigShield plan${planName ? ` (${planName})` : ''} has been upgraded successfully.`,
    'success'
  );
  await notificationService.pushNotification(
    adminId || 'all_admins', 'admin',
    `Policy updated for worker ${workerId}.`,
    'info'
  );
});

// policy:renewed  { workerId }
eventBus.on('policy:renewed', async ({ workerId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    'Your policy has been auto-renewed.',
    'success'
  );
});

// premium:paid  { workerId, amount }
eventBus.on('premium:paid', async ({ workerId, amount }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Your weekly premium of ₹${amount} has been successfully deducted. Your policy is active.`,
    'success'
  );
});

// premium:deduction_failed  { workerId }
eventBus.on('premium:deduction_failed', async ({ workerId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    'Premium deduction failed. Please top-up your wallet to maintain active coverage.',
    'warning'
  );
});

// Alias used by rbaService.processPremiumDeduction
eventBus.on('premium:deduction_attempted', async ({ workerId, amount, success }) => {
  if (success) {
    eventBus.emit('premium:paid', { workerId, amount });
  } else {
    eventBus.emit('premium:deduction_failed', { workerId });
  }
});

// ============================================================================
//  SCENARIO 2 — CLAIM LIFECYCLE EVENTS  (Worker + Admin)
// ============================================================================

// claim:raised  { workerId, claimId }
eventBus.on('claim:raised', async ({ workerId, claimId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Your claim ${claimId} has been submitted successfully.`,
    'info'
  );
  await notificationService.pushNotification(
    'all_admins', 'admin',
    `New claim ${claimId} submitted by worker ${workerId}.`,
    'warning'
  );
});

// claim:accepted  { workerId, claimId }
eventBus.on('claim:accepted', async ({ workerId, claimId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Your claim ${claimId} has been approved.`,
    'success'
  );
  await notificationService.pushNotification(
    'all_admins', 'admin',
    `Claim ${claimId} processed.`,
    'info'
  );
});

// claim:rejected  { workerId, claimId, reason? }
eventBus.on('claim:rejected', async ({ workerId, claimId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Your claim ${claimId} was rejected.`,
    'alert'
  );
  await notificationService.pushNotification(
    'all_admins', 'admin',
    `Claim ${claimId} processed.`,
    'info'
  );
});

// payout:completed  { workerId, amount, claimId? }
eventBus.on('payout:completed', async ({ workerId, amount }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Payout of ₹${amount} has been credited to your account.`,
    'success'
  );
});

// payout:upi_risk_locked  { workerId, claimId, lockedUntil?, reason? }
eventBus.on('payout:upi_risk_locked', async ({ workerId, claimId, lockedUntil, reason }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Payout for claim ${claimId} is paused by UPI Risk Lock until ${lockedUntil || 'the verification window ends'}. ${reason || 'Recent payout account change detected.'}`,
    'warning'
  );
  await notificationService.pushNotification(
    'all_admins', 'admin',
    `UPI Risk Lock paused payout for worker ${workerId}, claim ${claimId}.`,
    'warning'
  );
});

// Alias used by rbaService.processWeatherPayout
eventBus.on('payout:auto_approved', async ({ workerId, amount, zone, reason }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Automatic payout of ₹${amount} approved for ${reason || 'weather event'} in ${zone || 'your zone'}.`,
    'success'
  );
  await notificationService.pushNotification(
    'all_admins', 'admin',
    `Auto-payout of ₹${amount} approved for worker ${workerId} due to ${reason}.`,
    'info'
  );
});

// ============================================================================
//  SCENARIO 3 — PROFILE & ACCOUNT EVENTS  (Worker)
// ============================================================================

// profile:updated  { workerId }
eventBus.on('profile:updated', async ({ workerId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    'Your profile details have been updated.',
    'info'
  );
});

// profile:bank_updated  { workerId, riskLocked?, lockedUntil? }
eventBus.on('profile:bank_updated', async ({ workerId, riskLocked, lockedUntil }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    riskLocked
      ? `Your payout UPI was updated. For security, payouts are temporarily locked until ${lockedUntil || 'the verification window ends'}.`
      : 'Your payout bank account has been updated.',
    riskLocked ? 'warning' : 'info'
  );
});

// profile:contact_updated  { workerId }
eventBus.on('profile:contact_updated', async ({ workerId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    'Your email or phone number has been updated.',
    'info'
  );
});

// ============================================================================
//  SCENARIO 4 — ADMIN ACTION EVENTS
// ============================================================================

// fraud:review_started  { workerId, claimId, adminId? }
eventBus.on('fraud:review_started', async ({ workerId, claimId, adminId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    'Your claim is under review for verification.',
    'warning'
  );
  await notificationService.pushNotification(
    adminId || 'all_admins', 'admin',
    `Fraud review initiated for worker ${workerId}.`,
    'warning'
  );
});

// fraud:review_accepted  { workerId, claimId, adminId? }
eventBus.on('fraud:review_accepted', async ({ workerId, claimId, adminId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Your claim ${claimId} passed review and was accepted.`,
    'success'
  );
  await notificationService.pushNotification(
    adminId || 'all_admins', 'admin',
    'Fraud review completed.',
    'info'
  );
});

// fraud:review_rejected  { workerId, claimId, penaltyCredits, adminId? }
eventBus.on('fraud:review_rejected', async ({ workerId, claimId, penaltyCredits, adminId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Your claim ${claimId} was rejected after review.${penaltyCredits ? ` ${penaltyCredits} trust credits deducted.` : ''}`,
    'alert'
  );
  await notificationService.pushNotification(
    adminId || 'all_admins', 'admin',
    'Fraud review completed.',
    'info'
  );
});

// Alias used by rbaService.rejectFraudulentClaim
eventBus.on('claim:fraud_detected', async ({ workerId, claimId, penaltyCredits, reason }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    `Your claim ${claimId} was flagged for fraud. ${penaltyCredits ? penaltyCredits + ' trust credits deducted.' : ''} Reason: ${reason || 'policy violation'}.`,
    'alert'
  );
  await notificationService.pushNotification(
    'all_admins', 'admin',
    `Fraud detected: Claim ${claimId} (worker ${workerId}) — ${reason || 'automated flag'}.`,
    'alert'
  );
});

// account:flagged  { workerId, adminId? }
eventBus.on('account:flagged', async ({ workerId, adminId }) => {
  await notificationService.pushNotification(
    workerId, 'worker',
    'Your account has been flagged for suspicious activity.',
    'alert'
  );
  await notificationService.pushNotification(
    adminId || 'all_admins', 'admin',
    `Fraud review initiated for worker ${workerId}.`,
    'alert'
  );
});

// ============================================================================
//  SCENARIO 5 — ADMIN-ONLY EVENTS
// ============================================================================

// staff:added  { staffName?, adminId? }
eventBus.on('staff:added', async ({ staffName } = {}) => {
  await notificationService.pushNotification(
    'all_admins', 'admin',
    staffName
      ? `New staff member "${staffName}" has been added.`
      : 'New staff member added.',
    'info'
  );
});

// staff:role_changed  { staffId, newRole }
eventBus.on('staff:role_changed', async ({ staffId, newRole }) => {
  await notificationService.pushNotification(
    'all_admins', 'admin',
    `Staff role for ${staffId} updated to ${newRole}.`,
    'info'
  );
});

// system:distribution_payout_events  { payoutCount, totalAmount }
eventBus.on('system:distribution_payout_events', async ({ payoutCount, totalAmount }) => {
  await notificationService.pushNotification(
    'all_admins', 'admin',
    `Distribution payout completed. ${payoutCount} payouts totaling ₹${totalAmount || 0}.`,
    'info'
  );
});

// ============================================================================
//  SCENARIO 6 — SYSTEM & ML EVENTS  (Super Admin)
// ============================================================================

// system:ml_training_completed  { dataSource? }
eventBus.on('system:ml_training_completed', async ({ dataSource } = {}) => {
  await notificationService.pushNotification(
    'all_superadmins', 'superadmin',
    'ML Model training completed successfully.',
    'success'
  );
});

// system:funds_low  { currentBalance?, threshold? }
eventBus.on('system:funds_low', async ({ currentBalance, threshold } = {}) => {
  await notificationService.pushNotification(
    'all_superadmins', 'superadmin',
    `Platform Alert: Reserve payout pool running low.${currentBalance !== undefined ? ` Balance: ₹${currentBalance}` : ''}`,
    'alert'
  );
});

console.log('[RBA] ✅ All notification event listeners registered (Scenarios 1–6).');

module.exports = eventBus;
