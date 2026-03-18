-- ============================================================
-- Migration 007 — Align live DB with backend expectations
-- and add ML prediction audit logging.
--
-- Idempotent: safe to run multiple times.
-- ============================================================

-- ---- plans ---------------------------------------------------
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS weekly_premium NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS max_coverage NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS coverage_config JSONB,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE plans
SET weekly_premium = COALESCE(weekly_premium, base_premium)
WHERE weekly_premium IS NULL;

UPDATE plans
SET max_coverage = COALESCE(max_coverage, max_payout)
WHERE max_coverage IS NULL;

UPDATE plans
SET coverage_config = jsonb_build_object(
  'heavyRain', jsonb_build_object('payoutPercent', CASE WHEN COALESCE(max_coverage, max_payout) >= 2000 THEN 70 WHEN COALESCE(max_coverage, max_payout) >= 1000 THEN 50 ELSE 30 END, 'maxPayout', ROUND(COALESCE(max_coverage, max_payout) * 0.30)),
  'poorAqi', jsonb_build_object('payoutPercent', CASE WHEN COALESCE(max_coverage, max_payout) >= 2000 THEN 60 WHEN COALESCE(max_coverage, max_payout) >= 1000 THEN 40 ELSE 25 END, 'maxPayout', ROUND(COALESCE(max_coverage, max_payout) * 0.25)),
  'heatwave', jsonb_build_object('payoutPercent', CASE WHEN COALESCE(max_coverage, max_payout) >= 2000 THEN 50 WHEN COALESCE(max_coverage, max_payout) >= 1000 THEN 30 ELSE 20 END, 'maxPayout', ROUND(COALESCE(max_coverage, max_payout) * 0.20)),
  'platformOutage', jsonb_build_object('payoutPercent', CASE WHEN COALESCE(max_coverage, max_payout) >= 2000 THEN 80 WHEN COALESCE(max_coverage, max_payout) >= 1000 THEN 60 ELSE 40 END, 'maxPayout', ROUND(COALESCE(max_coverage, max_payout) * 0.40))
)
WHERE coverage_config IS NULL;

-- ---- policies ------------------------------------------------
ALTER TABLE policies
  ADD COLUMN IF NOT EXISTS policy_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS max_coverage NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS coverage_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS premium_amount NUMERIC(8,2);

UPDATE policies
SET premium_amount = COALESCE(premium_amount, premium)
WHERE premium_amount IS NULL;

UPDATE policies p
SET max_coverage = COALESCE(
  p.max_coverage,
  pl.max_coverage,
  pl.max_payout
)
FROM plans pl
WHERE pl.id = p.plan_id
  AND p.max_coverage IS NULL;

UPDATE policies
SET policy_number = COALESCE(
  policy_number,
  'POL-' || EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::TEXT || '-' || SUBSTRING(REPLACE(id::TEXT, '-', '') FROM 1 FOR 8)
)
WHERE policy_number IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'policies_policy_number_key'
  ) THEN
    ALTER TABLE policies ADD CONSTRAINT policies_policy_number_key UNIQUE (policy_number);
  END IF;
END $$;

-- ---- claims --------------------------------------------------
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS claim_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gps_match BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE claims
SET claim_number = COALESCE(
  claim_number,
  'CLM-' || SUBSTRING(REPLACE(id::TEXT, '-', '') FROM 1 FOR 8)
)
WHERE claim_number IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'claims_claim_number_key'
  ) THEN
    ALTER TABLE claims ADD CONSTRAINT claims_claim_number_key UNIQUE (claim_number);
  END IF;
END $$;

-- ---- payouts -------------------------------------------------
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS payout_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS gateway_ref TEXT,
  ADD COLUMN IF NOT EXISTS gateway_response TEXT;

UPDATE payouts
SET payout_number = COALESCE(
  payout_number,
  'PAY-' || SUBSTRING(REPLACE(id::TEXT, '-', '') FROM 1 FOR 8)
)
WHERE payout_number IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payouts_payout_number_key'
  ) THEN
    ALTER TABLE payouts ADD CONSTRAINT payouts_payout_number_key UNIQUE (payout_number);
  END IF;
END $$;

-- ---- disruption_events --------------------------------------
ALTER TABLE disruption_events
  ADD COLUMN IF NOT EXISTS event_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS value VARCHAR(100),
  ADD COLUMN IF NOT EXISTS source VARCHAR(20),
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS claims_generated INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE disruption_events
SET event_number = COALESCE(
  event_number,
  'EVT-' || SUBSTRING(REPLACE(id::TEXT, '-', '') FROM 1 FOR 8)
)
WHERE event_number IS NULL;

UPDATE disruption_events
SET source = COALESCE(source, 'manual')
WHERE source IS NULL;

UPDATE disruption_events
SET value = COALESCE(value, data::TEXT, severity)
WHERE value IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'disruption_events_event_number_key'
  ) THEN
    ALTER TABLE disruption_events ADD CONSTRAINT disruption_events_event_number_key UNIQUE (event_number);
  END IF;
END $$;

-- ---- ML prediction logging ----------------------------------
CREATE TABLE IF NOT EXISTS ml_prediction_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prediction_type VARCHAR(50) NOT NULL,
  worker_id UUID NULL REFERENCES workers(id) ON DELETE SET NULL,
  policy_id UUID NULL REFERENCES policies(id) ON DELETE SET NULL,
  claim_id UUID NULL REFERENCES claims(id) ON DELETE SET NULL,
  event_id UUID NULL REFERENCES disruption_events(id) ON DELETE SET NULL,
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  decision VARCHAR(100),
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_prediction_logs_type_created
  ON ml_prediction_logs(prediction_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_logs_worker
  ON ml_prediction_logs(worker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_prediction_logs_claim
  ON ml_prediction_logs(claim_id, created_at DESC);

-- ---- Helpful indexes ----------------------------------------
CREATE INDEX IF NOT EXISTS idx_policies_worker_status
  ON policies(worker_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_worker_event_type
  ON claims(worker_id, event_id, type);
CREATE INDEX IF NOT EXISTS idx_disruption_events_zone_triggered
  ON disruption_events(zone_id, triggered_at DESC);
