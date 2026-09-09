-- Run this in Supabase SQL Editor to create the report cache table
-- Dashboard → SQL Editor → New Query → Paste & Run

CREATE TABLE IF NOT EXISTS report_cache (
  cache_key TEXT PRIMARY KEY,
  report_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but allow service key access
ALTER TABLE report_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service key access" ON report_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant access
GRANT ALL ON report_cache TO anon;
GRANT ALL ON report_cache TO authenticated;
