-- ═══════════════════════════════════════════════════════════════════
-- LED Ads: Add upload_token and media_url columns
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE led_ad_registrations ADD COLUMN IF NOT EXISTS upload_token TEXT UNIQUE;
ALTER TABLE led_ad_registrations ADD COLUMN IF NOT EXISTS media_url TEXT DEFAULT '';
ALTER TABLE led_ad_registrations ADD COLUMN IF NOT EXISTS media_filename TEXT DEFAULT '';
ALTER TABLE led_ad_registrations ADD COLUMN IF NOT EXISTS media_uploaded_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════
-- Create Supabase Storage bucket for LED ad media
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('led-ads', 'led-ads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read (so admin can view/download)
CREATE POLICY "Public read for led-ads bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'led-ads');

-- Allow service role to upload
CREATE POLICY "Service upload for led-ads bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'led-ads');

-- Allow service role to delete
CREATE POLICY "Service delete for led-ads bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'led-ads');
