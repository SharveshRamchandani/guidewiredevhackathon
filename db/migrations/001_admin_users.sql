-- ============================================================
-- Migration 001 — admin_users
-- GigShield multi-tenant admin table
-- ============================================================

CREATE TYPE IF NOT EXISTS admin_role AS ENUM ('super_admin', 'admin');

CREATE TABLE IF NOT EXISTS admin_users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(100) NOT NULL,
  email                 VARCHAR(150) UNIQUE NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  role                  admin_role NOT NULL DEFAULT 'admin',
  company_name          VARCHAR(200),
  company_reg_number    VARCHAR(100),
  registration_code     VARCHAR(20) UNIQUE,
  totp_secret           VARCHAR(255),
  totp_enabled          BOOLEAN DEFAULT false,
  setup_token           VARCHAR(255),
  setup_token_expiry    TIMESTAMPTZ,
  active                BOOLEAN DEFAULT true,
  last_login            TIMESTAMPTZ,
  created_by            UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_email     ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role      ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_reg_code  ON admin_users(registration_code);
CREATE INDEX IF NOT EXISTS idx_admin_users_active    ON admin_users(active);
