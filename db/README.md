# GigShield — Data Layer (Updated for Use My Location Feature)

## New Feature: Use My Location

**Added support for worker location selection via GPS:**

```
Frontend Flow:
Dashboard/Register → "📍 Use My Location" 
  ↓ GPS (browser)
  ↓ BigDataCloud API (free) → lat/lng → city
  ↓ Backend /api/worker/zones?city=Mumbai → fuzzy match zones
  ↓ Leaflet map modal + zone selector
  ↓ PATCH /api/worker/location → UPDATE workers (city, zone_id)
```

**Database Changes:**
```
workers table:
- city (string) - Human readable city name  
- zone_id (UUID) → REFERENCES zones(id)
- updated_at (TIMESTAMPTZ) - Track location updates

zones table:
- id (UUID PRIMARY KEY)
- city_id REFERENCES cities(id)
- name (VARCHAR) - "Bandra", "Andheri", etc.

cities table:
- id (UUID PRIMARY KEY)
- name (VARCHAR UNIQUE) - "Mumbai", "Delhi", etc.
```

**Backend Endpoints Added:**
```
GET /api/worker/zones?city=sathyamangalam
→ Remaps to Coimbatore → returns zones for Coimbatore

PATCH /api/worker/location
→ UPDATE workers SET city, zone_id, updated_at WHERE id=$3
→ requireWorkerAuth middleware (JWT + active check)
```

**Frontend Components Added:**
```
hooks/useLocation.ts - GPS + geocoding + backend call
components/LocationPicker.tsx - Map modal + zone selector
Integrated in Dashboard.tsx + RegisterProfile.tsx
```

## Full Architecture

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

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **workers** | Gig worker profiles | phone, name, platform, zone_id, weekly_earnings, upi, kyc_status, risk_level |
| **admins** | Admin users for platform management | email, password_hash, name, role, two_fa_secret |
| **policies** | Insurance policies | worker_id, plan_id, premium, max_coverage, status, auto_renew, start_date, end_date |
| **claims** | Disruption claims | worker_id, policy_id, event_id, type, amount, status, fraud_score, gps_match |
| **payouts** | UPI payouts to workers | claim_id, worker_id, amount, status, upi, initiated_at, completed_at |
| **disruption_events** | Weather/AQI/outage events | type, zone_id, severity, value, source, verified, claims_generated |
| **system_config** | Engine configuration | engine_active, check_interval_minutes, payout_delay_seconds, thresholds |
| **audit_logs** | Admin action history | user_id, user_type, action, field, old_value, new_value |

### Supporting Tables

| Table | Purpose |
|-------|---------|
| **cities** | City definitions (Mumbai, Delhi, Bangalore) |
| **zones** | Zone definitions with risk levels (Bandra, Rohini, etc.) |
| **plans** | Policy plans (basic, standard, premium) with coverage config |

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

## Next Steps

- Add more seed data (sample workers, policies, claims)
- Implement API endpoints that use this data layer
- Add more Redis caching for frequently accessed data
- Consider adding connection pooling for Redis
