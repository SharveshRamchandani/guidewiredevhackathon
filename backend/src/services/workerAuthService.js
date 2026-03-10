/**
 * Worker Auth Service
 * Handles OTP-based login and multi-step registration for Gig Workers.
 * Workers register directly with GigShield — no registration code / admin tenancy.
 */
const crypto = require('crypto');
const { query } = require('../config/db');
const otpService = require('./otpService');
const jwtService = require('./jwtService');
const { AppError } = require('./jwtService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validatePhone(phone) {
    if (!/^\d{10}$/.test(phone)) {
        throw new AppError('INVALID_PHONE', 'Phone number must be exactly 10 digits.', 400);
    }
}

function hashSHA256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

const UPI_REGEX = /^[\w.\-]+@[\w]+$/;

// ─── Step 1: Initiate login (send OTP) ────────────────────────────────────────

async function initiateWorkerLogin(phone) {
    validatePhone(phone);
    return otpService.sendOTP(phone);
}

// ─── Step 2: Verify OTP → login or start registration ─────────────────────────

async function verifyWorkerOTP(phone, otp) {
    validatePhone(phone);

    const result = await otpService.verifyOTP(phone, otp);

    if (!result.valid) {
        const errorMap = {
            OTP_EXPIRED: ['OTP_EXPIRED', 'OTP has expired. Please request a new one.', 400],
            INVALID_OTP: ['INVALID_OTP', 'The OTP you entered is incorrect.', 400],
            MAX_ATTEMPTS_EXCEEDED: ['MAX_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts. Please request a new OTP.', 429],
        };
        const [code, message, status] = errorMap[result.reason] || ['INVALID_OTP', 'Invalid OTP.', 400];
        throw new AppError(code, message, status);
    }

    // Check if worker already exists
    const { rows } = await query(
        `SELECT id, name, phone, is_phone_verified, is_profile_complete, active
         FROM workers WHERE phone = $1`,
        [phone]
    );

    if (rows.length && rows[0].is_phone_verified) {
        const worker = rows[0];

        if (!worker.active) {
            throw new AppError('UNAUTHORIZED', 'Your account has been deactivated.', 401);
        }

        // Issue full worker token
        const token = jwtService.generateWorkerToken(worker);

        // Update last_login
        await query('UPDATE workers SET last_login = NOW() WHERE id = $1', [worker.id]);

        return {
            isNewUser: false,
            token,
            worker: {
                id: worker.id,
                name: worker.name,
                phone: worker.phone,
            },
        };
    }

    // New user — issue a short-lived registration token
    const registrationToken = jwtService.generateRegistrationToken(phone);

    return {
        isNewUser: true,
        registrationToken,
    };
}

// ─── Step 3: Complete registration ────────────────────────────────────────────

/**
 * @param {string} registrationToken - Short-lived JWT with role: 'pending_registration'
 * @param {{ name, platform, city, zoneId, avgWeeklyEarning, aadhaarLast4, upiId }} data
 * No registrationCode — workers register directly with GigShield.
 */
async function completeWorkerRegistration(registrationToken, data) {
    const { name, platform, city, zoneId, avgWeeklyEarning, aadhaarLast4, upiId } = data;

    // 1. Verify registration token
    const decoded = jwtService.verifyToken(registrationToken);
    if (decoded.role !== 'pending_registration') {
        throw new AppError('TOKEN_INVALID', 'Invalid registration token.', 401);
    }

    const phone = decoded.phone;

    // 2. Check if phone already registered (race condition guard)
    const { rows: existingPhone } = await query(
        'SELECT id FROM workers WHERE phone = $1',
        [phone]
    );
    if (existingPhone.length) {
        throw new AppError('PHONE_ALREADY_REGISTERED', 'This phone number is already registered.', 409);
    }

    // 3. Hash aadhaarLast4 with SHA-256
    const aadhaarHash = hashSHA256(aadhaarLast4);

    // 4. Check aadhaar_hash uniqueness
    const { rows: aadhaarRows } = await query(
        'SELECT id FROM workers WHERE aadhaar_hash = $1',
        [aadhaarHash]
    );
    if (aadhaarRows.length) {
        throw new AppError('AADHAAR_ALREADY_REGISTERED', 'This Aadhaar is already linked to another account.', 409);
    }

    // 5. Validate UPI ID format
    if (!UPI_REGEX.test(upiId)) {
        throw new AppError('INVALID_UPI_ID', 'UPI ID format is invalid. Expected format: name@bankname', 400);
    }

    // 6. Insert worker record — no admin_id
    const { rows: newWorkerRows } = await query(
        `INSERT INTO workers
           (phone, name, platform, city, zone_id, avg_weekly_earning,
            aadhaar_hash, upi_id, is_phone_verified, is_kyc_verified, is_profile_complete,
            active, last_login, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, true, true, NOW(), NOW(), NOW())
         RETURNING id, name, phone, platform, city`,
        [
            phone, name, platform, city,
            zoneId || null,
            avgWeeklyEarning || null,
            aadhaarHash,
            upiId,
        ]
    );

    const worker = newWorkerRows[0];

    // 7. Issue worker JWT
    const token = jwtService.generateWorkerToken(worker);

    return {
        isNewUser: false,
        token,
        worker: {
            id: worker.id,
            name: worker.name,
            phone: worker.phone,
        },
    };
}

module.exports = {
    initiateWorkerLogin,
    verifyWorkerOTP,
    completeWorkerRegistration,
};
