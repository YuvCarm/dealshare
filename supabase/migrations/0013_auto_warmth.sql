-- DealShare — warmth becomes automatic (the reciprocity ratio)
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run.
--
-- Warmth is now computed by the app from each co-investor's deal-flow ratio
-- (deals they sent you ÷ deals you sent them — see src/app/co-investors/
-- auto-warmth.ts). The `warmth` column keeps only MANUAL OVERRIDES from here
-- on: null means "automatic". This clears every previously hand-set value so
-- the whole rolodex starts on automatic, as decided on 2026-07-16.
--
-- ⚠ Unlike the other migrations this one is NOT safe to re-run casually:
-- running it again later would also wipe any overrides set AFTER the switch.
-- Run it exactly once, when deploying the auto-warmth change.

update co_investors set warmth = null;

comment on column co_investors.warmth is
  'Manual warmth override (1-5); null = computed automatically from deal reciprocity.';
