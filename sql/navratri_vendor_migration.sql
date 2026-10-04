-- ══════════════════════════════════════════════════════════════════════════════
-- NAVRATRI 2026 VENDOR & BOOTH REGISTRATION MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Master Vendor Registrations Table
CREATE TABLE IF NOT EXISTS public.navratri_vendor_registrations (
  id                    BIGSERIAL PRIMARY KEY,
  registration_number   TEXT NOT NULL UNIQUE,       -- e.g. NVV-2610-4821
  business_name         TEXT NOT NULL,
  contact_name          TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  address               TEXT,
  city                  TEXT,
  state                 TEXT,
  zip                   TEXT,
  category              TEXT NOT NULL DEFAULT 'merchandise', -- food, jewelry, clothing, henna, services, other
  category_details      TEXT,
  electrical_needed     BOOLEAN DEFAULT false,
  special_requests      TEXT,
  notes                 TEXT,                                -- admin notes
  total_booths_booked   INTEGER NOT NULL DEFAULT 1,
  amount_due            INTEGER NOT NULL,                    -- cents ($)
  amount_paid           INTEGER NOT NULL DEFAULT 0,          -- cents ($)
  payment_status        TEXT NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending', 'paid', 'partially_refunded', 'refunded', 'failed', 'cancelled')),
  stripe_session_id     TEXT,
  stripe_payment_ref    TEXT DEFAULT '',
  disclaimer_accepted   BOOLEAN NOT NULL DEFAULT false,
  registration_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nvv_reg_number ON public.navratri_vendor_registrations(registration_number);
CREATE INDEX IF NOT EXISTS idx_nvv_payment_status ON public.navratri_vendor_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_nvv_email ON public.navratri_vendor_registrations(email);

-- 2. Booked Dates Breakdown Table (multi-date, spot assignment, capacity & partial refunds)
CREATE TABLE IF NOT EXISTS public.navratri_vendor_dates (
  id                    BIGSERIAL PRIMARY KEY,
  registration_id       BIGINT NOT NULL REFERENCES public.navratri_vendor_registrations(id) ON DELETE CASCADE,
  event_date            DATE NOT NULL,                       -- 2026-10-11
  day_label             TEXT NOT NULL,                       -- 'Day 1 — Sun, Oct 11'
  is_weekend            BOOLEAN NOT NULL DEFAULT false,      -- true if Fri or Sat
  rate_cents            INTEGER NOT NULL,                    -- 20100 (Sun-Thu) or 35100 (Fri-Sat)
  booth_count           INTEGER NOT NULL DEFAULT 1,          -- 1, 2, etc.
  total_cents           INTEGER NOT NULL,                    -- rate_cents * booth_count
  booth_spot_number     TEXT DEFAULT '',                     -- e.g. 'Booth #4', assigned by committee
  status                TEXT NOT NULL DEFAULT 'confirmed'
                        CHECK (status IN ('confirmed', 'cancelled', 'refunded')),
  refund_amount_cents   INTEGER DEFAULT 0,
  refund_id             TEXT,                                -- Stripe refund ID if refunded
  refunded_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nvv_dates_reg_id ON public.navratri_vendor_dates(registration_id);
CREATE INDEX IF NOT EXISTS idx_nvv_dates_event_date ON public.navratri_vendor_dates(event_date);
CREATE INDEX IF NOT EXISTS idx_nvv_dates_status ON public.navratri_vendor_dates(status);

-- 3. Settings table for Navratri Vendors (publish toggle, booth capacity per night, etc.)
CREATE TABLE IF NOT EXISTS public.navratri_vendor_settings (
  key                   TEXT PRIMARY KEY,
  value                 TEXT NOT NULL,
  description           TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial settings
INSERT INTO public.navratri_vendor_settings (key, value, description)
VALUES 
  ('is_published', 'true', 'Controls whether the public vendor registration page is open'),
  ('default_capacity_per_night', '10', 'Default booth capacity per night'),
  ('disabled_dates', '[]', 'JSON array of dates disabled for registration'),
  ('custom_capacities', '{}', 'JSON map of custom capacity per date e.g. {"2026-10-16": 12}')
ON CONFLICT (key) DO NOTHING;

-- RLS setup
ALTER TABLE public.navratri_vendor_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_vendor_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_vendor_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on navratri_vendor_registrations" ON public.navratri_vendor_registrations;
CREATE POLICY "Service role full access on navratri_vendor_registrations"
  ON public.navratri_vendor_registrations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on navratri_vendor_dates" ON public.navratri_vendor_dates;
CREATE POLICY "Service role full access on navratri_vendor_dates"
  ON public.navratri_vendor_dates FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on navratri_vendor_settings" ON public.navratri_vendor_settings;
CREATE POLICY "Service role full access on navratri_vendor_settings"
  ON public.navratri_vendor_settings FOR ALL USING (true) WITH CHECK (true);

SELECT 'Navratri Vendor tables created successfully ✅' AS status;
