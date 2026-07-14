import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Badge from '@/app/badge'
import { inlineLink, itemCard, moneyCls } from '@/app/ui'
import { type ShareableFieldKey } from '@/app/packets/fields'

// This page is PUBLIC — anyone with the link can open it, logged in or not.
// It deliberately has no auth check and no site navigation. All data comes
// through the packet_by_token database function (migration 0004), which
// returns each deal already trimmed to only the fields the sender ticked.

// Private share links should never show up in search engines.
export const metadata: Metadata = {
  title: 'Deals shared with you — DealShare',
  robots: { index: false, follow: false },
}

// What packet_by_token returns. Each deal only carries its ticked fields,
// so every field is optional here.
type SharedDeal = Partial<Record<ShareableFieldKey, string | number | boolean | null>>

type PacketPayload = {
  created_at: string
  co_investor: { name: string; fund_name: string | null } | null
  deals: SharedDeal[]
}

function usd(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function PacketViewerPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('packet_by_token', { p_token: token })

  if (error) {
    // The one setup step this page needs: migration 0004 creates the
    // packet_by_token function. Surface that clearly instead of a silent 404.
    if (error.code === 'PGRST202') {
      throw new Error(
        'The packet_by_token database function is missing — run supabase/migrations/0004_public_packet_viewer.sql in Supabase → SQL Editor.'
      )
    }
    throw new Error(`Couldn't load this packet: ${error.message}`)
  }

  // Unknown token → the friendly not-found page in this folder.
  const packet = data as PacketPayload | null
  if (!packet) notFound()

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="flex items-center justify-between border-b border-zinc-950/[.06] px-6 py-4 dark:border-white/[.08]">
        <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
          DealShare
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950/[.03] px-2.5 py-1 text-[11px] font-medium text-zinc-500 ring-1 ring-inset ring-zinc-950/[.08] dark:bg-white/[.05] dark:text-zinc-400 dark:ring-white/[.1]">
          Private link — please don&apos;t forward
        </span>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Deals shared with {packet.co_investor ? packet.co_investor.name : 'you'}
          {packet.co_investor?.fund_name && (
            <span className="ml-2 text-base font-normal text-zinc-500 dark:text-zinc-400">
              {packet.co_investor.fund_name}
            </span>
          )}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="font-mono tabular-nums">{packet.deals.length}</span>{' '}
          {packet.deals.length === 1 ? 'deal' : 'deals'} · shared{' '}
          {formatDate(packet.created_at)}
        </p>

        <ul className="mt-6 flex flex-col gap-3">
          {packet.deals.map((deal, index) => (
            <DealCard key={index} deal={deal} />
          ))}
        </ul>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-zinc-400 dark:text-zinc-600">
        Shared privately via{' '}
        <Link href="/" className="underline underline-offset-4 hover:text-accent">
          DealShare
        </Link>
      </footer>
    </div>
  )
}

// One shared deal. Every field is optional — the sender chose what to reveal —
// so each piece renders only when it was included AND actually has a value.
function DealCard({ deal }: { deal: SharedDeal }) {
  const money = (key: ShareableFieldKey) =>
    typeof deal[key] === 'number' ? usd(deal[key]) : null

  return (
    <li className={itemCard}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {typeof deal.company_name === 'string' ? deal.company_name : 'Undisclosed company'}
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {deal.company_stage && <Badge>{String(deal.company_stage)}</Badge>}
          {deal.round_status && (
            <Badge value={String(deal.round_status)}>{String(deal.round_status)}</Badge>
          )}
          {deal.your_fund_status && (
            <Badge value={String(deal.your_fund_status)}>
              our status: {String(deal.your_fund_status)}
            </Badge>
          )}
        </div>
      </div>

      {deal.one_liner && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{String(deal.one_liner)}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {deal.sector && <span>Sector: {String(deal.sector)}</span>}
        {deal.geography && <span>Geo: {String(deal.geography)}</span>}
        {deal.round_type && <span>Type: {String(deal.round_type).replace(/_/g, ' ')}</span>}
        {deal.lead_investor && <span>Lead: {String(deal.lead_investor)}</span>}
        {money('round_size') && (
          <span>
            Round: <span className={moneyCls}>{money('round_size')}</span>
          </span>
        )}
        {money('valuation_or_cap') && (
          <span>
            Val/cap: <span className={moneyCls}>{money('valuation_or_cap')}</span>
          </span>
        )}
        {money('committed_so_far') && (
          <span>
            Committed: <span className={moneyCls}>{money('committed_so_far')}</span>
          </span>
        )}
      </div>

      {(deal.website || deal.deck_url) && (
        <div className="mt-2 flex gap-4 text-sm">
          {deal.website && (
            <a
              href={String(deal.website)}
              target="_blank"
              rel="noopener noreferrer"
              className={inlineLink}
            >
              Website ↗
            </a>
          )}
          {deal.deck_url && (
            <a
              href={String(deal.deck_url)}
              target="_blank"
              rel="noopener noreferrer"
              className={inlineLink}
            >
              Deck ↗
            </a>
          )}
        </div>
      )}

      {deal.kpis && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">KPIs: </span>
          <span className="whitespace-pre-wrap">{String(deal.kpis)}</span>
        </p>
      )}

      {deal.notes && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-500 dark:text-zinc-400">
          {String(deal.notes)}
        </p>
      )}
    </li>
  )
}
