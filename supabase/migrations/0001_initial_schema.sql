-- DealShare — initial database schema (Step 3)
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. It is safe to re-run (it uses "if not exists" guards).
--
-- What this does:
--   • Creates the five tables from the plan.
--   • Every table gets: id, user_id (the owner), created_at.
--   • Turns ON Row-Level Security (RLS) so the tables are LOCKED by default.
--     The rules that let you read/write your OWN rows are added in Step 4.

-- ---------------------------------------------------------------------------
-- 1. Enum types (fixed sets of allowed values)
--    Wrapped so re-running doesn't error if the type already exists.
-- ---------------------------------------------------------------------------
do $$ begin
  create type company_stage as enum ('pre-seed', 'seed', 'A', 'B+');
exception when duplicate_object then null; end $$;

do $$ begin
  create type round_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type round_type as enum ('priced_equity', 'safe', 'convertible_note', 'bridge');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fund_status as enum ('evaluating', 'investing', 'passed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type inbound_status as enum ('interested', 'passed', 'meeting_booked');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. deals — the companies / rounds you are tracking
-- ---------------------------------------------------------------------------
create table if not exists deals (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),

  company_name  text not null,
  one_liner     text,
  website       text,

  sector        text,
  geography     text,
  company_stage company_stage,

  round_size        numeric,  -- USD
  valuation_or_cap  numeric,  -- USD
  committed_so_far  numeric,  -- USD

  round_status   round_status,
  round_type     round_type,
  lead_investor  text,

  your_fund_status fund_status,
  founder_consent  boolean not null default false,

  kpis      text,
  deck_url  text,
  notes     text
);

-- ---------------------------------------------------------------------------
-- 3. co_investors — the funds/people you might share deals with
-- ---------------------------------------------------------------------------
create table if not exists co_investors (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),

  name       text not null,
  fund_name  text,
  email      text,

  thesis_stages      text[],  -- lists, e.g. {'seed','A'}
  thesis_sectors     text[],
  thesis_geographies text[],

  check_size_min  numeric,  -- USD
  check_size_max  numeric,  -- USD

  warmth  smallint check (warmth between 1 and 5),
  notes   text
);

-- ---------------------------------------------------------------------------
-- 4. share_packets — a shareable bundle prepared for one co-investor
-- ---------------------------------------------------------------------------
create table if not exists share_packets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),

  co_investor_id uuid references co_investors (id) on delete cascade,
  -- the secret token that goes in the shareable link
  link_token     uuid not null unique default gen_random_uuid()
);

-- ---------------------------------------------------------------------------
-- 5. packet_deals — which deals are in a packet, and which fields to reveal
-- ---------------------------------------------------------------------------
create table if not exists packet_deals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),

  packet_id       uuid not null references share_packets (id) on delete cascade,
  deal_id         uuid not null references deals (id) on delete cascade,
  included_fields text[] not null default '{}',  -- deal field names to share

  unique (packet_id, deal_id)
);

-- ---------------------------------------------------------------------------
-- 6. inbound_deals — deals co-investors send back to you
-- ---------------------------------------------------------------------------
create table if not exists inbound_deals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now(),

  company_name   text not null,
  co_investor_id uuid references co_investors (id) on delete set null,
  status         inbound_status not null default 'interested',
  notes          text
);

-- ---------------------------------------------------------------------------
-- 7. Lock every table with Row-Level Security.
--    With RLS on and no policies yet, NOBODY can read/write via the API —
--    a safe default. Step 4 adds the "owner can access their own rows" rules.
-- ---------------------------------------------------------------------------
alter table deals         enable row level security;
alter table co_investors  enable row level security;
alter table share_packets enable row level security;
alter table packet_deals  enable row level security;
alter table inbound_deals enable row level security;
