# Demo data (fictional)

Two copy-paste scripts for the Supabase SQL Editor (Dashboard → SQL Editor →
New query → paste → Run), the same way the migrations are applied:

| Script | What it does |
| --- | --- |
| `seed_demo_data.sql` | Fills your account with a fictional maritime-investing world: 10 deals, 6 co-investors, 7 share packets (one revoked), 7 inbound deals. Re-running it wipes and re-creates the demo rows, so it doubles as a reset. |
| `wipe_demo_data.sql` | Removes every demo row and nothing else. |

## Why it's safe on the live database

- Every demo row is inserted with a hand-picked id starting **`dea1dea1-`**.
  Real rows get random UUIDs, so no real row ever has that prefix. The wipe
  (and the seed's own clean-up step) delete only ids with that prefix.
- The scripts only **insert** new rows — they never update existing data,
  never touch auth/user accounts, and each runs as a single transaction
  (any error rolls everything back).
- All companies, funds, and people are invented. Websites and emails use the
  reserved `example.com` domain; share-packet links use `demo-…` tokens.

## Notes

- The seed looks up your account by the email at the top of the file
  (`v_email`) — edit that line if you log in with a different address.
- Migration `0005_packet_revocation.sql` is optional for the seed: without it
  you just don't get the one revoked example packet (a notice will say so).
