-- DealShare — let the RECIPIENT hide an in-app share
--
-- Run this ONCE in Supabase → SQL Editor, AFTER 0009–0011. Safe to re-run.
--
-- The gap this closes
-- -------------------
-- Any DealShare account that knows your email can share a deal to it, and the
-- share appears on your /inbound page automatically — with clickable links.
-- Until now the RECIPIENT had no way to make it go away: deal_shares is
-- deliberately read-only for recipients (migration 0007), so only the SHARER
-- can revoke. That's the right rule for the share row itself — it's the
-- sharer's record — but it left the recipient unable to dismiss something
-- they never asked for.
--
-- The shape of the fix
-- --------------------
-- We don't touch the share row at all. Instead the recipient gets their own
-- tiny table of preferences ABOUT shares: one row here means "don't show me
-- this share again". The sharer never sees it, isn't notified, and their
-- share stays exactly as it was — active, revocable, theirs. Hiding is
-- one-sided and private, like archiving an email.
--
-- The filter lives inside inbound_deal_shares(), the one door recipients read
-- shares through — so a hidden share never even leaves Postgres. Un-hiding
-- needs no new machinery later: the policy below already lets a recipient
-- delete their own preference row.

-- ---------------------------------------------------------------------------
-- 1. The preference table. One row = one share hidden by one recipient.
-- ---------------------------------------------------------------------------
create table if not exists recipient_share_prefs (
  -- Who hid it. Always the recipient's own account id — the policy below
  -- refuses anything else.
  recipient_user_id uuid not null default auth.uid()
                    references auth.users (id) on delete cascade,

  -- Which share. If the sharer deletes the share, the preference row goes
  -- with it — and a brand-new re-share (new row, new id) starts UNhidden,
  -- which is right: a fresh share is a fresh decision to show it to you.
  share_id          uuid not null references deal_shares (id) on delete cascade,

  -- When it was hidden. Purely informational today, but it means a future
  -- "recently hidden" or undo surface costs nothing.
  hidden_at         timestamptz not null default now(),

  -- One preference row per (person, share) — hiding twice is a no-op, not
  -- a duplicate.
  primary key (recipient_user_id, share_id)
);

-- The sharer deleting a share triggers a lookup by share_id here (the cascade
-- above); give that lookup an index so it never has to scan the table.
create index if not exists recipient_share_prefs_share_id
  on recipient_share_prefs (share_id);

alter table recipient_share_prefs enable row level security;

-- The one policy: you manage YOUR OWN preference rows, and nothing else.
--
-- In plain language:
--   "You may see, create, and delete a hide-preference if — and only if — it
--    is stamped with your own account id. And when creating one, the share it
--    points at must be a share addressed to YOU."
--
-- The `exists` in `with check` is the same addressed-to-you test used by the
-- recipient policies in 0007 and 0009: your account id is on the share, or
-- the share is still unclaimed and its email is the verified email you log in
-- with. And because that subquery runs under deal_shares' own RLS, a share
-- you can't currently SEE (revoked, or someone else's) can't be hidden either
-- — you can only hide what is actually in front of you. A hidden share that
-- is later claimed (0008 stamps to_user_id) stays hidden: the preference row
-- is keyed by your account id, which claiming doesn't change.
drop policy if exists "Recipient manages own share prefs" on recipient_share_prefs;
create policy "Recipient manages own share prefs"
  on recipient_share_prefs for all
  to authenticated
  using (auth.uid() = recipient_user_id)
  with check (
    auth.uid() = recipient_user_id
    and exists (
      select 1
      from deal_shares ds
      where ds.id = share_id
        and (
          ds.to_user_id = auth.uid()
          or (
            ds.to_user_id is null
            and ds.to_email = lower(auth.jwt() ->> 'email')
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. inbound_deal_shares — same function as 0011 (allowlist intersection
--    INCLUDED), plus one new condition: shares you hid are left out entirely.
--    See 0009 for the full commentary on how this function works.
--
--    As with 0011: if you ever re-run 0009 or 0011, re-run THIS file
--    afterwards, or hidden shares quietly reappear (and for 0009, the
--    allowlist hardening disappears too). The latest version of this
--    function now lives HERE.
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
    )
    -- The hide filter: skip any share the CALLER has a preference row for.
    -- Filtering here — inside the security-definer function — means a hidden
    -- share never reaches the app at all; there is no client-side "hidden"
    -- flag to forget to check.
    and not exists (
      select 1
      from public.recipient_share_prefs p
      where p.recipient_user_id = auth.uid()
        and p.share_id = ds.id
    );
$$;

revoke all on function public.inbound_deal_shares() from public, anon;
grant execute on function public.inbound_deal_shares() to authenticated;
