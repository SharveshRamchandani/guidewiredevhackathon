-- ============================================================
-- GigShield — Auth Migration
-- Adds authentication columns missing from base schema
-- Run AFTER schema.sql
-- ============================================================

-- Add password_hash to workers (for phone+password auth)
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add password_hash to admins if not present
ALTER TABLE admins
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Update workers table with extra fields used by the backend
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS months_active   INT   DEFAULT 6,
  ADD COLUMN IF NOT EXISTS avg_daily_hours FLOAT DEFAULT 8.0;

-- Update zones with risk columns for ML integration  
ALTER TABLE zones
  ADD COLUMN IF NOT EXISTS flood_risk FLOAT DEFAULT 0.3,
  ADD COLUMN IF NOT EXISTS heat_risk  FLOAT DEFAULT 0.3;

-- Update plans with base_premium alias (schema uses weekly_premium)
-- No column needed — backend reads weekly_premium, no change required

-- Ensure disruption_events has created_at (it only has triggered_at in base schema)
ALTER TABLE disruption_events
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Payouts: add gateway columns for Razorpay simulation tracking
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS gateway_ref      TEXT,
  ADD COLUMN IF NOT EXISTS gateway_response TEXT,
  ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS failure_reason   TEXT;

-- Workers: ensure updated_at exists
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Claims: ensure updated_at and description exist
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN workers.password_hash IS 'bcrypt hash of worker password — for phone/password login';
COMMENT ON COLUMN admins.password_hash  IS 'bcrypt hash of admin password';

-- ============================================================
-- SEED: Default admin account
-- Password: admin123 (bcrypt 10 rounds) — change in production!
-- ============================================================

INSERT INTO admins (name, email, password_hash, role)
VALUES (
  'GigShield Admin',
  'admin@gigshield.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SEED: Sample cities and zones
-- ============================================================

INSERT INTO cities (name) VALUES
  ('Mumbai'), ('Delhi'), ('Bangalore'), ('Chennai'), ('Hyderabad')
ON CONFLICT (name) DO NOTHING;

INSERT INTO zones (name, city_id, risk_level, flood_risk, heat_risk) 
SELECT 'Bandra', id, 'high', 0.8, 0.3 FROM cities WHERE name = 'Mumbai'
ON CONFLICT (city_id, name) DO NOTHING;

INSERT INTO zones (name, city_id, risk_level, flood_risk, heat_risk)
SELECT 'Andheri', id, 'medium', 0.6, 0.3 FROM cities WHERE name = 'Mumbai'
ON CONFLICT (city_id, name) DO NOTHING;

INSERT INTO zones (name, city_id, risk_level, flood_risk, heat_risk) 
SELECT 'Rohini', id, 'medium', 0.3, 0.6 FROM cities WHERE name = 'Delhi'
ON CONFLICT (city_id, name) DO NOTHING;

INSERT INTO zones (name, city_id, risk_level, flood_risk, heat_risk)
SELECT 'Connaught Place', id, 'high', 0.3, 0.7 FROM cities WHERE name = 'Delhi'
ON CONFLICT (city_id, name) DO NOTHING;

INSERT INTO zones (name, city_id, risk_level, flood_risk, heat_risk)
SELECT 'Whitefield', id, 'low', 0.2, 0.4 FROM cities WHERE name = 'Bangalore'
ON CONFLICT (city_id, name) DO NOTHING;

INSERT INTO zones (name, city_id, risk_level, flood_risk, heat_risk)
SELECT 'Koramangala', id, 'medium', 0.3, 0.4 FROM cities WHERE name = 'Bangalore'
ON CONFLICT (city_id, name) DO NOTHING;

-- ============================================================
-- SEED: Plans
-- ============================================================


