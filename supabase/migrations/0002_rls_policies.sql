-- DealShare — Row-Level Security policies (Step 4)
--
-- Run this ONCE in Supabase → SQL Editor. Safe to re-run.
--
-- In Step 3 we turned RLS ON, which locked every table completely. These
-- policies add the one exception we want:
--
--     "A logged-in user may read or write a row ONLY if that row's user_id
--      equals their own account id (auth.uid())."
--
-- The database checks this on EVERY query, so a user can only ever see and
-- change their own data — even though everyone shares the same public API key.
--
-- `for all`      = the rule covers select, insert, update, and delete.
-- `to authenticated` = only signed-in users; anonymous visitors still get nothing.
-- `using (...)`      = which existing rows you're allowed to see/change/delete.
-- `with check (...)` = what you're allowed to create/update (stops you writing
--                      a row owned by someone else).

-- deals
drop policy if exists "Owner full access to deals" on deals;
create policy "Owner full access to deals"
  on deals for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- co_investors
drop policy if exists "Owner full access to co_investors" on co_investors;
create policy "Owner full access to co_investors"
  on co_investors for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- share_packets
drop policy if exists "Owner full access to share_packets" on share_packets;
create policy "Owner full access to share_packets"
  on share_packets for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- packet_deals
drop policy if exists "Owner full access to packet_deals" on packet_deals;
create policy "Owner full access to packet_deals"
  on packet_deals for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- inbound_deals
drop policy if exists "Owner full access to inbound_deals" on inbound_deals;
create policy "Owner full access to inbound_deals"
  on inbound_deals for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
