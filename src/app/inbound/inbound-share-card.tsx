import Badge from '@/app/badge'
import { inlineLink, itemCard, moneyCls } from '@/app/ui'
import { SHAREABLE_FIELDS, type ShareableFieldKey } from '@/app/packets/fields'
import HideShareButton from './hide-share-button'
import PromoteShareButton from './promote-share-button'
import type { InAppShare, InAppSharedDeal } from './types'

// One deal a co-investor shared with you INSIDE DealShare (a live deal_shares
// row, surfaced through the inbound_deal_shares() function). The deal arrives
// already trimmed to the fields the sharer chose, so every field is optional
// and each piece renders only when it was included AND has a value — exactly
// like the public packet viewer at /p/[token].
//
// Visually set apart from manually-logged inbound deals: an accent spine down
// the left edge and a "Shared in-app" chip, so at a glance you can tell a live
// in-app share from a deal you jotted down after a phone call.

function usd(n: number): string {
  return '$' + n.toLocaleString('en-US')
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function InboundShareCard({
  share,
  alreadyAdded,
}: {
  share: InAppShare
  // True when a deal in the viewer's pipeline already points back at this
  // share (deals.promoted_from_share_id) — shown as "Added ✓" from the start.
  alreadyAdded: boolean
}) {
  const deal = share.deal

  const money = (key: ShareableFieldKey) =>
    typeof deal[key] === 'number' ? usd(deal[key] as number) : null

  return (
    <li className={`${itemCard} border-l-2 border-l-accent`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {typeof deal.company_name === 'string' ? deal.company_name : 'Undisclosed company'}
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent ring-1 ring-inset ring-accent/20">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          Shared in-app
        </span>
      </div>

      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Shared {formatDate(share.created_at)} ·{' '}
        <span className="tabular-nums">
          {share.included_fields.length} of {SHAREABLE_FIELDS.length}
        </span>{' '}
        fields included
      </p>

      <DealFields deal={deal} money={money} />

      {/* Card footer: the promote action on the left, and a quiet "Hide" on
          the right — the recipient's way to dismiss a share they never asked
          for (the sharer keeps their share row; see hideInboundShare). */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <PromoteShareButton shareId={share.share_id} alreadyAdded={alreadyAdded} />
        <HideShareButton shareId={share.share_id} />
      </div>
    </li>
  )
}

// The trimmed deal fields, kept separate from the card chrome above.
function DealFields({
  deal,
  money,
}: {
  deal: InAppSharedDeal
  money: (key: ShareableFieldKey) => string | null
}) {
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {deal.company_stage && <Badge>{String(deal.company_stage)}</Badge>}
        {deal.round_status && (
          <Badge value={String(deal.round_status)}>{String(deal.round_status)}</Badge>
        )}
        {deal.your_fund_status && (
          <Badge value={String(deal.your_fund_status)}>
            their status: {String(deal.your_fund_status)}
          </Badge>
        )}
      </div>

      {deal.one_liner && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">{String(deal.one_liner)}</p>
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
    </>
  )
}
