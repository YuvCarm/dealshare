'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { updateCoInvestor, deleteCoInvestor, type ActionState } from './actions'
import CoInvestorFields from './co-investor-fields'
import { WarmthDots } from './warmth'
import type { CoInvestor } from './types'

const initialState: ActionState = { ok: false }

// Shared button looks.
const secondaryBtn =
  'rounded-lg border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:text-white dark:hover:bg-white/[.06]'
const primaryBtn =
  'h-9 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]'

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

// Turn a min/max pair into one readable range string.
function checkRange(min: number | null, max: number | null): string | null {
  const lo = money(min)
  const hi = money(max)
  if (lo && hi) return `${lo}–${hi}`
  if (lo) return `${lo}+`
  if (hi) return `up to ${hi}`
  return null
}

export default function CoInvestorCard({ investor }: { investor: CoInvestor }) {
  // Which face of the card is showing right now.
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm'>('view')

  if (mode === 'edit') {
    return <EditCard investor={investor} onClose={() => setMode('view')} />
  }

  const stages = investor.thesis_stages?.join(', ')
  const sectors = investor.thesis_sectors?.join(', ')
  const geos = investor.thesis_geographies?.join(', ')
  const range = checkRange(investor.check_size_min, investor.check_size_max)

  return (
    <li className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-black dark:text-zinc-50">
            <Link href={`/co-investors/${investor.id}`} className="hover:underline">
              {investor.name}
            </Link>
          </h3>
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

      <div className="mt-4 flex items-center gap-2">
        {mode === 'view' ? (
          <>
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
          <DeleteConfirm id={investor.id} onCancel={() => setMode('view')} />
        )}
      </div>
    </li>
  )
}

// The "Are you sure?" step. On success the row is gone from the list (the page
// re-fetches), so this component simply unmounts — no extra cleanup needed.
function DeleteConfirm({ id, onCancel }: { id: string; onCancel: () => void }) {
  const [state, action, pending] = useActionState(deleteCoInvestor, initialState)

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-sm text-zinc-600 dark:text-zinc-400">Are you sure?</span>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-lg bg-red-600 px-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
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
function EditCard({ investor, onClose }: { investor: CoInvestor; onClose: () => void }) {
  const [state, action, pending] = useActionState(updateCoInvestor, initialState)

  useEffect(() => {
    if (state.ok) onClose()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950">
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="id" value={investor.id} />
        <CoInvestorFields values={investor} />
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
