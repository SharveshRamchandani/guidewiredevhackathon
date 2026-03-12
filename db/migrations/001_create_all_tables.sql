-- ============================================================
-- GigShield — Complete Schema Migration (001_create_all_tables.sql)
-- Run: node db/migrate.js
-- Drops ALL existing tables safely, recreates from live schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- DROP ALL TABLES (safe reverse dependency order)
-- ============================================================
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS payouts CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS policies CASCADE;
DROP TABLE IF EXISTS disruption_events CASCADE;
DROP TABLE IF EXISTS worker_auth_sessions CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS admins CASCADE;  -- legacy
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS cities CASCADE;

-- ============================================================
-- SUPPORT TABLES
-- ============================================================
CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  state VARCHAR(100)
);

CREATE TABLE zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  risk_factor DECIMAL(4,3) DEFAULT 1.000,
  zone_number INTEGER CHECK (zone_number BETWEEN 1 AND 4)
);

-- ============================================================
-- CORE TABLES
-- ============================================================
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE CHECK (name IN ('nano','basic','standard','premium')),
  base_premium DECIMAL(8,2) NOT NULL,
  max_payout DECIMAL(10,2) NOT NULL,
  coverage_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT true,
  coverage_config JSONB,
  weekly_premium DECIMAL(8,2),
  max_coverage DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(15) NOT NULL UNIQUE,
  name VARCHAR(150),
  platform VARCHAR(50),
  city VARCHAR(100),
  zone_id INTEGER REFERENCES zones(id),
  avg_weekly_earning DECIMAL(10,2),
  risk_score DECIMAL(5,3) DEFAULT 0.500,
  upi_id VARCHAR(100),
  is_phone_verified BOOLEAN DEFAULT false,
  is_kyc_verified BOOLEAN DEFAULT false,
  is_profile_complete BOOLEAN DEFAULT false,
  claim_free_weeks INTEGER DEFAULT 0,
  loyalty_discount DECIMAL(5,4) DEFAULT 0.0000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired','cancelled','pending')),
  premium DECIMAL(8,2) NOT NULL,
  premium_amount DECIMAL(8,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  co_payment_percent DECIMAL(5,4) DEFAULT 0.1000,
  auto_renew BOOLEAN DEFAULT true,
  zone_adjustment DECIMAL(5,4) DEFAULT 1.0000,
  coverage_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin','super_admin')),
  job_title VARCHAR(150),
  google_id VARCHAR(255) UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(150),
  role VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);  -- legacy table

CREATE TABLE worker_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE system_config (
  id SERIAL PRIMARY KEY,
  engine_active BOOLEAN DEFAULT true,
  check_interval_minutes INTEGER DEFAULT 10,
  payout_delay_seconds INTEGER DEFAULT 30,
  thresholds JSONB DEFAULT '{"rainMm":20,"aqi":300,"heatwaveTemp":42,"outageHours":2}',
  zone_overrides JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE disruption_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  zone_id INTEGER REFERENCES zones(id),
  city_id INTEGER REFERENCES cities(id),
  severity VARCHAR(20) DEFAULT 'medium',
  payout_amount DECIMAL(10,2) DEFAULT 0,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB
);

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES policies(id),
  event_id UUID REFERENCES disruption_events(id),
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  fraud_score DECIMAL(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES claims(id),
  amount DECIMAL(10,2) NOT NULL,
  upi_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES (optimized for app queries)
-- ============================================================
CREATE INDEX idx_workers_phone ON workers(phone);
CREATE INDEX idx_workers_upi ON workers(upi_id);
CREATE INDEX idx_policies_worker ON policies(worker_id);
CREATE INDEX idx_policies_status ON policies(status);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_worker ON claims(worker_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_active ON admin_users(active);

-- ============================================================
-- DEFAULT SYSTEM CONFIG
-- ============================================================
INSERT INTO system_config (engine_active, check_interval_minutes, payout_delay_seconds)
VALUES (true, 10, 30)
ON CONFLICT (id) DO UPDATE SET updated_at = NOW();

-- Success message
SELECT '✅ Schema migration 001_create_all_tables.sql completed successfully' AS status;
