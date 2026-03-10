/**
 * Admin Auth Service
 * Handles Super Admin seeding, Admin (staff) creation, setup, and login.
 * No multi-tenancy. GigShield is the single insurance provider.
 * Admins are internal GigShield staff members.
 */
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { query } = require('../config/db');
const jwtService = require('./jwtService');
const { AppError } = require('./jwtService');

const BCRYPT_ROUNDS = 12;

// Dummy hash for timing-safe comparison when user is not found.
// Pre-computed bcrypt hash so we don't need to hash on every failed login.
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

async function insertAuditLog(adminId, action, targetType, targetId, oldValue, newValue, ip) {
    try {
        await query(
            `INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, old_value, new_value, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                adminId || null,
                action,
                targetType || null,
                targetId || null,
                oldValue ? JSON.stringify(oldValue) : null,
                newValue ? JSON.stringify(newValue) : null,
                ip || null,
            ]
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
    const name = process.env.SUPER_ADMIN_NAME || 'GigShield Platform Owner';

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    await query(
        `INSERT INTO admin_users (name, email, password_hash, role, job_title, active)
         VALUES ($1, $2, $3, 'super_admin', 'Platform Owner', true)`,
        [name, email.toLowerCase(), password_hash]
    );

    console.log(`
╔══════════════════════════════════════════╗
║      GigShield Super Admin Created       ║
╠══════════════════════════════════════════╣
║  Email:    ${email.padEnd(31)}║
║  Password: ${password.padEnd(31)}║
╠══════════════════════════════════════════╣
║  ⚠  Change password after first login   ║
╚══════════════════════════════════════════╝
  `);
}

// ─── Admin (Staff) Creation (by Super Admin) ──────────────────────────────────

/**
 * Creates a new GigShield staff member.
 * @param {{ name: string, email: string, jobTitle?: string }} data
 * @param {string} createdById - Super admin's ID
 */
async function createAdmin(data, createdById) {
    const { name, email, jobTitle } = data;

    // 1. Check email uniqueness
    const { rows: emailCheck } = await query(
        'SELECT id FROM admin_users WHERE email = $1',
        [email.toLowerCase()]
    );
    if (emailCheck.length) {
        throw new AppError('EMAIL_ALREADY_EXISTS', 'A staff member with this email already exists.', 409);
    }

    // 2. Generate setup token
    const { raw: rawToken, hashed: hashedToken } = generateSetupToken();

    const setupTokenExpiry = new Date(
        Date.now() + (parseInt(process.env.ADMIN_SETUP_TOKEN_EXPIRY_HOURS || '24', 10)) * 60 * 60 * 1000
    );

    // 3. Insert staff member
    const { rows: newAdmin } = await query(
        `INSERT INTO admin_users
           (name, email, password_hash, role, job_title, setup_token, setup_token_expiry, active, created_by)
         VALUES ($1, $2, 'PENDING_SETUP', 'admin', $3, $4, $5, true, $6)
         RETURNING id, name, email, job_title`,
        [
            name,
            email.toLowerCase(),
            jobTitle || null,
            hashedToken,
            setupTokenExpiry,
            createdById,
        ]
    );

    const admin = newAdmin[0];

    // 4. Audit log
    await insertAuditLog(createdById, 'ADMIN_STAFF_CREATED', 'admin_user', admin.id, null, { email, jobTitle });

    // 5. Build setup link
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const setupLink = `${baseUrl}/admin/setup?token=${rawToken}`;

    const isDevMode = process.env.FEATURE_EMAIL_ENABLED !== 'true';

    if (isDevMode) {
        console.log(`\n[DEV] Staff setup link: ${setupLink}\n`);
        return {
            success: true,
            setupLink,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                jobTitle: admin.job_title,
            },
        };
    }

    // TODO: Send email via nodemailer/sendgrid when FEATURE_EMAIL_ENABLED=true
    // Interface: sendEmail(to: string, subject: string, body: string): Promise<void>
    return { success: true };
}

// ─── Admin Setup (complete account setup via token) ───────────────────────────

async function completeAdminSetup(token, password) {
    // Hash the raw token to look up the DB record
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

    await insertAuditLog(admin.id, 'ADMIN_SETUP_COMPLETED', 'admin_user', admin.id, null, null);
}

// ─── Admin Login ──────────────────────────────────────────────────────────────

async function loginAdmin(email, password) {
    const { rows } = await query(
        `SELECT id, name, email, password_hash, role, job_title, active
         FROM admin_users WHERE email = $1`,
        [email.toLowerCase()]
    );

    // Timing-safe: ALWAYS run bcrypt.compare even if user not found.
    // This prevents timing attacks that reveal whether an email exists.
    const foundUser = rows.length ? rows[0] : null;
    const isPendingSetup = foundUser?.password_hash === 'PENDING_SETUP';
    const hashToCompare = (foundUser && !isPendingSetup) ? foundUser.password_hash : DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!foundUser || !foundUser.active) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }

    if (isPendingSetup) {
        // Check after timing-safe compare to avoid leaking the PENDING_SETUP state via timing
        throw new AppError(
            'SETUP_NOT_COMPLETED',
            'Your account setup is not complete. Check your email for the setup link.',
            401
        );
    }

    // Google-only accounts cannot log in with a password
    if (foundUser?.password_hash === 'GOOGLE_ONLY' || foundUser?.password_hash === 'GOOGLE_AUTH') {
        throw new AppError(
            'GOOGLE_ONLY_ACCOUNT',
            'This account uses Google Sign-In. Please click "Sign in with Google".',
            401
        );
    }

    if (!passwordMatch) {
        throw new AppError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }

    // TOTP gate (stubbed)
    if (process.env.FEATURE_TOTP_ENABLED === 'true') {
        // TODO: Implement TOTP verification when FEATURE_TOTP_ENABLED=true
        // const tempToken = jwtService.generateToken({ id: admin.id, role: 'totp_pending' }, '5m');
        // return { requiresTOTP: true, tempToken };
    }

    // Issue JWT
    const token = jwtService.generateAdminToken(foundUser);

    // Update last_login
    await query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [foundUser.id]);

    // Audit log
    await insertAuditLog(foundUser.id, 'ADMIN_LOGIN', 'admin_user', foundUser.id, null, null);

    return {
        token,
        admin: {
            id: foundUser.id,
            name: foundUser.name,
            email: foundUser.email,
            role: foundUser.role,
            jobTitle: foundUser.job_title,
        },
    };
}

// ─── Super Admin: List Staff ──────────────────────────────────────────────────

async function listStaff() {
    const { rows } = await query(
        `SELECT
           id, name, email, job_title, role,
           active, last_login, created_at
         FROM admin_users
         WHERE role = 'admin'
         ORDER BY created_at DESC`,
        []
    );
    return rows;
}

// ─── Super Admin: Deactivate / Reactivate Staff ───────────────────────────────

async function deactivateStaff(targetId, requestingAdminId, requestingAdminRole, ip) {
    // Cannot deactivate own account
    if (targetId === requestingAdminId) {
        throw new AppError('FORBIDDEN', 'You cannot deactivate your own account.', 403);
    }

    // Fetch target
    const { rows } = await query(
        'SELECT id, name, email, role FROM admin_users WHERE id = $1',
        [targetId]
    );

    if (!rows.length) {
        throw new AppError('NOT_FOUND', 'Staff member not found.', 404);
    }

    const target = rows[0];

    // Cannot deactivate another super_admin
    if (target.role === 'super_admin') {
        throw new AppError('FORBIDDEN', 'Cannot deactivate a super admin account.', 403);
    }

    await query(
        'UPDATE admin_users SET active = false, updated_at = NOW() WHERE id = $1',
        [targetId]
    );

    await insertAuditLog(requestingAdminId, 'ADMIN_DEACTIVATED', 'admin_user', targetId, { active: true }, { active: false }, ip);
    return { success: true };
}

async function reactivateStaff(targetId, requestingAdminId, ip) {
    const { rows } = await query(
        'SELECT id, name, email, role FROM admin_users WHERE id = $1',
        [targetId]
    );

    if (!rows.length) {
        throw new AppError('NOT_FOUND', 'Staff member not found.', 404);
    }

    await query(
        'UPDATE admin_users SET active = true, updated_at = NOW() WHERE id = $1',
        [targetId]
    );

    await insertAuditLog(requestingAdminId, 'ADMIN_REACTIVATED', 'admin_user', targetId, { active: false }, { active: true }, ip);
    return { success: true };
}

// ─── Platform Stats (Super Admin) ─────────────────────────────────────────────

async function getPlatformStats() {
    const [workers, activeWorkers, policies, premiums, payouts, staff, fraud] = await Promise.all([
        query('SELECT COUNT(*) AS total FROM workers'),
        query(`SELECT COUNT(DISTINCT worker_id) AS total FROM policies
               WHERE status = 'active' AND created_at >= NOW() - INTERVAL '7 days'`),
        query("SELECT COUNT(*) AS total FROM policies WHERE status = 'active'"),
        query(`SELECT COALESCE(SUM(premium_amount), 0) AS total
               FROM policies WHERE created_at >= NOW() - INTERVAL '7 days'`),
        query(`SELECT COALESCE(SUM(amount), 0) AS total
               FROM payouts WHERE status = 'completed' AND initiated_at >= NOW() - INTERVAL '7 days'`),
        query("SELECT COUNT(*) AS total FROM admin_users WHERE role = 'admin' AND active = true"),
        query("SELECT COUNT(*) AS total FROM claims WHERE fraud_score >= 70 AND status = 'pending'"),
    ]);

    const totalPremiums = +(premiums.rows[0]?.total || 0);
    const totalPayouts = +(payouts.rows[0]?.total || 0);

    return {
        totalWorkers: +workers.rows[0].total,
        activeWorkersThisWeek: +activeWorkers.rows[0].total,
        totalActivePolicies: +policies.rows[0].total,
        totalPremiumsThisWeek: totalPremiums,
        totalPayoutsThisWeek: totalPayouts,
        platformLossRatio: totalPremiums > 0 ? Math.round((totalPayouts / totalPremiums) * 100) : 0,
        totalAdminStaff: +staff.rows[0].total,
        pendingFraudReviews: +fraud.rows[0]?.total || 0,
    };
}

// ─── Audit Log (paginated) ────────────────────────────────────────────────────

async function getAuditLog({ page = 1, limit = 50, adminId, action, from, to } = {}) {
    const conditions = [];
    const params = [];
    let i = 1;

    if (adminId) { conditions.push(`l.admin_id = $${i++}`); params.push(adminId); }
    if (action) { conditions.push(`l.action = $${i++}`); params.push(action); }
    if (from) { conditions.push(`l.created_at >= $${i++}`); params.push(from); }
    if (to) { conditions.push(`l.created_at <= $${i++}`); params.push(to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const { rows } = await query(
        `SELECT l.*, a.name AS admin_name, a.email AS admin_email
         FROM admin_audit_log l
         LEFT JOIN admin_users a ON a.id = l.admin_id
         ${where}
         ORDER BY l.created_at DESC
         LIMIT $${i++} OFFSET $${i++}`,
        [...params, limit, offset]
    );

    const { rows: countRows } = await query(
        `SELECT COUNT(*) AS total FROM admin_audit_log l ${where}`,
        params
    );

    return {
        logs: rows,
        total: +countRows[0].total,
        page,
        limit,
    };
}

module.exports = {
    createSuperAdmin,
    createAdmin,
    completeAdminSetup,
    loginAdmin,
    listStaff,
    deactivateStaff,
    reactivateStaff,
    getPlatformStats,
    getAuditLog,
    // Legacy alias kept for backward compat
    listAdmins: listStaff,
    deactivateAdmin: deactivateStaff,
};
