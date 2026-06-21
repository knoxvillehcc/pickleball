-- ============================================================
-- HCC Pickleball Registrations — Supabase Schema
-- Run this ONCE in the Supabase SQL Editor
-- https://supabase.com/dashboard → Your Project → SQL Editor
-- ============================================================

-- Auto-incrementing registration number sequence
CREATE SEQUENCE IF NOT EXISTS pickleball_reg_seq START 1001;

CREATE TABLE IF NOT EXISTS registrations (
  -- Primary key
  id                      BIGSERIAL PRIMARY KEY,

  -- Auto-generated registration number (e.g. HCC-1001)
  registration_number     TEXT NOT NULL DEFAULT ('HCC-' || nextval('pickleball_reg_seq')::TEXT),

  -- Personal info
  first_name              TEXT NOT NULL,
  last_name               TEXT NOT NULL,
  full_name               TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email                   TEXT NOT NULL,
  phone                   TEXT,
  gender                  TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  date_of_birth           DATE,

  -- Address
  street                  TEXT,
  city                    TEXT,
  state                   TEXT,
  zip_code                TEXT,

  -- Emergency contact
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,

  -- Pickleball details
  skill_level             TEXT NOT NULL DEFAULT 'beginner'
                            CHECK (skill_level IN ('beginner','intermediate','advanced')),
  partner_name            TEXT,
  special_notes           TEXT,
  liability_accepted      BOOLEAN NOT NULL DEFAULT FALSE,
  liability_accepted_date TIMESTAMPTZ,

  -- Event snapshot (copied from config at time of registration)
  event_name              TEXT,
  event_date              TEXT,
  event_time              TEXT,
  event_location          TEXT,

  -- Payment
  payment_status          TEXT NOT NULL DEFAULT 'pending'
                            CHECK (payment_status IN ('pending','paid','failed','refunded')),
  amount_paid             NUMERIC(10,2) DEFAULT 0,
  stripe_payment_ref      TEXT,
  payment_date            TIMESTAMPTZ,
  invoice_id              TEXT,

  -- Timestamps
  registration_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes for fast filtering ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reg_payment_status  ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_reg_skill_level     ON registrations(skill_level);
CREATE INDEX IF NOT EXISTS idx_reg_email           ON registrations(email);
CREATE INDEX IF NOT EXISTS idx_reg_date            ON registrations(registration_date DESC);

-- ── Row Level Security: allow public reads via anon key ─────
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- Allow anon key to SELECT (read dashboard data)
CREATE POLICY "Allow anon read" ON registrations
  FOR SELECT USING (true);

-- Allow anon key to INSERT (public registration form submissions)
CREATE POLICY "Allow anon insert" ON registrations
  FOR INSERT WITH CHECK (true);

-- ── Test: insert a sample record ────────────────────────────
-- (delete this after confirming it appears in your dashboard)
INSERT INTO registrations (
  first_name, last_name, email, phone, skill_level,
  payment_status, amount_paid, event_name
) VALUES (
  'Test', 'Player', 'test@example.com', '865-555-0001', 'beginner',
  'paid', 25.00, 'HCC Summer Pickleball 2025'
);
