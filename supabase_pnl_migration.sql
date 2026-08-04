-- ─────────────────────────────────────────────────────────────────────────────
-- HCC P&L Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. P&L Settings (key/value store for report defaults)
CREATE TABLE IF NOT EXISTS hcc_pnl_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hcc_pnl_settings ENABLE ROW LEVEL SECURITY;

-- Service-role only (all access via backend)
CREATE POLICY "service_role_all_pnl_settings" ON hcc_pnl_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Insert default settings
INSERT INTO hcc_pnl_settings (key, value) VALUES
  ('default_date_range',      '"this_month"'),
  ('default_basis',           '"accrual"'),
  ('default_comparison_mode', 'false'),
  ('show_zero_categories',    'false'),
  ('show_taxes',              'true'),
  ('cost_method',             '"standard_price"'),
  ('historical_cost_fallback','true'),
  ('cache_duration_minutes',  '30'),
  ('timezone',                '"America/New_York"'),
  ('report_currency',         '"USD"')
ON CONFLICT (key) DO NOTHING;


-- 2. P&L Audit Log
CREATE TABLE IF NOT EXISTS hcc_pnl_audit_log (
  id               BIGSERIAL PRIMARY KEY,
  user_id          TEXT,
  user_email       TEXT,
  user_name        TEXT,
  action           TEXT NOT NULL,
  date_range_start DATE,
  date_range_end   DATE,
  filters          JSONB,
  export_type      TEXT,          -- 'excel' | 'csv' | 'pdf' | null
  file_name        TEXT,
  detail_level     TEXT,          -- 'summary' | 'category' | 'product' | 'full'
  accounting_basis TEXT,          -- 'accrual' | 'cash'
  ip_address       TEXT,
  session_info     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hcc_pnl_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_pnl_audit" ON hcc_pnl_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_pnl_audit_user_email ON hcc_pnl_audit_log (user_email);
CREATE INDEX IF NOT EXISTS idx_pnl_audit_action     ON hcc_pnl_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_pnl_audit_created_at ON hcc_pnl_audit_log (created_at DESC);
