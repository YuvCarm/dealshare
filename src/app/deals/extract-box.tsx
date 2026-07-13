'use client'

import { useActionState, useEffect, useState } from 'react'
import { areaCls, btnSecondary, fieldLabel } from '@/app/ui'
import { extractDealFields, type ExtractedDealFields, type ExtractState } from './extract'

const initialState: ExtractState = { ok: false }

// Counts how many fields Claude actually found, for the success message.
function filledCount(fields: ExtractedDealFields): number {
  return Object.values(fields).filter((v) => v != null).length
}

export default function ExtractBox({
  onExtracted,
}: {
  onExtracted: (fields: ExtractedDealFields) => void
}) {
  const [state, formAction, pending] = useActionState(extractDealFields, initialState)
  // Controlled value: React 19 resets form fields after an action runs, and we
  // don't want a rate-limit hiccup to eat a long paste. Controlled = it stays.
  const [text, setText] = useState('')

  // When an extraction finishes, hand the fields to the deal form.
  // (onExtracted is memoized in the parent, so this runs once per extraction.)
  useEffect(() => {
    if (state.ok) onExtracted(state.fields)
  }, [state, onExtracted])

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-xl border border-indigo-600/15 bg-indigo-500/[.04] p-4 dark:border-indigo-400/20 dark:bg-indigo-400/[.06]"
    >
      <label className="flex flex-col gap-1">
        <span className={fieldLabel}>
          Paste deal notes, an email, or deck text — I&apos;ll fill in the fields for you.
        </span>
        <textarea
          name="raw_text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="e.g. Fwd: Acme is raising a $3M seed at a $15M cap, led by Foo Ventures…"
          className={areaCls}
        />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnSecondary}>
          {pending ? 'Extracting…' : 'Extract'}
        </button>
        {pending && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Asking Claude to read your text…
          </p>
        )}
        {!pending && state.ok && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            Filled {filledCount(state.fields)} of 10 fields — review below, then add the deal.
          </p>
        )}
        {!pending && !state.ok && state.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        )}
      </div>
    </form>
  )
}
