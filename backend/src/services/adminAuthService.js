/**
 * Admin Auth Service
 * Handles Super Admin seeding, Admin creation, setup, and login.
 * Supports multi-tenancy via registration codes.
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../config/db');
const jwtService = require('./jwtService');
const { AppError } = require('./jwtService');

const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = '$2b$12$dummyhash.for.timing.protection/XXXXXXXXXXXXXXXXXXXXXXXXXX';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hashSHA256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function generateSetupToken() {
    const raw = crypto.randomBytes(32).toString('hex');
    const hashed = hashSHA256(raw);
    return { raw, hashed };
}

/**
 * Generate a unique 8-char alphanumeric registration code
 * derived from company initials + random suffix.
 */
function generateRegistrationCode(companyName) {
    const initials = companyName
        .split(/\s+/)
        .map(word => word[0]?.toUpperCase() || '')
        .join('')
        .slice(0, 4)
        .padEnd(2, 'X');

    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
    return `${initials}${suffix}`.slice(0, 8).toUpperCase();
}

function validatePasswordStrength(password) {
    if (password.length < 12) {
        throw new AppError('WEAK_PASSWORD', 'Password must be at least 12 characters.', 400);
    }
    if (!/[A-Z]/.test(password)) {
        throw new AppError('WEAK_PASSWORD', 'Password must contain at least one uppercase letter.', 400);
    }
    if (!/[0-9]/.test(password)) {
        throw new AppError('WEAK_PASSWORD', 'Password must contain at least one number.', 400);
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
        throw new AppError('WEAK_PASSWORD', 'Password must contain at least one special character.', 400);
    }
}

async function insertAuditLog(adminId, action, targetType, targetId, newValue, ip) {
    try {
        await query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
            [adminId, action, targetType || null, targetId || null, newValue ? JSON.stringify(newValue) : null, ip || null]
        );
    } catch (err) {
        console.error('[AuditLog] Failed to insert audit log:', err.message);
    }
}

// ─── Super Admin Seeding ──────────────────────────────────────────────────────

async function createSuperAdmin() {
    const { rows: existing } = await query(
        "SELECT id FROM admin_users WHERE role = 'super_admin'",
        []
    );

    if (existing.length) {
        console.log('[Seed] Super admin already exists — skipping.');
        return;
    }

    const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@gigshield.in';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'GigShield@SuperAdmin#2026';
    const name = 'GigShield Super Admin';

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const registration_code = 'GIGSHIELD_PLATFORM';

    await query(
        `INSERT INTO admin_users (name, email, password_hash, role, registration_code, company_name, active)
     VALUES ($1, $2, $3, 'super_admin', $4, $5, true)`,
        [name, email, password_hash, registration_code, 'GigShield Platform']
    );

    console.log(`
╔══════════════════════════════════════╗
║     GigShield Super Admin Created    ║
╠══════════════════════════════════════╣
║  Email:    ${email.padEnd(27)}║
║  Password: ${password.padEnd(27)}║
╠══════════════════════════════════════╣
║  ⚠  Change password after first login║
╚══════════════════════════════════════╝
  `);
}

// ─── Admin Creation (by Super Admin) ─────────────────────────────────────────

async function createAdmin(data, createdById) {
    const { name, email, companyName, companyRegNumber } = data;

    // 1. Check email uniqueness
    const { rows: emailCheck } = await query(
        'SELECT id FROM admin_users WHERE email = $1',
        [email.toLowerCase()]
    );
    if (emailCheck.length) {
        throw new AppError('EMAIL_ALREADY_EXISTS', 'An admin with this email already exists.', 409);
    }

    // 2. Generate unique registration code (retry on collision)
    let registrationCode;
    let attempts = 0;
    while (attempts < 10) {
        const candidate = generateRegistrationCode(companyName);
        const { rows: codeCheck } = await query(
            'SELECT id FROM admin_users WHERE registration_code = $1',
            [candidate]
        );
        if (!codeCheck.length) {
            registrationCode = candidate;
            break;
        }
        attempts++;
    }
    if (!registrationCode) {
        throw new AppError('INTERNAL_ERROR', 'Could not generate a unique registration code.', 500);
    }

    // 3. Generate setup token
    const { raw: rawToken, hashed: hashedToken } = generateSetupToken();

    const setupTokenExpiry = new Date(
        Date.now() + (parseInt(process.env.ADMIN_SETUP_TOKEN_EXPIRY_HOURS) || 48) * 60 * 60 * 1000
    );

    // 4. Insert admin
    const { rows: newAdmin } = await query(
        `INSERT INTO admin_users
       (name, email, password_hash, role, company_name, company_reg_number,
        registration_code, setup_token, setup_token_expiry, active, created_by)
     VALUES ($1, $2, 'PENDING_SETUP', 'admin', $3, $4, $5, $6, $7, true, $8)
     RETURNING id, name, email, company_name, registration_code`,
        [
            name, email.toLowerCase(), companyName, companyRegNumber || null,
            registrationCode, hashedToken, setupTokenExpiry, createdById,
        ]
    );

    const admin = newAdmin[0];

    // 5. Audit log
    await insertAuditLog(createdById, 'ADMIN_CREATED', 'admin_user', admin.id, { email, companyName });

    // 6. Build setup link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const setupLink = `${baseUrl}/admin/setup?token=${rawToken}`;

    const isDevMode = process.env.FEATURE_EMAIL_ENABLED !== 'true';

    if (isDevMode) {
        console.log(`\n[DEV] Admin Setup Link:     ${setupLink}`);
        console.log(`[DEV] Registration Code:    ${registrationCode}\n`);
        return {
            success: true,
            setupLink,
            registrationCode,
            admin: { id: admin.id, name: admin.name, email: admin.email, companyName: admin.company_name },
        };
    }

    // TODO: Replace with email service when FEATURE_EMAIL_ENABLED=true
    // Interface: sendEmail(to, subject, html): Promise<void>
    // await emailService.sendAdminSetupEmail(email, setupLink, registrationCode);

    return { success: true };
}

// ─── Admin Setup (complete account setup via token) ───────────────────────────

async function completeAdminSetup(token, password) {
    const hashedToken = hashSHA256(token);

    const { rows } = await query(
        `SELECT id, password_hash, setup_token_expiry, active
     FROM admin_users
     WHERE setup_token = $1`,
        [hashedToken]
    );

    if (!rows.length) {
        throw new AppError('SETUP_TOKEN_INVALID', 'This setup link is invalid or has already been used.', 400);
    }

    const admin = rows[0];

    if (new Date() > new Date(admin.setup_token_expiry)) {
        throw new AppError('SETUP_TOKEN_EXPIRED', 'This setup link has expired. Please ask for a new one.', 400);
    }

    if (admin.password_hash !== 'PENDING_SETUP') {
        throw new AppError('SETUP_TOKEN_INVALID', 'This setup link has already been used.', 400);
    }

    validatePasswordStrength(password);

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await query(
        `UPDATE admin_users
     SET password_hash = $1, setup_token = NULL, setup_token_expiry = NULL, updated_at = NOW()
     WHERE id = $2`,
        [password_hash, admin.id]
    );

    await insertAuditLog(admin.id, 'ADMIN_SETUP_COMPLETED', 'admin_user', admin.id, null);
}

// ─── Admin Login ──────────────────────────────────────────────────────────────

async function loginAdmin(email, password) {
    const { rows } = await query(
        `SELECT id, name, email, password_hash, role, company_name, active
     FROM admin_users WHERE email = $1`,
        [email.toLowerCase()]
    );

    // Timing-safe: always run bcrypt.compare even if user not found
    // This prevents timing attacks that reveal whether an email exists
    const hashToCompare = rows.length ? rows[0].password_hash : DUMMY_HASH;
    const dummy = hashToCompare === 'PENDING_SETUP' ? DUMMY_HASH : hashToCompare;
    const passwordMatch = await bcrypt.compare(password, dummy);

    if (!rows.length || !rows[0].active) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }

    const admin = rows[0];

    if (!passwordMatch) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }

    if (admin.password_hash === 'PENDING_SETUP') {
        throw new AppError(
            'SETUP_NOT_COMPLETED',
            'Your account setup is not complete. Check your email for the setup link.',
            401
        );
    }

    // TOTP gate (stubbed)
    if (process.env.FEATURE_TOTP_ENABLED === 'true') {
        // TODO: Generate temp token and return requiresTOTP: true
        // const tempToken = jwtService.generateToken({ id: admin.id, role: 'totp_pending' }, '5m');
        // return { requiresTOTP: true, tempToken };
    }

    // Issue JWT
    const token = jwtService.generateAdminToken(admin);

    // Update last_login
    await query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [admin.id]);

    // Audit log
    await insertAuditLog(admin.id, 'ADMIN_LOGIN', 'admin_user', admin.id, null);

    return {
        token,
        admin: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            companyName: admin.company_name,
        },
    };
}

// ─── Super Admin: List Admins ─────────────────────────────────────────────────

async function listAdmins() {
    const { rows } = await query(
        `SELECT 
       a.id, a.name, a.email, a.role, a.company_name, a.registration_code,
       a.active, a.last_login, a.created_at,
       COUNT(DISTINCT w.id) AS worker_count,
       COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_policy_count,
       COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= date_trunc('month', NOW())) AS claims_this_month
     FROM admin_users a
     LEFT JOIN workers w ON w.admin_id = a.id
     LEFT JOIN policies p ON p.admin_id = a.id
     LEFT JOIN claims c ON c.admin_id = a.id
     WHERE a.role = 'admin'
     GROUP BY a.id
     ORDER BY a.created_at DESC`,
        []
    );
    return rows;
}

async function deactivateAdmin(adminId, requestingAdminId, ip) {
    const { rows } = await query(
        `UPDATE admin_users SET active = false, updated_at = NOW()
     WHERE id = $1 AND role = 'admin'
     RETURNING id, name, email`,
        [adminId]
    );

    if (!rows.length) {
        throw new AppError('NOT_FOUND', 'Admin account not found.', 404);
    }

    await insertAuditLog(requestingAdminId, 'ADMIN_DEACTIVATED', 'admin_user', adminId, null, ip);
    return rows[0];
}

async function getPlatformStats() {
    const [admins, workers, policies, payouts] = await Promise.all([
        query("SELECT COUNT(*) AS total FROM admin_users WHERE role = 'admin'"),
        query('SELECT COUNT(*) AS total FROM workers WHERE is_active = true'),
        query("SELECT COUNT(*) AS total FROM policies WHERE status = 'active'"),
        query(`SELECT COALESCE(SUM(amount), 0) AS total_this_week
           FROM payouts 
           WHERE status = 'completed' AND initiated_at >= NOW() - INTERVAL '7 days'`),
    ]);

    return {
        totalAdmins: +admins.rows[0].total,
        totalWorkers: +workers.rows[0].total,
        totalActivePolicies: +policies.rows[0].total,
        totalPayoutsThisWeek: +payouts.rows[0].total_this_week,
    };
}

module.exports = {
    createSuperAdmin,
    createAdmin,
    completeAdminSetup,
    loginAdmin,
    listAdmins,
    deactivateAdmin,
    getPlatformStats,
};
