-- DealShare — claim deal shares on sign-in (multi-user sharing, step 3 of 3)
--
-- Run this ONCE in Supabase → SQL Editor, AFTER 0006 and 0007. Safe to re-run.
--
-- The missing piece of email-addressed sharing: when someone signs in, any
-- share that was addressed to their email BEFORE they had an account (so its
-- to_user_id is still empty) gets stamped with their account id. The app
-- calls this from /auth/confirm after every successful magic-link sign-in —
-- which includes the very first sign-in that creates the account, and every
-- one after it, so shares sent while they were away get claimed next visit.
--
-- Why `security definer`: the caller is the RECIPIENT, but the row belongs to
-- the SHARER — under the RLS policies the recipient may only read it, never
-- write. So this function runs with its owner's rights instead of the
-- caller's. That's safe here because the caller controls nothing about what
-- it does: WHO they are comes from auth.uid() (their verified session), the
-- email comes from their own account record, and the only change possible is
-- writing their own id into shares already addressed to that email.
--
-- `set search_path = ''` + schema-qualified names: standard hygiene for
-- security-definer functions, so no lookalike table elsewhere on the search
-- path can hijack what the privileged function touches.

create or replace function public.claim_deal_shares()
returns integer
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    update public.deal_shares ds
       set to_user_id = auth.uid()
     where ds.to_user_id is null
       and ds.to_email = (
         -- The account's email from the source of truth, lowercased to match
         -- how deal_shares stores addresses.
         select lower(u.email)
         from auth.users u
         where u.id = auth.uid()
       )
    returning ds.id
  )
  select count(*)::integer from claimed;
$$;

-- Signed-in users only — an anonymous visitor has no auth.uid(), so there is
-- nothing this function could ever do for them.
revoke all on function public.claim_deal_shares() from public;
grant execute on function public.claim_deal_shares() to authenticated;
