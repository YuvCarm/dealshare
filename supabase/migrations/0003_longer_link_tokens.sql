-- DealShare — longer share-link tokens (share packets step)
--
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste → Run. Safe to re-run.
--
-- Why: share_packets.link_token was a UUID (36 characters, 122 random bits).
-- The link is the ONLY thing protecting a packet, so the app now generates a
-- longer 256-bit random token (43 URL-safe characters). This changes the
-- column to plain text so it can hold that format. Any existing UUID tokens
-- are kept as-is (they simply become text), so old links keep working.
--
-- The app supplies the token when it creates a packet, so the database-side
-- default is no longer needed.

alter table share_packets alter column link_token drop default;
alter table share_packets alter column link_token type text using link_token::text;
