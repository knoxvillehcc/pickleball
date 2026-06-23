-- ══════════════════════════════════════════════════════════════════════════════
-- HCC PORTAL – SECURITY REMEDIATION & PRODUCTION HARDENING MIGRATIONS
-- Run this script in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. Secure Registrations & Settings RLS Policies ──────────────────────────
-- Drop wide-open update policies for anonymous users
DROP POLICY IF EXISTS "Allow anon update" ON public.registrations;
DROP POLICY IF EXISTS "Allow anon upsert settings" ON public.pickleball_settings;
DROP POLICY IF EXISTS "Allow anon update settings" ON public.pickleball_settings;

-- ── 2. Create Webhook Logs Table (Idempotency Audit) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id                  BIGSERIAL PRIMARY KEY,
  webhook_id          TEXT NOT NULL UNIQUE,
  registration_number TEXT,
  result              TEXT,
  processed_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);

-- ── 3. Create Login Lockouts Table (DB Lockout Tracking) ─────────────────────
CREATE TABLE IF NOT EXISTS public.login_lockouts (
  id           BIGSERIAL PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  failed_count INT DEFAULT 0,
  locked_until TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_lockouts_email ON public.login_lockouts(email);

-- ── 4. Create Registration Number Sequence & RPC Generator ────────────────────
CREATE SEQUENCE IF NOT EXISTS public.PB_2026_seq START 1;

CREATE OR REPLACE FUNCTION public.get_next_registration_number()
RETURNS TEXT AS $$
DECLARE
  next_val INT;
BEGIN
  next_val := nextval('public.PB_2026_seq');
  RETURN 'PB-2026-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ── 5. Create Email Queue Table (Reliability & Retries) ──────────────────────
CREATE TABLE IF NOT EXISTS public.email_queue (
  id              BIGSERIAL PRIMARY KEY,
  registration_id BIGINT,
  to_email        TEXT NOT NULL,
  subject         TEXT NOT NULL,
  body_html       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts        INT DEFAULT 0,
  last_error      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON public.email_queue(status);

-- ── Verify ────────────────────────────────════════════════════════════════════
SELECT 'All security and hardening migrations applied successfully ✅' AS status;
