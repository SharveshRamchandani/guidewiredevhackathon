/**
 * OTP Service
 * Handles OTP generation, storage (Redis with in-memory fallback), and verification.
 * Uses crypto.randomInt — never Math.random.
 *
 * If Redis is unavailable, falls back to a process-level in-memory store so that
 * OTP send/verify still works in dev (or when Redis is momentarily unreachable).
 * The in-memory store is NOT suitable for multi-process production deployments.
 */
const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');

const OTP_EXPIRY_SECONDS = parseInt(process.env.OTP_EXPIRY_SECONDS) || 300;  // 5 min
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;   // 1 min
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;

// ─── In-memory fallback store ────────────────────────────────────────────────
// Structure: Map<key, { value: string, expiresAt: number }>
// Used only when Redis is unavailable.

const memStore = new Map();

function memGet(key) {
    const entry = memStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { memStore.delete(key); return null; }
    return entry.value;
}

function memSet(key, value, ttlSeconds) {
    memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memDel(key) {
    memStore.delete(key);
}

function memTTL(key) {
    const entry = memStore.get(key);
    if (!entry) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    if (remaining <= 0) { memStore.delete(key); return -1; }
    return remaining;
}

function memIncr(key, ttlSeconds) {
    const entry = memStore.get(key);
    const now = Date.now();
    if (!entry || now > entry.expiresAt) {
        memStore.set(key, { value: '1', expiresAt: now + ttlSeconds * 1000 });
        return 1;
    }
    const next = (parseInt(entry.value, 10) + 1).toString();
    entry.value = next;
    return parseInt(next, 10);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
}

// ─── Redis helpers with in-memory fallback ────────────────────────────────────

async function rawGet(key) {
    try {
        const r = await getRedisClient();
        if (r) {
            const val = await r.get(key);
            return val; // returns string or null
        }
    } catch { /* fall through to memory */ }
    return memGet(key);
}

async function rawSet(key, value, ttlSeconds) {
    try {
        const r = await getRedisClient();
        if (r) {
            await r.set(key, value, { EX: ttlSeconds });
            return;
        }
    } catch { /* fall through to memory */ }
    memSet(key, value, ttlSeconds);
}

async function rawDel(key) {
    try {
        const r = await getRedisClient();
        if (r) {
            await r.del(key);
            return;
        }
    } catch { /* fall through to memory */ }
    memDel(key);
}

async function rawTTL(key) {
    try {
        const r = await getRedisClient();
        if (r) return r.ttl(key);
    } catch { /* fall through to memory */ }
    return memTTL(key);
}

async function rawIncr(key) {
    try {
        const r = await getRedisClient();
        if (r) return r.incr(key);
    } catch { /* fall through to memory */ }
    return memIncr(key, OTP_EXPIRY_SECONDS);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initiate OTP send to phone number.
 * Respects cooldown window to prevent spam.
 */
async function sendOTP(phone) {
    // Check cooldown
    const cooldownTTL = await rawTTL(`otp_cooldown:${phone}`);
    if (cooldownTTL > 0) {
        return {
            success: false,
            reason: 'OTP_COOLDOWN_ACTIVE',
            remainingCooldown: cooldownTTL,
        };
    }

    const otp = generateOTP();

    // Store OTP (hashed would be ideal but kept plain for speed — OTP is short-lived)
    await rawSet(`otp:${phone}`, otp, OTP_EXPIRY_SECONDS);

    // Set cooldown
    await rawSet(`otp_cooldown:${phone}`, '1', OTP_RESEND_COOLDOWN_SECONDS);

    // Reset attempt counter
    await rawDel(`otp_attempts:${phone}`);

    const isDevMode = process.env.FEATURE_SMS_ENABLED !== 'true';

    if (isDevMode) {
        console.log(`[DEV OTP] ${phone}: ${otp}`);
        return { success: true, otp, expiresIn: OTP_EXPIRY_SECONDS };
    }

    // TODO: Replace with Twilio when FEATURE_SMS_ENABLED=true
    // const twilioService = require('./twilio.service');
    // await twilioService.sendSMS(`+91${phone}`, `Your GigShield OTP is: ${otp}. Valid for 5 minutes.`);

    return { success: true, expiresIn: OTP_EXPIRY_SECONDS };
}

/**
 * Verify OTP submitted by user.
 * Tracks attempts and locks out after max attempts.
 */
async function verifyOTP(phone, inputOtp) {
    const storedOtp = await rawGet(`otp:${phone}`);

    if (!storedOtp) {
        return { valid: false, reason: 'OTP_EXPIRED' };
    }

    // Increment attempt counter
    const attempts = await rawIncr(`otp_attempts:${phone}`);

    // Set TTL on attempt counter if it's new (Redis path only — mem path handles TTL in memIncr)
    if (attempts === 1) {
        try {
            const r = await getRedisClient();
            if (r) await r.expire(`otp_attempts:${phone}`, OTP_EXPIRY_SECONDS);
        } catch { /* ignore */ }
    }

    if (attempts > OTP_MAX_ATTEMPTS) {
        await rawDel(`otp:${phone}`);
        return { valid: false, reason: 'MAX_ATTEMPTS_EXCEEDED' };
    }

    if (storedOtp !== inputOtp.toString()) {
        return { valid: false, reason: 'INVALID_OTP' };
    }

    // Success — clean up
    await rawDel(`otp:${phone}`);
    await rawDel(`otp_attempts:${phone}`);

    return { valid: true };
}

module.exports = { sendOTP, verifyOTP };
