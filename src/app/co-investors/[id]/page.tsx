import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import Badge from '@/app/badge'
import { countCls, errorBox, inlineLink, itemCard, moneyCls, sectionCard } from '@/app/ui'
import CopyLinkButton from '@/app/packets/copy-link-button'
import StatusChip from '@/app/packets/status-chip'
import { statusLabel } from '@/app/inbound/types'
import { WarmthDots } from '../warmth'
import { autoWarmth } from '../auto-warmth'
import { fetchReciprocity } from '../reciprocity'
import type { CoInvestor } from '../types'

// One packet sent to this co-investor, with the names of the deals inside it.
// revoked_at is optional because it only exists once migration 0005 has run.
type PacketForInvestor = {
  id: string
  created_at: string
  link_token: string
  revoked_at?: string | null
  packet_deals: { deals: { company_name: string } | null }[]
}

// One inbound deal they shared with you (no join needed — we're on their page).
type InboundFromInvestor = {
  id: string
  created_at: string
  company_name: string
  status: string
  notes: string | null
}

// Locale AND timezone pinned, so every page shows the same date for a row no
// matter where the server or visitor is.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

// "Jul 2026" — for the reciprocity line.
function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// Format a dollar amount compactly: 250000 -> $250K, 1500000 -> $1.5M.
function money(n: number | null): string | null {
  if (n == null) return null
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return '$' + (Number.isInteger(m) ? m : m.toFixed(1)) + 'M'
  }
  if (n >= 1_000) {
    const k = n / 1_000
    return '$' + (Number.isInteger(k) ? k : k.toFixed(1)) + 'K'
  }
  return '$' + n.toLocaleString('en-US')
}

function checkRange(min: number | null, max: number | null): string | null {
  const lo = money(min)
  const hi = money(max)
  if (lo && hi) return `${lo}–${hi}`
  if (lo) return `${lo}+`
  if (hi) return `up to ${hi}`
  return null
}

export default async function CoInvestorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // The shared sent/received counter (reciprocity.ts) — unlike this page's own
  // queries below it also counts direct shares and in-app shares, so the
  // numbers here match the dashboard and drive automatic warmth. Fired first,
  // WITHOUT await, so it overlaps the three queries below (it needs none of
  // their results); awaited once they're done.
  const reciprocityPromise = fetchReciprocity(supabase, user.id)

  // The co-investor themselves. RLS means you can only ever load your own.
  const { data: investor, error: investorError } = await supabase
    .from('co_investors')
    .select('*')
    .eq('id', id)
    .maybeSingle<CoInvestor>()

  // A malformed id in the URL (someone edited it by hand) makes Postgres
  // complain about the uuid — treat that exactly like "not found".
  if (investorError?.code === '22P02') notFound()
  if (!investorError && !investor) notFound()

  // Everything you've sent them, newest first, with each packet's deal names.
  const { data: packets, error: packetsError } = await supabase
    .from('share_packets')
    .select('*, packet_deals ( deals ( company_name ) )')
    .eq('co_investor_id', id)
    .order('created_at', { ascending: false })
    .returns<PacketForInvestor[]>()

  // Everything they've sent you, newest first.
  const { data: inbound, error: inboundError } = await supabase
    .from('inbound_deals')
    .select('*')
    .eq('co_investor_id', id)
    .order('created_at', { ascending: false })
    .returns<InboundFromInvestor[]>()

  const reciprocity = await reciprocityPromise

  // Only the page's OWN queries are fatal. A failed reciprocity count just
  // hides the numbers line behind a banner further down — the profile itself
  // (bio, packets, inbound) still renders, same as the list page degrades.
  const loadError = investorError || packetsError || inboundError
  if (loadError || !investor) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-background">
        <SiteHeader email={user.email} active="co-investors" />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
          <p className={errorBox}>
            Couldn&apos;t load this profile: {loadError?.message ?? 'unknown error'}
          </p>
        </main>
      </div>
    )
  }

  // ----- The reciprocity numbers -----
  // "You → them": distinct deals that reached them (packet or direct share).
  // "Them → you": deals they sent you (logged inbound or in-app share).
  const counts = reciprocity.counts.get(investor.id)
  const sentCount = counts?.sent ?? 0
  const receivedCount = counts?.received ?? 0
  const lastSharedAt = counts?.lastSentAt ?? null
  const lastReceivedAt = counts?.lastReceivedAt ?? null

  const stages = investor.thesis_stages?.join(', ')
  const sectors = investor.thesis_sectors?.join(', ')
  const geos = investor.thesis_geographies?.join(', ')
  const range = checkRange(investor.check_size_min, investor.check_size_max)

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader email={user.email} active="co-investors" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link
          href="/co-investors"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← All co-investors
        </Link>

        {/* ----- Who they are ----- */}
        <section className={`mt-4 ${sectionCard}`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {investor.name}
              </h1>
              {investor.fund_name && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{investor.fund_name}</p>
              )}
            </div>
            <WarmthDots
              value={investor.warmth ?? autoWarmth(sentCount, receivedCount)}
              // If the counts failed to load, empty dots mean "unknown", not
              // "no history" — so don't claim automatic in the tooltip.
              auto={investor.warmth == null && reciprocity.errors.length === 0}
            />
          </div>

          {(stages || sectors || geos || range) && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {stages && <span>Stages: {stages}</span>}
              {sectors && <span>Sectors: {sectors}</span>}
              {geos && <span>Geos: {geos}</span>}
              {range && (
                <span>
                  Check: <span className={moneyCls}>{range}</span>
                </span>
              )}
            </div>
          )}

          {investor.email && (
            <div className="mt-2 text-sm">
              <a href={`mailto:${investor.email}`} className={inlineLink}>
                {investor.email}
              </a>
            </div>
          )}

          {investor.notes && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-500 dark:text-zinc-400">
              {investor.notes}
            </p>
          )}

          {/* ----- Reciprocity: who owes whom a deal ----- */}
          {reciprocity.errors.length > 0 ? (
            <p className={`mt-4 ${errorBox}`}>
              Couldn&apos;t count deal flow (warmth shows as unknown):{' '}
              {reciprocity.errors.join(' · ')}
            </p>
          ) : (
            <p className="mt-4 border-t border-zinc-950/[.06] pt-4 text-sm text-zinc-600 dark:border-white/[.08] dark:text-zinc-400">
              <strong className="font-medium text-zinc-950 dark:text-zinc-50">You → them:</strong>{' '}
              <span className="font-mono font-medium tabular-nums text-zinc-950 dark:text-zinc-50">
                {sentCount}
              </span>{' '}
              {sentCount === 1 ? 'deal' : 'deals'}
              {lastSharedAt && ` (last: ${monthYear(lastSharedAt)})`}
              <span className="mx-2">·</span>
              <strong className="font-medium text-zinc-950 dark:text-zinc-50">
                Them → you:
              </strong>{' '}
              <span className="font-mono font-medium tabular-nums text-zinc-950 dark:text-zinc-50">
                {receivedCount}
              </span>{' '}
              {receivedCount === 1 ? 'deal' : 'deals'}
              {lastReceivedAt && ` (last: ${monthYear(lastReceivedAt)})`}
              {/* These totals count every route a deal traveled (packets,
                  direct shares, in-app shares), so they can exceed the two
                  lists below, which only show packets and logged deals. */}
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                Counts all deal flow — packets, direct shares, and in-app shares — and sets
                warmth automatically.
              </span>
            </p>
          )}
        </section>

        {/* ----- Shared with them ----- */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Shared with them
            {packets && <span className={countCls}>({packets.length})</span>}
          </h2>

          {packets && packets.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              No packets yet —{' '}
              <Link href="/packets/new" className={inlineLink}>
                create one →
              </Link>
            </p>
          )}

          <ul className="mt-4 flex flex-col gap-3">
            {packets?.map((packet) => {
              const dealNames = packet.packet_deals
                .map((pd) => pd.deals?.company_name)
                .filter(Boolean)
                .join(', ')
              return (
                <li key={packet.id} className={itemCard}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium tabular-nums text-zinc-950 dark:text-zinc-50">
                      {formatDate(packet.created_at)} · {packet.packet_deals.length}{' '}
                      {packet.packet_deals.length === 1 ? 'deal' : 'deals'}
                    </span>
                    <StatusChip revoked={!!packet.revoked_at} />
                  </div>
                  {dealNames && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{dealNames}</p>
                  )}
                  <div className="mt-3">
                    <CopyLinkButton path={`/p/${packet.link_token}`} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* ----- Received from them ----- */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Received from them
            {inbound && <span className={countCls}>({inbound.length})</span>}
          </h2>

          {inbound && inbound.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Nothing yet — when they share a deal with you,{' '}
              <Link href="/inbound" className={inlineLink}>
                log it on the Inbound page →
              </Link>
            </p>
          )}

          <ul className="mt-4 flex flex-col gap-3">
            {inbound?.map((deal) => (
              <li key={deal.id} className={itemCard}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                    {deal.company_name}
                  </span>
                  <Badge value={deal.status}>{statusLabel(deal.status)}</Badge>
                </div>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  {formatDate(deal.created_at)}
                </p>
                {deal.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-500 dark:text-zinc-400">
                    {deal.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
