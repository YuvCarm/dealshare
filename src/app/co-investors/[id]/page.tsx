import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import CopyLinkButton from '@/app/packets/copy-link-button'
import StatusChip from '@/app/packets/status-chip'
import { statusLabel } from '@/app/inbound/types'
import { WarmthDots } from '../warmth'
import type { CoInvestor } from '../types'

// One packet sent to this co-investor, with the names of the deals inside it.
// revoked_at is optional because it only exists once migration 0005 has run.
type PacketForInvestor = {
  id: string
  created_at: string
  link_token: string
  revoked_at?: string | null
  packet_deals: { deal_id: string; deals: { company_name: string } | null }[]
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
    .select('*, packet_deals ( deal_id, deals ( company_name ) )')
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

  const loadError = investorError || packetsError || inboundError
  if (loadError || !investor) {
    return (
      <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
        <SiteHeader email={user.email} active="co-investors" />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Couldn&apos;t load this profile: {loadError?.message ?? 'unknown error'}
          </p>
        </main>
      </div>
    )
  }

  // ----- The reciprocity numbers -----
  // "You → them": how many distinct deals you've shared (the same deal in two
  // packets counts once), and when the latest packet went out.
  const sharedDealIds = new Set(
    (packets ?? []).flatMap((p) => p.packet_deals.map((pd) => pd.deal_id))
  )
  const lastSharedAt = packets?.[0]?.created_at ?? null

  // "Them → you": how many deals they've sent you, and when the latest arrived.
  const receivedCount = inbound?.length ?? 0
  const lastReceivedAt = inbound?.[0]?.created_at ?? null

  const stages = investor.thesis_stages?.join(', ')
  const sectors = investor.thesis_sectors?.join(', ')
  const geos = investor.thesis_geographies?.join(', ')
  const range = checkRange(investor.check_size_min, investor.check_size_max)

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader email={user.email} active="co-investors" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <Link
          href="/co-investors"
          className="text-sm text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← All co-investors
        </Link>

        {/* ----- Who they are ----- */}
        <section className="mt-4 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
                {investor.name}
              </h1>
              {investor.fund_name && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{investor.fund_name}</p>
              )}
            </div>
            <WarmthDots value={investor.warmth} />
          </div>

          {(stages || sectors || geos || range) && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {stages && <span>Stages: {stages}</span>}
              {sectors && <span>Sectors: {sectors}</span>}
              {geos && <span>Geos: {geos}</span>}
              {range && <span>Check: {range}</span>}
            </div>
          )}

          {investor.email && (
            <div className="mt-2 text-sm">
              <a
                href={`mailto:${investor.email}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
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
          <p className="mt-4 border-t border-black/[.06] pt-4 text-sm text-zinc-600 dark:border-white/[.1] dark:text-zinc-400">
            <strong className="text-black dark:text-zinc-50">You → them:</strong>{' '}
            {sharedDealIds.size} {sharedDealIds.size === 1 ? 'deal' : 'deals'}
            {lastSharedAt && ` (last: ${monthYear(lastSharedAt)})`}
            <span className="mx-2">·</span>
            <strong className="text-black dark:text-zinc-50">Them → you:</strong> {receivedCount}{' '}
            {receivedCount === 1 ? 'deal' : 'deals'}
            {lastReceivedAt && ` (last: ${monthYear(lastReceivedAt)})`}
          </p>
        </section>

        {/* ----- Shared with them ----- */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Shared with them{packets ? ` (${packets.length})` : ''}
          </h2>

          {packets && packets.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              No packets yet —{' '}
              <Link
                href="/packets/new"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
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
                <li
                  key={packet.id}
                  className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-black dark:text-zinc-50">
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
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Received from them{inbound ? ` (${inbound.length})` : ''}
          </h2>

          {inbound && inbound.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Nothing yet — when they share a deal with you,{' '}
              <Link href="/inbound" className="text-blue-600 hover:underline dark:text-blue-400">
                log it on the Inbound page →
              </Link>
            </p>
          )}

          <ul className="mt-4 flex flex-col gap-3">
            {inbound?.map((deal) => (
              <li
                key={deal.id}
                className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-black dark:text-zinc-50">
                    {deal.company_name}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {statusLabel(deal.status)}
                  </span>
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
