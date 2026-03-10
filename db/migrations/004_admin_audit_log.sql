-- ============================================================
-- Migration 004 — admin_audit_log
-- Tracks all admin actions for compliance and audit trail
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID REFERENCES admin_users(id),
  action        VARCHAR(100) NOT NULL,
  target_type   VARCHAR(50),
  target_id     UUID,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Also add admin_id to existing tables for proper tenant isolation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='policies' AND column_name='admin_id') THEN
    ALTER TABLE policies ADD COLUMN admin_id UUID REFERENCES admin_users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims' AND column_name='admin_id') THEN
    ALTER TABLE claims ADD COLUMN admin_id UUID REFERENCES admin_users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payouts' AND column_name='admin_id') THEN
    ALTER TABLE payouts ADD COLUMN admin_id UUID REFERENCES admin_users(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='disruption_events' AND column_name='admin_id') THEN
    ALTER TABLE disruption_events ADD COLUMN admin_id UUID REFERENCES admin_users(id);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin   ON admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action  ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policies_admin_id   ON policies(admin_id);
CREATE INDEX IF NOT EXISTS idx_claims_admin_id     ON claims(admin_id);
CREATE INDEX IF NOT EXISTS idx_payouts_admin_id    ON payouts(admin_id);
CREATE INDEX IF NOT EXISTS idx_events_admin_id     ON disruption_events(admin_id);
