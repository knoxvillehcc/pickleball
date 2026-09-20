-- ═══════════════════════════════════════════════════════════════════
-- LED Screen Ads Registration Table
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS led_ad_registrations (
  id                    SERIAL PRIMARY KEY,
  registration_number   TEXT NOT NULL UNIQUE,
  business_name         TEXT NOT NULL,
  contact_name          TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  address               TEXT,
  city                  TEXT,
  state                 TEXT,
  zip                   TEXT,
  ad_description        TEXT,
  amount_due            INTEGER NOT NULL DEFAULT 150000,   -- $1500 in cents
  amount_paid           INTEGER NOT NULL DEFAULT 0,
  payment_status        TEXT NOT NULL DEFAULT 'pending',   -- pending, paid, refunded
  stripe_payment_ref    TEXT DEFAULT '',
  disclaimer_accepted   BOOLEAN NOT NULL DEFAULT FALSE,
  registration_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_led_ads_payment_status ON led_ad_registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_led_ads_reg_number ON led_ad_registrations(registration_number);

-- Enable RLS
ALTER TABLE led_ad_registrations ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access on led_ad_registrations"
  ON led_ad_registrations FOR ALL
  USING (true) WITH CHECK (true);
