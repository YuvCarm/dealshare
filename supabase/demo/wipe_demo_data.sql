-- DealShare — remove ALL demo data (and nothing else)
--
-- Run it any time in Supabase: Dashboard → SQL Editor → New query → paste →
-- Run. Safe to re-run; running it with no demo data present simply removes 0
-- rows. To reseed afterwards, run seed_demo_data.sql.
--
-- Why it can't touch your real data: every row the demo seed creates has a
-- hand-picked id starting 'dea1dea1-'. Real rows get random UUIDs, so no real
-- row ever matches that prefix. This script deletes ONLY rows whose id starts
-- with 'dea1dea1-', and only in the five DealShare tables — nothing is
-- updated, no other table is touched, and your account is not involved.
--
-- (Deletion order matters only for tidiness: packet line-items first, then
-- the packets, then the rest — so nothing ever references a missing row.)

do $$
declare
  v_count integer;
  v_total integer := 0;
begin
  delete from public.packet_deals where id::text like 'dea1dea1-%';
  get diagnostics v_count = row_count;  v_total := v_total + v_count;

  delete from public.share_packets where id::text like 'dea1dea1-%';
  get diagnostics v_count = row_count;  v_total := v_total + v_count;

  delete from public.inbound_deals where id::text like 'dea1dea1-%';
  get diagnostics v_count = row_count;  v_total := v_total + v_count;

  delete from public.deals where id::text like 'dea1dea1-%';
  get diagnostics v_count = row_count;  v_total := v_total + v_count;

  delete from public.co_investors where id::text like 'dea1dea1-%';
  get diagnostics v_count = row_count;  v_total := v_total + v_count;

  raise notice 'Removed % demo rows.', v_total;
end $$;

-- A visible confirmation you can read in the results panel: how many demo
-- rows remain in each table. Expected: 0 everywhere.
select 'deals' as table_name,        count(*) as demo_rows_left from deals         where id::text like 'dea1dea1-%'
union all
select 'co_investors',               count(*)                   from co_investors  where id::text like 'dea1dea1-%'
union all
select 'share_packets',              count(*)                   from share_packets where id::text like 'dea1dea1-%'
union all
select 'packet_deals',               count(*)                   from packet_deals  where id::text like 'dea1dea1-%'
union all
select 'inbound_deals',              count(*)                   from inbound_deals where id::text like 'dea1dea1-%';
