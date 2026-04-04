# Kintsu

Kintsu is a full-stack hackathon project for AI-assisted parametric insurance tailored to gig workers in India. It combines a React worker/admin portal, a Node.js orchestration backend, a Python FastAPI ML service, PostgreSQL for durable state, and Redis for caching, sessions, queues, and notifications.

The project models a simple but ambitious product story:

- Workers onboard with phone-based OTP and choose a protection plan.
- Environmental and operational disruptions such as heavy rain, poor AQI, heatwaves, and platform outages are monitored per zone.
- Claims can be auto-initiated, fraud-scored, reviewed, and routed to simulated UPI payouts.
- UPI payout changes are protected by a **UPI Risk Lock** that temporarily pauses payouts after suspicious payout-address updates.
- Admins and super admins manage workers, claims, policies, staff access, analytics, settings, and notifications.

## Table Of Contents

- [Project Overview](#project-overview)
- [Core Capabilities](#core-capabilities)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Structure](#repository-structure)
- [How The System Works](#how-the-system-works)
- [Services](#services)
- [Database And Data Model](#database-and-data-model)
- [Environment Variables](#environment-variables)
- [Local Development Setup](#local-development-setup)
- [Running The Project](#running-the-project)
- [Scripts And Operational Commands](#scripts-and-operational-commands)
- [API Surface Summary](#api-surface-summary)
- [Frontend Experience](#frontend-experience)
- [ML Service Summary](#ml-service-summary)
- [Caching, Queues, And Notifications](#caching-queues-and-notifications)
- [Testing And Verification](#testing-and-verification)
- [Known Constraints And Notes](#known-constraints-and-notes)
- [License](#license)

## Project Overview

Kintsu is organized as a multi-service monorepo:

- `frontend/`: React + Vite single-page application for workers, admins, and super admins.
- `backend/`: Express API and orchestration service responsible for auth, policy flows, claims, payouts, admin workflows, cron jobs, and internal integrations.
- `ml/`: Internal FastAPI microservice that exposes risk, fraud, disruption, premium, vulnerability, and trigger endpoints.
- `db/`: Schema, migrations, seed scripts, and low-level PostgreSQL and Redis helpers.
- `scripts/`: Setup automation, especially for local PostgreSQL initialization on Windows.

The codebase is clearly hackathon-driven but it is more than a landing page demo. It includes role-based auth, background jobs, data seeding, admin staff management, mock payments, in-app notifications, and an internal support assistant.

## Core Capabilities

- Worker OTP onboarding and profile completion.
- Plan discovery, quote generation, and policy purchase/renewal APIs.
- Worker dashboard with policy, earnings, claims, payouts, and weather risk context.
- UPI Risk Lock on worker profile updates: if the payout UPI changes near approved claims or in-flight payouts, payouts are paused for a configurable cooldown window and both worker/admin notifications are generated.
- Admin dashboard with KPIs, claim queues, policy and worker management, analytics, and configuration.
- Super admin controls for staff provisioning, activation/deactivation, platform stats, and audit log access.
- Internal ML service for:
  - worker risk scoring
  - claim fraud scoring
  - disruption detection
  - income loss and income shock estimation
  - vulnerability scoring
  - dynamic premium generation
  - trigger orchestration
- Cron-based trigger polling and payout queue processing.
- Redis-backed notifications with in-memory fallback when Redis is unavailable.
- Mock payment flow for plan purchase and payout simulation.
- Chat assistant with Groq-backed replies and deterministic fallback behavior.

## Architecture

```text
Frontend (React/Vite)
  -> calls REST APIs on the backend

Backend (Node.js/Express)
  -> reads/writes PostgreSQL
  -> uses Redis for sessions, cache, queues, rate limiting, notifications
  -> calls the internal ML service over HTTP
  -> runs cron jobs for trigger evaluation and payout processing

ML Service (FastAPI)
  -> loads/scorers synthetic-model artifacts
  -> exposes inference and trigger endpoints

PostgreSQL
  -> workers, policies, claims, payouts, disruption events, admins, config, logs

Redis
  -> auth sessions, blacklist entries, dashboard cache, weather cache,
     config cache, fraud review queue, payout queue, notifications
```

## Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui + Radix UI
- TanStack Query
- Zustand
- React Router
- Vitest

### Backend

- Node.js
- Express
- PostgreSQL via `pg`
- Redis via `redis`
- JWT auth
- Passport Google OAuth for admin sign-in
- `node-cron`
- `express-rate-limit`

### ML Service

- FastAPI
- Uvicorn
- Pydantic / pydantic-settings
- scikit-learn
- pandas / numpy / joblib
- Groq API integration for AI explanations

### Data Layer

- PostgreSQL
- Redis
- SQL migrations and seed scripts

## Repository Structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- app.js
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- cron/
|   |   |-- events/
|   |   |-- middleware/
|   |   |-- routes/
|   |   |-- services/
|   |   `-- utils/
|   |-- scripts/
|   `-- package.json
|-- db/
|   |-- migrations/
|   |-- schema.sql
|   |-- migrate.sql
|   |-- migrate.js
|   |-- seed.js
|   |-- postgres.js
|   `-- redis.js
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- config/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- pages/
|   |   `-- stores/
|   `-- package.json
|-- ml/
|   |-- app/
|   |   |-- routers/
|   |   |-- schemas/
|   |   `-- services/
|   |-- models/
|   |-- main.py
|   `-- requirements.txt
|-- scripts/
|   `-- setup-postgres.ps1
|-- package.json
`-- README.md
```

## How The System Works

### 1. Worker onboarding

- Worker requests an OTP through `/api/auth/send-otp`.
- OTP is verified through `/api/auth/verify-otp`.
- New users receive a registration token.
- Registration completes through `/api/auth/register/complete`.
- The worker profile, chosen plan, and policy context are then available to the frontend.

### 2. Policy lifecycle

- Plans are fetched publicly from `/api/policy/plans`.
- Quote and policy APIs combine worker inputs, plan metadata, and ML risk or premium signals.
- Policies are stored in PostgreSQL with a weekly 7-day term and a coverage snapshot for historical integrity.

### 3. Trigger and claims flow

- The backend cron job loads active system config and all zones.
- For each zone, the backend calls ML trigger stubs for weather, AQI, and alerts.
- If a threshold is breached, a disruption event is inserted.
- Active policies for affected workers are identified.
- Claims are auto-initiated and fraud-scored.
- Claims move to:
  - approved
  - pending manual review
  - rejected

### 4. Payout flow

- Approved claims create or reuse payout records.
- Before payout creation or manual payout initiation, the backend checks UPI Risk Lock status.
- If the worker recently changed UPI in a risky context, payout is blocked with `UPI_RISK_LOCKED`, and worker/admin warning notifications are emitted.
- Payout IDs are pushed to the Redis payout queue.
- A cron job processes the queue every 30 seconds.
- Razorpay-like payout responses are simulated and marked completed after a short delay.

### 5. UPI Risk Lock

- Workers can update their payout UPI from the Profile page.
- The backend computes a payout-address risk score using:
  - whether the UPI actually changed
  - approved claims in the last 48 hours
  - payouts already in `pending` or `processing`
  - repeated UPI changes within 72 hours
- If risk is high, payouts are locked for `UPI_RISK_LOCK_HOURS` (default 24 hours).
- Lock state is derived from existing `audit_logs` entries (`profile_upi_change` and `profile_upi_risk_lock`), so this feature does **not** require a DB schema change.
- The Profile page shows a **UPI Risk Lock Active** banner with unlock time, risk score, reason, and previous UPI.

### 6. Admin and super admin operations

- Admins review claims, workers, policies, events, analytics, and config.
- Super admins provision staff, manage staff lifecycle, inspect platform stats, and review audit logs.
- Google OAuth is supported for pre-provisioned admin accounts when credentials are configured.

## Services

### Frontend service

The frontend is a single SPA with role-based route protection:

- Public worker routes:
  - `/`
  - `/login`
  - `/register`
  - `/register/phone`
  - `/register/profile`
  - `/register/kyc`
  - `/register/upi`
  - `/register/plan`
- Protected worker routes:
  - `/dashboard`
  - `/policy`
  - `/claims`
  - `/payouts`
  - `/profile`
  - `/plans`
  - `/notifications`
- Public admin routes:
  - `/admin/login`
  - `/admin/oauth/callback`
  - `/admin/setup`
- Protected admin routes:
  - `/admin/dashboard`
  - `/admin/workers`
  - `/admin/policies`
  - `/admin/claims`
  - `/admin/events`
  - `/admin/cron`
  - `/admin/analytics`
  - `/admin/fraud`
  - `/admin/profile`
  - `/admin/notifications`
- Super-admin-only routes:
  - `/admin/staff`
  - `/admin/staff/new`
  - `/admin/platform`
  - `/admin/platform/settings`
  - `/admin/companies`
  - `/admin/companies/:id`

Auth state is managed with Zustand and persisted in local storage.

### Backend service

The backend boots from `backend/src/app.js` and provides:

- CORS support with configurable frontend origins.
- global rate limiting
- health checks
- worker auth and onboarding routes
- worker claims, policy, payout, and profile routes
- admin and super-admin auth and management routes
- notification routes
- payment mock routes
- internal chat route
- cron startup for trigger and payout processing

Notable backend modules:

- `services/authService.js`: worker auth and JWT issuance
- `services/adminAuthService.js`: staff and super-admin auth lifecycle
- `services/policyService.js`: plan and policy logic
- `services/claimsService.js`: fraud scoring, claim initiation, review, payout handoff
- `services/payoutService.js`: payout simulation and queue processing
- `services/upiRiskLockService.js`: payout-destination risk scoring and UPI lock enforcement without schema changes
- `services/triggerService.js`: zone scans and disruption event creation
- `services/notificationService.js`: Redis and in-memory notifications
- `services/chatService.js`: Groq-backed or fallback chat responses

### ML service

The FastAPI app in `ml/main.py` registers routers for:

- `/health`
- `/ml/risk-score`
- `/ml/fraud-score`
- `/ml/disruption-score`
- `/ml/income-loss`
- `/ml/income-shock`
- `/ml/vulnerability-score`
- `/ml/premium`
- `/ml/trigger`
- `/ml/heatmap`
- `/ml/correlations`
- `/triggers/weather`
- `/triggers/aqi`
- `/triggers/mock-alerts`

The ML service is internal-only in current design. No auth layer is implemented on these endpoints.

## Database And Data Model

The baseline schema lives in `db/schema.sql`. Key tables include:

- `cities`
- `zones`
- `plans`
- `workers`
- `admins`
- `policies`
- `disruption_events`
- `claims`
- `payouts`
- `system_config`
- `audit_logs`

Important schema-level concepts:

- UUID primary keys are used throughout the relational model.
- Workers are tied to city and zone geography.
- Plans store weekly premium, max coverage, and JSON coverage definitions.
- Policies snapshot coverage at purchase time and are issued on a 7-day term.
- Claims reference workers, policies, and optionally disruption events.
- Payouts reference approved claims and worker payout identifiers.
- `audit_logs` is also used as the UPI change trail and lock ledger, so payout-address risk can be enforced without adding new worker columns.
- `system_config` drives trigger engine behavior.

The repo also contains incremental SQL migrations in `db/migrations/`, plus `db/migrate.sql` for additional auth and seed-related schema updates used by the backend setup flow.

## Environment Variables

The repo does not provide a single canonical root `.env.example`, so local setup typically uses service-specific `.env` files or shell environment variables.

### Backend

Common backend variables inferred from the code:

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/Kintsu
REDIS_URL=redis://localhost:6379
NODE_ENV=development
PORT=5000
ML_BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:5000

JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
JWT_ADMIN_EXPIRES_IN=8h
JWT_REGISTRATION_EXPIRES_IN=30m

TRIGGER_CRON_INTERVAL=*/15 * * * *
UPI_RISK_LOCK_HOURS=24

OTP_EXPIRY_SECONDS=300
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5

FEATURE_SMS_ENABLED=false
FEATURE_EMAIL_ENABLED=false
FEATURE_TOTP_ENABLED=false

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

SUPER_ADMIN_EMAIL=superadmin@Kintsu.in
SUPER_ADMIN_PASSWORD=Kintsu@SuperAdmin#2026
SUPER_ADMIN_NAME=Kintsu Platform Owner
ADMIN_SETUP_TOKEN_EXPIRY_HOURS=24

GROQ_CHAT_MODEL=llama-3.1-8b-instant
GROQ_API_KEY=
```

### Frontend

```env
VITE_API_URL=http://localhost:5000
```

### ML service

```env
OPENWEATHERMAP_API_KEY=your-key-or-mock
AQICN_API_KEY=your-key-or-mock
GROQ_API_KEY=your-groq-key
```

## Local Development Setup

### Prerequisites

- Node.js 18+
- npm
- Python 3.10+
- PostgreSQL 14+
- Redis instance or Redis Cloud endpoint

### 1. Clone and install dependencies

At the repository root:

```bash
npm install
```

Then install service dependencies:

```bash
cd backend
npm install
```

```bash
cd frontend
npm install
```

```bash
cd ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Set up PostgreSQL

On Windows, the repo provides an automation script:

```powershell
.\scripts\setup-postgres.ps1
```

What it does:

- finds a local PostgreSQL install
- validates connectivity
- creates the `Kintsu` database if missing
- applies `db/schema.sql`
- applies `db/migrate.sql`
- prints local admin credentials

Manual alternative:

```powershell
psql -U postgres -c "CREATE DATABASE Kintsu"
psql -U postgres -d Kintsu -f db\schema.sql
psql -U postgres -d Kintsu -f db\migrate.sql
node db\seed.js
```

### 3. Prepare the ML artifacts

If the saved model files are missing or need regeneration:

```bash
cd ml
python models/generate_data.py
python models/train_risk.py
python models/train_fraud.py
```

## Running The Project

Run the services in this order:

### 1. ML service

```bash
cd ml
uvicorn main:app --reload --port 8000
```

### 2. Backend

```bash
cd backend
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm run dev
```

Default local URLs:

- frontend: `http://localhost:8080`
- backend: `http://localhost:5000`
- ML service: `http://localhost:8000`
- ML Swagger docs: `http://localhost:8000/docs`
- backend health: `http://localhost:5000/health`

## Scripts And Operational Commands

### Root

- `npm test`
  - placeholder root script, not a meaningful project test entrypoint

### Backend

- `npm run start`
- `npm run dev`
- `npm run seed:super-admin`
- `npm run reset:super-admin-password`

### Frontend

- `npm run dev`
- `npm run build`
- `npm run build:dev`
- `npm run lint`
- `npm run preview`
- `npm run test`
- `npm run test:watch`

### Database utilities

- `node db/migrate.js`
- `node db/seed.js`
- `node db/apply-migrations.js`

## API Surface Summary

This is a condensed summary of the backend API shape. Exact validation rules live in the route and controller layers.

### Worker auth

- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/register/complete`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### Worker domain routes

- `GET /api/policy/plans`
- `POST /api/policy/quote`
- `POST /api/policy/create`
- `GET /api/policy/my`
- `GET /api/policy/:id`
- `POST /api/policy/:id/renew`

- `POST /api/claims/auto-initiate`
- `GET /api/claims/my`
- `GET /api/claims/worker/:id`
- `GET /api/claims/:id/status`
- `POST /api/claims/:id/approve`
- `POST /api/claims/:id/reject`

- `POST /api/payouts/initiate`
- `GET /api/payouts/my`
- `GET /api/payouts/worker/:id`
- `GET /api/payouts/:id/status`

- `GET /api/profile`
- `PATCH /api/profile`
- `PATCH /api/profile/bank`
- `PATCH /api/profile/contact`

`PATCH /api/profile/bank` returns `data.upi_lock` with `isLocked`, `lockedUntil`, `riskScore`, `reason`, and `previousUpiId`.
`POST /api/payouts/initiate` may return HTTP `423` with `UPI_RISK_LOCKED` if a recent risky UPI change is still in its cooldown window.

### Admin and super admin

- `POST /api/admin/auth/login`
- `POST /api/admin/auth/setup`
- `GET /api/admin/auth/google`
- `GET /api/admin/auth/google/callback`

- `GET /api/admin/dashboard`
- `GET /api/admin/workers`
- `PATCH /api/admin/workers/:id/kyc`
- `POST /api/admin/workers/:id/flag`
- `GET /api/admin/policies`
- `GET /api/admin/claims`
- `POST /api/admin/claims/:id/approve`
- `POST /api/admin/claims/:id/reject`
- `GET /api/admin/events`
- `GET /api/admin/analytics`
- `GET /api/admin/config`
- `PATCH /api/admin/config`

- `POST /api/super-admin/staff/create`
- `GET /api/super-admin/staff`
- `PATCH /api/super-admin/staff/:id/deactivate`
- `PATCH /api/super-admin/staff/:id/reactivate`
- `GET /api/super-admin/dashboard/stats`
- `GET /api/super-admin/audit-log`

### Notifications, payment, and chat

- role-specific notifications under `/api/notifications`
- mock payment endpoints under `/api/payment`
- chat endpoint under `/api/chat/message`

## Frontend Experience

The frontend is split across worker and admin experiences but shares a common design system.

Worker-side highlights:

- landing page with product explanation and CTA flow
- multi-step registration funnel
- dashboard with active policy summary and weather widget
- policy and plans pages
- claims and payouts tracking
- profile management with **UPI Payout Security** controls and a visible **UPI Risk Lock** status banner
- notifications page and slide-out panel

Admin-side highlights:

- operational KPI dashboard
- claims management with review modal and fraud scoring visualization
- worker and policy management
- events, analytics, cron/config, and fraud pages
- dedicated super admin sections for staff and platform management

Shared UX patterns:

- route guards
- persisted auth store
- toast notifications
- chat drawer
- reusable layouts for worker and admin navigation

## ML Service Summary

The ML service is not a thin mock. It includes explicit model-training scripts and service-layer abstractions.

Key design patterns visible in the code:

- synthetic dataset generation for training
- Random Forest risk classification
- Isolation Forest fraud and income-shock anomaly detection
- bounded premium computation logic
- disruption scoring and threshold math
- optional LLM-generated explanations with graceful fallback

Primary ML folders:

- `ml/app/routers/`: API layer
- `ml/app/schemas/`: typed request and response models
- `ml/app/services/`: inference and external-integration logic
- `ml/models/`: data generation and training scripts
- `ml/models/saved/`: persisted model artifacts

## Caching, Queues, And Notifications

Redis usage in the backend includes:

- `session:worker:{id}`
- `session:admin:{id}`
- `blacklist:{token}`
- `weather:{zoneId}`
- `system:config`
- `dashboard:kpis`
- `risk_zones:{cityId}`
- `ratelimit:{key}`
- `queue:claims:fraud`
- `queue:payouts`

Notification behavior:

- notifications are stored per role and user
- admin and super-admin group broadcasts are supported
- UPI lock notifications alert workers when payout UPI changes trigger a temporary freeze, and alert admins when an approved claim payout is paused by lock policy.
- Redis Pub/Sub is used when Redis is available
- an in-memory fallback keeps the demo functional even if Redis is down

## Testing And Verification

Current test coverage is limited from a repository perspective.

Available checks:

- frontend: `npm run test`
- frontend: `npm run lint`
- backend health endpoint: `GET /health`
- ML Swagger docs and endpoint smoke testing through `/docs`
- database setup verification by running schema, migration, and seed scripts

Recommended manual smoke test flow:

1. start PostgreSQL and Redis
2. start ML service
3. start backend
4. start frontend
5. verify worker registration path
6. log in as admin
7. inspect dashboard, claims queue, and notifications
8. hit ML docs and backend health endpoints

## Market Crash Scenario Solution:
## Adversarial Defense & Anti-Spoofing Strategy

Kintsu’s anti-spoofing approach is based on one core principle: a payout-triggering event should never rely on raw GPS alone. Instead, the platform treats a claim as valid only when location, behavioral, environmental, and device-level signals form a consistent real-world story. The system is designed to distinguish a genuinely stranded delivery partner from a coordinated fraud ring by scoring "context integrity" rather than just "presence in a risk zone."

### 1. The Differentiation

To separate a real stranded worker from a GPS-spoofing attacker, the AI/ML layer evaluates whether the worker’s activity pattern matches how a delivery partner would actually behave during a disruption.

A genuine stranded worker typically shows:
- Normal pre-event work behavior before the disruption, such as active sessions, recent trip movement, and expected zone transitions
- A realistic mobility slowdown or stop pattern consistent with severe weather, heat, flooding, or unsafe AQI conditions
- Correlation between claimed disruption time and verified zone-level external alerts
- Device and session continuity, meaning the same device, same account, same route pattern, and no abrupt environment change
- Individual claim timing that aligns with the worker’s historical operating geography and usual working hours

A spoofing actor typically shows:
- Sudden impossible relocation into a red-alert zone without natural travel history leading into that area
- Stationary or inconsistent telemetry that looks like "device at home, GPS in danger zone"
- Repeated high-risk claim timing clustered across many accounts in the same area within a short time window
- Shared behavioral fingerprints across multiple accounts, suggesting coordinated fraud
- Device, network, or account anomalies that break the worker’s normal operating pattern

The fraud model should therefore use a multi-signal risk score combining:
- location consistency
- movement plausibility
- device trust
- network integrity
- historical worker behavior
- ring/cohort anomaly detection
- event-to-claim timing consistency

Claims are auto-approved only when disruption eligibility and anti-spoof confidence are both strong. If the event is valid but spoof-risk is high, the claim is routed to review instead of immediate payout.

### 2. The Data

Beyond basic GPS coordinates, the platform should analyze the following data points:

#### Mobility and route plausibility
- Speed, acceleration, and stop/start patterns
- Path continuity over time, not just final coordinates
- Entry history into the affected zone
- Distance jump anomalies, such as impossible teleportation between locations
- Historical operating zones and common delivery corridors for that worker

#### Device integrity signals
- Device ID consistency across sessions
- App version, OS version, and device fingerprint stability
- Detection of mock location settings or developer-mode risk flags where available
- Sensor consistency checks between GPS, network location, and device motion patterns
- Frequency of SIM/device/account changes

#### Network and session intelligence
- IP geolocation versus claimed GPS zone
- Rapid IP switching or suspicious proxy/VPN patterns
- Session continuity before, during, and after the event
- Login/logout bursts across multiple suspicious accounts
- Shared network fingerprints across clusters of accounts

#### Work-pattern and account behavior
- Recent order activity or work session presence before disruption
- Historical working hours and city/zone patterns
- Claim frequency, approval history, and prior fraud flags
- Whether the worker typically operates in the claimed zone or has suddenly appeared there only during payout-triggering events
- Time gap between event onset and user/app behavior

#### Environmental and event corroboration
- Hyperlocal weather severity confirmation
- AQI/heat alerts by zone and timestamp
- Platform outage or service disruption feeds
- Density of affected legitimate workers in the same geography
- Whether claim timing aligns with a real trigger window or appears artificially synchronized

#### Coordinated fraud ring indicators
- Multiple accounts claiming from the same suspicious device/network cluster
- Synchronized claim submissions within narrow time bands
- Similar route anomalies across many workers
- Shared payout endpoints, device reuse, or repeated beneficiary patterns
- Community-level anomaly spikes in one zone that exceed expected worker density and disruption impact

This allows the system to move from simple fraud scoring to coordinated adversarial detection. In practice, the architecture should support both:
- per-claim fraud scoring
- graph-based ring detection across accounts, devices, IPs, payout handles, and timing patterns

### 3. The UX Balance

The workflow should not punish honest gig workers simply because weather conditions cause weak connectivity, delayed telemetry, or incomplete app signals. The design principle is "friction only when risk is high, and even then, explainable friction."

#### Proposed claim handling workflow
- Low spoof-risk + verified disruption: auto-initiate and fast-track payout
- Medium spoof-risk: place in pending review, request passive re-verification, and preserve claim priority
- High spoof-risk or coordinated ring indicators: hold payout, escalate to fraud review, and link to cluster investigation

#### Fairness safeguards for genuine workers
- Never reject solely because of one missing signal, such as a temporary network drop
- Use fallback evidence, such as prior route continuity, device history, and zone-level event verification
- Give the worker a simple explanation that the claim is under verification due to unusual signal mismatch
- Allow lightweight in-app confirmation steps instead of forcing heavy documentation for every flagged case
- Maintain SLA-based review queues so honest workers are not trapped in indefinite manual review

#### Worker-friendly re-verification examples
- Passive re-check of device/session continuity
- Short in-app presence confirmation when connectivity returns
- Recent route/activity replay from already captured telemetry
- Admin-assisted review only when automated confidence remains low

This preserves trust: genuine workers still get fast support during real disruptions, while bad actors face progressively stronger scrutiny.

### Architectural direction


1. Trigger engine detects disruption eligibility by zone
2. Anti-spoofing engine computes context-integrity and fraud-risk scores
3. Ring detection checks for coordinated anomalies across workers/devices/networks
4. Decision layer classifies claims into auto-approve, review, or hold
5. Human review is reserved for ambiguous or adversarial cases, not normal claims



## Known Constraints And Notes

- This is a hackathon repository, so some areas mix polished flows with prototype shortcuts.
- The root `package.json` is not the real workspace command center; backend and frontend each have their own active dependency trees.
- Several legacy scripts, scratch files, and exploratory files exist in the repo root and backend folder.
- Some subsystem docs are older than the current implementation and should not be treated as canonical over the source code.
- Redis is optional at runtime in several paths because the backend intentionally degrades to no-op or in-memory behavior.
- The frontend Vite dev server is configured for port `8080`, while some older docs mention `5173`. The backend CORS configuration allows multiple local origins.
- Google OAuth for admins is disabled unless `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are configured.
- The internal chat assistant can use the ML service's `GROQ_API_KEY` if one is available in `ml/.env`.

## License

This repository includes an MIT license in [`LICENSE`](./LICENSE).
