require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const { testConnection }     = require('./config/db');
const { getRedisClient }     = require('./config/redis');
const { startTriggerEngine } = require('./cron/triggerEngine');

const authRoutes   = require('./routes/authRoutes');
const policyRoutes = require('./routes/policyRoutes');
const claimsRoutes = require('./routes/claimsRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const adminRoutes  = require('./routes/adminRoutes');

const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// ─── Core middleware ───────────────────────────────────────────────────────────
app.use(cors({
  origin:  process.env.FRONTEND_URL || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (_, res) =>
  res.json({ status: 'ok', service: 'GigShield API', ts: new Date().toISOString() })
);

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',    authRoutes);
app.use('/api/policy',  policyRoutes);
app.use('/api/claims',  claimsRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/admin',   adminRoutes);

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
    const timeout      = new Promise((_, rej) =>
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
