# GigShield — Layer 3 Backend

AI-Powered Parametric Insurance for Food Delivery Gig Workers (India)  
**Node.js · Express · PostgreSQL · Redis · JWT · node-cron**  
Built for **Guidewire DEVTrails 2026**

---

## System Architecture

| Layer | Service | Stack | Port |
|-------|---------|-------|------|
| 1 | Frontend | React + Vite + TypeScript + shadcn/ui | 5173 |
| **3** | **Core Backend (this)** | **Node.js + Express** | **5000** |
| 4 | ML Engine | Python FastAPI | 8000 |
| 6 | Data | PostgreSQL + Redis (cloud) | 5432 / cloud |

---

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14 — must be installed and running locally
- **Redis** — hosted on RedisLabs cloud (configured in `.env`, always-on)
- **ML Service** — Python FastAPI running at `http://localhost:8000`

---

## Quick Start

### 1. Install PostgreSQL (if not installed)

**Option A — EnterpriseDB installer (recommended):**  
Download from https://www.enterprisedb.com/downloads/postgres-postgresql-downloads  
Set password to `Niggapls` during installation.

**Option B — winget (run as Administrator):**
```powershell
winget install PostgreSQL.PostgreSQL
```

### 2. Set up the Database

Run the automated setup script (PowerShell, as Administrator):

```powershell
cd d:\devtrails\guidewiredevhackathon
.\scripts\setup-postgres.ps1
```

This script will:
- ✅ Create the `gigshield` database
- ✅ Apply `db/schema.sql` (base schema)
- ✅ Apply `db/migrate.sql` (auth columns, seeds)
- ✅ Seed admin user: `admin@gigshield.com` / `admin123`
- ✅ Seed sample cities, zones, and plans
- ✅ Add psql to system PATH

**Or manually:**
```powershell
# Set postgres password
$env:PGPASSWORD = "Niggapls"

# Create database
psql -U postgres -c "CREATE DATABASE gigshield"

# Apply schema
psql -U postgres -d gigshield -f db\schema.sql

# Apply auth migration and seeds
psql -U postgres -d gigshield -f db\migrate.sql
```

### 3. Install Node.js dependencies

```bash
cd backend
npm install
```

### 4. Configure environment

The `.env` is already set correctly:
```env
DATABASE_URL=postgres://postgres:Niggapls@localhost:5432/gigshield
REDIS_URL=redis://:...@redis-14806.crce283.ap-south-1-2.ec2.cloud.redislabs.com:14806
NODE_ENV=development
PORT=5000
JWT_SECRET=gigshield_secret_2026
ML_BASE_URL=http://localhost:8000
TRIGGER_CRON_INTERVAL=*/15 * * * *
FRONTEND_URL=http://localhost:5173
```

### 5. Start all services in order

```bash
# 1. PostgreSQL (must be running — see setup above)

# 2. Redis — always-on cloud (no action needed)

# 3. ML Engine
cd ml
uvicorn main:app --reload --port 8000

# 4. Backend (this service)
cd backend
npm run dev

# 5. Frontend
cd frontend
npm run dev
```

---

## Project Structure

```
backend/src/
├── config/
│   ├── db.js           ← PostgreSQL pool (pg library, DATABASE_URL)
│   ├── redis.js        ← Redis client + all cache/session/queue helpers
│   └── mlClient.js     ← Axios instance for ML service (localhost:8000)
├── controllers/        ← Thin: call service, send response
│   ├── authController.js
│   ├── claimsController.js
│   ├── payoutController.js
│   ├── policyController.js
│   └── adminController.js
├── services/           ← Business logic
│   ├── authService.js  ← bcrypt + JWT, worker/admin auth
│   ├── policyService.js← ML risk-score, premium calc, CRUD
│   ├── claimsService.js← ML fraud-score, auto-approve, queue
│   ├── payoutService.js← Simulated Razorpay, queue processor
│   ├── adminService.js ← Dashboard KPIs, analytics, config
│   └── triggerService.js← ML trigger calls per zone
├── routes/             ← express-validator + controller wiring
├── middleware/
│   ├── auth.js         ← JWT verify + Redis blacklist + session
│   ├── errorHandler.js ← Centralised error handling
│   └── validate.js     ← express-validator error collector
├── cron/
│   └── triggerEngine.js← node-cron: triggers every 15min, payouts every 30s
├── utils/
│   └── response.js
└── app.js              ← Express app bootstrap
```

---

## API Reference

All protected routes require: `Authorization: Bearer <token>`

### AUTH

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register worker (phone-based) |
| POST | `/api/auth/login` | ❌ | Worker login |
| GET | `/api/auth/me` | ✅ Worker | Get profile |
| POST | `/api/auth/logout` | ✅ Worker | Logout + blacklist token |
| POST | `/api/admin/auth/login` | ❌ | Admin login |
| POST | `/api/admin/auth/logout` | ✅ Admin | Admin logout |

**Register worker:**
```json
POST /api/auth/register
{
  "name": "Ravi Kumar",
  "phone": "9876543210",
  "password": "secret123",
  "platform": "Swiggy",
  "zone_id": "<uuid>",
  "city_id": "<uuid>",
  "upi": "ravi@upi"
}
```

### POLICY

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/policy/plans` | ❌ | List all plans |
| POST | `/api/policy/quote` | ✅ Worker | Get ML risk quote |
| POST | `/api/policy/create` | ✅ Worker | Purchase policy |
| GET | `/api/policy/my` | ✅ Worker | My policies |
| GET | `/api/policy/:id` | ✅ Worker | Policy detail |
| POST | `/api/policy/:id/renew` | ✅ Worker | Renew policy |

### CLAIMS

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/claims/auto-initiate` | ✅ Worker | File a claim (ML fraud check) |
| GET | `/api/claims/my` | ✅ Worker | My claims |
| GET | `/api/claims/worker/:id` | ✅ | Claims for worker |
| GET | `/api/claims/:id/status` | ✅ | Claim status |

### PAYOUTS

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/payouts/initiate` | ✅ Worker | Initiate payout for approved claim |
| GET | `/api/payouts/my` | ✅ Worker | My payouts |
| GET | `/api/payouts/worker/:id` | ✅ | Worker payouts |
| GET | `/api/payouts/:id/status` | ✅ | Payout status |

### ADMIN

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/dashboard` | KPIs (cached 3min) |
| GET | `/api/admin/workers` | Paginated workers list |
| PATCH | `/api/admin/workers/:id/kyc` | Update KYC status |
| GET | `/api/admin/policies` | All policies |
| GET | `/api/admin/claims` | All claims |
| POST | `/api/admin/claims/:id/approve` | Approve + trigger payout |
| POST | `/api/admin/claims/:id/reject` | Reject with reason |
| GET | `/api/admin/events` | Disruption events |
| GET | `/api/admin/analytics` | Claims/revenue analytics |
| GET | `/api/admin/config` | System config |
| PATCH | `/api/admin/config` | Toggle trigger engine etc. |

---

## Redis Key Architecture

| Key | TTL | Purpose |
|-----|-----|---------|
| `session:worker:{id}` | 24h | Worker auth session |
| `session:admin:{id}` | 24h | Admin auth session |
| `blacklist:{token}` | JWT expiry | Logout revocation |
| `weather_{zone}` | 2 min | ML weather trigger cache |
| `aqi_{zone}` | 2 min | ML AQI trigger cache |
| `dashboard:kpis` | 3 min | Admin dashboard cache |
| `system:config` | 1 min | Trigger engine config |
| `queue:claims:fraud` | — | Fraud review queue |
| `queue:payouts` | — | Payout processing queue |

---

## ML Integration

| Backend Service | ML Endpoint | Type | Purpose |
|----------------|-------------|------|---------|
| Policy quote | `/ml/risk-score` | POST | Risk score → premium |
| Claim initiation | `/ml/fraud-score` | POST | Fraud decision |
| Trigger cron | `/triggers/weather?zone_id=` | GET | Weather threshold |
| Trigger cron | `/triggers/aqi?zone_id=` | GET | AQI threshold |
| Trigger cron | `/triggers/mock-alerts?zone_id=` | GET | Strike/curfew alerts |

All ML calls fall back gracefully if the ML service is unavailable.

---

## Database Schema Notes

The backend uses the schema from `db/schema.sql` + migrations from `db/migrate.sql`.

**Critical schema facts:**
- All IDs are **UUIDs** (not integers)
- Workers login by **phone** (not email)
- `plans` table uses `weekly_premium` column (not `base_premium`)
- `claims.type` must be one of: `Heavy Rain`, `Poor AQI`, `Heatwave`, `Platform Outage`
- `payouts.upi` is required (cannot be null)
- `disruption_events.severity` is a text enum: `low/medium/high/critical`
- `disruption_events.source` must be: `weather/aqi/platform/manual`
- `workers.kyc_status` must be: `pending/verified`

---

## Health Check

```bash
curl http://localhost:5000/health
# {"status":"ok","service":"GigShield API","ts":"..."}
```

---

## Default Admin Account

```
Email:    admin@gigshield.com
Password: admin123
```
> ⚠️ Change this in production!
