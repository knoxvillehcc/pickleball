-- ═══════════════════════════════════════════════════════════════════
-- LED Screen Ads — Offline Payment & Manual Registration Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.led_ad_registrations 
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS check_number TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_notes TEXT DEFAULT '';

-- Add index on payment_method for quick filtering
CREATE INDEX IF NOT EXISTS idx_led_ads_payment_method ON public.led_ad_registrations(payment_method);

COMMENT ON COLUMN public.led_ad_registrations.payment_method IS 'stripe, cash, check, zelle, card';
COMMENT ON COLUMN public.led_ad_registrations.check_number IS 'Bank check number or offline transaction reference';
COMMENT ON COLUMN public.led_ad_registrations.payment_notes IS 'Internal admin notes on payment collection';
