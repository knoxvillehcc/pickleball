-- ══════════════════════════════════════════════════════════════════════════════
-- HCC EXPENSES & EVENT SETTLEMENT MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Master Expenses Table
CREATE TABLE IF NOT EXISTS public.hcc_expenses (
  id                  BIGSERIAL PRIMARY KEY,
  expense_date        DATE NOT NULL DEFAULT CURRENT_DATE,    -- Stored YYYY-MM-DD, displayed MM-DD-YYYY
  vendor_name         TEXT NOT NULL,                         -- e.g. 'KUB Electric', 'DJ Amit', 'Costco'
  account_code        TEXT NOT NULL,                         -- e.g. '4001', '30008', '30002'
  account_name        TEXT NOT NULL,                         -- e.g. 'Electric', 'Event Entertainment', 'Food & Catering'
  amount              NUMERIC(12, 2) NOT NULL,               -- in dollars
  payment_method      TEXT NOT NULL DEFAULT 'check'          -- 'check', 'card', 'cash', 'reimbursable'
                      CHECK (payment_method IN ('check', 'card', 'cash', 'reimbursable')),
  payment_ref         TEXT DEFAULT '',                       -- e.g. 'Check #1042', 'Card ending 4190', 'Volunteer: Rajesh'
  description         TEXT DEFAULT '',                       -- Memo / Details
  event_tag           TEXT DEFAULT 'general',                -- 'general' for utilities/operations, or 'Navratri 2026', etc.
  analytic_account    TEXT DEFAULT '',                       -- Odoo analytic account name
  status              TEXT NOT NULL DEFAULT 'draft'          -- 'draft', 'posted_odoo', 'adjustment_pending'
                      CHECK (status IN ('draft', 'posted_odoo', 'adjustment_pending')),
  odoo_move_id        INTEGER,                               -- ID of posted entry in Odoo
  odoo_move_name      TEXT DEFAULT '',                       -- e.g. 'MISC/2026/00142'
  posted_to_odoo_at   TIMESTAMPTZ,
  created_by          TEXT DEFAULT 'admin',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hcc_expenses_date ON public.hcc_expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_hcc_expenses_event ON public.hcc_expenses(event_tag);
CREATE INDEX IF NOT EXISTS idx_hcc_expenses_status ON public.hcc_expenses(status);

-- 2. Custom Events Registry Table
CREATE TABLE IF NOT EXISTS public.hcc_custom_events (
  id                  BIGSERIAL PRIMARY KEY,
  event_name          TEXT NOT NULL UNIQUE,                  -- e.g. 'Diwali Mela 2026', 'Holi 2026'
  analytic_name       TEXT NOT NULL,                         -- Name in Odoo Analytic Accounts
  event_type          TEXT NOT NULL DEFAULT 'festival',      -- 'festival', 'sports', 'fundraiser', 'general'
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial events
INSERT INTO public.hcc_custom_events (event_name, analytic_name, event_type)
VALUES
  ('Navratri 2026', 'Navratri 2026', 'festival'),
  ('India Fest 2026', 'India Fest 2026', 'festival'),
  ('Pickleball Tournament 2026', 'Pickleball 2026', 'sports')
ON CONFLICT (event_name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.hcc_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hcc_custom_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on hcc_expenses"
  ON public.hcc_expenses FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access on hcc_custom_events"
  ON public.hcc_custom_events FOR ALL
  USING (true) WITH CHECK (true);
