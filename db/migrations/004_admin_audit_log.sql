  -- ============================================================
  -- Migration 004 — admin_audit_log
  -- ============================================================

  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id      UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action        VARCHAR(100) NOT NULL,
    target_type   VARCHAR(50),
    target_id     UUID,
    old_value     JSONB,
    new_value     JSONB,
    ip_address    VARCHAR(45),
    created_at    TIMESTAMPTZ DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS idx_audit_log_admin_id   ON admin_audit_log(admin_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON admin_audit_log(action);
  CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON admin_audit_log(created_at);
