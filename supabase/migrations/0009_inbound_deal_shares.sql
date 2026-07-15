-- DealShare — recipient read-path for in-app shares
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. Safe to re-run (create OR REPLACE).
--
-- The problem this solves
-- -----------------------
-- deal_shares (migrations 0006-0008) let one person share a deal with another,
-- addressed by email. The RECIPIENT can already read the share ROW (its RLS
-- policy grants that) — but a share row only says "deal X, showing fields
-- A,B,C". The actual deal data lives in the `deals` table, and the deals table
-- is locked to its OWNER by Row-Level Security. So a recipient can see that a
-- deal was shared, but not a single field of it. That's the gap.
--
-- Why a function instead of loosening RLS
-- ---------------------------------------
-- We do NOT want to give recipients blanket SELECT on `deals` — that would
-- leak every column of every shared deal, including the fields the sharer
-- deliberately left OUT of `included_fields`. Instead this creates one narrow,
-- controlled door:
--
--   • `security definer` = the function runs with its OWNER's rights, so it can
--     read past RLS on `deals`. Because it can see everything, its body must
--     stay this tight — it never returns a deal it wasn't asked to, and it
--     never returns a field outside that share's `included_fields`.
--   • `set search_path = ''` = standard hardening for security-definer
--     functions; every table name is spelled out in full (public.…, auth.…) so
--     no lookalike table on someone's search path can hijack it.
--
-- What it returns
-- ---------------
-- A JSON array of the ACTIVE shares addressed to the CALLER (the logged-in
-- recipient), newest first. Each element carries:
--   • share_id        — so the app can act on one share (e.g. add to pipeline)
--   • created_at      — when it was shared
--   • from_email      — who shared it (used to group by co-investor in the UI)
--   • included_fields — the field keys the sharer chose (for the "N of M" line)
--   • deal            — the deal row TRIMMED to exactly those fields, and
--                       nothing else. This trimming happens inside Postgres, so
--                       an unshared column never leaves the database.
--
-- "Addressed to the caller" is the SAME test the recipient RLS policy uses
-- (migration 0007): an active share whose to_user_id is the caller, OR whose
-- to_user_id is still empty and whose to_email matches the verified email in
-- the caller's login token. Magic-link sign-in proves that inbox is theirs, so
-- matching on email is safe.

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
        -- Who shared it. The sharer's email from the source of truth,
        -- lowercased so the app can match it against the recipient's rolodex.
        'from_email', (
          select lower(u.email)
          from auth.users u
          where u.id = ds.from_user_id
        ),
        'included_fields', ds.included_fields,
        -- The deal, reduced to exactly its included_fields. to_jsonb(d) is the
        -- whole deal row as JSON; we keep only the ticked keys. An unticked
        -- field is dropped here, inside Postgres — it never reaches the app.
        'deal', (
          select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
          from public.deals d
          cross join lateral jsonb_each(to_jsonb(d)) e
          where d.id = ds.deal_id
            and e.key = any (ds.included_fields)
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

-- Signed-in users only. An anonymous visitor has no auth.uid() and no email in
-- a login token, so this function could never return anything for them anyway —
-- but we lock it down explicitly. `anon` is revoked BY NAME because Supabase's
-- default privileges grant every new function to anon directly, and revoking
-- from `public` alone would leave that direct grant standing.
revoke all on function public.inbound_deal_shares() from public, anon;
grant execute on function public.inbound_deal_shares() to authenticated;
