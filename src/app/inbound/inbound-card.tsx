'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { addToPipeline, updateInboundDeal, deleteInboundDeal, type ActionState } from './actions'
import InboundFields from './inbound-fields'
import { statusLabel, type CoInvestorOption, type InboundDeal } from './types'

const initialState: ActionState = { ok: false }

// Shared button looks (same as the co-investor cards).
const secondaryBtn =
  'rounded-lg border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black hover:bg-black/[.04] dark:border-white/[.2] dark:text-white dark:hover:bg-white/[.06]'
const primaryBtn =
  'h-9 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]'

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
    <li className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-black dark:text-zinc-50">
            {deal.company_name}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Shared by{' '}
            {deal.co_investors ? (
              <>
                <Link
                  href={`/co-investors/${deal.co_investors.id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
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
        <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {statusLabel(deal.status)}
        </span>
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
            <button type="button" onClick={() => setMode('edit')} className={secondaryBtn}>
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMode('confirm')}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
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
      <span className="text-sm text-green-600 dark:text-green-400">
        Added ✓{' '}
        <Link href="/deals" className="underline hover:text-green-700 dark:hover:text-green-300">
          view in Deals
        </Link>
      </span>
    )
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={secondaryBtn}>
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
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" onClick={onCancel} className={secondaryBtn}>
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
    <li className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={deal.id} />
        <InboundFields coInvestors={coInvestors} values={deal} />
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" onClick={onClose} className={secondaryBtn}>
            Cancel
          </button>
          {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        </div>
      </form>
    </li>
  )
}
