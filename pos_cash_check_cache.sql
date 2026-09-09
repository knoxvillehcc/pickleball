-- ══════════════════════════════════════════════════════════════════════════════
-- POS Cash/Check Category Cache
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- Caches resolved product category for each POS cash/check payment so we
-- don't need to re-query Odoo every time.

CREATE TABLE IF NOT EXISTS public.pos_cash_check_categories (
  payment_id     INTEGER PRIMARY KEY,                  -- Odoo pos.payment ID
  payment_method TEXT NOT NULL DEFAULT 'Cash',          -- 'Cash' or 'Check'
  category       TEXT NOT NULL DEFAULT 'Uncategorized', -- Resolved product category
  amount         DECIMAL(10,2),                         -- Payment amount
  payment_date   TEXT,                                  -- Date of payment (YYYY-MM-DD)
  payment_time   TEXT,                                  -- Time of payment (HH:MM:SS)
  customer       TEXT,                                  -- Customer name
  order_ref      TEXT,                                  -- POS order reference
  order_id       INTEGER,                               -- Odoo pos.order ID
  resolved_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pccc_date     ON public.pos_cash_check_categories (payment_date);
CREATE INDEX IF NOT EXISTS idx_pccc_method   ON public.pos_cash_check_categories (payment_method);
CREATE INDEX IF NOT EXISTS idx_pccc_category ON public.pos_cash_check_categories (category);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.pos_cash_check_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.pos_cash_check_categories;
CREATE POLICY "Service role full access"
  ON public.pos_cash_check_categories FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon read only" ON public.pos_cash_check_categories;
CREATE POLICY "Anon read only"
  ON public.pos_cash_check_categories FOR SELECT
  TO anon
  USING (true);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'pos_cash_check_categories table created successfully ✅' AS status;
