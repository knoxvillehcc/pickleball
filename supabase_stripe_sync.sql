-- ══════════════════════════════════════════════════════════════════════════════
-- Stripe Sync Log — Audit Trail & Duplicate Prevention
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

-- Tracks every Stripe charge and payout we process so we:
--   1. Never process the same charge/payout twice (idempotent)
--   2. Have a full audit trail of what was created in Odoo
--   3. Can rollback if something goes wrong

CREATE TABLE IF NOT EXISTS public.stripe_sync_log (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_id               TEXT UNIQUE NOT NULL,            -- charge ID (ch_xxx) or payout ID (po_xxx)
  type                    TEXT NOT NULL                     -- 'charge' or 'payout'
                          CHECK (type IN ('charge', 'payout')),
  amount                  DECIMAL(10,2),                   -- gross charge amount or payout amount
  fee                     DECIMAL(10,2),                   -- Stripe fee for this charge/payout
  net                     DECIMAL(10,2),                   -- net amount (amount - fee)
  currency                TEXT DEFAULT 'usd',
  stripe_created_at       TIMESTAMPTZ,                     -- when Stripe created the charge/payout
  customer_name           TEXT,                             -- Stripe customer name (if available)
  customer_email          TEXT,                             -- Stripe customer email (if available)
  description             TEXT,                             -- Stripe charge description
  payout_id               TEXT,                             -- which payout this charge belongs to
  odoo_statement_line_id  INTEGER,                         -- bank.statement.line ID created in Odoo
  odoo_move_id            INTEGER,                         -- account.move ID (fee journal entry)
  status                  TEXT DEFAULT 'success'           -- 'success', 'error', 'skipped', 'dry_run'
                          CHECK (status IN ('success', 'error', 'skipped', 'dry_run')),
  error_message           TEXT,                            -- error details if status = 'error'
  sync_batch_id           TEXT,                            -- groups entries from the same sync run
  processed_at            TIMESTAMPTZ DEFAULT NOW(),
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stripe_sync_stripe_id   ON public.stripe_sync_log (stripe_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sync_type        ON public.stripe_sync_log (type);
CREATE INDEX IF NOT EXISTS idx_stripe_sync_status      ON public.stripe_sync_log (status);
CREATE INDEX IF NOT EXISTS idx_stripe_sync_batch       ON public.stripe_sync_log (sync_batch_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sync_payout      ON public.stripe_sync_log (payout_id);
CREATE INDEX IF NOT EXISTS idx_stripe_sync_processed   ON public.stripe_sync_log (processed_at DESC);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.stripe_sync_log ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (our API uses service key)
DROP POLICY IF EXISTS "Service role full access" ON public.stripe_sync_log;
CREATE POLICY "Service role full access"
  ON public.stripe_sync_log FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Anon can only read (for dashboard display)
DROP POLICY IF EXISTS "Anon read only" ON public.stripe_sync_log;
CREATE POLICY "Anon read only"
  ON public.stripe_sync_log FOR SELECT
  TO anon
  USING (true);

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT 'stripe_sync_log table created successfully ✅' AS status;
