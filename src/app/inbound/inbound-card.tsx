'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import Badge from '@/app/badge'
import {
  btnDanger,
  btnDangerSolid,
  btnPrimarySm,
  btnSecondarySm,
  inlineLink,
  itemCard,
} from '@/app/ui'
import { addToPipeline, updateInboundDeal, deleteInboundDeal, type ActionState } from './actions'
import InboundFields from './inbound-fields'
import { statusLabel, type CoInvestorOption, type InboundDeal } from './types'

const initialState: ActionState = { ok: false }

// A fixed locale AND timezone: this component renders on the server first and
// again in the browser, and without pinning the timezone the two can disagree
// on the calendar day (a React "hydration mismatch"). UTC also matches what
// the server-rendered pages (like the co-investor profile) display.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function InboundCard({
  deal,
  coInvestors,
}: {
  deal: InboundDeal
  coInvestors: CoInvestorOption[]
}) {
  // Which face of the card is showing right now.
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view')

  // "Already added to my deals" lives up here (not inside AddToPipeline) so it
  // survives switching to Edit or Delete and back — otherwise the button would
  // reappear and allow adding the same deal twice.
  const [added, setAdded] = useState(false)

  if (mode === 'edit') {
    return <EditCard deal={deal} coInvestors={coInvestors} onClose={() => setMode('view')} />
  }

  return (
    <li className={itemCard}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {deal.company_name}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Shared by{' '}
            {deal.co_investors ? (
              <>
                <Link href={`/co-investors/${deal.co_investors.id}`} className={inlineLink}>
                  {deal.co_investors.name}
                </Link>
                {deal.co_investors.fund_name && ` (${deal.co_investors.fund_name})`}
              </>
            ) : (
              'a removed co-investor'
            )}{' '}
            · {formatDate(deal.created_at)}
          </p>
        </div>
        <Badge value={deal.status}>{statusLabel(deal.status)}</Badge>
      </div>

      {deal.notes && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-500 dark:text-zinc-400">
          {deal.notes}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {mode === 'view' ? (
          <>
            <AddToPipeline id={deal.id} added={added} onAdded={() => setAdded(true)} />
            <button type="button" onClick={() => setMode('edit')} className={btnSecondarySm}>
              Edit
            </button>
            <button type="button" onClick={() => setMode('confirm')} className={btnDanger}>
              Delete
            </button>
          </>
        ) : (
          <DeleteConfirm id={deal.id} onCancel={() => setMode('view')} />
        )}
      </div>
    </li>
  )
}

// Copies this inbound deal into your own deals table (company name + notes,
// with a "Source: shared by …" line). On success the button becomes a
// confirmation with a link, which also stops accidental double-adds — the
// `added` flag is owned by the card so it survives Edit/Delete toggles.
function AddToPipeline({
  id,
  added,
  onAdded,
}: {
  id: string
  added: boolean
  onAdded: () => void
}) {
  const [state, action, pending] = useActionState(addToPipeline, initialState)

  useEffect(() => {
    if (state.ok) onAdded()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  if (added) {
    return (
      <span className="text-sm text-emerald-700 dark:text-emerald-400">
        Added ✓{' '}
        <Link
          href="/deals"
          className="underline underline-offset-4 hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          view in Deals
        </Link>
      </span>
    )
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={btnSecondarySm}>
        {pending ? 'Adding…' : 'Add to my pipeline'}
      </button>
      {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  )
}

// The "Are you sure?" step. On success the row is gone from the list (the page
// re-fetches), so this component simply unmounts — no extra cleanup needed.
function DeleteConfirm({ id, onCancel }: { id: string; onCancel: () => void }) {
  const [state, action, pending] = useActionState(deleteInboundDeal, initialState)

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-zinc-600 dark:text-zinc-400">Are you sure?</span>
      <button type="submit" disabled={pending} className={btnDangerSolid}>
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" onClick={onCancel} className={btnSecondarySm}>
        Cancel
      </button>
      {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  )
}

// The edit face: the same fields as "add", pre-filled, plus a hidden id so the
// server knows which row to update. On success we flip back to the view.
function EditCard({
  deal,
  coInvestors,
  onClose,
}: {
  deal: InboundDeal
  coInvestors: CoInvestorOption[]
  onClose: () => void
}) {
  const [state, action, pending] = useActionState(updateInboundDeal, initialState)

  useEffect(() => {
    if (state.ok) onClose()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li className={itemCard}>
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={deal.id} />
        <InboundFields coInvestors={coInvestors} values={deal} />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={btnPrimarySm}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={onClose} className={btnSecondarySm}>
            Cancel
          </button>
          {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        </div>
      </form>
    </li>
  )
}
