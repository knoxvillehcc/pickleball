-- ══════════════════════════════════════════════════════════════════════════════
-- HCC Login Activity Logs Table
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hcc_login_activity (
  id          BIGSERIAL    PRIMARY KEY,
  email       TEXT         NOT NULL,
  name        TEXT         NOT NULL,
  status      TEXT         NOT NULL CHECK (status IN ('success', 'failed')),
  reason      TEXT         NOT NULL DEFAULT '',
  ip_address  TEXT         NOT NULL,
  user_agent  TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_login_activity_email ON public.hcc_login_activity(email);
CREATE INDEX IF NOT EXISTS idx_login_activity_status ON public.hcc_login_activity(status);
CREATE INDEX IF NOT EXISTS idx_login_activity_created_at ON public.hcc_login_activity(created_at DESC);

-- Enable RLS (Row Level Security) but DO NOT define public select policies.
-- This ensures only the service_role key (server-side Next.js) can read/write logs.
ALTER TABLE public.hcc_login_activity ENABLE ROW LEVEL SECURITY;

SELECT 'hcc_login_activity table created successfully ✅' AS status;
