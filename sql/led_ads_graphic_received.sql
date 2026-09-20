-- Add graphic_received manual tracking column
ALTER TABLE led_ad_registrations ADD COLUMN IF NOT EXISTS graphic_received BOOLEAN NOT NULL DEFAULT FALSE;
