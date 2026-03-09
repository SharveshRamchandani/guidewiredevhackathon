-- ============================================================
-- Migration 002 — workers table update for multi-tenancy
-- Adds admin_id FK, OTP-based auth fields, and new columns
-- ============================================================

-- Add admin_id if it doesn't exist (link worker to tenant admin)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='workers' AND column_name='admin_id'
  ) THEN
    ALTER TABLE workers ADD COLUMN admin_id UUID REFERENCES admin_users(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Add OTP auth / registration fields
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
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='zone_id_int') THEN
    ALTER TABLE workers ADD COLUMN zone_id_int INT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workers' AND column_name='last_login') THEN
    ALTER TABLE workers ADD COLUMN last_login TIMESTAMPTZ;
  END IF;
END $$;

-- Rename is_active to active if needed (keep backward compat via alias)
-- We keep is_active as primary since existing code uses it
-- Add active as computed or alias — kept consistent

-- Add tenant index
CREATE INDEX IF NOT EXISTS idx_workers_admin_id ON workers(admin_id);
CREATE INDEX IF NOT EXISTS idx_workers_aadhaar  ON workers(aadhaar_hash);
