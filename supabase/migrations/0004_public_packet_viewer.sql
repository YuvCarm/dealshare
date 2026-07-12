-- DealShare — public packet viewer (share packets step)
--
-- ⚠ SUPERSEDED by 0005: migration 0005 replaces the function below with a
-- version that also skips revoked packets. Never run this file AFTER 0005 —
-- doing so would silently make revoked links work again. If you ever do,
-- simply re-run 0005 afterwards to restore the right version.
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. Safe to re-run (create OR REPLACE — but see the warning above).
--
-- Why: the /p/<token> page must work for people who are NOT logged in. Our
-- Row-Level Security rules (rightly) hide everything from anonymous visitors,
-- and we are NOT loosening them. Instead, this creates one narrow, controlled
-- door: a database function that takes a link token and returns that packet's
-- contents — with each deal already trimmed down to ONLY the fields you ticked
-- when creating the packet. The trimming happens inside the database, so an
-- unticked field never even leaves Postgres.
--
--   • `security definer`  = the function runs with the table owner's rights
--     (that's what lets it read past RLS) — so its body must stay this narrow.
--   • `set search_path = ''` = standard hardening for security definer
--     functions; forces every table reference to be spelled out in full.
--   • The only way in is knowing the exact 43-character token. There is no
--     way to list packets, enumerate tokens, or ask for extra fields.

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
  where sp.link_token = p_token;
$$;

-- Functions are callable by everyone by default; make the grant explicit and
-- deliberate: anonymous visitors (anon) and logged-in users (authenticated).
revoke all on function public.packet_by_token(text) from public;
grant execute on function public.packet_by_token(text) to anon, authenticated;
