-- ============================================================
-- GigShield — PostgreSQL Schema (Layer 6)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SUPPORTING TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS cities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE -- e.g. Mumbai, Delhi, Bangalore
);

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,       -- e.g. Bandra, Rohini, Whitefield
  risk_level VARCHAR(10) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  UNIQUE (city_id, name)
);

CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(20) NOT NULL UNIQUE CHECK (name IN ('basic', 'standard', 'premium')),
  weekly_premium NUMERIC(8,2) NOT NULL,  -- e.g. 19, 35, 59
  max_coverage NUMERIC(10,2) NOT NULL,
  coverage_config JSONB NOT NULL
  -- coverage_config example:
  -- {
  --   "heavyRain":       { "payoutPercent": 50, "maxPayout": 500 },
  --   "poorAqi":         { "payoutPercent": 40, "maxPayout": 400 },
  --   "heatwave":        { "payoutPercent": 30, "maxPayout": 300 },
  --   "platformOutage":  { "payoutPercent": 60, "maxPayout": 600 }
  -- }
);

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(15) NOT NULL UNIQUE,
  name VARCHAR(150),
  platform VARCHAR(50) CHECK (platform IN ('Swiggy','Zomato','Amazon','Zepto','Blinkit','Dunzo')),
  city_id UUID REFERENCES cities(id),
  zone_id UUID REFERENCES zones(id),
  weekly_earnings NUMERIC(10,2),
  aadhaar_last4 VARCHAR(4),              -- store hashed in production
  upi VARCHAR(100),
  kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified')),
  risk_level VARCHAR(10) DEFAULT 'low' CHECK (risk_level IN ('low','medium','high')),
  notifications JSONB DEFAULT '{"sms":true,"push":true,"whatsapp":false}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(150),
  role VARCHAR(50) DEFAULT 'admin',
  two_fa_secret TEXT,
  notifications JSONB DEFAULT '{"email":true,"slack":false,"criticalSms":true}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_number VARCHAR(30) UNIQUE,     -- e.g. POL-2026-0847
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  premium NUMERIC(8,2) NOT NULL,
  max_coverage NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  auto_renew BOOLEAN DEFAULT TRUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  coverage_snapshot JSONB,              -- snapshot of coverage at time of purchase
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disruption_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_number VARCHAR(20) UNIQUE,      -- e.g. EVT-001
  type VARCHAR(50) NOT NULL CHECK (type IN ('Heavy Rain','Poor AQI','Heatwave','Platform Outage')),
  zone_id UUID REFERENCES zones(id),
  city_id UUID REFERENCES cities(id),
  severity VARCHAR(20) CHECK (severity IN ('low','medium','high','critical')),
  value VARCHAR(50),                    -- e.g. "45mm", "AQI 340", "3.5 hrs"
  source VARCHAR(20) CHECK (source IN ('weather','aqi','platform','manual')),
  verified BOOLEAN DEFAULT FALSE,
  claims_generated INT DEFAULT 0,
  triggered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_number VARCHAR(20) UNIQUE,      -- e.g. CLM-001
  worker_id UUID NOT NULL REFERENCES workers(id),
  policy_id UUID NOT NULL REFERENCES policies(id),
  event_id UUID REFERENCES disruption_events(id),
  type VARCHAR(50) NOT NULL CHECK (type IN ('Heavy Rain','Poor AQI','Heatwave','Platform Outage')),
  amount NUMERIC(10,2) NOT NULL,
  approved_amount NUMERIC(10,2),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  fraud_score NUMERIC(5,2) DEFAULT 0,   -- 0-100
  gps_match BOOLEAN DEFAULT FALSE,
  velocity NUMERIC(5,2),                -- claims per day
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_number VARCHAR(20) UNIQUE,     -- e.g. PAY-001
  claim_id UUID NOT NULL REFERENCES claims(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed')),
  upi VARCHAR(100) NOT NULL,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  engine_active BOOLEAN DEFAULT TRUE,
  check_interval_minutes INT DEFAULT 10,
  payout_delay_seconds INT DEFAULT 30,
  zone_overrides JSONB DEFAULT '[]',
  thresholds JSONB DEFAULT '{
    "rainMm": 20,
    "aqi": 300,
    "heatwaveTemp": 42,
    "outageHours": 2
  }',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,                         -- worker or admin UUID
  user_type VARCHAR(10) CHECK (user_type IN ('worker','admin')),
  action VARCHAR(100) NOT NULL,
  field VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workers_phone       ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_zone        ON workers(zone_id);
CREATE INDEX IF NOT EXISTS idx_workers_kyc         ON workers(kyc_status);

CREATE INDEX IF NOT EXISTS idx_policies_worker     ON policies(worker_id);
CREATE INDEX IF NOT EXISTS idx_policies_status     ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_end_date   ON policies(end_date);

CREATE INDEX IF NOT EXISTS idx_claims_worker       ON claims(worker_id);
CREATE INDEX IF NOT EXISTS idx_claims_status       ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_created      ON claims(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_fraud        ON claims(fraud_score);
CREATE INDEX IF NOT EXISTS idx_claims_event        ON claims(event_id);

CREATE INDEX IF NOT EXISTS idx_payouts_claim       ON payouts(claim_id);
CREATE INDEX IF NOT EXISTS idx_payouts_worker      ON payouts(worker_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status      ON payouts(status);

CREATE INDEX IF NOT EXISTS idx_events_zone         ON disruption_events(zone_id);
CREATE INDEX IF NOT EXISTS idx_events_type         ON disruption_events(type);
CREATE INDEX IF NOT EXISTS idx_events_triggered    ON disruption_events(triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_user          ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created       ON audit_logs(created_at DESC);

-- ============================================================
-- SEED: Default System Config (one row)
-- ============================================================

INSERT INTO system_config (engine_active, check_interval_minutes, payout_delay_seconds)
VALUES (TRUE, 10, 30)
ON CONFLICT DO NOTHING;
