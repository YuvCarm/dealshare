-- DealShare — deal_shares table (multi-user sharing, step 1 of 3)
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. Safe to re-run.
--
-- What this does: creates `deal_shares`. One row means "I shared this one
-- deal with this one person, showing exactly these fields". Unlike a share
-- packet (an anonymous link anyone holding it can open), a deal share is
-- addressed to a person and follows them into their own DealShare account.
--
-- Why the recipient is an EMAIL rather than a co_investors row or account id:
--   • Your co_investors rows are your private rolodex. Their ids mean nothing
--     inside the recipient's account, and you can edit or delete them freely —
--     a share must not break when you tidy your contacts.
--   • The recipient may not have a DealShare account yet. You can't store an
--     account id that doesn't exist — but their email already identifies them
--     today, and it's the same email they'll later sign in with.
--   • So: `to_email` is the durable address of the share, and `to_user_id`
--     starts empty. Once an account with that email signs in, step 3 of 3
--     (migration 0008) fills `to_user_id` in and the share is permanently
--     attached to the account.

-- A share is either live or pulled back — same idea as packet revocation,
-- but as a two-value status so each row reads plainly.
do $$ begin
  create type share_status as enum ('active', 'revoked');
exception
  when duplicate_object then null;
end $$;

create table if not exists deal_shares (
  id            uuid primary key default gen_random_uuid(),

  -- The deal being shared. If the deal is deleted, its shares go with it.
  deal_id       uuid not null references deals (id) on delete cascade,

  -- Who shared it (the sharer/owner side of the row).
  from_user_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,

  -- Who it's for. Always stored lowercase so "Jane@Acme.VC" and
  -- "jane@acme.vc" can never become two different recipients — the database
  -- refuses uppercase outright rather than trusting every app code path.
  to_email      text not null
                constraint deal_shares_to_email_is_lowercase
                check (to_email = lower(to_email)),

  -- Filled in once an account with that email exists (migration 0008).
  -- If that account is ever deleted, the share falls back to being
  -- addressed by email only — it isn't lost.
  to_user_id    uuid references auth.users (id) on delete set null,

  -- Which deal fields the recipient gets to see — same field keys as
  -- share packets (src/app/packets/fields.ts is the single source of truth).
  included_fields text[] not null default '{}',

  status        share_status not null default 'active',
  created_at    timestamptz not null default now()
);

-- One LIVE share per deal per person. Revoked rows stay behind as history and
-- don't count — you can always share the same deal with the same person again
-- after revoking. (A "unique index ... where" only enforces itself on rows
-- matching the where-clause; that's what makes the revoked copies exempt.)
create unique index if not exists deal_shares_one_active_per_person
  on deal_shares (deal_id, to_email)
  where status = 'active';

-- Lock the table down completely. With RLS on and no policies yet, nobody —
-- not even the sharer — can touch it through the app's API key. Step 2 of 3
-- (migration 0007) adds the two carefully-scoped exceptions.
alter table deal_shares enable row level security;
