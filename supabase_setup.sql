-- ══════════════════════════════════════════════════════════════════════════════
-- HCC Pickleball Registrations Table
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.registrations (
  id                   BIGSERIAL PRIMARY KEY,
  registration_number  TEXT        NOT NULL UNIQUE,
  full_name            TEXT        NOT NULL,
  first_name           TEXT        NOT NULL DEFAULT '',
  last_name            TEXT        NOT NULL DEFAULT '',
  email                TEXT        NOT NULL,
  phone                TEXT        NOT NULL DEFAULT '',
  skill_level          TEXT        NOT NULL CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
  gender               TEXT        NOT NULL DEFAULT '',
  city                 TEXT        NOT NULL DEFAULT '',
  state                TEXT        NOT NULL DEFAULT '',
  partner_name         TEXT        NOT NULL DEFAULT '',
  event_name           TEXT        NOT NULL DEFAULT 'HCC Pickleball Tournament',
  event_date           TEXT        NOT NULL DEFAULT '',
  registration_type    TEXT        NOT NULL DEFAULT 'singles' CHECK (registration_type IN ('singles', 'doubles')),
  payment_status       TEXT        NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  amount_paid          NUMERIC(10,2) NOT NULL DEFAULT 0,
  stripe_payment_ref   TEXT        NOT NULL DEFAULT '',
  liability_accepted   BOOLEAN     NOT NULL DEFAULT FALSE,
  registration_date    TEXT        NOT NULL DEFAULT '',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes for fast lookups ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_registrations_email          ON public.registrations (email);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status ON public.registrations (payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_skill_level    ON public.registrations (skill_level);
CREATE INDEX IF NOT EXISTS idx_registrations_reg_number     ON public.registrations (registration_number);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at     ON public.registrations (created_at DESC);

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.registrations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Row Level Security (allow anon to INSERT and SELECT) ──────────────────────
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Public can read all registrations (for admin dashboard)
DROP POLICY IF EXISTS "Allow anon read" ON public.registrations;
CREATE POLICY "Allow anon read"
  ON public.registrations FOR SELECT
  USING (true);

-- Public can insert new registrations (for registration form)
DROP POLICY IF EXISTS "Allow anon insert" ON public.registrations;
CREATE POLICY "Allow anon insert"
  ON public.registrations FOR INSERT
  WITH CHECK (true);

-- Public can update their own registration (for webhook updating payment status)
DROP POLICY IF EXISTS "Allow anon update" ON public.registrations;
CREATE POLICY "Allow anon update"
  ON public.registrations FOR UPDATE
  USING (true);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'registrations table created successfully ✅' AS status;
