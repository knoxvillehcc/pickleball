-- ══════════════════════════════════════════════════════════════════════════════
-- HCC NAVRATRI EVENT TICKETING — COMPLETE DATABASE MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- 
-- This creates ~20 tables with navratri_ prefix.
-- Safe to run alongside existing HCC tables — no collisions.
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Auto-incrementing order number sequence ──────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS navratri_order_seq START 1;

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. EVENTS — Master event table (Navratri 2026, 2027, etc.)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_events (
  id                        BIGSERIAL PRIMARY KEY,
  name                      TEXT NOT NULL,                          -- 'Navratri 2026'
  slug                      TEXT NOT NULL UNIQUE,                   -- 'navratri-2026'
  status                    TEXT NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft','published','active','completed','archived')),
  membership_year           INT NOT NULL,                           -- 2026
  venue_name                TEXT,
  venue_address             TEXT,
  contact_phone             TEXT,
  contact_email             TEXT,
  default_start_time        TIME DEFAULT '19:00',
  default_end_time          TIME DEFAULT '23:00',
  timezone                  TEXT DEFAULT 'America/New_York',
  hero_image_url            TEXT,
  theme_primary             TEXT DEFAULT '#FF6B35',
  theme_secondary           TEXT DEFAULT '#8B1E3F',
  theme_accent              TEXT DEFAULT '#FFD700',
  terms_text                TEXT,
  terms_version             INT DEFAULT 1,
  refund_policy_text        TEXT,
  refund_cutoff_hours       INT DEFAULT 72,
  daily_sales_open          BOOLEAN DEFAULT false,
  combo_sales_open          BOOLEAN DEFAULT false,
  -- Pricing (all configurable, stored in cents for precision)
  price_general_daily       INT DEFAULT 2000,                      -- $20.00
  price_pioneer_guest_daily INT DEFAULT 2000,                      -- $20.00
  price_nonmember_daily     INT DEFAULT 3000,                      -- $30.00
  price_combo               INT DEFAULT 35000,                     -- $350.00
  -- Entitlement limits
  daily_member_limit        INT DEFAULT 2,
  daily_pioneer_guest_limit INT DEFAULT 2,
  combo_wristband_qty       INT DEFAULT 2,
  pioneer_wristband_qty     INT DEFAULT 2,
  pioneer_parking_qty       INT DEFAULT 1,
  committee_extra_parking   INT DEFAULT 1,
  -- Price lock & session settings
  price_lock_minutes        INT DEFAULT 15,
  stripe_session_minutes    INT DEFAULT 30,
  -- Reminder settings
  reminder_lead_hours       INT DEFAULT 6,
  reminder_channel          TEXT DEFAULT 'both'
                            CHECK (reminder_channel IN ('sms','email','both')),
  -- Odoo settings
  odoo_analytic_account_id  INT,
  odoo_analytic_account_name TEXT,
  -- Clone tracking
  cloned_from_id            BIGINT,
  created_by                BIGINT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. EVENT DATES — Configurable dates per event
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_event_dates (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL REFERENCES public.navratri_events(id) ON DELETE CASCADE,
  event_date                DATE NOT NULL,
  start_time                TIME,
  end_time                  TIME,
  display_order             INT NOT NULL,
  label                     TEXT,                                   -- 'Day 1', 'Day 11 (Special)'
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, event_date)
);

CREATE INDEX IF NOT EXISTS idx_nv_dates_event ON public.navratri_event_dates(event_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. MEMBERS CACHE — Local Odoo member sync for fast lookup
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_members_cache (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL,
  odoo_partner_id           INT NOT NULL,
  membership_type           TEXT NOT NULL CHECK (membership_type IN ('general','pioneer')),
  name                      TEXT NOT NULL,
  phone                     TEXT,
  email                     TEXT,
  is_committee              BOOLEAN DEFAULT false,
  odoo_membership_id        INT,
  synced_at                 TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, odoo_partner_id)
);

CREATE INDEX IF NOT EXISTS idx_nv_members_event ON public.navratri_members_cache(event_id);
CREATE INDEX IF NOT EXISTS idx_nv_members_phone ON public.navratri_members_cache(phone);
CREATE INDEX IF NOT EXISTS idx_nv_members_odoo ON public.navratri_members_cache(odoo_partner_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. MEMBER LINKS — Duplicate Odoo member identity linking
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_member_links (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL,
  primary_odoo_id           INT NOT NULL,
  linked_odoo_id            INT NOT NULL,
  reason                    TEXT NOT NULL,
  linked_by                 BIGINT NOT NULL,
  linked_at                 TIMESTAMPTZ DEFAULT NOW(),
  unlinked_at               TIMESTAMPTZ,
  unlinked_by               BIGINT,
  unlink_reason             TEXT,
  UNIQUE(event_id, primary_odoo_id, linked_odoo_id)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. COMMITTEE MEMBERS — Admin-marked members who get extra parking
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_committee_members (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL,
  odoo_partner_id           INT NOT NULL,
  added_by                  BIGINT NOT NULL,
  added_at                  TIMESTAMPTZ DEFAULT NOW(),
  removed_at                TIMESTAMPTZ,
  removed_by                BIGINT,
  UNIQUE(event_id, odoo_partner_id)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. ENTITLEMENTS — Per-member entitlement ledger
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_entitlements (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL,
  odoo_partner_id           INT NOT NULL,
  membership_type           TEXT NOT NULL CHECK (membership_type IN ('general','pioneer')),
  -- Combo / Pioneer free pass
  combo_purchased           BOOLEAN DEFAULT false,
  combo_order_id            BIGINT,
  pioneer_claimed           BOOLEAN DEFAULT false,
  pioneer_claim_order_id    BIGINT,
  -- Daily tickets: { "date_id": { "purchased": 2, "refunded": 0 } }
  daily_tickets             JSONB DEFAULT '{}'::jsonb,
  -- Parking
  parking_eligible          INT DEFAULT 0,
  parking_picked_up         INT DEFAULT 0,
  -- Manual adjustments log
  manual_adjustments        JSONB DEFAULT '[]'::jsonb,
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, odoo_partner_id)
);

CREATE INDEX IF NOT EXISTS idx_nv_entitlements_event ON public.navratri_entitlements(event_id);
CREATE INDEX IF NOT EXISTS idx_nv_entitlements_odoo ON public.navratri_entitlements(odoo_partner_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. ENTITLEMENT HOLDS — Temporary checkout reservations (30-min)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_entitlement_holds (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL,
  odoo_partner_id           INT,
  hold_type                 TEXT NOT NULL
                            CHECK (hold_type IN ('daily_ticket','combo','pioneer_claim')),
  event_date_id             BIGINT,
  quantity                  INT DEFAULT 1,
  stripe_session_id         TEXT,
  expires_at                TIMESTAMPTZ NOT NULL,
  status                    TEXT DEFAULT 'active'
                            CHECK (status IN ('active','committed','released','expired')),
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_holds_status ON public.navratri_entitlement_holds(status);
CREATE INDEX IF NOT EXISTS idx_nv_holds_expires ON public.navratri_entitlement_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_nv_holds_member ON public.navratri_entitlement_holds(odoo_partner_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. ORDERS — All ticket/pass orders
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_orders (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL,
  order_number              TEXT NOT NULL UNIQUE,                   -- 'NV-2026-000001'
  purchaser_name            TEXT NOT NULL,
  purchaser_email           TEXT NOT NULL,
  purchaser_phone           TEXT NOT NULL,
  customer_type             TEXT NOT NULL
                            CHECK (customer_type IN ('general','pioneer','non_member')),
  odoo_partner_id           INT,
  order_type                TEXT NOT NULL
                            CHECK (order_type IN ('daily','combo','pioneer_claim','manual')),
  -- Payment
  payment_method            TEXT NOT NULL
                            CHECK (payment_method IN ('stripe','cash','check','complimentary')),
  payment_status            TEXT DEFAULT 'pending'
                            CHECK (payment_status IN ('pending','paid','failed','refunded','partial_refund','cancelled')),
  stripe_session_id         TEXT,
  stripe_payment_intent     TEXT,
  stripe_charge_id          TEXT,
  check_number              TEXT,
  total_amount              DECIMAL(10,2) DEFAULT 0,
  stripe_fee                DECIMAL(10,2) DEFAULT 0,
  -- Price lock
  price_locked_at           TIMESTAMPTZ,
  price_lock_prices         JSONB,
  -- Manual issue
  manual_issue              BOOLEAN DEFAULT false,
  manual_ticket_type        TEXT,                                   -- 'complimentary','vip','sponsor','volunteer'
  manual_reason             TEXT,
  manual_issued_by          BIGINT,
  -- Terms
  terms_version             INT,
  terms_accepted_at         TIMESTAMPTZ,
  -- Communication consent
  consent_marketing         BOOLEAN DEFAULT false,
  consent_version           TEXT,
  consent_timestamp         TIMESTAMPTZ,
  -- OTP verification tracking
  verified_phone            TEXT,                                   -- Phone used during OTP verification
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_orders_event ON public.navratri_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_nv_orders_status ON public.navratri_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_nv_orders_phone ON public.navratri_orders(purchaser_phone);
CREATE INDEX IF NOT EXISTS idx_nv_orders_email ON public.navratri_orders(purchaser_email);
CREATE INDEX IF NOT EXISTS idx_nv_orders_stripe ON public.navratri_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_nv_orders_pi ON public.navratri_orders(stripe_payment_intent);
CREATE INDEX IF NOT EXISTS idx_nv_orders_odoo ON public.navratri_orders(odoo_partner_id);
CREATE INDEX IF NOT EXISTS idx_nv_orders_number ON public.navratri_orders(order_number);

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. ORDER ITEMS — Per-date line items within an order
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_order_items (
  id                        BIGSERIAL PRIMARY KEY,
  order_id                  BIGINT NOT NULL REFERENCES public.navratri_orders(id) ON DELETE CASCADE,
  event_date_id             BIGINT REFERENCES public.navratri_event_dates(id),
  ticket_type               TEXT NOT NULL
                            CHECK (ticket_type IN ('daily_member','daily_guest','daily_nonmember','combo','pioneer_free')),
  quantity                  INT NOT NULL,
  unit_price                DECIMAL(10,2) NOT NULL,
  total_price               DECIMAL(10,2) NOT NULL,
  refunded_qty              INT DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_items_order ON public.navratri_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_nv_items_date ON public.navratri_order_items(event_date_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. TICKETS — QR tokens (one per date per order)
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_tickets (
  id                        BIGSERIAL PRIMARY KEY,
  order_id                  BIGINT NOT NULL REFERENCES public.navratri_orders(id) ON DELETE CASCADE,
  order_item_id             BIGINT REFERENCES public.navratri_order_items(id),
  event_date_id             BIGINT,                                -- NULL for combo/pioneer pickup QR
  token                     TEXT NOT NULL UNIQUE,                   -- crypto.randomBytes(32).hex
  token_secret              TEXT NOT NULL,                          -- HMAC secret for rolling QR
  ticket_type               TEXT NOT NULL
                            CHECK (ticket_type IN ('daily_entry','combo_pickup','pioneer_pickup')),
  quantity                  INT NOT NULL,
  status                    TEXT DEFAULT 'inactive'
                            CHECK (status IN ('inactive','active','used','revoked','refunded')),
  checked_in_at             TIMESTAMPTZ,
  checked_in_by             INT,                                   -- employee odoo ID
  checked_in_by_name        TEXT,
  -- Reissue tracking
  previous_token            TEXT,
  reissue_reason            TEXT,
  reissued_by               BIGINT,
  reissued_at               TIMESTAMPTZ,
  -- Delivery tracking
  email_sent                BOOLEAN DEFAULT false,
  sms_sent                  BOOLEAN DEFAULT false,
  email_sent_at             TIMESTAMPTZ,
  sms_sent_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_tickets_token ON public.navratri_tickets(token);
CREATE INDEX IF NOT EXISTS idx_nv_tickets_order ON public.navratri_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_nv_tickets_date ON public.navratri_tickets(event_date_id);
CREATE INDEX IF NOT EXISTS idx_nv_tickets_status ON public.navratri_tickets(status);

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. CHECK-INS — Scanner check-in records
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_checkins (
  id                        BIGSERIAL PRIMARY KEY,
  ticket_id                 BIGINT NOT NULL REFERENCES public.navratri_tickets(id),
  event_date_id             BIGINT NOT NULL,
  employee_odoo_id          INT NOT NULL,
  employee_name             TEXT NOT NULL,
  quantity_checked_in       INT NOT NULL,
  scan_result               TEXT NOT NULL
                            CHECK (scan_result IN ('valid','duplicate','wrong_date','revoked','refunded','invalid','expired_qr')),
  device_info               TEXT,
  ip_address                TEXT,
  checked_in_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_checkins_ticket ON public.navratri_checkins(ticket_id);
CREATE INDEX IF NOT EXISTS idx_nv_checkins_date ON public.navratri_checkins(event_date_id);
CREATE INDEX IF NOT EXISTS idx_nv_checkins_employee ON public.navratri_checkins(employee_odoo_id);
CREATE INDEX IF NOT EXISTS idx_nv_checkins_time ON public.navratri_checkins(checked_in_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. PICKUPS — Wristband and parking pass pickup records
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_pickups (
  id                        BIGSERIAL PRIMARY KEY,
  order_id                  BIGINT REFERENCES public.navratri_orders(id),
  odoo_partner_id           INT,
  event_id                  BIGINT NOT NULL,
  pickup_type               TEXT NOT NULL
                            CHECK (pickup_type IN ('combo_wristband','pioneer_wristband','parking_pass')),
  wristband_qty             INT DEFAULT 0,
  parking_qty               INT DEFAULT 0,
  parking_pass_numbers      TEXT[],                                -- ['P-101', 'P-102']
  employee_odoo_id          INT NOT NULL,
  employee_name             TEXT NOT NULL,
  notes                     TEXT,
  picked_up_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_pickups_order ON public.navratri_pickups(order_id);
CREATE INDEX IF NOT EXISTS idx_nv_pickups_member ON public.navratri_pickups(odoo_partner_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. WRISTBAND INVENTORY — Physical wristband stock tracking
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_wristband_inventory (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL UNIQUE,
  starting_qty              INT NOT NULL DEFAULT 0,
  issued_qty                INT NOT NULL DEFAULT 0,
  manual_adjustment         INT NOT NULL DEFAULT 0,
  adjustment_reason         TEXT,
  adjusted_by               BIGINT,
  adjusted_at               TIMESTAMPTZ,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 14. REFUNDS — Refund records linked to Stripe
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_refunds (
  id                        BIGSERIAL PRIMARY KEY,
  order_id                  BIGINT NOT NULL REFERENCES public.navratri_orders(id),
  order_item_id             BIGINT REFERENCES public.navratri_order_items(id),
  refund_qty                INT NOT NULL,
  refund_amount             DECIMAL(10,2) NOT NULL,
  stripe_refund_id          TEXT,
  reason                    TEXT NOT NULL,
  is_override               BOOLEAN DEFAULT false,
  override_reason           TEXT,
  refunded_by               BIGINT NOT NULL,
  refunded_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_refunds_order ON public.navratri_refunds(order_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 15. DAILY CLOSE — Accounting close records
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_daily_close (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL,
  close_date                DATE NOT NULL,
  status                    TEXT DEFAULT 'open'
                            CHECK (status IN ('open','closed','draft_created','posted','reopened')),
  -- Totals
  order_count               INT,
  ticket_quantity           INT,
  stripe_gross              DECIMAL(10,2),
  stripe_fees               DECIMAL(10,2),
  stripe_net                DECIMAL(10,2),
  cash_total                DECIMAL(10,2),
  check_total               DECIMAL(10,2),
  refund_total              DECIMAL(10,2),
  manual_paid_total         DECIMAL(10,2),
  complimentary_count       INT,
  -- Pending
  pending_stripe            JSONB DEFAULT '[]'::jsonb,
  -- Odoo references
  odoo_draft_move_id        INT,
  odoo_posted_move_id       INT,
  -- Users
  closed_by                 BIGINT,
  closed_at                 TIMESTAMPTZ,
  posted_by                 BIGINT,
  posted_at                 TIMESTAMPTZ,
  reopened_by               BIGINT,
  reopened_at               TIMESTAMPTZ,
  reopen_reason             TEXT,
  -- Full reconciliation snapshot
  reconciliation_data       JSONB,
  UNIQUE(event_id, close_date)
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 16. OTP SESSIONS — Twilio OTP verification
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_otp_sessions (
  id                        BIGSERIAL PRIMARY KEY,
  phone                     TEXT NOT NULL,
  otp_hash                  TEXT NOT NULL,                         -- bcrypt hashed OTP
  attempts                  INT DEFAULT 0,
  max_attempts              INT DEFAULT 5,
  verified                  BOOLEAN DEFAULT false,
  ip_address                TEXT,
  expires_at                TIMESTAMPTZ NOT NULL,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_otp_phone ON public.navratri_otp_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_nv_otp_expires ON public.navratri_otp_sessions(expires_at);

-- ══════════════════════════════════════════════════════════════════════════════
-- 17. SCANNER SESSIONS — Employee PIN auth for scanner/pickup
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_scanner_sessions (
  id                        BIGSERIAL PRIMARY KEY,
  employee_odoo_id          INT NOT NULL,
  employee_name             TEXT NOT NULL,
  event_id                  BIGINT NOT NULL,
  session_type              TEXT NOT NULL
                            CHECK (session_type IN ('scanner','pickup')),
  token                     TEXT NOT NULL UNIQUE,
  last_activity             TIMESTAMPTZ DEFAULT NOW(),
  expires_at                TIMESTAMPTZ NOT NULL,
  ip_address                TEXT,
  device_info               TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_scanner_token ON public.navratri_scanner_sessions(token);

-- ══════════════════════════════════════════════════════════════════════════════
-- 18. COMMUNICATIONS — Announcement/reminder/resend log
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_communications (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL,
  type                      TEXT NOT NULL
                            CHECK (type IN ('reminder','announcement','resend','ticket_delivery')),
  channel                   TEXT NOT NULL
                            CHECK (channel IN ('sms','email','both')),
  target_filter             JSONB,
  subject                   TEXT,
  message_body              TEXT,
  recipient_count           INT,
  success_count             INT DEFAULT 0,
  failure_count             INT DEFAULT 0,
  sent_by                   BIGINT NOT NULL,
  sent_at                   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 19. AUDIT LOG — Immutable-style application audit trail
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_audit_log (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT,
  action                    TEXT NOT NULL,
  entity_type               TEXT,                                  -- 'order','ticket','member','entitlement', etc.
  entity_id                 BIGINT,
  user_id                   BIGINT,
  user_email                TEXT,
  employee_odoo_id          INT,
  old_value                 JSONB,
  new_value                 JSONB,
  reason                    TEXT,
  ip_address                TEXT,
  device_info               TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_audit_event ON public.navratri_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_nv_audit_action ON public.navratri_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_nv_audit_entity ON public.navratri_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_nv_audit_user ON public.navratri_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_nv_audit_time ON public.navratri_audit_log(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════════════
-- 20. SETTINGS HISTORY — Versioned settings changes
-- ══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.navratri_settings_history (
  id                        BIGSERIAL PRIMARY KEY,
  event_id                  BIGINT NOT NULL,
  setting_key               TEXT NOT NULL,
  old_value                 TEXT,
  new_value                 TEXT,
  changed_by                BIGINT NOT NULL,
  changed_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nv_settings_event ON public.navratri_settings_history(event_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY — All tables
-- ══════════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.navratri_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_event_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_members_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_member_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_entitlement_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_pickups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_wristband_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_daily_close ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_otp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_scanner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navratri_settings_history ENABLE ROW LEVEL SECURITY;

-- Service role: full access on all tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'navratri_events','navratri_event_dates','navratri_members_cache',
    'navratri_member_links','navratri_committee_members','navratri_entitlements',
    'navratri_entitlement_holds','navratri_orders','navratri_order_items',
    'navratri_tickets','navratri_checkins','navratri_pickups',
    'navratri_wristband_inventory','navratri_refunds','navratri_daily_close',
    'navratri_otp_sessions','navratri_scanner_sessions','navratri_communications',
    'navratri_audit_log','navratri_settings_history'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_full_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "service_full_%s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- Anon read: events, event_dates, tickets (for public page + ticket viewer)
CREATE POLICY "anon_read_events" ON public.navratri_events FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_dates" ON public.navratri_event_dates FOR SELECT TO anon USING (true);
-- Anon can read their own tickets by token (via PostgREST filter)
CREATE POLICY "anon_read_tickets" ON public.navratri_tickets FOR SELECT TO anon USING (true);
-- Anon can read orders by order_number (for confirmation page)
CREATE POLICY "anon_read_orders" ON public.navratri_orders FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_items" ON public.navratri_order_items FOR SELECT TO anon USING (true);

-- ══════════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGERS
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.navratri_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'navratri_events','navratri_entitlements','navratri_orders','navratri_wristband_inventory'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', tbl);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.navratri_update_timestamp()', tbl);
  END LOOP;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- ORDER NUMBER GENERATOR RPC
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_next_navratri_order_number(event_year INT DEFAULT 2026)
RETURNS TEXT AS $$
DECLARE
  next_val INT;
BEGIN
  next_val := nextval('public.navratri_order_seq');
  RETURN 'NV-' || event_year::TEXT || '-' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- EXPIRED HOLD CLEANUP RPC
-- Call periodically to release expired entitlement holds
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cleanup_expired_navratri_holds()
RETURNS INT AS $$
DECLARE
  count INT;
BEGIN
  UPDATE public.navratri_entitlement_holds
  SET status = 'expired'
  WHERE status = 'active' AND expires_at < NOW();
  GET DIAGNOSTICS count = ROW_COUNT;
  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════════════════════════════════════════
-- SEED: Navratri 2026 Event
-- ══════════════════════════════════════════════════════════════════════════════
INSERT INTO public.navratri_events (
  name, slug, status, membership_year,
  venue_name, venue_address, contact_email,
  default_start_time, default_end_time
) VALUES (
  'Navratri 2026', 'navratri-2026', 'draft', 2026,
  'Hindu Community Center Knoxville',
  '8580 Hickory Creek Rd, Lenoir City, TN',
  'knoxvillehcc@gmail.com',
  '19:00', '23:00'
) ON CONFLICT (slug) DO NOTHING;

-- Seed the 11 event dates
INSERT INTO public.navratri_event_dates (event_id, event_date, display_order, label, start_time, end_time)
SELECT e.id, d.event_date, d.display_order, d.label, '19:00'::TIME, '23:00'::TIME
FROM public.navratri_events e,
(VALUES
  ('2026-10-11'::DATE, 1,  'Day 1'),
  ('2026-10-12'::DATE, 2,  'Day 2'),
  ('2026-10-13'::DATE, 3,  'Day 3'),
  ('2026-10-14'::DATE, 4,  'Day 4'),
  ('2026-10-15'::DATE, 5,  'Day 5'),
  ('2026-10-16'::DATE, 6,  'Day 6'),
  ('2026-10-17'::DATE, 7,  'Day 7'),
  ('2026-10-18'::DATE, 8,  'Day 8'),
  ('2026-10-19'::DATE, 9,  'Day 9'),
  ('2026-10-20'::DATE, 10, 'Day 10'),
  ('2026-10-25'::DATE, 11, 'Day 11 — Special')
) AS d(event_date, display_order, label)
WHERE e.slug = 'navratri-2026'
ON CONFLICT (event_id, event_date) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- VERIFY
-- ══════════════════════════════════════════════════════════════════════════════
SELECT 'Navratri migration complete ✅ — ' || 
  (SELECT count(*) FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name LIKE 'navratri_%') 
  || ' tables created' AS status;
