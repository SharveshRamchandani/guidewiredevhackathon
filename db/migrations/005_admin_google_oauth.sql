-- ============================================================
-- Migration 005 — Admin Google OAuth
-- Adds google_id for OAuth login; makes password_hash nullable
-- ============================================================

-- Add google_id column (nullable — only set for Google-authenticated admins)
ALTER TABLE admin_users
  ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

-- Make password_hash nullable — Google-only admins won't have one
ALTER TABLE admin_users
  ALTER COLUMN password_hash DROP NOT NULL;

-- Index for fast Google ID lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_google_id ON admin_users(google_id);
