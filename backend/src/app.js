require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const { setupPassport } = require('./config/passport');

const { testConnection } = require('./config/db');
const { getRedisClient } = require('./config/redis');
const { startTriggerEngine } = require('./cron/triggerEngine');

// Existing routes
const authRoutes = require('./routes/authRoutes');
const policyRoutes = require('./routes/policyRoutes');
const claimsRoutes = require('./routes/claimsRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const adminRoutes = require('./routes/adminRoutes');

// New auth/role routes
const workerAuthRoutes = require('./routes/workerAuthRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');

const { errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

const app = express();

// ─── CORS — allow multiple origins (comma-separated in FRONTEND_URL) ──────────
// In dev, we also always allow common local ports so port changes don't break things.
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'];

const allowedOrigins = [
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : []),
  ...(process.env.NODE_ENV !== 'production' ? DEV_ORIGINS : []),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`[CORS] Blocked request from: ${origin}`);
    callback(new Error(`CORS: Origin ${origin} is not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session (required for Passport OAuth redirect handshake only) ─────────────
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'gigshield_session_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true, maxAge: 5 * 60 * 1000 },
}));

// ─── Passport ─────────────────────────────────────────────────────────────────
setupPassport();
app.use(passport.initialize());
app.use(passport.session());

// ─── Global rate limiter (200 req / 1 min / IP) ────────────────────────────────
app.use(globalLimiter);

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'GigShield API', ts: new Date().toISOString() })
);

// ─── Routes ────────────────────────────────────────────────────────────────────
// Worker auth
app.use('/api/auth', authRoutes);
app.use('/api/auth', workerAuthRoutes);
app.use('/api/policy', policyRoutes);
app.use('/api/claims', claimsRoutes);
app.use('/api/payouts', payoutRoutes);

// ⚠️  IMPORTANT: adminAuthRoutes (/api/admin/auth) and superAdminRoutes (/api/super-admin)
// MUST be registered BEFORE adminRoutes (/api/admin).
// adminRoutes applies requireAdminAuth to ALL sub-paths, so if it runs first it will
// return 401 for the public /login and Google OAuth endpoints.
app.use('/api/admin/auth', adminAuthRoutes);   // public login + Google OAuth — no auth required
app.use('/api/super-admin', superAdminRoutes); // super_admin protected
app.use('/api/admin', adminRoutes);            // admin protected (registered last)

// ─── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({
    success: false,
    message: `${req.method} ${req.originalUrl} not found`,
  })
);

app.use(errorHandler);

// ─── Boot ──────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const mask = (url) => url?.replace(/:([^:@]{4,})@/, ':****@') ?? 'unset';

// Start HTTP server immediately so nodemon doesn't hang
const server = app.listen(PORT, () => {
  console.log(`\n🚀  GigShield Backend  →  http://localhost:${PORT}`);
  console.log(`    Env    : ${process.env.NODE_ENV}`);
  console.log(`    DB     : ${mask(process.env.DATABASE_URL)}`);
  console.log(`    Redis  : ${mask(process.env.REDIS_URL)}`);
  console.log(`    ML     : ${process.env.ML_BASE_URL}`);
  console.log('\n⏳  Connecting to DB and Redis in background...');
});

// Background init — connect to DB and Redis without blocking the server
(async () => {
  // DB
  await testConnection();

  // Redis — timeout guard so app doesn't hang on Redis cloud issues
  try {
    const redisPromise = getRedisClient();
    const timeout = new Promise((_, rej) =>
      setTimeout(() => rej(new Error('Redis connection timed out after 10s')), 10000)
    );
    await Promise.race([redisPromise, timeout]);
  } catch (err) {
    console.warn('[Redis] Warning:', err.message);
    console.warn('    → Sessions/cache will not work until Redis reconnects.');
  }

  // Start cron trigger engine after connections
  startTriggerEngine();
})();

module.exports = app;
