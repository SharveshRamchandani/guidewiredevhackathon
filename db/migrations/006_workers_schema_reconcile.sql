-- ============================================================
-- Migration 006 — Reconcile workers table column names
--
-- schema.sql used:  upi, aadhaar_last4, weekly_earnings, is_active
-- migration 002 and all service code use:
--   upi_id, aadhaar_hash, avg_weekly_earning, active,
--   is_phone_verified, is_kyc_verified, is_profile_complete
--
-- This migration is idempotent — safe to run multiple times.
-- ============================================================

DO $$
BEGIN

  -- 1. Rename "upi" → "upi_id" (if old column still exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'upi'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'upi_id'
  ) THEN
    ALTER TABLE workers RENAME COLUMN upi TO upi_id;
    RAISE NOTICE 'Renamed workers.upi → upi_id';
  END IF;

  -- 2. Add "upi_id" if it doesn't exist at all
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'upi_id'
  ) THEN
    ALTER TABLE workers ADD COLUMN upi_id VARCHAR(100);
    RAISE NOTICE 'Added workers.upi_id';
  END IF;

  -- 3. Rename "aadhaar_last4" → "aadhaar_hash" (if old column still exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'aadhaar_last4'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'aadhaar_hash'
  ) THEN
    ALTER TABLE workers RENAME COLUMN aadhaar_last4 TO aadhaar_hash;
    ALTER TABLE workers ALTER COLUMN aadhaar_hash TYPE VARCHAR(64);
    RAISE NOTICE 'Renamed workers.aadhaar_last4 → aadhaar_hash';
  END IF;

  -- 4. Add "aadhaar_hash" if it doesn't exist at all
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'aadhaar_hash'
  ) THEN
    ALTER TABLE workers ADD COLUMN aadhaar_hash VARCHAR(64);
    RAISE NOTICE 'Added workers.aadhaar_hash';
  END IF;

  -- Add UNIQUE constraint on aadhaar_hash if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workers_aadhaar_hash_key'
  ) THEN
    ALTER TABLE workers ADD CONSTRAINT workers_aadhaar_hash_key UNIQUE (aadhaar_hash);
    RAISE NOTICE 'Added UNIQUE constraint on workers.aadhaar_hash';
  END IF;

  -- 5. Rename "weekly_earnings" → "avg_weekly_earning" (if old column still exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'weekly_earnings'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'avg_weekly_earning'
  ) THEN
    ALTER TABLE workers RENAME COLUMN weekly_earnings TO avg_weekly_earning;
    RAISE NOTICE 'Renamed workers.weekly_earnings → avg_weekly_earning';
  END IF;

  -- 6. Add "avg_weekly_earning" if it doesn't exist at all
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'avg_weekly_earning'
  ) THEN
    ALTER TABLE workers ADD COLUMN avg_weekly_earning DECIMAL(8,2);
    RAISE NOTICE 'Added workers.avg_weekly_earning';
  END IF;

  -- 7. Rename "is_active" → "active" (if old column still exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'is_active'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'active'
  ) THEN
    ALTER TABLE workers RENAME COLUMN is_active TO active;
    RAISE NOTICE 'Renamed workers.is_active → active';
  END IF;

  -- 8. Add "active" if it doesn't exist at all
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'active'
  ) THEN
    ALTER TABLE workers ADD COLUMN active BOOLEAN DEFAULT true;
    RAISE NOTICE 'Added workers.active';
  END IF;

  -- 9. Add "is_phone_verified" if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'is_phone_verified'
  ) THEN
    ALTER TABLE workers ADD COLUMN is_phone_verified BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added workers.is_phone_verified';
  END IF;

  -- 10. Add "is_kyc_verified" if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'is_kyc_verified'
  ) THEN
    ALTER TABLE workers ADD COLUMN is_kyc_verified BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added workers.is_kyc_verified';
  END IF;

  -- 11. Add "is_profile_complete" if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'is_profile_complete'
  ) THEN
    ALTER TABLE workers ADD COLUMN is_profile_complete BOOLEAN DEFAULT false;
    RAISE NOTICE 'Added workers.is_profile_complete';
  END IF;

  -- 12. Add "risk_score" if missing (replaces old "risk_level" text column in service code)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'risk_score'
  ) THEN
    ALTER TABLE workers ADD COLUMN risk_score DECIMAL(4,3) DEFAULT 0.500;
    RAISE NOTICE 'Added workers.risk_score';
  END IF;

  -- 13. Add "last_login" if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE workers ADD COLUMN last_login TIMESTAMPTZ;
    RAISE NOTICE 'Added workers.last_login';
  END IF;

  -- 14. Add "city" (plain text) if missing — workerAuthService inserts city as text, not city_id UUID
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workers' AND column_name = 'city'
  ) THEN
    ALTER TABLE workers ADD COLUMN city VARCHAR(50);
    RAISE NOTICE 'Added workers.city';
  END IF;

END $$;

-- Indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_workers_aadhaar  ON workers(aadhaar_hash);
CREATE INDEX IF NOT EXISTS idx_workers_active   ON workers(active);
CREATE INDEX IF NOT EXISTS idx_workers_verified ON workers(is_phone_verified);
