-- DealShare — deal_shares security policies (multi-user sharing, step 2 of 3)
--
-- Run this ONCE in Supabase → SQL Editor, AFTER 0006. Safe to re-run.
--
-- Migration 0006 turned RLS on with no policies, so deal_shares is currently
-- sealed shut. These two policies open exactly two doors:
--
--   1. The SHARER: full control over shares they created — and they can only
--      ever share deals they actually own.
--   2. The RECIPIENT: read-only, active shares only, addressed to them only.
--
-- When a row matches several policies, Postgres ORs them together: you see a
-- row if ANY policy lets you. So the sharer sees all their shares (active and
-- revoked), while a recipient's view is filtered to active ones — and someone
-- who is both (you shared a deal to your own email) simply gets both views.

-- Policy 1 — the sharer.
--
-- In plain language:
--   "You may see, create, change, and delete a share if — and only if — its
--    from_user_id is your own account id. And when creating or changing one,
--    the deal it points at must be a deal YOU own."
--
-- `using` guards rows you look at or touch; `with check` guards rows you
-- write. The extra `exists` in `with check` closes a subtle hole: without it,
-- a hand-crafted request could insert a share row pointing at SOMEONE ELSE'S
-- deal id. That row wouldn't leak any data today, but a future read-path that
-- trusts deal_shares would inherit the lie — cheaper to make it impossible now.
drop policy if exists "Sharer full access to deal_shares" on deal_shares;
create policy "Sharer full access to deal_shares"
  on deal_shares for all
  to authenticated
  using (auth.uid() = from_user_id)
  with check (
    auth.uid() = from_user_id
    and exists (
      select 1
      from deals d
      where d.id = deal_id
        and d.user_id = auth.uid()
    )
  );

-- Policy 2 — the recipient.
--
-- In plain language:
--   "A signed-in user may READ a share if it's still active, and it's
--    addressed to them — either their account id was already filled in, or
--    the share is still unclaimed and its email matches the verified email
--    they log in with."
--
-- Notes on each condition:
--   • `for select` — recipients can look, never touch. Only the sharer can
--     revoke, re-share, or delete.
--   • `status = 'active'` — revoking hides the share from the recipient at
--     the very next query. No cleanup job needed; the row just stops matching.
--   • `to_user_id = auth.uid()` — the claimed case (after migration 0008 has
--     attached the share to their account).
--   • the `or` branch — the not-yet-claimed case. auth.jwt() ->> 'email' is
--     the email inside their login token. DealShare signs people in by magic
--     link, so holding a session for jane@acme.vc PROVES that inbox is really
--     theirs — that proof is what makes email-matching safe to trust here.
--     We require `to_user_id is null` so this branch quietly retires once
--     the share is claimed.
drop policy if exists "Recipient read access to active deal_shares" on deal_shares;
create policy "Recipient read access to active deal_shares"
  on deal_shares for select
  to authenticated
  using (
    status = 'active'
    and (
      to_user_id = auth.uid()
      or (
        to_user_id is null
        and to_email = lower(auth.jwt() ->> 'email')
      )
    )
  );
