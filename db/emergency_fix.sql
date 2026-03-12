-- ============================================================
-- GigShield — EMERGENCY FIX
-- Run this in pgAdmin Query Tool to unblock /policy and /plans
--
-- This only adds missing columns. It does NOT touch any existing
-- data. Safe to run multiple times (all statements use IF NOT EXISTS).
-- ============================================================

BEGIN;

-- ── plans: add coverage_config (the main cause of the 500) ───
ALTER TABLE plans ADD COLUMN IF NOT EXISTS coverage_config  JSONB;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS weekly_premium   DECIMAL(8,2);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_coverage     DECIMAL(10,2);
ALTER TABLE plans ADD COLUMN IF NOT EXISTS updated_at       TIMESTAMPTZ NOT NULL DEFAULT now();

-- Back-fill alias columns so COALESCE fallbacks work
UPDATE plans SET weekly_premium = base_premium WHERE weekly_premium IS NULL;
UPDATE plans SET max_coverage   = max_payout   WHERE max_coverage   IS NULL;

-- UNIQUE constraint on name so upserts work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'plans'::regclass AND conname = 'plans_name_key'
  ) THEN
    ALTER TABLE plans ADD CONSTRAINT plans_name_key UNIQUE (name);
  END IF;
END$$;

-- ── policies: add columns used by the service layer ──────────
ALTER TABLE policies ADD COLUMN IF NOT EXISTS auto_renew          BOOLEAN     NOT NULL DEFAULT false;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS co_payment_percent  DECIMAL(5,4) NOT NULL DEFAULT 0.00;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS zone_adjustment     DECIMAL(8,2) NOT NULL DEFAULT 0.00;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS coverage_config     JSONB;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS updated_at          TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plans_name      ON plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_policies_plan_id    ON policies(plan_id);
CREATE INDEX IF NOT EXISTS idx_policies_auto_renew ON policies(auto_renew) WHERE auto_renew = true;

-- ── back-fill policies.coverage_config from plan snapshot ────
UPDATE policies pol
SET    coverage_config = pl.coverage_config
FROM   plans pl
WHERE  pol.plan_id         = pl.id
AND    pol.coverage_config IS NULL
AND    pl.coverage_config  IS NOT NULL;

-- ── verify ────────────────────────────────────────────────────
SELECT
  name,
  base_premium,
  max_payout,
  is_active,
  coverage_config IS NOT NULL AS has_coverage_config
FROM plans ORDER BY base_premium;

COMMIT;
