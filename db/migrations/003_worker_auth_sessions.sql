-- ============================================================
-- Migration 003 — worker_auth_sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS worker_auth_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id   UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worker_auth_sessions_worker ON worker_auth_sessions(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_auth_sessions_hash   ON worker_auth_sessions(token_hash);
