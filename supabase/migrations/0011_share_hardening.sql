-- DealShare — share-reading hardening + one-promotion-per-share
--
-- Run this ONCE in Supabase → SQL Editor, AFTER 0009 and 0010. Safe to re-run.
--
-- Three fixes that came out of an adversarial review of the recipient-side
-- sharing work:
--
-- 1. A DATABASE-side allowlist of shareable field keys.
--    The app validates included_fields when a share is created through the UI,
--    but nothing stopped a hand-crafted API request from inserting a share
--    whose included_fields named INTERNAL columns ('founder_consent',
--    'user_id', 'id', …). The reading functions would then have obediently
--    served those columns to the recipient. Only the sharer could do this, and
--    only for their own deals — so nothing private could leak from anyone
--    else — but fields.ts is explicit that founder_consent must NEVER reach a
--    co-investor, and a rule the app depends on belongs in the database, where
--    no client can route around it. (Same philosophy as 0007's ownership
--    check: close the hole before any future code inherits the lie.)
--
-- 2. Both reading functions now intersect with that allowlist.
--    inbound_deal_shares() (0009) and packet_by_token() (0005) each gain one
--    condition: a key must be in included_fields AND in the allowlist to be
--    returned. Everything else about them is unchanged.
--
-- 3. One promotion per share, remembered by the database.
--    "Add to my pipeline" used to rely on the button's in-page success state
--    to prevent double-adds — which forgets on every reload, so the same share
--    could be promoted into duplicate deals day after day. Now each promoted
--    deal records WHICH share it came from, a unique index refuses a second
--    promotion of the same share, and /inbound can show "already added" even
--    after a reload.

-- ---------------------------------------------------------------------------
-- 1. The allowlist. This is the SQL twin of SHAREABLE_FIELDS in
--    src/app/packets/fields.ts — if a field is ever added there, add it here
--    too (and re-run this file). `immutable` tells Postgres the result never
--    changes, so it can evaluate it once per query, not once per row.
-- ---------------------------------------------------------------------------
create or replace function public.shareable_field_keys()
returns text[]
language sql
immutable
as $$
  select array[
    'company_name','one_liner','website','sector','geography',
    'company_stage','round_size','round_status','round_type','lead_investor',
    'valuation_or_cap','committed_so_far','your_fund_status','kpis',
    'deck_url','notes'
  ];
$$;

-- ---------------------------------------------------------------------------
-- 2a. inbound_deal_shares — same function as 0009, plus the allowlist
--     intersection on e.key. See 0009 for the full commentary; only the
--     one condition is new.
-- ---------------------------------------------------------------------------
create or replace function public.inbound_deal_shares()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'share_id', ds.id,
        'created_at', ds.created_at,
        'from_email', (
          select lower(u.email)
          from auth.users u
          where u.id = ds.from_user_id
        ),
        'included_fields', ds.included_fields,
        'deal', (
          select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
          from public.deals d
          cross join lateral jsonb_each(to_jsonb(d)) e
          where d.id = ds.deal_id
            and e.key = any (ds.included_fields)
            -- The database's own last word on what is shareable: a key that
            -- isn't on the allowlist never leaves, no matter what a forged
            -- share row asked for.
            and e.key = any (public.shareable_field_keys())
        )
      )
      order by ds.created_at desc
    ),
    '[]'::jsonb
  )
  from public.deal_shares ds
  where ds.status = 'active'
    and (
      ds.to_user_id = auth.uid()
      or (
        ds.to_user_id is null
        and ds.to_email = lower(auth.jwt() ->> 'email')
      )
    );
$$;

revoke all on function public.inbound_deal_shares() from public, anon;
grant execute on function public.inbound_deal_shares() to authenticated;

-- ---------------------------------------------------------------------------
-- 2b. packet_by_token — same function as 0005 (revocation check INCLUDED),
--     plus the same allowlist intersection. As with 0005: if you ever re-run
--     0004 or 0005, re-run THIS file afterwards, or the hardening (and for
--     0004, the revocation check) silently disappears.
-- ---------------------------------------------------------------------------
create or replace function public.packet_by_token(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'created_at', sp.created_at,

    'co_investor', (
      select jsonb_build_object('name', ci.name, 'fund_name', ci.fund_name)
      from public.co_investors ci
      where ci.id = sp.co_investor_id
    ),

    'deals', (
      select coalesce(jsonb_agg(f.deal_json order by pd.created_at), '[]'::jsonb)
      from public.packet_deals pd
      join public.deals d on d.id = pd.deal_id
      cross join lateral (
        select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) as deal_json
        from jsonb_each(to_jsonb(d)) e
        where e.key = any (pd.included_fields)
          and e.key = any (public.shareable_field_keys())
      ) f
      where pd.packet_id = sp.id
    )
  )
  from public.share_packets sp
  where sp.link_token = p_token
    and sp.revoked_at is null;
$$;

revoke all on function public.packet_by_token(text) from public;
grant execute on function public.packet_by_token(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Remember which share a promoted deal came from.
--    Nullable: deals you add yourself simply leave it empty. If the share row
--    is ever deleted, the deal stays and the link just clears (set null) —
--    which also means the share could be promoted again, matching how
--    "the sharer deleted and re-shared" should behave.
-- ---------------------------------------------------------------------------
alter table deals
  add column if not exists promoted_from_share_id uuid
    references deal_shares (id) on delete set null;

-- One promotion of a given share PER USER. Scoped to (user_id, share) rather
-- than the share alone so nobody else's row — however it was created — can
-- ever block the real recipient from promoting theirs.
create unique index if not exists deals_one_promotion_per_share
  on deals (user_id, promoted_from_share_id)
  where promoted_from_share_id is not null;
