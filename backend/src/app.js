require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { testConnection } = require('./config/db');
const { getRedisClient } = require('./config/redis');
const { startTriggerEngine } = require('./cron/triggerEngine');
const { setupPassport } = require('./config/passport');

// Routes
const authRoutes = require('./routes/authRoutes');
const policyRoutes = require('./routes/policyRoutes');
const claimsRoutes = require('./routes/claimsRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Auth/role routes
const workerAuthRoutes = require('./routes/workerAuthRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const { errorHandler } = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

const app = express();

setupPassport();
const passport = require('passport');
app.use(passport.initialize());

// ─── CORS — allow multiple origins (comma-separated in FRONTEND_URL) ──────────
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3000'];

const allowedOrigins = [
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
    : []),
  ...(process.env.NODE_ENV !== 'production' ? DEV_ORIGINS : []),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
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

// ⚠️  IMPORTANT: adminAuthRoutes and superAdminRoutes MUST be registered BEFORE adminRoutes.
// adminRoutes applies requireAdminAuth to ALL sub-paths, so if it runs first it will
// return 401 for the public /login endpoint.
app.use('/api/admin/auth', adminAuthRoutes);   // public login — no auth required
app.use('/api/super-admin', superAdminRoutes); // super_admin protected
app.use('/api/admin', adminRoutes);            // admin protected (registered last)
app.use('/api/notifications', notificationRoutes);

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
  await testConnection();

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

  startTriggerEngine();
})();

module.exports = app;
