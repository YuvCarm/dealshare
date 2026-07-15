-- DealShare — where each deal came from (the `source` field)
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. Safe to re-run.
--
-- Adds one column to `deals` so every deal knows how it entered your pipeline,
-- which is what the tabs on /deals sort by. Exactly three buckets, so every
-- deal falls under exactly one tab:
--
--   • sourced_by_me         — you added it yourself on /deals.
--   • promoted_from_inbound  — you copied it in from an inbound deal (a deal a
--                              co-investor shared with you, in-app or verbally).
--   • other                  — anything that doesn't fit the two above. Nothing
--                              lands here today; it's a home for future ways a
--                              deal might arrive (e.g. a bulk import).

-- The fixed set of allowed values. Wrapped so re-running doesn't error.
do $$ begin
  create type deal_source as enum ('sourced_by_me', 'promoted_from_inbound', 'other');
exception when duplicate_object then null; end $$;

-- The column. `not null default 'sourced_by_me'` means every EXISTING row is
-- immediately stamped 'sourced_by_me' (the safe assumption: it was already in
-- your pipeline, so you put it there), and every NEW deal added through the
-- add-deal form gets that same default without the app having to set it.
alter table deals
  add column if not exists source deal_source not null default 'sourced_by_me';

-- Backfill the exception: deals you PROMOTED from an inbound deal. The
-- "Add to my pipeline" action stamps a "Source: shared by …" line into the
-- notes, so that marker is how we recognise them after the fact. We only touch
-- rows still sitting at the default, so re-running never disturbs a deal whose
-- source was set deliberately later.
update deals
  set source = 'promoted_from_inbound'
  where source = 'sourced_by_me'
    and notes like '%Source: shared by%';
