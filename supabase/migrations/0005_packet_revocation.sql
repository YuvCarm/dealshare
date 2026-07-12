-- DealShare — packet revocation (relationship ledger step)
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. Safe to re-run.
--
-- Adds an on/off switch to every share packet:
--   • share_packets.revoked_at — empty (null) means the link works; a
--     timestamp means "revoked at that moment".
--   • packet_by_token now skips revoked packets, so a revoked link shows the
--     same friendly "this link isn't working" page as a wrong token — the
--     recipient can't tell the difference, and nothing leaks.
--
-- This REPLACES the function from migration 0004; the only change to it is
-- the `and sp.revoked_at is null` condition near the bottom. If you ever
-- re-run 0004 for any reason, re-run THIS file afterwards — otherwise the
-- revocation check silently disappears and revoked links work again.

alter table share_packets add column if not exists revoked_at timestamptz;

create or replace function public.packet_by_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'created_at', sp.created_at,

    -- Who the packet was prepared for (shown as a greeting on the page).
    'co_investor', (
      select jsonb_build_object('name', ci.name, 'fund_name', ci.fund_name)
      from public.co_investors ci
      where ci.id = sp.co_investor_id
    ),

    -- The deals — each one reduced to exactly its included_fields.
    'deals', (
      select coalesce(jsonb_agg(f.deal_json order by pd.created_at), '[]'::jsonb)
      from public.packet_deals pd
      join public.deals d on d.id = pd.deal_id
      cross join lateral (
        -- to_jsonb(d) is the whole deal row as JSON; keep only ticked keys.
        select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) as deal_json
        from jsonb_each(to_jsonb(d)) e
        where e.key = any (pd.included_fields)
      ) f
      where pd.packet_id = sp.id
    )
  )
  from public.share_packets sp
  where sp.link_token = p_token
    and sp.revoked_at is null;
$$;

-- Same explicit grants as migration 0004 (repeated so this file stands alone).
revoke all on function public.packet_by_token(text) from public;
grant execute on function public.packet_by_token(text) to anon, authenticated;
