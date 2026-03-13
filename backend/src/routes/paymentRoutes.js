/**
 * Mock Payment Routes
 * Prefix: /api/payment
 * Simulates a UPI/payment gateway for plan purchases during registration.
 */
const router = require('express').Router();

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ─── Simulate a short network delay ──────────────────────────────────────────
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ─── POST /api/payment/process ────────────────────────────────────────────────
// Processes a mock UPI payment for plan purchase during registration.
// Body: { upi_id, amount, plan_id, plan_name, registration_token }
// Returns: { success, transaction_id, status, message, paid_at }
router.post('/process', asyncHandler(async (req, res) => {
    const { upi_id, amount, plan_id, plan_name } = req.body;

    // Basic validation
    if (!upi_id || !amount || !plan_id) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_PAYLOAD', message: 'upi_id, amount, and plan_id are required.' }
        });
    }

    const upiRegex = /^[\w.\-]+@[\w]+$/;
    if (!upiRegex.test(upi_id)) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_UPI_ID', message: 'UPI ID format is invalid. Expected: name@bankname' }
        });
    }

    if (amount <= 0) {
        return res.status(400).json({
            success: false,
            error: { code: 'INVALID_AMOUNT', message: 'Payment amount must be greater than 0.' }
        });
    }

    // Simulate processing delay (1.5–2.5s to feel realistic)
    const processingTime = 1500 + Math.floor(Math.random() * 1000);
    await delay(processingTime);

    // Simulate a 95% success rate (5% random failure for realism)
    const isSuccess = Math.random() > 0.05;

    if (!isSuccess) {
        return res.status(402).json({
            success: false,
            error: {
                code: 'PAYMENT_FAILED',
                message: 'Payment could not be processed. Please check your UPI ID and try again.'
            }
        });
    }

    // Generate a realistic-looking transaction ID
    const txnId = `GS${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    return res.json({
        success: true,
        transaction_id: txnId,
        status: 'completed',
        upi_id,
        amount_paid: parseFloat(amount),
        plan_id,
        plan_name: plan_name || 'Plan',
        paid_at: new Date().toISOString(),
        message: `Payment of ₹${amount} to GigShield completed successfully via ${upi_id}.`
    });
}));

// ─── GET /api/payment/verify/:txn_id ─────────────────────────────────────────
// Verifies a previously processed mock transaction.
router.get('/verify/:txn_id', asyncHandler(async (req, res) => {
    const { txn_id } = req.params;

    if (!txn_id || !txn_id.startsWith('GS')) {
        return res.status(404).json({
            success: false,
            error: { code: 'TXN_NOT_FOUND', message: 'Transaction not found.' }
        });
    }

    return res.json({
        success: true,
        transaction_id: txn_id,
        status: 'completed',
        verified_at: new Date().toISOString(),
    });
}));

module.exports = router;
