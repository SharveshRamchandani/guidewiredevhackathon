-- ==============================================================
-- GIGSHIELD — MIGRATION: Add plan tracking to workers table
-- Run this in psql or pgAdmin to apply the changes.
-- ==============================================================

-- ─── 1. Add plan_id to workers ─────────────────────────────────────────────────
-- Tracks the plan the worker selected during registration.
-- References the plans table so we can always look up plan details.

ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_workers_plan_id ON workers(plan_id);

COMMENT ON COLUMN workers.plan_id IS
  'The insurance plan ID chosen by the worker during registration. NULL until plan is selected.';

-- ─── 2. Ensure policies table has all columns used by policyService.js ─────────
-- The base migration may be missing some columns. Add them safely.

ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS policy_number    VARCHAR(50)  UNIQUE,
  ADD COLUMN IF NOT EXISTS max_coverage     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS coverage_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS auto_renew       BOOLEAN      NOT NULL DEFAULT true;

-- Backfill max_coverage from the linked plan for existing rows
UPDATE policies p
SET max_coverage = pl.max_payout
FROM plans pl
WHERE p.plan_id = pl.id
  AND p.max_coverage IS NULL;

-- ─── 3. Verification queries ────────────────────────────────────────────────────
-- Run these to confirm the migration was applied correctly.

-- Check workers table has plan_id:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'workers' AND column_name = 'plan_id';

-- Check policies table has the new columns:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'policies'
-- AND column_name IN ('policy_number','max_coverage','coverage_snapshot','auto_renew');

-- Count workers who have selected a plan:
-- SELECT COUNT(*) AS workers_with_plan FROM workers WHERE plan_id IS NOT NULL;
