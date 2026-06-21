-- ══════════════════════════════════════════════════════════════════════════════
-- HCC Pickleball — Migration: Add new columns to registrations table
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS address       TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS zip           TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS player_type   TEXT NOT NULL DEFAULT 'adult'
    CHECK (player_type IN ('adult', 'middle_high_school')),
  ADD COLUMN IF NOT EXISTS team_name     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS player_count  INT  NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS players_data  JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT FALSE;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'registrations'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Migration complete ✅' AS status;
