-- DealShare — DEMO DATA seed (100% fictional, safe to run on your live project)
--
-- Run it any time in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Running it again later is fine: it first removes its own previous demo rows,
-- then inserts a fresh copy (so it doubles as a "reset demo data" button).
-- To remove the demo data completely, run wipe_demo_data.sql instead.
--
-- What you get:
--   • 10 fictional maritime/logistics startups in your deal pipeline
--   •  6 fictional co-investors with theses, check sizes, and varied warmth
--   •  7 share packets you've "sent" (one revoked), 11 packet line-items
--   •  7 inbound deals they've "shared back", with mixed statuses
--   → so the Deals, Co-investors, Packets, and Inbound pages — and the
--     reciprocity numbers on each co-investor profile — all look lived-in.
--
-- Why it can't touch your real data:
--   • Every demo row is created with a hand-picked id starting 'dea1dea1-'.
--     Real rows get random UUIDs, so no real row ever matches that prefix.
--     The clean-up step deletes ONLY ids with that prefix, in these 5 tables.
--   • Everything else is INSERTs of brand-new rows. No existing row is
--     updated. Your account, auth settings, and RLS policies are not touched.
--     The one thing it reads is your own user id (so the rows belong to you).
--   • The whole script is a single transaction: if anything fails, the
--     database is left exactly as it was.
--   • Every company, fund, and person is invented; websites and emails use
--     the reserved example.com domain; share links use 'demo-…' tokens.
--
-- Needs: migrations 0001–0004 already applied (they are, on your project).
-- Migration 0005 (revocation) is optional — without it you just don't get
-- the one revoked packet, and the script tells you so in a notice.

do $$
declare
  -- ⚠ The one line you might edit: the email you log in to DealShare with.
  --   The demo rows are created under this account.
  v_email constant text := 'yc.carmeli@gmail.com';

  v_user uuid;
  v_has_revoked_at boolean;

  -- ---- fixed demo ids (the 'dea1dea1-' prefix is what makes wipe safe) ----
  -- co-investors
  c_maya   constant uuid := 'dea1dea1-0002-4000-a000-000000000001'; -- Spindrift Capital
  c_dev    constant uuid := 'dea1dea1-0002-4000-a000-000000000002'; -- Ninefathom Ventures
  c_sofia  constant uuid := 'dea1dea1-0002-4000-a000-000000000003'; -- Cabotage Capital
  c_tomas  constant uuid := 'dea1dea1-0002-4000-a000-000000000004'; -- Drydock Ventures
  c_priya  constant uuid := 'dea1dea1-0002-4000-a000-000000000005'; -- Longmile Growth
  c_anders constant uuid := 'dea1dea1-0002-4000-a000-000000000006'; -- Counterswell Capital

  -- deals
  c_quaymark   constant uuid := 'dea1dea1-0001-4000-a000-000000000001';
  c_ballastiq  constant uuid := 'dea1dea1-0001-4000-a000-000000000002';
  c_reeferline constant uuid := 'dea1dea1-0001-4000-a000-000000000003';
  c_tidelane   constant uuid := 'dea1dea1-0001-4000-a000-000000000004';
  c_cranebird  constant uuid := 'dea1dea1-0001-4000-a000-000000000005';
  c_fathomware constant uuid := 'dea1dea1-0001-4000-a000-000000000006';
  c_laycan     constant uuid := 'dea1dea1-0001-4000-a000-000000000007';
  c_bunkerlane constant uuid := 'dea1dea1-0001-4000-a000-000000000008';
  c_draymatic  constant uuid := 'dea1dea1-0001-4000-a000-000000000009';
  c_skiff      constant uuid := 'dea1dea1-0001-4000-a000-000000000010';

  -- share packets
  c_packet1 constant uuid := 'dea1dea1-0003-4000-a000-000000000001'; -- → Maya (old, revoked)
  c_packet2 constant uuid := 'dea1dea1-0003-4000-a000-000000000002'; -- → Maya
  c_packet3 constant uuid := 'dea1dea1-0003-4000-a000-000000000003'; -- → Maya (newest)
  c_packet4 constant uuid := 'dea1dea1-0003-4000-a000-000000000004'; -- → Dev
  c_packet5 constant uuid := 'dea1dea1-0003-4000-a000-000000000005'; -- → Dev
  c_packet6 constant uuid := 'dea1dea1-0003-4000-a000-000000000006'; -- → Tomas
  c_packet7 constant uuid := 'dea1dea1-0003-4000-a000-000000000007'; -- → Priya

  -- The field set a packet shares by default in the app (the "defaultOn"
  -- fields from src/app/packets/fields.ts). Some packets add private fields
  -- on top, exactly like ticking extra boxes in the New Packet form.
  c_basic constant text[] := array[
    'company_name','one_liner','website','sector','geography',
    'company_stage','round_size','round_status','round_type','lead_investor'
  ];
begin
  -- ------------------------------------------------------------------
  -- 0. Safety checks
  -- ------------------------------------------------------------------
  if to_regclass('public.deals') is null then
    raise exception 'DealShare tables not found — run migrations 0001 and 0002 first.';
  end if;

  select id into v_user from auth.users where lower(email) = lower(v_email);
  if v_user is null then
    raise exception 'No user with email % — edit v_email at the top of this file to the email you log in with.', v_email;
  end if;

  -- ------------------------------------------------------------------
  -- 1. Remove any previous demo rows (same statements as wipe_demo_data.sql).
  --    Only ids starting 'dea1dea1-' — your real rows can never match.
  -- ------------------------------------------------------------------
  delete from public.packet_deals  where id::text like 'dea1dea1-%';
  delete from public.share_packets where id::text like 'dea1dea1-%';
  delete from public.inbound_deals where id::text like 'dea1dea1-%';
  delete from public.deals         where id::text like 'dea1dea1-%';
  delete from public.co_investors  where id::text like 'dea1dea1-%';

  -- ------------------------------------------------------------------
  -- 2. Co-investors — six fictional funds, warmth from 5 (close) to 1 (cold).
  -- ------------------------------------------------------------------
  insert into public.co_investors
    (id, user_id, created_at, name, fund_name, email,
     thesis_stages, thesis_sectors, thesis_geographies,
     check_size_min, check_size_max, warmth, notes)
  values
    (c_maya, v_user, now() - interval '120 days',
     'Maya Lindqvist', 'Spindrift Capital', 'maya@spindriftcap.example.com',
     array['seed','A'], array['Port operations','Terminal automation','Maritime software'], array['Europe','US'],
     500000, 1500000, 5,
     'Closest maritime relationship — co-invested twice. Prefers ops-heavy founding teams. Led Cranebird''s seed.'),

    (c_dev, v_user, now() - interval '110 days',
     'Dev Okonkwo', 'Ninefathom Ventures', 'dev@ninefathom.example.com',
     array['seed','A'], array['Ocean data','Vessel monitoring','Voyage optimization'], array['Global'],
     1000000, 3000000, 4,
     'Deep technical diligence, strong on anything with sensors on it. Led Tidelane''s seed.'),

    (c_sofia, v_user, now() - interval '95 days',
     'Sofia Marchetti', 'Cabotage Capital', 'sofia@cabotagecap.example.com',
     array['A','B+'], array['Freight fintech','Marketplaces'], array['Europe','MENA'],
     2000000, 5000000, 3,
     'Later-stage, razor sharp on unit economics. Sends us a lot — we owe her a good one. Led Laycan Labs'' A.'),

    (c_tomas, v_user, now() - interval '70 days',
     'Tomas Keller', 'Drydock Ventures', 'tomas@drydockvc.example.com',
     array['pre-seed','seed'], array['Marine robotics','Maritime hardware'], array['Europe'],
     250000, 750000, 2,
     'Met at a shipping-tech conference; hardware-first thesis. Relationship still new.'),

    (c_priya, v_user, now() - interval '65 days',
     'Priya Raghavan', 'Longmile Growth', 'priya@longmilegrowth.example.com',
     array['B+'], array['Logistics software','Drayage','Supply chain'], array['US'],
     5000000, 15000000, 3,
     'Growth-stage; useful later-round perspective on our A-stage companies. Led Draymatic''s B.'),

    (c_anders, v_user, now() - interval '20 days',
     'Anders Voss', 'Counterswell Capital', 'anders@counterswell.example.com',
     array['pre-seed','seed'], array['Maritime compliance','Marine insurance'], array['Nordics'],
     300000, 1000000, 1,
     'One intro call so far. Thesis-adjacent but no shared history yet.');

  -- ------------------------------------------------------------------
  -- 3. Deals — ten fictional startups across stages and statuses.
  --    (Fathomware has founder_consent = false, so it stays out of packets.)
  -- ------------------------------------------------------------------
  insert into public.deals
    (id, user_id, created_at, company_name, one_liner, website, sector, geography,
     company_stage, round_size, valuation_or_cap, committed_so_far,
     round_status, round_type, lead_investor, your_fund_status, founder_consent,
     kpis, deck_url, notes)
  values
    (c_quaymark, v_user, now() - interval '88 days',
     'Quaymark', 'Berth scheduling and port-call optimization for mid-size container terminals.',
     'https://quaymark.example.com', 'Port operations software', 'Rotterdam, NL',
     'seed', 3500000, 16000000, 2100000,
     'open', 'priced_equity', 'Meridian Harbor Ventures', 'evaluating', true,
     '12 terminals live · $410K ARR · +9% berth utilization in pilots',
     'https://decks.example.com/quaymark-seed.pdf',
     'Intro via the port authority innovation day. Strong ops team, GTM still thin.'),

    (c_ballastiq, v_user, now() - interval '84 days',
     'Ballastiq', 'Ballast-water compliance monitoring that files its own paperwork.',
     'https://ballastiq.example.com', 'Maritime compliance', 'Singapore',
     'pre-seed', 1200000, 8000000, 400000,
     'open', 'safe', null, 'evaluating', true,
     '3 fleet pilots · 41 vessels instrumented · $180K in signed LOIs',
     'https://decks.example.com/ballastiq-preseed.pdf', null),

    (c_reeferline, v_user, now() - interval '60 days',
     'Reeferline', 'Door-to-door cold-chain telemetry for reefer containers.',
     'https://reeferline.example.com', 'Cold chain IoT', 'Copenhagen, DK',
     'A', 9000000, 42000000, 6500000,
     'open', 'priced_equity', 'Northwake Capital', 'investing', true,
     '$1.8M ARR · 24K containers monitored · 130% net revenue retention',
     'https://decks.example.com/reeferline-a.pdf',
     'Likely our largest check this year if reference calls hold up.'),

    (c_tidelane, v_user, now() - interval '58 days',
     'Tidelane', 'Voyage optimization that trades fuel burn against port congestion in real time.',
     'https://tidelane.example.com', 'Voyage optimization', 'Athens, GR',
     'seed', 4000000, 20000000, 1000000,
     'open', 'safe', 'Ninefathom Ventures', 'evaluating', true,
     '6 fleets live · 7.2% average fuel savings · $320K ARR',
     'https://decks.example.com/tidelane-seed.pdf', null),

    (c_cranebird, v_user, now() - interval '100 days',
     'Cranebird', 'Computer vision that keeps ship-to-shore cranes moving and dockworkers safe.',
     'https://cranebird.example.com', 'Terminal automation', 'Long Beach, US',
     'seed', 2800000, 14000000, 2800000,
     'closed', 'safe', 'Spindrift Capital', 'passed', true,
     '4 terminals · 31% fewer near-misses · 18% faster crane cycles',
     'https://decks.example.com/cranebird-seed.pdf',
     'We passed at seed — the round moved fast. Stay close for the A.'),

    (c_fathomware, v_user, now() - interval '34 days',
     'Fathomware', 'Hull-stress digital twins for aging bulk carriers.',
     'https://fathomware.example.com', 'Vessel monitoring', 'Oslo, NO',
     'pre-seed', 900000, 6000000, 250000,
     'open', 'convertible_note', null, 'evaluating', false,
     '2 paid pilots with dry-bulk operators · sensors on 11 vessels',
     null, 'Waiting on founder consent before this goes in any packet.'),

    (c_laycan, v_user, now() - interval '52 days',
     'Laycan Labs', 'Turns statement-of-facts PDFs into settled demurrage claims.',
     'https://laycanlabs.example.com', 'Freight fintech', 'London, UK',
     'A', 7500000, 36000000, 5200000,
     'open', 'priced_equity', 'Cabotage Capital', 'investing', true,
     '$2.1M ARR · $38M claims processed · 92% straight-through settlement',
     'https://decks.example.com/laycanlabs-a.pdf', null),

    (c_bunkerlane, v_user, now() - interval '44 days',
     'Bunkerlane', 'Verified marketplace and escrow for low-sulfur bunker fuel.',
     'https://bunkerlane.example.com', 'Marine fuel marketplace', 'Dubai, AE',
     'seed', 5000000, 25000000, 3700000,
     'open', 'safe', 'Meridian Harbor Ventures', 'evaluating', true,
     '$14M annualized GMV · 96 vessels fueled · 1.4% take rate',
     'https://decks.example.com/bunkerlane-seed.pdf', null),

    (c_draymatic, v_user, now() - interval '66 days',
     'Draymatic', 'Dispatch and chassis-pool orchestration for drayage fleets.',
     'https://draymatic.example.com', 'Drayage software', 'Newark, US',
     'B+', 18000000, 90000000, 12000000,
     'open', 'priced_equity', 'Longmile Growth', 'passed', true,
     '$6.4M ARR · 210 fleets · 1.9M container moves per year',
     'https://decks.example.com/draymatic-b.pdf',
     'Passed — stage past our sweet spot; tracking for a later co-invest.'),

    (c_skiff, v_user, now() - interval '14 days',
     'Skiff Systems', 'Autonomous survey skiffs for harbor depth and infrastructure inspection.',
     'https://skiffsystems.example.com', 'Marine robotics', 'Hamburg, DE',
     'pre-seed', 1500000, 9000000, null,
     'open', 'safe', null, 'evaluating', true,
     '2 harbor authorities piloting · 40 km² surveyed autonomously',
     null, 'Fresh in the pipeline — first partner call booked.');

  -- ------------------------------------------------------------------
  -- 4. Share packets — what you've "sent". Tokens are hardcoded (stable
  --    across reseeds) and prefixed demo- so a demo link is recognizable.
  --    The reciprocity story this builds:
  --      Maya  ← 3 packets (6 deals)   Dev ← 2 packets (3 deals)
  --      Tomas ← 1 packet  (1 deal)    Priya ← 1 packet (1 deal)
  --      Sofia & Anders ← nothing sent (Sofia mostly sends to US)
  -- ------------------------------------------------------------------
  insert into public.share_packets (id, user_id, created_at, co_investor_id, link_token)
  values
    (c_packet1, v_user, now() - interval '82 days', c_maya,  'demo-spindrift-a7Kq2mXw9RtB4nLc8vYhJ3sF'),
    (c_packet2, v_user, now() - interval '45 days', c_maya,  'demo-spindrift-e5Tn8bQj2WxM6kPr4dZgV9cH'),
    (c_packet3, v_user, now() - interval '12 days', c_maya,  'demo-spindrift-u3Fs6hNd8LqK2jRw7mXbT4vY'),
    (c_packet4, v_user, now() - interval '51 days', c_dev,   'demo-ninefathom-p9Vc4kMt7BnQ2xWj5rLdF8sG'),
    (c_packet5, v_user, now() - interval '9 days',  c_dev,   'demo-ninefathom-y6Hb3wRq8TkN5mPc2vXzJ7dL'),
    (c_packet6, v_user, now() - interval '8 days',  c_tomas, 'demo-drydock-r4Jm7cVx2NqW9bKt5hYsD8fP'),
    (c_packet7, v_user, now() - interval '21 days', c_priya, 'demo-longmile-k8Sw5nTb3MvJ7qXc4rZhG2dN');

  -- Mark the oldest packet to Maya as revoked (superseded by fresher ones) —
  -- but only if migration 0005 has run; otherwise the column doesn't exist.
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'share_packets'
      and column_name = 'revoked_at'
  ) into v_has_revoked_at;

  if v_has_revoked_at then
    update public.share_packets
      set revoked_at = created_at + interval '3 days'
      where id = c_packet1;  -- a demo row created moments ago, never a real one
  else
    raise notice 'Migration 0005 not applied yet — skipping the revoked example packet (everything else seeded normally).';
  end if;

  -- ------------------------------------------------------------------
  -- 5. Packet line-items — which deals each packet shares, and which fields.
  --    created_at trails its packet by minutes, like rows saved in one go.
  -- ------------------------------------------------------------------
  insert into public.packet_deals (id, user_id, created_at, packet_id, deal_id, included_fields)
  values
    -- packet 1 → Maya (the later-revoked one): two early deals, basics only
    ('dea1dea1-0004-4000-a000-000000000001', v_user, now() - interval '82 days' + interval '1 minute', c_packet1, c_quaymark,   c_basic),
    ('dea1dea1-0004-4000-a000-000000000002', v_user, now() - interval '82 days' + interval '2 minutes', c_packet1, c_ballastiq, c_basic),
    -- packet 2 → Maya: Reeferline with the private fields opened up (deep trust)
    ('dea1dea1-0004-4000-a000-000000000003', v_user, now() - interval '45 days' + interval '1 minute', c_packet2, c_reeferline, c_basic || array['valuation_or_cap','committed_so_far','kpis']),
    -- packet 3 → Maya: three current deals, KPIs included for Tidelane
    ('dea1dea1-0004-4000-a000-000000000004', v_user, now() - interval '12 days' + interval '1 minute', c_packet3, c_tidelane,   c_basic || array['kpis']),
    ('dea1dea1-0004-4000-a000-000000000005', v_user, now() - interval '12 days' + interval '2 minutes', c_packet3, c_bunkerlane, c_basic),
    ('dea1dea1-0004-4000-a000-000000000006', v_user, now() - interval '12 days' + interval '3 minutes', c_packet3, c_skiff,     c_basic),
    -- packet 4 → Dev: sensor-heavy picks matching his thesis
    ('dea1dea1-0004-4000-a000-000000000007', v_user, now() - interval '51 days' + interval '1 minute', c_packet4, c_quaymark,   c_basic || array['kpis']),
    ('dea1dea1-0004-4000-a000-000000000008', v_user, now() - interval '51 days' + interval '2 minutes', c_packet4, c_reeferline, c_basic),
    -- packet 5 → Dev
    ('dea1dea1-0004-4000-a000-000000000009', v_user, now() - interval '9 days' + interval '1 minute',  c_packet5, c_ballastiq,  c_basic),
    -- packet 6 → Tomas: the robotics deal, testing a new relationship
    ('dea1dea1-0004-4000-a000-000000000010', v_user, now() - interval '8 days' + interval '1 minute',  c_packet6, c_skiff,      c_basic),
    -- packet 7 → Priya: the later-stage fintech with numbers she'll want
    ('dea1dea1-0004-4000-a000-000000000011', v_user, now() - interval '21 days' + interval '1 minute', c_packet7, c_laycan,     c_basic || array['committed_so_far','kpis']);

  -- ------------------------------------------------------------------
  -- 6. Inbound deals — what they've "shared back", mixed statuses.
  --    Balance: Maya 2, Dev 1, Sofia 3 (we owe her), Priya 1, others 0.
  -- ------------------------------------------------------------------
  insert into public.inbound_deals (id, user_id, created_at, company_name, co_investor_id, status, notes)
  values
    ('dea1dea1-0005-4000-a000-000000000001', v_user, now() - interval '26 days',
     'Moorline Analytics', c_maya, 'meeting_booked',
     'Mooring-line tension monitoring for tanker terminals. Rotterdam pilot data looks strong — call booked.'),
    ('dea1dea1-0005-4000-a000-000000000002', v_user, now() - interval '8 days',
     'Pallax Robotics', c_maya, 'interested',
     'Container-yard AMRs. Early, but the founders are ex-terminal ops.'),
    ('dea1dea1-0005-4000-a000-000000000003', v_user, now() - interval '33 days',
     'Sonarium', c_dev, 'interested',
     'Acoustic seabed mapping as a service. Outside our core thesis; the data moat is the interesting part.'),
    ('dea1dea1-0005-4000-a000-000000000004', v_user, now() - interval '55 days',
     'Ladewell', c_sofia, 'passed',
     'Freight-invoice factoring. Passed: crowded space, thin moat.'),
    ('dea1dea1-0005-4000-a000-000000000005', v_user, now() - interval '11 days',
     'Freightmark', c_sofia, 'meeting_booked',
     'Trade finance for freight forwarders. Sofia is co-investing and wants our maritime read.'),
    ('dea1dea1-0005-4000-a000-000000000006', v_user, now() - interval '6 days',
     'Berthbook', c_sofia, 'interested',
     'Payments and reconciliation for port agents. Fresh from Sofia — worth a first call.'),
    ('dea1dea1-0005-4000-a000-000000000007', v_user, now() - interval '17 days',
     'Yardhound', c_priya, 'passed',
     'Drayage yard visibility. Passed: point solution, overlaps Draymatic.');

  raise notice 'Demo data seeded for % — 10 deals, 6 co-investors, 7 packets, 7 inbound deals.', v_email;
end $$;

-- A visible confirmation you can read in the results panel: how many demo
-- rows now exist in each table. Expected: 10 / 6 / 7 / 11 / 7.
select 'deals' as table_name,        count(*) as demo_rows from deals         where id::text like 'dea1dea1-%'
union all
select 'co_investors',               count(*)              from co_investors  where id::text like 'dea1dea1-%'
union all
select 'share_packets',              count(*)              from share_packets where id::text like 'dea1dea1-%'
union all
select 'packet_deals',               count(*)              from packet_deals  where id::text like 'dea1dea1-%'
union all
select 'inbound_deals',              count(*)              from inbound_deals where id::text like 'dea1dea1-%';
