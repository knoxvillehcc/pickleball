-- ══════════════════════════════════════════════════════════════════════════════
-- HCC Pickleball Settings Table
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pickleball_settings (
  id         BIGSERIAL    PRIMARY KEY,
  key        TEXT         NOT NULL UNIQUE,
  value      TEXT         NOT NULL DEFAULT 'false',
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Default: registration page is closed (not published)
INSERT INTO public.pickleball_settings (key, value)
VALUES ('is_published', 'false')
ON CONFLICT (key) DO NOTHING;

-- RLS: allow anon read (so registration page can check)
ALTER TABLE public.pickleball_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read settings" ON public.pickleball_settings;
CREATE POLICY "Allow anon read settings"
  ON public.pickleball_settings FOR SELECT USING (true);

-- Allow anon insert/update (for the admin dashboard publish toggle)
DROP POLICY IF EXISTS "Allow anon upsert settings" ON public.pickleball_settings;
CREATE POLICY "Allow anon upsert settings"
  ON public.pickleball_settings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update settings" ON public.pickleball_settings;
CREATE POLICY "Allow anon update settings"
  ON public.pickleball_settings FOR UPDATE USING (true);

-- Verify
SELECT * FROM public.pickleball_settings;
SELECT 'pickleball_settings table created ✅' AS status;
