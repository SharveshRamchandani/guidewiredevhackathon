/**
 * Worker Auth Service
 * Handles OTP-based login and multi-step registration for Gig Workers.
 * Workers are linked to an admin via registration_code.
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
        // Map OTP error reasons to HTTP errors
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
        `SELECT id, name, phone, admin_id, is_phone_verified, is_profile_complete, is_active
     FROM workers WHERE phone = $1`,
        [phone]
    );

    if (rows.length && rows[0].is_phone_verified) {
        const worker = rows[0];

        if (!worker.is_active) {
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

    // New user — issue a registration token (no adminId yet)
    const registrationToken = jwtService.generateRegistrationToken(phone, null);

    return {
        isNewUser: true,
        registrationToken,
    };
}

// ─── Step 3: Complete registration ────────────────────────────────────────────

async function completeWorkerRegistration(registrationToken, data) {
    const {
        name,
        platform,
        city,
        zoneId,
        avgWeeklyEarning,
        aadhaarLast4,
        upiId,
        registrationCode,
    } = data;

    // 1. Verify registration token
    const decoded = jwtService.verifyToken(registrationToken);
    if (decoded.role !== 'pending_registration') {
        throw new AppError('TOKEN_INVALID', 'Invalid registration token.', 401);
    }

    const phone = decoded.phone;

    // 2. Resolve admin_id from registration code
    const { rows: adminRows } = await query(
        'SELECT id, name, company_name FROM admin_users WHERE registration_code = $1 AND active = true',
        [registrationCode.toUpperCase()]
    );

    if (!adminRows.length) {
        throw new AppError(
            'INVALID_REGISTRATION_CODE',
            'The company code you entered is invalid. Please check with your delivery platform.',
            400
        );
    }

    const admin = adminRows[0];

    // 3. Check if phone already registered (race condition guard)
    const { rows: existingPhone } = await query(
        'SELECT id FROM workers WHERE phone = $1',
        [phone]
    );
    if (existingPhone.length) {
        throw new AppError('PHONE_ALREADY_REGISTERED', 'This phone number is already registered.', 409);
    }

    // 4. Hash aadhaarLast4
    const aadhaarHash = hashSHA256(aadhaarLast4);

    // 5. Check aadhaar_hash uniqueness
    const { rows: aadhaarRows } = await query(
        'SELECT id FROM workers WHERE aadhaar_hash = $1',
        [aadhaarHash]
    );
    if (aadhaarRows.length) {
        throw new AppError(
            'AADHAAR_ALREADY_REGISTERED',
            'This Aadhaar is already linked to another account.',
            409
        );
    }

    // 6. Validate UPI ID format
    if (!UPI_REGEX.test(upiId)) {
        throw new AppError('INVALID_UPI', 'UPI ID format is invalid. Expected format: name@bankname', 400);
    }

    // 7. Insert worker record
    const { rows: newWorkerRows } = await query(
        `INSERT INTO workers
       (admin_id, phone, name, platform, city, zone_id_int, avg_weekly_earning,
        aadhaar_hash, upi, is_phone_verified, is_kyc_verified, is_profile_complete,
        is_active, last_login, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, true, true, true, NOW(), NOW(), NOW())
     RETURNING id, name, phone, admin_id, platform, city`,
        [
            admin.id, phone, name, platform, city,
            zoneId || null, avgWeeklyEarning || null,
            aadhaarHash, upiId,
        ]
    );

    const worker = newWorkerRows[0];

    // 8. Issue worker JWT
    const token = jwtService.generateWorkerToken(worker);

    return {
        isNewUser: false,
        token,
        worker: {
            id: worker.id,
            name: worker.name,
            phone: worker.phone,
            adminId: worker.admin_id,
        },
    };
}

// ─── Validate registration code (inline route) ────────────────────────────────

async function validateRegistrationCode(code) {
    const { rows } = await query(
        'SELECT id, company_name FROM admin_users WHERE registration_code = $1 AND active = true',
        [code.toUpperCase()]
    );
    if (!rows.length) return { valid: false };
    return { valid: true, companyName: rows[0].company_name };
}

module.exports = {
    initiateWorkerLogin,
    verifyWorkerOTP,
    completeWorkerRegistration,
    validateRegistrationCode,
};
