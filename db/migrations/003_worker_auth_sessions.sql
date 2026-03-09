-- ============================================================
-- Migration 003 — worker_auth_sessions
-- Tracks active worker sessions for audit/invalidation
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_auth_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  admin_id    UUID NOT NULL REFERENCES admin_users(id),
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_sessions_worker  ON worker_auth_sessions(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_sessions_expires ON worker_auth_sessions(expires_at);
