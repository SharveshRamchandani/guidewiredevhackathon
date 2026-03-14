# GigShield — Layer 6: Data Layer

## Overview

This is the **data layer** for GigShield - an income protection insurance platform for India's gig workers. This folder contains the PostgreSQL schema and Redis caching layer that supports the entire application.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  /dashboard  /claims  /payouts  /policy  /admin/dashboard ... │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API Calls
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND (Node.js)                           │
│  Auth Service │ Trigger Engine │ Claims │ Payout │ Analytics  │
└────────────────────────────┬────────────────────────────────────┘
                             │ pg Pool / Redis Client
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA LAYER (This Folder)                    │
│  ┌─────────────────────┐    ┌─────────────────────────────┐  │
│  │   PostgreSQL        │    │   Redis Cloud               │  │
│  │   (Primary DB)      │    │   (Caching + Queues)        │  │
│  │   workers           │    │   weather:{zone}             │  │
│  │   policies          │    │   dashboard:kpis            │  │
│  │   claims            │    │   session:worker:{id}      │  │
│  │   payouts           │    │   queue:claims:fraud        │  │
│  │   disruption_events │    │   queue:payouts             │  │
│  │   system_config     │    │   system:config             │  │
│  └─────────────────────┘    └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Stack
- **PostgreSQL** — Primary relational database
- **Redis Cloud** — Caching + trigger/payout queues

## Database Schema (PostgreSQL)

### Database Schema Details (PostgreSQL)

#### Core Tables

- **`workers`**: Gig worker profiles on the platform.
  - `id` (UUID): Primary Key.
  - `phone` (VARCHAR): Unique mobile number.
  - `name` (VARCHAR): Full name.
  - `platform` (VARCHAR): Swiggy, Zomato, Amazon, Zepto, Blinkit, Dunzo.
  - `city_id` / `zone_id` (UUID): Links to operating locations.
  - `weekly_earnings` (NUMERIC): Reported weekly income.
  - `aadhaar_last4` (VARCHAR): Masked ID for KYC.
  - `upi` (VARCHAR): UPI ID for payouts.
  - `kyc_status` (VARCHAR): 'pending', 'verified'.
  - `risk_level` (VARCHAR): 'low','medium','high'.
  - `notifications` (JSONB): Preferences for sms, push, whatsapp.
  - `is_active` (BOOLEAN): Worker active status.
  - `created_at` / `updated_at` (TIMESTAMPTZ): Timestamps.

- **`admins`**: Platform administrators.
  - `id` (UUID): Primary Key.
  - `email` (VARCHAR): Unique login email.
  - `password_hash` (TEXT): Encrypted password.
  - `name` (VARCHAR): Admin name.
  - `role` (VARCHAR): Role (default: 'admin').
  - `two_fa_secret` (TEXT): Secret for 2FA.
  - `notifications` (JSONB): Preferences for email, slack, criticalSms.
  - `is_active` (BOOLEAN): Admin active status.
  - `created_at` / `updated_at` (TIMESTAMPTZ): Timestamps.

- **`policies`**: Active insurance policies for gig workers.
  - `id` (UUID): Primary Key.
  - `policy_number` (VARCHAR): E.g., POL-2026-0847.
  - `worker_id` / `plan_id` (UUID): Who holds the policy and which plan.
  - `premium` (NUMERIC): Policy cost.
  - `max_coverage` (NUMERIC): Maximum payout overall.
  - `status` (VARCHAR): 'active', 'expired', 'cancelled'.
  - `auto_renew` (BOOLEAN): Auto-renewal status.
  - `start_date` / `end_date` (DATE): Policy duration.
  - `coverage_snapshot` (JSONB): Coverage rules applied.
  - `created_at` / `updated_at` (TIMESTAMPTZ): Timestamps.

- **`disruption_events`**: Disruption events creating claims.
  - `id` (UUID): Primary Key.
  - `event_number` (VARCHAR): E.g., EVT-001.
  - `type` (VARCHAR): 'Heavy Rain', 'Poor AQI', etc.
  - `zone_id` / `city_id` (UUID): Affected areas.
  - `severity` (VARCHAR): 'low', 'medium', 'high', 'critical'.
  - `value` (VARCHAR): Detail (e.g., "45mm", "AQI 340").
  - `source` (VARCHAR): Data origin.
  - `verified` (BOOLEAN): Event verification.
  - `claims_generated` (INT): Claims created.
  - `triggered_at` (TIMESTAMPTZ): Disruption trigger time.

- **`claims`**: Worker disruption claims.
  - `id` (UUID): Primary Key.
  - `claim_number` (VARCHAR): E.g., CLM-001.
  - `worker_id` / `policy_id` / `event_id` (UUID): Claim identifiers.
  - `type` (VARCHAR): Corresponds to `disruption_events`.
  - `amount` (NUMERIC): Requested compensation.
  - `approved_amount` (NUMERIC): Sanctioned compensation.
  - `status` (VARCHAR): 'pending', 'approved', 'rejected'.
  - `fraud_score` (NUMERIC): Likelihood of fraud (0-100).
  - `gps_match` (BOOLEAN): Worker GPS matching zone.
  - `velocity` (NUMERIC): Daily claim frequency.
  - `rejection_reason` (TEXT): Details on rejection.
  - `processed_at` / `created_at` / `updated_at` (TIMESTAMPTZ): Timestamps.

- **`payouts`**: Disbursed monetary claims.
  - `id` (UUID): Primary Key.
  - `payout_number` (VARCHAR): E.g., PAY-001.
  - `claim_id` / `worker_id` (UUID): Reference to worker and claim.
  - `amount` (NUMERIC): Disbursed amount.
  - `status` (VARCHAR): 'pending', 'processing', 'completed', 'failed'.
  - `upi` (VARCHAR): Beneficiary identifier.
  - `initiated_at` / `completed_at` (TIMESTAMPTZ): Timestamps.
  - `failure_reason` (TEXT): Rejection logs.

- **`system_config`**: Configuration thresholds for the trigger engine.
  - `id` (UUID): Primary Key.
  - `engine_active` (BOOLEAN): Engine operational status.
  - `check_interval_minutes` (INT): Engine cycle period.
  - `payout_delay_seconds` (INT): Payout delay limit.
  - `zone_overrides` (JSONB): Specific zone overrides.
  - `thresholds` (JSONB): Disruption parameters (Limits for rain/aqi).
  - `updated_at` (TIMESTAMPTZ): Timestamps.

- **`audit_logs`**: System modification records.
  - `id` (UUID): Primary Key.
  - `user_id` (UUID): Identifier.
  - `user_type` (VARCHAR): 'worker', 'admin'.
  - `action` (VARCHAR): Modification triggered.
  - `field` (VARCHAR): Value customized.
  - `old_value` / `new_value` (TEXT): Track changes.
  - `ip_address` (VARCHAR): Origin metadata.
  - `created_at` (TIMESTAMPTZ): Timestamp.

#### Supporting Tables

- **`cities`**: City definitions where GigShield operates.
  - `id` (UUID): Primary Key.
  - `name` (VARCHAR): E.g., Mumbai, Delhi, Bangalore. Unique.

- **`zones`**: Localized risk zones within cities.
  - `id` (UUID): Primary Key.
  - `city_id` (UUID): Links to `cities`.
  - `name` (VARCHAR): E.g., Bandra, Rohini, Whitefield.
  - `risk_level` (VARCHAR): 'low','medium','high'. Defaults to 'low'.

- **`plans`**: Available gig worker insurance policies.
  - `id` (UUID): Primary Key.
  - `name` (VARCHAR): 'basic', 'standard', 'premium'. Unique.
  - `weekly_premium` (NUMERIC): Plan cost.
  - `max_coverage` (NUMERIC): Coverage upper bracket.
  - `coverage_config` (JSONB): Allowed payout circumstances (weather, outage parameters).

### Indexes

The schema includes optimized indexes for common queries:
- `idx_workers_phone` - Fast worker lookup by phone
- `idx_claims_status` - Filter claims by status (pending/approved/rejected)
- `idx_policies_worker` - Get worker's policy history
- `idx_events_zone` + `idx_events_triggered` - Query events by zone and time

## Redis Caching Strategy

### Cache Keys

| Key Pattern | Purpose | TTL | Use Case |
|-------------|---------|-----|----------|
| `weather:{zone}` | Live weather/AQI data | 2 min | Dashboard weather widget |
| `dashboard:kpis` | Admin KPIs | 3 min | Admin dashboard stats |
| `risk_zones:{city}` | Zone risk levels | 5 min | Risk zone display |
| `system:config` | Engine config | 1 min | Trigger engine reads |
| `session:worker:{id}` | Worker auth session | 24 hrs | Auth validation |
| `session:admin:{id}` | Admin auth session | 24 hrs | Admin auth validation |
| `ratelimit:{key}` | API rate limiting | 1 min | Prevent abuse |

### Queue Keys

| Key | Type | Purpose |
|-----|------|---------|
| `queue:claims:fraud` | List | Claims pending fraud check |
| `queue:payouts` | List | Approved claims pending UPI payout |

## Setup

### 1. Install dependencies
```bash
npm install pg redis dotenv
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in your DATABASE_URL and REDIS_URL
```

### 3. Run migration (creates all tables)
```bash
node db/migrate.js
```

### 4. Seed default data (cities, zones, plans)
```bash
node db/seed.js
```

## File Structure

```
db/
  postgres.js   ← pg Pool — import this in any service
  redis.js      ← Redis client + all helper functions
  schema.sql    ← All CREATE TABLE statements + indexes
  migrate.js    ← Runs schema.sql against your DB
  seed.js       ← Inserts cities, zones, plans
.env.example    ← Copy to .env and fill in credentials
README.md       ← This file
```

## Frontend-to-Database Mapping

### Worker Features

| Frontend Page | Database Tables | Redis Keys |
|--------------|-----------------|------------|
| **Register** | workers, policies | session:worker:{id} |
| **Dashboard** | policies, claims, payouts, disruption_events | weather:{zone}, dashboard:kpis |
| **Claims** | claims | - |
| **Payouts** | payouts | - |
| **Policy** | policies, plans | - |
| **Profile** | workers | session:worker:{id} |

### Admin Features

| Frontend Page | Database Tables | Redis Keys |
|--------------|-----------------|------------|
| **AdminDashboard** | workers, policies, claims, payouts | dashboard:kpis |
| **AdminWorkers** | workers | - |
| **AdminPolicies** | policies, workers | - |
| **AdminClaims** | claims, workers | queue:claims:fraud |
| **AdminEvents** | disruption_events | weather:{zone} |
| **AdminCron** | system_config, audit_logs | system:config |
| **AdminAnalytics** | workers, policies, claims, payouts | dashboard:kpis |
| **AdminFraud** | claims | queue:claims:fraud |

## Data Flow Examples

### 1. Worker Registration Flow
```
Frontend: /register → POST /api/auth/register
  ↓
Backend: INSERT into workers table
  ↓
Redis: setSession(workerId, { token, role: 'worker' })
  ↓
Response: { workerId, token, policyId }
```

### 2. Claim Trigger Flow
```
Trigger Engine: checkWeather() → threshold exceeded
  ↓
Backend: INSERT into disruption_events
  ↓
Backend: INSERT into claims (for each affected worker)
  ↓
Redis: enqueueClaim(claimId) → pushed to queue:claims:fraud
  ↓
Fraud Service: dequeueClaim() → process fraud check
  ↓
Backend: UPDATE claims SET status = 'approved'
  ↓
Redis: enqueuePayout(payoutId) → pushed to queue:payouts
  ↓
Payout Service: dequeuePayout() → process UPI transfer
  ↓
Backend: INSERT into payouts
```

### 3. Admin Claim Review Flow
```
Frontend: /admin/claims → GET /api/claims?status=pending
  ↓
Backend: SELECT * FROM claims WHERE status = 'pending'
  ↓
Redis: cacheDashboard() - invalidates on new claims
  ↓
Frontend: Click "Approve" → PUT /api/claims/:id/approve
  ↓
Backend: UPDATE claims SET status = 'approved', processed_at = NOW()
  ↓
Redis: enqueuePayout(payoutId)
```

## How Other Layers Use This

### Auth Service (Layer 3)
```js
const pool = require('./db/postgres');
const { setSession, getSession } = require('./db/redis');

// Create session on login
await setSession(workerId, { token, phone, platform });

// Validate session
const session = await getSession(workerId);
if (!session) return res.status(401).json({ error: 'Unauthorized' });
```

### Trigger Engine (Layer 3)
```js
const { getConfig, cacheWeather, enqueueClaim } = require('./db/redis');

// Read engine config (cached)
const config = await getConfig();
if (!config?.engine_active) return;

// Cache weather data
await cacheWeather(zone, { rainfall, temperature, aqi });

// Queue claims for fraud check
await enqueueClaim(claimId);
```

### Claims Service (Layer 3)
```js
const pool = require('./db/postgres');
const { enqueueClaim, dequeueClaim } = require('./db/redis');

// Process fraud queue
const claimId = await dequeueClaim();
if (claimId) {
  // Run fraud checks, update claim status
  await pool.query('UPDATE claims SET status = $1 WHERE id = $2', ['approved', claimId]);
}
```

### Payout Service (Layer 3)
```js
const { enqueuePayout, dequeuePayout } = require('./db/redis');

// Process payout queue
const payoutId = await dequeuePayout();
if (payoutId) {
  // Process UPI transfer
  await processUpiTransfer(payoutId);
}
```

### Analytics Service
```js
const { cacheDashboard, getDashboard, invalidateDashboard } = require('./db/redis');

// Cache dashboard KPIs
await cacheDashboard({
  activeWorkers: 12432,
  premiumCollected: 435000,
  activeClaims: 847,
  fraudFlagged: 23
});

// Invalidate when data changes
await invalidateDashboard();
```

## Redis Key Map Reference

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `weather:{zone}` | Live weather/AQI | 2 min |
| `dashboard:kpis` | Admin dashboard KPIs | 3 min |
| `risk_zones:{city}` | Zone risk levels | 5 min |
| `system:config` | Trigger engine config | 1 min |
| `session:worker:{id}` | Worker auth session | 24 hrs |
| `session:admin:{id}` | Admin auth session | 24 hrs |
| `queue:claims:fraud` | Fraud check queue | — |
| `queue:payouts` | Payout queue | — |
| `ratelimit:{key}` | API rate limiting | 1 min |

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/gigshield

# Redis
REDIS_URL=redis://user:password@host:port

# App
NODE_ENV=development  # or production
```

## Testing

Run migration and seed:
```bash
node db/migrate.js && node db/seed.js
```

Verify tables created:
```bash
psql $DATABASE_URL -c "\dt"
```

Check indexes:
```bash
psql $DATABASE_URL -c "\di"
```

## Recent Adds (BLACKBOXAI)

**Policy Page Real Data Integration (2024)**

**Backend Updates:**
- `backend/src/services/policyService.js`: Fixed column mismatches:
  - `generateQuote`: `base_premium, max_payout` → `weekly_premium AS base_premium, max_coverage AS max_payout`
  - `listPlans`: Same column fix, ORDER BY weekly_premium
  - `getWorkerPolicies`: `pl.max_payout AS max_coverage, pl.base_premium AS base_premium` → `pl.max_coverage, pl.weekly_premium AS base_premium`
- APIs `/api/policy/plans`, `/api/policy/my` now return correct schema data (weekly_premium, max_coverage from `plans` table).

**Frontend Updates:**
- `frontend/src/lib/api.ts`: Added `workerApi.getPlans()`, `workerApi.getMyPolicies(token)`
- `frontend/src/pages/Policy.tsx`: 
  - Removed hardcoded data; now fetches real policies/plans.
  - Dynamic active policy display (plan_name, policy_number, premium, max_coverage, dates, zone proxy).
  - Coverage table parsed from `coverage_snapshot` or `coverage_config`.
  - Policy history from `/api/policy/my` (non-active policies).
  - Loading spinner, error toast + retry, empty state for no policies.
  - Auto-renew switch (synced from API).

**Verification:**
- Backend restart: `cd backend && npm run dev`
- Frontend dev: `cd frontend && npm run dev`
- Test: `/policy` shows real data; APIs return `weekly_premium`, `max_coverage`.

## Recent Adds (Antigravity Claims Fixes)

**Claims Page Real Data Integration & Schema Alignment (2026)**

**Database Schema Fixes:**
- **`policies` table**: 
  - Added missing `policy_number` (VARCHAR 50) column. This field is required by `policyService.js` to store the human-readable ID (e.g., POL-2026-1234). 
  - Retroactively updated existing active policies in the database to have uniquely generated `policy_number`s.

- **`claims` table**: 
  - Identified schema drift. The backend insertion logic (e.g., node scripts) was attempting to insert into `claim_number` and `gps_match` columns, which did not physically exist in the current local instance.
  - Resolved seeding operations by bypassing non-existent schema columns and directly inserting vital UI data (`worker_id`, `policy_id`, `type`, `amount`, `status`, `fraud_score`) mapped back to local `id` usage on the frontend.

**Backend & Frontend Claims Alignment:**
- `claimsRoutes.js`: Overhauled the `/seed` endpoint to dynamically generate mock claims matching a user's exact active policy `coverage_config` (e.g., ensuring Basic users only see "Heavy Rain" events).
- `Claims.tsx` & `Dashboard.tsx`: Replaced hardcoded dummy arrays (`claimsData`, `recentClaims`). Handwired UI components to fetch real database claims via `claimsApi.getMyClaims`.

## Next Steps

- Add more seed data (sample workers, policies, claims)
- Implement API endpoints that use this data layer
- Add more Redis caching for frequently accessed data
- Consider adding connection pooling for Redis
