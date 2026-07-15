import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import { WarmthDots } from '@/app/co-investors/warmth'
import { countCls, errorBox, itemCard, sectionCard } from '@/app/ui'
import type { InAppShare } from '@/app/inbound/types'

// The signed-in home: a read-only summary of everything the other pages manage.
// It answers four questions at a glance — how big is my pipeline, what's open,
// who's waiting on me, and what have I got out there — then a row of visual
// breakdowns (monthly deal flow, fund-status split, network warmth), then who
// my deal flow actually runs through (the reciprocity table) and what
// happened lately.

// ---- Row shapes ------------------------------------------------------------
// Each query selects only what the dashboard reads. `source` and
// `promoted_from_share_id` are optional because they arrive with migrations
// 0010/0011 — on an older database `select('*')` simply won't include them.
type DealRow = {
  id: string
  created_at: string
  company_name: string
  company_stage: string | null
  round_status: string | null
  your_fund_status: string | null
  source?: string | null
  promoted_from_share_id?: string | null
}

type SentShare = {
  id: string
  created_at: string
  deal_id: string
  to_email: string
  status: 'active' | 'revoked'
  deals: { company_name: string } | null
}

type PacketRow = {
  created_at: string
  co_investor_id: string | null
  packet_deals: { deal_id: string }[]
}

type InvestorRow = {
  id: string
  name: string
  fund_name: string | null
  email: string | null
  warmth: number | null
}

type ManualInboundRow = {
  id: string
  created_at: string
  company_name: string
  co_investor_id: string | null
  co_investors: { id: string; name: string } | null
}

// Same UTC-pinned formatter as /shared and /packets, so the server and every
// visitor render the identical date for a row.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Six independent reads, fired together. RLS scopes deals, co_investors,
  // share_packets, and inbound_deals to this user; deal_shares needs the
  // explicit from_user_id filter because its policies also expose shares
  // addressed TO this user; inbound shares only exist via the
  // inbound_deal_shares() function (which trims each deal to shared fields).
  const [dealsRes, sentRes, inboundRes, investorsRes, packetsRes, manualRes] = await Promise.all([
    supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<DealRow[]>(),
    supabase
      .from('deal_shares')
      // deals!deal_id names the foreign key: since migration 0011 there are
      // two deals↔deal_shares relationships, so a bare `deals` is ambiguous.
      .select('id, created_at, deal_id, to_email, status, deals!deal_id ( company_name )')
      .eq('from_user_id', user.id)
      .order('created_at', { ascending: false })
      .returns<SentShare[]>(),
    supabase.rpc('inbound_deal_shares'),
    supabase
      .from('co_investors')
      .select('id, name, fund_name, email, warmth')
      .order('created_at')
      .returns<InvestorRow[]>(),
    supabase
      .from('share_packets')
      .select('created_at, co_investor_id, packet_deals ( deal_id )')
      .returns<PacketRow[]>(),
    supabase
      .from('inbound_deals')
      .select('id, created_at, company_name, co_investor_id, co_investors ( id, name )')
      .order('created_at', { ascending: false })
      .returns<ManualInboundRow[]>(),
  ])

  const deals = dealsRes.data ?? []
  const sentShares = sentRes.data ?? []
  const inboundShares = (inboundRes.data as InAppShare[] | null) ?? []
  const investors = investorsRes.data ?? []
  const packets = packetsRes.data ?? []
  const manualInbound = manualRes.data ?? []

  // Surface load failures without blanking the whole page — whatever did load
  // still renders. PGRST202 just means migration 0009 hasn't created the
  // inbound function yet; the inbound section of the app treats that as
  // "no in-app shares", so the dashboard does too.
  const loadErrors = [
    dealsRes.error && `deals: ${dealsRes.error.message}`,
    sentRes.error && `shares sent: ${sentRes.error.message}`,
    inboundRes.error &&
      inboundRes.error.code !== 'PGRST202' &&
      `inbound shares: ${inboundRes.error.message}`,
    investorsRes.error && `co-investors: ${investorsRes.error.message}`,
    packetsRes.error && `packets: ${packetsRes.error.message}`,
    manualRes.error && `inbound deals: ${manualRes.error.message}`,
  ].filter((e): e is string => Boolean(e))

  // ---- Stats ---------------------------------------------------------------
  const openRounds = deals.filter((d) => d.round_status === 'open')
  const activeSent = sentShares.filter((s) => s.status === 'active')

  // "Pending" = an active share addressed to me whose deal I haven't promoted
  // into my own pipeline yet. Promoted deals remember their share id.
  const promotedShareIds = new Set(
    deals.map((d) => d.promoted_from_share_id).filter(Boolean),
  )
  const pendingInbound = inboundShares.filter((s) => !promotedShareIds.has(s.share_id))

  const now = new Date()
  const dealsThisMonth = deals.filter((d) => {
    const t = new Date(d.created_at)
    return t.getUTCFullYear() === now.getUTCFullYear() && t.getUTCMonth() === now.getUTCMonth()
  }).length

  const pendingSenders = new Set(pendingInbound.map((s) => s.from_email)).size
  const activeRecipients = new Set(activeSent.map((s) => s.to_email)).size

  // ---- Reciprocity ---------------------------------------------------------
  // Sharers arrive as bare emails, so the rolodex doubles as an email → name
  // lookup (same trick as /inbound and /shared). Unlike those pages this map
  // feeds COUNTS, not just display names, so ties must be deterministic: if
  // two rolodex entries share an email, the oldest entry (query is ordered by
  // created_at) owns it on every load, instead of flip-flopping.
  const investorByEmail = new Map<string, InvestorRow>()
  for (const investor of investors) {
    if (!investor.email) continue
    const key = investor.email.trim().toLowerCase()
    if (!investorByEmail.has(key)) investorByEmail.set(key, investor)
  }

  // Sent = distinct deals that reached this co-investor by either route: a
  // packet addressed to them, or a direct share to their email. The Set
  // dedupes a deal that traveled both ways, matching how the co-investor
  // profile counts packets (distinct deals, not rows).
  const sentDealsByInvestor = new Map<string, Set<string>>()
  const addSent = (investorId: string, dealId: string) => {
    const set = sentDealsByInvestor.get(investorId) ?? new Set<string>()
    set.add(dealId)
    sentDealsByInvestor.set(investorId, set)
  }
  for (const packet of packets) {
    if (!packet.co_investor_id) continue
    for (const pd of packet.packet_deals) addSent(packet.co_investor_id, pd.deal_id)
  }
  for (const share of sentShares) {
    const investor = investorByEmail.get(share.to_email)
    if (investor) addSent(investor.id, share.deal_id)
  }

  // Received = manually-logged inbound rows from them, plus live in-app shares
  // from their email. Two different record kinds, so a plain sum — there's no
  // shared deal id to dedupe on.
  const receivedByInvestor = new Map<string, number>()
  const addReceived = (investorId: string) =>
    receivedByInvestor.set(investorId, (receivedByInvestor.get(investorId) ?? 0) + 1)
  for (const row of manualInbound) {
    if (row.co_investor_id) addReceived(row.co_investor_id)
  }
  for (const share of inboundShares) {
    const investor = investorByEmail.get(share.from_email)
    if (investor) addReceived(investor.id)
  }

  const reciprocity = investors
    .map((investor) => ({
      investor,
      sent: sentDealsByInvestor.get(investor.id)?.size ?? 0,
      received: receivedByInvestor.get(investor.id) ?? 0,
    }))
    .filter((row) => row.sent + row.received > 0)
    .sort(
      (a, b) =>
        b.sent + b.received - (a.sent + a.received) ||
        a.investor.name.localeCompare(b.investor.name),
    )
    .slice(0, 8)

  // ---- Activity ------------------------------------------------------------
  // Three event streams merged newest-first: shares you sent, inbound that
  // reached you (in-app and manually logged), and promotions into your
  // pipeline. A promoted deal produces two entries on different dates —
  // received once, promoted later — which is the honest timeline.
  type Activity = { key: string; when: string; kind: 'sent' | 'received' | 'promoted'; text: React.ReactNode }

  const strong = (s: string) => (
    <strong className="font-medium text-zinc-950 dark:text-zinc-50">{s}</strong>
  )
  const senderName = (email: string) => investorByEmail.get(email)?.name ?? email

  const activity: Activity[] = [
    ...sentShares.map((share): Activity => ({
      key: `sent-${share.id}`,
      when: share.created_at,
      kind: 'sent',
      text: (
        <>
          You shared {strong(share.deals?.company_name ?? 'a deal')} with{' '}
          {strong(senderName(share.to_email))}
        </>
      ),
    })),
    ...inboundShares.map((share): Activity => {
      const name = share.deal.company_name
      return {
        key: `received-${share.share_id}`,
        when: share.created_at,
        kind: 'received',
        text: (
          <>
            {strong(senderName(share.from_email))} shared{' '}
            {strong(typeof name === 'string' ? name : 'Undisclosed company')} with you
          </>
        ),
      }
    }),
    ...manualInbound.map((row): Activity => ({
      key: `logged-${row.id}`,
      when: row.created_at,
      kind: 'received',
      text: (
        <>
          You logged {strong(row.company_name)}
          {row.co_investors && <> from {strong(row.co_investors.name)}</>}
        </>
      ),
    })),
    ...deals
      .filter((d) => d.source === 'promoted_from_inbound')
      .map((deal): Activity => ({
        key: `promoted-${deal.id}`,
        when: deal.created_at,
        kind: 'promoted',
        text: <>Promoted {strong(deal.company_name)} into your pipeline</>,
      })),
  ]
    .sort((a, b) => (a.when < b.when ? 1 : -1))
    .slice(0, 8)

  // ---- Pipeline by stage ---------------------------------------------------
  // One indigo ramp, lightest at pre-seed and deepening with maturity, so the
  // color itself reads as the funnel order. The four steps are indigo
  // 300→600, checked as an ordinal ramp against the card surface (#111113):
  // monotone lightness, visible step gaps, darkest step ≥ 3:1.
  const stages = [
    { value: 'pre-seed', label: 'Pre-seed', fill: '#a5b4fc' },
    { value: 'seed', label: 'Seed', fill: '#818cf8' },
    { value: 'A', label: 'Series A', fill: '#6366f1' },
    { value: 'B+', label: 'Series B+', fill: '#4f46e5' },
  ].map((stage) => ({
    ...stage,
    count: deals.filter((d) => d.company_stage === stage.value).length,
  }))
  const unstaged = deals.filter(
    (d) => !stages.some((s) => s.value === d.company_stage),
  ).length
  // Deals without a stage get a recessive gray row — missing data shouldn't
  // wear a ramp color, but hiding those deals would make the bars lie.
  const stageRows = [
    ...stages,
    ...(unstaged > 0 ? [{ value: 'none', label: 'No stage', fill: '#52525b', count: unstaged }] : []),
  ]
  const maxStageCount = Math.max(...stageRows.map((r) => r.count), 1)

  // ---- Visual breakdowns -----------------------------------------------------
  // Deal flow per month, last six months: what you sent out (direct shares +
  // packet deals) vs. what reached you (in-app shares + logged inbound).
  // Counts are events, not distinct deals — this chart is momentum, not
  // inventory. Received history only covers shares still visible to you
  // (revoked/hidden ones never leave Postgres), same as everywhere else.
  const monthKey = (d: Date) => `${d.getUTCFullYear()}-${d.getUTCMonth()}`
  const flowMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1))
    return {
      key: monthKey(d),
      label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
      sent: 0,
      received: 0,
    }
  })
  const flowByKey = new Map(flowMonths.map((m) => [m.key, m]))
  const bump = (iso: string, side: 'sent' | 'received', by = 1) => {
    const bucket = flowByKey.get(monthKey(new Date(iso)))
    if (bucket) bucket[side] += by
  }
  for (const share of sentShares) bump(share.created_at, 'sent')
  for (const packet of packets) bump(packet.created_at, 'sent', packet.packet_deals.length)
  for (const share of inboundShares) bump(share.created_at, 'received')
  for (const row of manualInbound) bump(row.created_at, 'received')
  const maxFlow = Math.max(...flowMonths.map((m) => Math.max(m.sent, m.received)), 1)
  const totalFlowSent = flowMonths.reduce((n, m) => n + m.sent, 0)
  const totalFlowReceived = flowMonths.reduce((n, m) => n + m.received, 0)
  const hasFlow = totalFlowSent + totalFlowReceived > 0

  // My stance on each deal, as one part-to-whole bar. The hues are the same
  // semantic ones the Badge component wears (evaluating amber, investing
  // indigo, passed rose); the legend carries the actual counts, so color is
  // never the only channel. Unjudged deals get the recessive gray again.
  const fundStatuses = [
    { value: 'evaluating', label: 'Evaluating', fill: '#fbbf24' },
    { value: 'investing', label: 'Investing', fill: '#818cf8' },
    { value: 'passed', label: 'Passed', fill: '#fb7185' },
  ].map((status) => ({
    ...status,
    count: deals.filter((d) => d.your_fund_status === status.value).length,
  }))
  const unjudged = deals.length - fundStatuses.reduce((sum, s) => sum + s.count, 0)
  const fundSegments = [
    ...fundStatuses,
    ...(unjudged > 0 ? [{ value: 'none', label: 'No status', fill: '#52525b', count: unjudged }] : []),
  ].filter((s) => s.count > 0)

  // Network warmth histogram: co-investors at each warmth level, in the same
  // amber that WarmthDots uses everywhere, plus a gray bin for "not set".
  const warmthBins = [1, 2, 3, 4, 5].map((level) => ({
    key: String(level),
    label: String(level),
    fill: '#f59e0b',
    count: investors.filter((i) => i.warmth === level).length,
  }))
  const warmthUnset = investors.filter((i) => i.warmth == null).length
  const warmthRows = [
    ...warmthBins,
    ...(warmthUnset > 0 ? [{ key: 'none', label: '—', fill: '#52525b', count: warmthUnset }] : []),
  ]
  const maxWarmth = Math.max(...warmthRows.map((r) => r.count), 1)

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader email={user.email} active="dashboard" />

      {/* Wider than the content pages (max-w-5xl vs max-w-3xl): those are
          single reading columns, this is a scanning surface with side-by-side
          panels that would fold awkwardly in a narrow column. */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Dashboard
        </h1>

        {loadErrors.length > 0 && (
          <p className={`mt-4 ${errorBox}`}>Couldn&apos;t load: {loadErrors.join(' · ')}</p>
        )}

        {/* The four numbers, each a link into the page that manages it. */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Deals in pipeline"
            value={deals.length}
            context={`${dealsThisMonth} added this month`}
            href="/deals"
          />
          <StatCard
            label="Open rounds"
            value={openRounds.length}
            context={`of ${deals.length} ${deals.length === 1 ? 'deal' : 'deals'}`}
            href="/deals"
          />
          <StatCard
            label="Pending inbound"
            value={pendingInbound.length}
            context={`from ${pendingSenders} ${pendingSenders === 1 ? 'sender' : 'senders'}`}
            href="/inbound"
          />
          <StatCard
            label="Active shares sent"
            value={activeSent.length}
            context={`to ${activeRecipients} ${activeRecipients === 1 ? 'recipient' : 'recipients'}`}
            href="/shared"
          />
        </div>

        {/* Three visual breakdowns, one glance each: momentum (flow over
            time), judgment (fund status), and network temperature (warmth).
            Grid children stretch to the tallest card so the row reads level. */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Deal flow — paired monthly columns, the page's only two-series
              chart, so it gets the legend (with totals as the visible numbers). */}
          <section className={sectionCard}>
            <CardHeader title="Deal flow" href="/shared" linkLabel="All shares" />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Shares sent vs. received, last 6 months.
            </p>

            {!hasFlow ? (
              <CardEmpty
                body="No deal flow in the last 6 months. Share a deal, or log one someone sent you."
                href="/deals"
                cta="Share a deal"
              />
            ) : (
              <div className="mt-5">
                <div className="flex items-end justify-between gap-2 border-b border-zinc-950/[.08] dark:border-white/[.08]">
                  {flowMonths.map((m) => (
                    <div
                      key={m.key}
                      className="flex flex-1 flex-col items-center"
                      title={`${m.label}: ${m.sent} sent · ${m.received} received`}
                    >
                      <span className="sr-only">
                        {m.label}: {m.sent} sent, {m.received} received
                      </span>
                      <div aria-hidden className="flex items-end gap-[2px]">
                        <div
                          className="w-2.5 rounded-t-[4px]"
                          style={{
                            height: `${(m.sent / maxFlow) * 88}px`,
                            minHeight: m.sent ? 2 : 0,
                            backgroundColor: '#6366f1',
                          }}
                        />
                        <div
                          className="w-2.5 rounded-t-[4px]"
                          style={{
                            height: `${(m.received / maxFlow) * 88}px`,
                            minHeight: m.received ? 2 : 0,
                            backgroundColor: '#059669',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between gap-2">
                  {flowMonths.map((m) => (
                    <span
                      key={m.key}
                      className="flex-1 text-center text-[11px] text-zinc-500 dark:text-zinc-400"
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  <LegendKey fill="#6366f1" label="Sent" count={totalFlowSent} />
                  <LegendKey fill="#059669" label="Received" count={totalFlowReceived} />
                </div>
              </div>
            )}
          </section>

          {/* Fund status — one segmented part-to-whole bar; 2px gaps in the
              surface color separate the segments, never a border. */}
          <section className={sectionCard}>
            <CardHeader title="Fund status" href="/deals" linkLabel="All deals" />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Where you stand on each deal in your pipeline.
            </p>

            {deals.length === 0 ? (
              <CardEmpty
                body="No deals in your pipeline yet."
                href="/deals#add-deal"
                cta="Add your first deal"
              />
            ) : (
              <div className="mt-5">
                <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-[4px]">
                  {fundSegments.map((s) => (
                    <div
                      key={s.value}
                      title={`${s.label}: ${s.count} ${s.count === 1 ? 'deal' : 'deals'}`}
                      style={{
                        width: `${(s.count / deals.length) * 100}%`,
                        backgroundColor: s.fill,
                      }}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
                  {fundSegments.map((s) => (
                    <LegendKey key={s.value} fill={s.fill} label={s.label} count={s.count} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Network warmth — a single-series histogram, so no legend; the
              count sits on each column's cap and the level below the baseline. */}
          <section className={sectionCard}>
            <CardHeader title="Network warmth" href="/co-investors" linkLabel="All co-investors" />
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Co-investors by warmth, 1 (cold) to 5 (close).
            </p>

            {investors.length === 0 ? (
              <CardEmpty
                body="Add co-investors to see how warm your network runs."
                href="/co-investors"
                cta="Add a co-investor"
              />
            ) : (
              <div className="mt-5">
                <div className="flex items-end justify-between gap-2 border-b border-zinc-950/[.08] dark:border-white/[.08]">
                  {warmthRows.map((r) => (
                    <div
                      key={r.key}
                      className="flex flex-1 flex-col items-center gap-1"
                      title={`Warmth ${r.label}: ${r.count} ${r.count === 1 ? 'co-investor' : 'co-investors'}`}
                    >
                      {/* Screen readers get the count and its level as one
                          phrase; the visible count and the label row below
                          are the sighted version of the same pairing. */}
                      <span className="sr-only">
                        Warmth {r.key === 'none' ? 'not set' : r.label}: {r.count}{' '}
                        {r.count === 1 ? 'co-investor' : 'co-investors'}
                      </span>
                      <span
                        aria-hidden
                        className="font-mono text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400"
                      >
                        {r.count}
                      </span>
                      <div
                        aria-hidden
                        className="w-5 rounded-t-[4px]"
                        style={{
                          height: `${(r.count / maxWarmth) * 64}px`,
                          minHeight: r.count ? 2 : 0,
                          backgroundColor: r.fill,
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div aria-hidden className="mt-1.5 flex justify-between gap-2">
                  {warmthRows.map((r) => (
                    <span
                      key={r.key}
                      className="flex-1 text-center text-[11px] text-zinc-500 dark:text-zinc-400"
                    >
                      {r.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Two-thirds / one-third split: the wide column carries the things
            you read across (a table, a chart); the narrow one carries the
            feed, which is a list you read down. */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Reciprocity — who the deal flow actually runs through. */}
            <section className={sectionCard}>
              <CardHeader
                title="Reciprocity"
                count={reciprocity.length > 0 ? reciprocity.length : undefined}
                href="/co-investors"
                linkLabel="All co-investors"
              />
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Co-investors ranked by two-way deal flow — deals you sent them vs. deals
                they sent you.
              </p>

              {investors.length === 0 ? (
                <CardEmpty
                  body="Add co-investors to start tracking who sends you deal flow — and who you send it to."
                  href="/co-investors"
                  cta="Add a co-investor"
                />
              ) : reciprocity.length === 0 ? (
                <CardEmpty
                  body="No deal flow yet. Share a deal with a co-investor and both directions will show up here."
                  href="/deals"
                  cta="Share a deal"
                />
              ) : (
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                      <th className="pb-2 font-medium">Co-investor</th>
                      <th className="pb-2 font-medium">Warmth</th>
                      <th className="pb-2 text-right font-medium">Sent</th>
                      <th className="pb-2 pl-4 text-right font-medium">Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-950/[.04] dark:divide-white/[.06]">
                    {reciprocity.map(({ investor, sent, received }) => (
                      <tr key={investor.id}>
                        <td className="py-2.5 pr-4">
                          <Link
                            href={`/co-investors/${investor.id}`}
                            className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                          >
                            {investor.name}
                          </Link>
                          {investor.fund_name && (
                            <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                              {investor.fund_name}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <WarmthDots value={investor.warmth} />
                        </td>
                        <td className="py-2.5 text-right font-mono text-[13px] tabular-nums text-zinc-800 dark:text-zinc-200">
                          {sent}
                        </td>
                        <td className="py-2.5 pl-4 text-right font-mono text-[13px] tabular-nums text-zinc-800 dark:text-zinc-200">
                          {received}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* Pipeline by stage. */}
            <section className={sectionCard}>
              <CardHeader
                title="Pipeline by stage"
                count={deals.length > 0 ? deals.length : undefined}
                href="/deals"
                linkLabel="All deals"
              />

              {deals.length === 0 ? (
                <CardEmpty
                  body="No deals in your pipeline yet."
                  href="/deals#add-deal"
                  cta="Add your first deal"
                />
              ) : (
                <div className="mt-5 space-y-3">
                  {stageRows.map((row) => (
                    <div
                      key={row.value}
                      className="flex items-center gap-3"
                      title={`${row.label}: ${row.count} ${row.count === 1 ? 'deal' : 'deals'}`}
                    >
                      <span className="w-20 shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                        {row.label}
                      </span>
                      <div className="h-5 flex-1 overflow-hidden rounded-r-[4px] bg-zinc-950/[.04] dark:bg-white/[.04]">
                        <div
                          className="h-full rounded-r-[4px]"
                          style={{
                            width: `${(row.count / maxStageCount) * 100}%`,
                            backgroundColor: row.fill,
                          }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right font-mono text-[13px] tabular-nums text-zinc-800 dark:text-zinc-200">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Recent activity. */}
          <section className={sectionCard}>
            <CardHeader title="Recent activity" href="/shared" linkLabel="All shares" />

            {activity.length === 0 ? (
              <CardEmpty
                body="Nothing has happened yet. Add a deal, or share one with a co-investor."
                href="/deals"
                cta="Go to deals"
              />
            ) : (
              <ul className="mt-2 divide-y divide-zinc-950/[.04] dark:divide-white/[.06]">
                {activity.map((item) => (
                  <li key={item.key} className="flex gap-3 py-3">
                    <ActivityIcon kind={item.kind} />
                    <div className="min-w-0">
                      <p className="text-sm leading-snug text-zinc-600 dark:text-zinc-400">
                        {item.text}
                      </p>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(item.when)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

// ---- Pieces ----------------------------------------------------------------

// One number with its context line. The whole card is the link, so it borrows
// itemCard's hover lift as the "this is clickable" cue.
function StatCard({
  label,
  value,
  context,
  href,
}: {
  label: string
  value: number
  context: string
  href: string
}) {
  return (
    <Link href={href} className={`block ${itemCard}`}>
      <p className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{context}</p>
    </Link>
  )
}

// Every panel opens the same way: a small title (optionally with the app's
// usual mono count) and a quiet link to the page with the full story.
function CardHeader({
  title,
  count,
  href,
  linkLabel,
}: {
  title: string
  count?: number
  href: string
  linkLabel: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        {title}
        {typeof count === 'number' && <span className={countCls}>({count})</span>}
      </h2>
      <Link
        href={href}
        className="whitespace-nowrap text-xs font-medium text-zinc-500 transition-colors duration-150 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
      >
        {linkLabel} &rarr;
      </Link>
    </div>
  )
}

// A legend entry: a small color swatch, the series name, and the actual
// number — so identity never rides on color alone, and the count is visible
// without hovering anything.
function LegendKey({ fill, label, count }: { fill: string; label: string; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <span aria-hidden className="h-2 w-2 rounded-[2px]" style={{ backgroundColor: fill }} />
      {label}
      {typeof count === 'number' && (
        <span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-300">{count}</span>
      )}
    </span>
  )
}

// The in-card cousin of the full-page EmptyState: same dashed look, sized to
// sit inside a panel instead of filling a page.
function CardEmpty({ body, href, cta }: { body: string; href: string; cta: string }) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-xl border border-dashed border-zinc-950/[.12] bg-zinc-950/[.015] px-4 py-8 text-center dark:border-white/[.12] dark:bg-white/[.02]">
      <p className="max-w-xs text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{body}</p>
      <Link
        href={href}
        className="mt-2 text-sm font-medium text-accent underline-offset-4 hover:underline"
      >
        {cta}
      </Link>
    </div>
  )
}

// Feed glyphs: out (↗), in (↙), and promoted (+) — the one event that earns
// the accent, since it's the moment inbound flow becomes pipeline.
function ActivityIcon({ kind }: { kind: 'sent' | 'received' | 'promoted' }) {
  const paths = {
    sent: 'M7 17L17 7M9 7h8v8',
    received: 'M17 7L7 17M15 17H7V9',
    promoted: 'M12 5v14M5 12h14',
  }
  return (
    <span
      aria-hidden
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-zinc-950/[.06] dark:ring-white/[.08] ${
        kind === 'promoted'
          ? 'bg-indigo-500/[.08] text-accent dark:bg-indigo-400/10'
          : 'bg-zinc-950/[.04] text-zinc-500 dark:bg-white/[.06] dark:text-zinc-400'
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={paths[kind]} />
      </svg>
    </span>
  )
}
