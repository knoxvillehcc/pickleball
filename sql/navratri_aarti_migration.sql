-- ══════════════════════════════════════════════════════════════════════════════
-- NAVRATRI 2026 DAILY AARTI SEVA & BIDDING SYSTEM MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Global Aarti Auction Settings Table
CREATE TABLE IF NOT EXISTS public.navratri_aarti_settings (
  id                  TEXT PRIMARY KEY DEFAULT 'config',
  is_published        BOOLEAN NOT NULL DEFAULT false,  -- Hidden from public until admin publishes
  tier1_max           INTEGER NOT NULL DEFAULT 3000,   -- Threshold ($) where increment changes (e.g. $3,000)
  tier1_increment     INTEGER NOT NULL DEFAULT 500,    -- Increment ($) below tier1_max ($500)
  tier2_increment     INTEGER NOT NULL DEFAULT 250,    -- Increment ($) above tier1_max ($250)
  daily_cutoff_time   TEXT NOT NULL DEFAULT '21:30',   -- 9:30 PM EST
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings if not exists (Unpublished for safe testing)
INSERT INTO public.navratri_aarti_settings (id, is_published, tier1_max, tier1_increment, tier2_increment, daily_cutoff_time)
VALUES ('config', false, 3000, 500, 250, '21:30')
ON CONFLICT (id) DO UPDATE SET
  tier1_max = EXCLUDED.tier1_max;

-- 2. Master 10-Day Festival Aarti Table
CREATE TABLE IF NOT EXISTS public.navratri_aarti_days (
  day_number          INTEGER PRIMARY KEY,             -- 1 to 10
  event_date          DATE NOT NULL,                   -- 2026-10-11 through 2026-10-20
  day_title           TEXT NOT NULL,
  is_maha_aarti       BOOLEAN NOT NULL DEFAULT false,  -- true for Day 8 (Aatham)
  base_bid            INTEGER NOT NULL DEFAULT 500,    -- Minimum opening bid ($500)
  current_highest_bid INTEGER NOT NULL DEFAULT 500,    -- Active highest bid ($)
  current_winner_name TEXT DEFAULT '',                 -- Full name displayed publicly
  current_winner_email TEXT DEFAULT '',                -- Private (admin only)
  current_winner_phone TEXT DEFAULT '',                -- Private (admin only)
  bids_count          INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'closed')),
  cutoff_time         TIMESTAMPTZ NOT NULL,            -- 9:30 PM EST of event_date
  payment_status      TEXT NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending', 'paid', 'waived')),
  payment_collector   TEXT DEFAULT '',                 -- e.g. 'iPad 1', 'iPad 2', 'Front Desk'
  payment_method      TEXT DEFAULT '',                 -- 'cash', 'check', 'card_pos'
  payment_ref         TEXT DEFAULT '',                 -- Check # or Card Last 4
  paid_at             TIMESTAMPTZ,
  admin_notes         TEXT DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_naarti_days_date ON public.navratri_aarti_days(event_date);
CREATE INDEX IF NOT EXISTS idx_naarti_days_status ON public.navratri_aarti_days(status);

-- 3. Individual Bids & OTP Verification Audit Log
CREATE TABLE IF NOT EXISTS public.navratri_aarti_bids (
  id                  BIGSERIAL PRIMARY KEY,
  day_number          INTEGER NOT NULL REFERENCES public.navratri_aarti_days(day_number) ON DELETE CASCADE,
  bidder_name         TEXT NOT NULL,
  bidder_email        TEXT NOT NULL,
  bidder_phone        TEXT NOT NULL,
  bid_amount          INTEGER NOT NULL,
  is_verified         BOOLEAN NOT NULL DEFAULT false,  -- set to true after OTP verification
  otp_code            TEXT NOT NULL,
  otp_expires_at      TIMESTAMPTZ NOT NULL,
  is_highest          BOOLEAN NOT NULL DEFAULT false,  -- marks if this bid was/is the top bid
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_naarti_bids_day ON public.navratri_aarti_bids(day_number);
CREATE INDEX IF NOT EXISTS idx_naarti_bids_verified ON public.navratri_aarti_bids(is_verified);
CREATE INDEX IF NOT EXISTS idx_naarti_bids_email ON public.navratri_aarti_bids(bidder_email);

-- 4. Seed 10 Festival Days (10-11-2026 to 10-20-2026)
INSERT INTO public.navratri_aarti_days 
  (day_number, event_date, day_title, is_maha_aarti, base_bid, current_highest_bid, status, cutoff_time)
VALUES
  (1,  '2026-10-11', 'Day 1 — Ghatasthapana (Prathama)', false, 500, 500, 'open', '2026-10-11T21:30:00-04:00'),
  (2,  '2026-10-12', 'Day 2 — Navratri Dwitiya',          false, 500, 500, 'open', '2026-10-12T21:30:00-04:00'),
  (3,  '2026-10-13', 'Day 3 — Navratri Tritiya',           false, 500, 500, 'open', '2026-10-13T21:30:00-04:00'),
  (4,  '2026-10-14', 'Day 4 — Navratri Chaturthi',         false, 500, 500, 'open', '2026-10-14T21:30:00-04:00'),
  (5,  '2026-10-15', 'Day 5 — Navratri Panchami',          false, 500, 500, 'open', '2026-10-15T21:30:00-04:00'),
  (6,  '2026-10-16', 'Day 6 — Navratri Shashthi',          false, 500, 500, 'open', '2026-10-16T21:30:00-04:00'),
  (7,  '2026-10-17', 'Day 7 — Navratri Saptami',           false, 500, 500, 'open', '2026-10-17T21:30:00-04:00'),
  (8,  '2026-10-18', 'Day 8 — Maha Aarti (Aatham)',        true,  500, 500, 'open', '2026-10-18T21:30:00-04:00'),
  (9,  '2026-10-19', 'Day 9 — Navratri Navami',            false, 500, 500, 'open', '2026-10-19T21:30:00-04:00'),
  (10, '2026-10-20', 'Day 10 — Vijayadashami (Dussehra)',   false, 500, 500, 'open', '2026-10-20T21:30:00-04:00')
ON CONFLICT (day_number) DO UPDATE SET
  day_title = EXCLUDED.day_title,
  is_maha_aarti = EXCLUDED.is_maha_aarti;

-- 5. Row-Level Security (RLS)
ALTER TABLE public.navratri_aarti_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_aarti_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_aarti_bids ENABLE ROW LEVEL SECURITY;

-- Anonymous public can read settings & days
DROP POLICY IF EXISTS "Public can view aarti settings" ON public.navratri_aarti_settings;
CREATE POLICY "Public can view aarti settings"
  ON public.navratri_aarti_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public can view aarti days" ON public.navratri_aarti_days;
CREATE POLICY "Public can view aarti days"
  ON public.navratri_aarti_days FOR SELECT
  USING (true);

-- Service role has full permissions on all tables
DROP POLICY IF EXISTS "Service role full access settings" ON public.navratri_aarti_settings;
CREATE POLICY "Service role full access settings"
  ON public.navratri_aarti_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access days" ON public.navratri_aarti_days;
CREATE POLICY "Service role full access days"
  ON public.navratri_aarti_days FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access bids" ON public.navratri_aarti_bids;
CREATE POLICY "Service role full access bids"
  ON public.navratri_aarti_bids FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
