-- HCC Membership snapshot + sync log
-- Run once in Supabase SQL editor. Server uses the service key (bypasses RLS);
-- RLS is enabled with NO policies and no anon/authenticated grants => not publicly readable.

create table if not exists public.hcc_membership_snapshot (
  history_id            bigint primary key,
  partner_id            bigint,
  partner_name          text,
  level                 text,
  level_id              bigint,
  status                text,
  start_date            date,
  end_date              date,
  order_name            text,
  order_state           text,
  invoice_name          text,
  invoice_payment_state text,
  invoice_state         text,
  pos_order_name        text,
  amount                numeric(12,2) default 0,
  counts_toward_revenue boolean default false,
  refunded              boolean default false,
  odoo_updated_at       timestamptz,
  is_current            boolean default false,
  history               jsonb default '[]'::jsonb,
  sync_run_id           text,
  synced_at             timestamptz default now()
);

create index if not exists hcc_membership_snapshot_current_idx
  on public.hcc_membership_snapshot (is_current);
create index if not exists hcc_membership_snapshot_partner_idx
  on public.hcc_membership_snapshot (partner_id);

create table if not exists public.hcc_sync_log (
  key            text primary key,
  last_synced_at timestamptz,
  synced_by      text,
  record_count   integer,
  active_count   integer,
  meta           jsonb default '{}'::jsonb
);

alter table public.hcc_membership_snapshot enable row level security;
alter table public.hcc_sync_log enable row level security;
revoke all on public.hcc_membership_snapshot from anon, authenticated;
revoke all on public.hcc_sync_log from anon, authenticated;

-- Member phone number (added later; safe to re-run)
alter table public.hcc_membership_snapshot add column if not exists phone text;
