-- ============================================================
-- GigShield — Migration 007: Plans & Policies Schema Reconcile
-- Created: 2026-03-12
--
-- WHY THIS EXISTS
-- ───────────────
-- Migration 000 created the `plans` table with:
--     base_premium, max_payout, coverage_days, is_active
--
-- But policyService.js queries pl.coverage_config (missing column → 500),
-- and uses COALESCE(base_premium, weekly_premium) and
-- COALESCE(max_payout, max_coverage) for alias compatibility.
--
-- The policies table was also missing:
--     auto_renew, co_payment_percent, zone_adjustment, coverage_config
--
-- This migration is ADDITIVE (no destructive changes):
--   1. Adds missing columns to `plans`
--   2. Adds missing columns to `policies`
--   3. Back-fills alias columns from canonical columns
--   4. Adds missing indexes
--   5. Upserts the four plans using REAL live UUIDs/premiums/configs
--      (ON CONFLICT only fills NULL alias columns — never overwrites live data)
--   6. Back-fills policies.coverage_config from their plan snapshot
-- ============================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────
-- SECTION 1: plans — add missing columns
-- ─────────────────────────────────────────────────────────────

-- coverage_config: per-event JSONB payout rules.
-- policyService.js selects pl.coverage_config — missing → 500.
-- Shape: { "<eventKey>": { "coPay": 0.10, "maxPayout": 1000 } }
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS coverage_config JSONB;

-- weekly_premium: alias for legacy seed compatibility.
-- policyService uses COALESCE(base_premium, weekly_premium).
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS weekly_premium DECIMAL(8,2);

-- max_coverage: alias for legacy seed compatibility.
-- policyService uses COALESCE(max_payout, max_coverage).
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS max_coverage DECIMAL(10,2);

-- updated_at: standard audit column, missing from original schema.
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure name has a UNIQUE constraint so ON CONFLICT (name) works.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'plans'::regclass
    AND    conname  = 'plans_name_key'
  ) THEN
    ALTER TABLE plans ADD CONSTRAINT plans_name_key UNIQUE (name);
  END IF;
END$$;

-- Back-fill alias columns for any existing rows.
UPDATE plans
SET
  weekly_premium = COALESCE(weekly_premium, base_premium),
  max_coverage   = COALESCE(max_coverage, max_payout)
WHERE weekly_premium IS NULL OR max_coverage IS NULL;

-- ─────────────────────────────────────────────────────────────
-- SECTION 2: policies — add missing columns
-- ─────────────────────────────────────────────────────────────

-- auto_renew: toggled via PATCH /api/policy/:id/auto-renew.
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT false;

-- co_payment_percent: fraction the worker co-pays (0.00–1.00).
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS co_payment_percent DECIMAL(5,4) NOT NULL DEFAULT 0.00;

-- zone_adjustment: premium uplift from the worker's risk zone.
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS zone_adjustment DECIMAL(8,2) NOT NULL DEFAULT 0.00;

-- coverage_config: snapshot of plan rules at purchase time.
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS coverage_config JSONB;

-- updated_at: guard with IF NOT EXISTS for safety.
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─────────────────────────────────────────────────────────────
-- SECTION 3: indexes
-- ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_plans_name      ON plans(name);
CREATE INDEX IF NOT EXISTS idx_plans_is_active ON plans(is_active);

CREATE INDEX IF NOT EXISTS idx_policies_plan_id    ON policies(plan_id);
CREATE INDEX IF NOT EXISTS idx_policies_auto_renew ON policies(auto_renew) WHERE auto_renew = true;

-- ─────────────────────────────────────────────────────────────
-- SECTION 4: upsert canonical GigShield plans
--
-- UUIDs, premiums, and coverage_config values are taken directly
-- from the live database (verified 2026-03-12 via pgAdmin).
--
-- ON CONFLICT (name): ONLY back-fills alias columns (weekly_premium,
-- max_coverage) if they are NULL. Never overwrites base_premium,
-- max_payout, or coverage_config that already exist in production.
-- ─────────────────────────────────────────────────────────────

INSERT INTO plans (
  id,
  name,
  base_premium,
  weekly_premium,
  max_payout,
  max_coverage,
  coverage_days,
  is_active,
  coverage_config
) VALUES

-- ── Nano ────────────────────────────────────────────────────────
-- base: ₹25 | max: ₹500 | 2 events: heavyRain, platformOutage
(
  '58e413bd-0ce1-46a6-8fb8-493510082447',
  'nano',
  25.00,
  25.00,
  500.00,
  500.00,
  7,
  true,
  '{"heavyRain": {"coPay": 0.25, "maxPayout": 150}, "platformOutage": {"coPay": 0.25, "maxPayout": 200}}'::jsonb
),

-- ── Basic ───────────────────────────────────────────────────────
-- base: ₹49 | max: ₹1 000 | 4 events: heavyRain, poorAqi, heatwave, platformOutage
(
  '937e2721-ae2d-4869-a13b-abb1febeb66a',
  'basic',
  49.00,
  49.00,
  1000.00,
  1000.00,
  7,
  true,
  '{"poorAqi": {"coPay": 0.20, "maxPayout": 250}, "heatwave": {"coPay": 0.20, "maxPayout": 200}, "heavyRain": {"coPay": 0.20, "maxPayout": 300}, "platformOutage": {"coPay": 0.20, "maxPayout": 400}}'::jsonb
),

-- ── Standard ────────────────────────────────────────────────────
-- base: ₹79 | max: ₹2 000 | 6 events: adds strike, curfew
(
  '163f9ab2-f3c9-49c9-b89d-2332a299cdf3',
  'standard',
  79.00,
  79.00,
  2000.00,
  2000.00,
  7,
  true,
  '{"curfew": {"coPay": 0.10, "maxPayout": 700}, "strike": {"coPay": 0.10, "maxPayout": 500}, "poorAqi": {"coPay": 0.10, "maxPayout": 400}, "heatwave": {"coPay": 0.10, "maxPayout": 300}, "heavyRain": {"coPay": 0.10, "maxPayout": 500}, "platformOutage": {"coPay": 0.10, "maxPayout": 600}}'::jsonb
),

-- ── Premium ─────────────────────────────────────────────────────
-- base: ₹99 | max: ₹3 500 | 7 events: all + accident (requiresOrderProof)
-- Premium plan has 0 co-pay on all events.
(
  '1b690d27-70ec-40fa-8b7b-3281498a4909',
  'premium',
  99.00,
  99.00,
  3500.00,
  3500.00,
  7,
  true,
  '{"curfew": {"coPay": 0, "maxPayout": 800}, "strike": {"coPay": 0, "maxPayout": 600}, "poorAqi": {"coPay": 0, "maxPayout": 500}, "accident": {"coPay": 0, "maxPayout": 500, "requiresOrderProof": true}, "heatwave": {"coPay": 0, "maxPayout": 400}, "heavyRain": {"coPay": 0, "maxPayout": 600}, "platformOutage": {"coPay": 0, "maxPayout": 750}}'::jsonb
)

-- SAFE conflict resolution:
-- Only back-fill alias columns that are NULL.
-- Never overwrite base_premium, max_payout, coverage_config, or is_active.
ON CONFLICT (name) DO UPDATE SET
  weekly_premium = COALESCE(plans.weekly_premium, EXCLUDED.weekly_premium),
  max_coverage   = COALESCE(plans.max_coverage,   EXCLUDED.max_coverage),
  updated_at     = COALESCE(plans.updated_at,      now());

-- ─────────────────────────────────────────────────────────────
-- SECTION 5: back-fill policies.coverage_config from their plan
-- (for any existing policies that pre-date this migration)
-- ─────────────────────────────────────────────────────────────

UPDATE policies pol
SET    coverage_config = pl.coverage_config
FROM   plans pl
WHERE  pol.plan_id         = pl.id
AND    pol.coverage_config IS NULL
AND    pl.coverage_config  IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- VERIFY
-- ─────────────────────────────────────────────────────────────

SELECT
  name,
  base_premium,
  max_payout,
  coverage_days,
  is_active,
  weekly_premium IS NOT NULL AS has_weekly_premium_alias,
  max_coverage   IS NOT NULL AS has_max_coverage_alias,
  coverage_config IS NOT NULL AS has_coverage_config
FROM plans
ORDER BY base_premium;

COMMIT;
