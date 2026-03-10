-- ============================================================
-- Migration 002 — workers
-- No admin_id FK. Workers belong to GigShield directly.
-- ============================================================

CREATE TABLE IF NOT EXISTS workers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100),
  phone                 VARCHAR(15) UNIQUE NOT NULL,
  platform              VARCHAR(50),
  city                  VARCHAR(50),
  zone_id               INT,
  avg_weekly_earning    DECIMAL(8,2),
  risk_score            DECIMAL(4,3) DEFAULT 0.500,
  aadhaar_hash          VARCHAR(64) UNIQUE,
  upi_id                VARCHAR(100),
  is_phone_verified     BOOLEAN DEFAULT false,
  is_kyc_verified       BOOLEAN DEFAULT false,
  is_profile_complete   BOOLEAN DEFAULT false,
  active                BOOLEAN DEFAULT true,
  last_login            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist (idempotent for existing DB)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='is_phone_verified') THEN
    ALTER TABLE workers ADD COLUMN is_phone_verified BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='is_kyc_verified') THEN
    ALTER TABLE workers ADD COLUMN is_kyc_verified BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='is_profile_complete') THEN
    ALTER TABLE workers ADD COLUMN is_profile_complete BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='aadhaar_hash') THEN
    ALTER TABLE workers ADD COLUMN aadhaar_hash VARCHAR(64) UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='avg_weekly_earning') THEN
    ALTER TABLE workers ADD COLUMN avg_weekly_earning DECIMAL(8,2);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='risk_score') THEN
    ALTER TABLE workers ADD COLUMN risk_score DECIMAL(4,3) DEFAULT 0.500;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='zone_id') THEN
    ALTER TABLE workers ADD COLUMN zone_id INT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='upi_id') THEN
    ALTER TABLE workers ADD COLUMN upi_id VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='active') THEN
    ALTER TABLE workers ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='last_login') THEN
    ALTER TABLE workers ADD COLUMN last_login TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='job_title') THEN
    -- job_title is for admin_users only, but keeping idempotency guard here
    NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workers_phone    ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_aadhaar  ON workers(aadhaar_hash);
CREATE INDEX IF NOT EXISTS idx_workers_active   ON workers(active);
