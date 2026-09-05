-- ══════════════════════════════════════════════════════════════════════════════
-- Stripe Deposit Breakdown — Charge Category Cache
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- Caches the resolved product category for each Stripe charge so we don't
-- need to re-query Odoo POS every time.

CREATE TABLE IF NOT EXISTS public.stripe_charge_categories (
  charge_id    TEXT PRIMARY KEY,                  -- Stripe charge ID (ch_xxx)
  payout_id    TEXT,                              -- Stripe payout ID (po_xxx)
  category     TEXT NOT NULL DEFAULT 'Unmatched', -- Resolved category name
  source       TEXT DEFAULT 'unmatched'           -- 'pos', 'checkout', 'unmatched'
                CHECK (source IN ('pos', 'checkout', 'unmatched')),
  amount       DECIMAL(10,2),                     -- Charge gross amount
  fee          DECIMAL(10,2),                     -- Stripe processing fee
  net          DECIMAL(10,2),                     -- Net amount (amount - fee)
  charge_date  DATE,                              -- Date of the charge
  customer     TEXT,                              -- Customer name (if available)
  pos_order    TEXT,                              -- Odoo POS order ref (if POS)
  resolved_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scc_payout    ON public.stripe_charge_categories (payout_id);
CREATE INDEX IF NOT EXISTS idx_scc_category  ON public.stripe_charge_categories (category);
CREATE INDEX IF NOT EXISTS idx_scc_date      ON public.stripe_charge_categories (charge_date);
CREATE INDEX IF NOT EXISTS idx_scc_source    ON public.stripe_charge_categories (source);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.stripe_charge_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.stripe_charge_categories;
CREATE POLICY "Service role full access"
  ON public.stripe_charge_categories FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon read only" ON public.stripe_charge_categories;
CREATE POLICY "Anon read only"
  ON public.stripe_charge_categories FOR SELECT
  TO anon
  USING (true);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'stripe_charge_categories table created successfully ✅' AS status;
