-- ==============================================================
-- GIGSHIELD — FULL DATABASE RESET
-- Run this in psql or pgAdmin to drop ALL tables and recreate
-- them from scratch with the correct schema.
-- ==============================================================

-- ─── DROP EVERYTHING ───────────────────────────────────────────

DROP TABLE IF EXISTS admin_audit_log         CASCADE;
DROP TABLE IF EXISTS worker_auth_sessions     CASCADE;
DROP TABLE IF EXISTS payouts                  CASCADE;
DROP TABLE IF EXISTS claims                   CASCADE;
DROP TABLE IF EXISTS policies                 CASCADE;
DROP TABLE IF EXISTS disruption_events        CASCADE;
DROP TABLE IF EXISTS system_config            CASCADE;
DROP TABLE IF EXISTS plans                    CASCADE;
DROP TABLE IF EXISTS zones                    CASCADE;
DROP TABLE IF EXISTS cities                   CASCADE;
DROP TABLE IF EXISTS workers                  CASCADE;
DROP TABLE IF EXISTS admin_users              CASCADE;
DROP TABLE IF EXISTS audit_logs               CASCADE;

-- ─── TABLE 1: admin_users ──────────────────────────────────────
-- GigShield internal staff (role: 'admin' | 'super_admin')

CREATE TABLE admin_users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(100) NOT NULL,
  email               VARCHAR(255) UNIQUE NOT NULL,
  password_hash       TEXT        NOT NULL,                  -- 'PENDING_SETUP' until first login
  role                VARCHAR(20) NOT NULL DEFAULT 'admin'
                      CHECK (role IN ('admin', 'super_admin')),
  job_title           VARCHAR(100),
  google_id           VARCHAR(255) UNIQUE,                  -- for Google OAuth
  active              BOOLEAN     NOT NULL DEFAULT true,
  setup_token         VARCHAR(64)  UNIQUE,                  -- SHA-256 hash of raw token
  setup_token_expiry  TIMESTAMPTZ,
  created_by          UUID        REFERENCES admin_users(id) ON DELETE SET NULL,
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_users_email  ON admin_users(email);
CREATE INDEX idx_admin_users_role   ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(active);


-- ─── TABLE 2: workers ──────────────────────────────────────────
-- Gig workers (customers of GigShield). Authenticate via phone + OTP.

CREATE TABLE workers (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone               VARCHAR(15) UNIQUE NOT NULL,
  name                VARCHAR(100),
  platform            VARCHAR(50),                          -- 'swiggy', 'zomato', 'zepto', etc.
  city                VARCHAR(50),                          -- 'mumbai', 'delhi', 'bangalore', etc.
  zone_id             INT,
  avg_weekly_earning  DECIMAL(8,2),
  risk_score          DECIMAL(5,3) DEFAULT 0.500,
  risk_level          VARCHAR(20)  DEFAULT 'low'
                      CHECK (risk_level IN ('low', 'medium', 'high')),
  aadhaar_hash        VARCHAR(64)  UNIQUE,                  -- SHA-256 of last 4 digits
  upi_id              VARCHAR(100),
  is_phone_verified   BOOLEAN     NOT NULL DEFAULT false,
  is_kyc_verified     BOOLEAN     NOT NULL DEFAULT false,
  is_profile_complete BOOLEAN     NOT NULL DEFAULT false,
  active              BOOLEAN     NOT NULL DEFAULT true,
  notification_prefs  JSONB       DEFAULT '{"sms": true, "push": true, "whatsapp": false}',
  last_login          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workers_phone   ON workers(phone);
CREATE INDEX idx_workers_aadhaar ON workers(aadhaar_hash);
CREATE INDEX idx_workers_active  ON workers(active);
CREATE INDEX idx_workers_platform ON workers(platform);


-- ─── TABLE 3: worker_auth_sessions ─────────────────────────────

CREATE TABLE worker_auth_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_worker_id  ON worker_auth_sessions(worker_id);
CREATE INDEX idx_sessions_expires_at ON worker_auth_sessions(expires_at);


-- ─── TABLE 4: cities ───────────────────────────────────────────

CREATE TABLE cities (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) UNIQUE NOT NULL,
  state VARCHAR(100)
);

INSERT INTO cities (name, state) VALUES
  ('Mumbai',    'Maharashtra'),
  ('Delhi',     'Delhi'),
  ('Bangalore', 'Karnataka'),
  ('Hyderabad', 'Telangana'),
  ('Chennai',   'Tamil Nadu'),
  ('Pune',      'Maharashtra'),
  ('Kolkata',   'West Bengal');


-- ─── TABLE 5: zones ────────────────────────────────────────────

CREATE TABLE zones (
  id       SERIAL PRIMARY KEY,
  name     VARCHAR(100) NOT NULL,
  city_id  INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  risk_factor DECIMAL(3,2) DEFAULT 1.00
);

INSERT INTO zones (name, city_id, risk_factor)
  SELECT 'Zone A', id, 1.0 FROM cities WHERE name = 'Mumbai'
  UNION ALL SELECT 'Zone B', id, 1.2 FROM cities WHERE name = 'Mumbai'
  UNION ALL SELECT 'Zone A', id, 1.0 FROM cities WHERE name = 'Delhi'
  UNION ALL SELECT 'Zone B', id, 1.1 FROM cities WHERE name = 'Delhi'
  UNION ALL SELECT 'Zone A', id, 1.0 FROM cities WHERE name = 'Bangalore'
  UNION ALL SELECT 'Zone A', id, 1.0 FROM cities WHERE name = 'Hyderabad'
  UNION ALL SELECT 'Zone A', id, 1.0 FROM cities WHERE name = 'Chennai';


-- ─── TABLE 6: plans ────────────────────────────────────────────

CREATE TABLE plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  base_premium  DECIMAL(8,2) NOT NULL,
  max_payout    DECIMAL(10,2) NOT NULL,
  coverage_days INT NOT NULL DEFAULT 7,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plans (name, base_premium, max_payout, coverage_days) VALUES
  ('Basic Weekly',    29.00, 500.00,  7),
  ('Standard Weekly', 49.00, 1000.00, 7),
  ('Premium Weekly',  79.00, 2000.00, 7);


-- ─── TABLE 7: policies ─────────────────────────────────────────

CREATE TABLE policies (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id       UUID        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  plan_id         UUID        NOT NULL REFERENCES plans(id),
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
  premium         DECIMAL(8,2) NOT NULL,
  premium_amount  DECIMAL(8,2) NOT NULL,                    -- alias used in some queries
  start_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_policies_worker_id ON policies(worker_id);
CREATE INDEX idx_policies_status    ON policies(status);


-- ─── TABLE 8: disruption_events ────────────────────────────────

CREATE TABLE disruption_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type         VARCHAR(50) NOT NULL
               CHECK (type IN ('heavy_rain', 'poor_aqi', 'heatwave', 'platform_outage', 'cyclone', 'flood')),
  zone_id      INT         REFERENCES zones(id),
  city_id      INT         REFERENCES cities(id),
  severity     VARCHAR(20) NOT NULL DEFAULT 'medium'
               CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  payout_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data         JSONB
);

CREATE INDEX idx_events_zone_id     ON disruption_events(zone_id);
CREATE INDEX idx_events_type        ON disruption_events(type);
CREATE INDEX idx_events_triggered_at ON disruption_events(triggered_at);


-- ─── TABLE 9: claims ───────────────────────────────────────────

CREATE TABLE claims (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    UUID        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  policy_id    UUID        REFERENCES policies(id),
  event_id     UUID        REFERENCES disruption_events(id),
  type         VARCHAR(50) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  fraud_score  DECIMAL(5,2) DEFAULT 0,
  reviewed_by  UUID        REFERENCES admin_users(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_claims_worker_id ON claims(worker_id);
CREATE INDEX idx_claims_status    ON claims(status);
CREATE INDEX idx_claims_event_id  ON claims(event_id);


-- ─── TABLE 10: payouts ─────────────────────────────────────────

CREATE TABLE payouts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id    UUID        NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  claim_id     UUID        REFERENCES claims(id) ON DELETE SET NULL,
  amount       DECIMAL(10,2) NOT NULL,
  upi_id       VARCHAR(100),
  status       VARCHAR(20) NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE INDEX idx_payouts_worker_id ON payouts(worker_id);
CREATE INDEX idx_payouts_status    ON payouts(status);


-- ─── TABLE 11: system_config ───────────────────────────────────

CREATE TABLE system_config (
  id                      SERIAL PRIMARY KEY,
  engine_active           BOOLEAN NOT NULL DEFAULT true,
  check_interval_minutes  INT     NOT NULL DEFAULT 15,
  payout_delay_seconds    INT     NOT NULL DEFAULT 5,
  thresholds              JSONB   NOT NULL DEFAULT '{
    "rain_mm_per_hour": 10,
    "aqi_threshold": 200,
    "heat_index_celsius": 42
  }',
  zone_overrides          JSONB   NOT NULL DEFAULT '{}',
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- Seed default config
INSERT INTO system_config (engine_active) VALUES (true);


-- ─── TABLE 12: admin_audit_log ─────────────────────────────────

CREATE TABLE admin_audit_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id     UUID        REFERENCES admin_users(id) ON DELETE SET NULL,
  action       VARCHAR(100) NOT NULL,
  target_type  VARCHAR(50),
  target_id    UUID,
  old_value    JSONB,
  new_value    JSONB,
  ip_address   VARCHAR(45),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_admin_id   ON admin_audit_log(admin_id);
CREATE INDEX idx_audit_log_action     ON admin_audit_log(action);
CREATE INDEX idx_audit_log_created_at ON admin_audit_log(created_at);
