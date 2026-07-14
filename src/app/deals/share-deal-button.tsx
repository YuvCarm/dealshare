'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import {
  btnPrimarySm,
  btnSecondarySm,
  checkboxCls,
  fieldLabel,
  inlineLink,
  inputCls,
} from '@/app/ui'
import { SHAREABLE_FIELDS } from '@/app/packets/fields'
import { createDealShare, type ShareFormState } from './share-actions'

// The slice of co_investors the share form needs — the page queries exactly this.
export type CoInvestorOption = {
  id: string
  name: string
  fund_name: string | null
  email: string | null
}

const DEFAULT_ON_FIELDS = SHAREABLE_FIELDS.filter((f) => f.defaultOn)
const DEFAULT_OFF_FIELDS = SHAREABLE_FIELDS.filter((f) => !f.defaultOn)

const initialState: ShareFormState = { ok: false }

// "Share with co-investor" on a deal card. Collapsed it's a single button;
// open it's a small form: pick one co-investor, tick the fields to include
// (same defaults as share packets), share. Shares are addressed to the
// co-investor's EMAIL, so contacts without one can't be picked yet.
export default function ShareDealButton({
  dealId,
  founderConsent,
  coInvestors,
}: {
  dealId: string
  founderConsent: boolean
  coInvestors: CoInvestorOption[]
}) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(createDealShare, initialState)

  // A successful share closes the form; the confirmation shows by the button.
  // (This is React's documented "adjust state while rendering" pattern — it
  // reacts to the action's result without an effect.)
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    if (state.ok) setOpen(false)
  }

  if (!open) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className={btnSecondarySm}>
          Share with co-investor
        </button>
        {state.ok && (
          <span className="text-sm text-emerald-700 dark:text-emerald-400">
            Shared ✓{' '}
            <Link href="/shared" className={inlineLink}>
              View your shares
            </Link>
          </span>
        )}
      </div>
    )
  }

  const shareable = coInvestors.filter((investor) => investor.email)

  // No one to share with yet — explain what's missing instead of an empty form.
  if (shareable.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-zinc-950/[.06] bg-surface p-4 dark:border-white/[.08]">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {coInvestors.length === 0 ? (
            <>
              Shares are addressed to a co-investor&apos;s email.{' '}
              <Link href="/co-investors" className={inlineLink}>
                Add a co-investor first →
              </Link>
            </>
          ) : (
            <>
              None of your co-investors has an email on file yet — shares are addressed to
              their email.{' '}
              <Link href="/co-investors" className={inlineLink}>
                Add one on their profile →
              </Link>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className={`mt-3 ${btnSecondarySm}`}
        >
          Close
        </button>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      className="mt-4 rounded-xl border border-indigo-500 bg-surface p-4 ring-1 ring-indigo-500/40 dark:border-indigo-400 dark:ring-indigo-400/40"
    >
      <input type="hidden" name="deal_id" value={dealId} />

      {!founderConsent && (
        <p className="mb-4 rounded-lg border border-amber-600/25 bg-amber-500/[.08] px-3 py-2 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
          Have you confirmed the founder is OK with sharing this?
        </p>
      )}

      <label className="flex flex-col gap-1">
        <span className={fieldLabel}>Share with *</span>
        <select name="co_investor_id" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            Choose a co-investor…
          </option>
          {coInvestors.map((investor) =>
            investor.email ? (
              <option key={investor.id} value={investor.id}>
                {investor.name}
                {investor.fund_name ? ` — ${investor.fund_name}` : ''}
              </option>
            ) : (
              <option key={investor.id} value="" disabled>
                {investor.name} (no email on file)
              </option>
            )
          )}
        </select>
      </label>

      <div className="mt-4 border-t border-zinc-950/[.06] pt-4 dark:border-white/[.1]">
        <FieldGroup title="Shared by default" fields={DEFAULT_ON_FIELDS} />
        <FieldGroup title="Private — only shared if you tick them" fields={DEFAULT_OFF_FIELDS} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className={btnPrimarySm}>
          {pending ? 'Sharing…' : 'Share deal'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnSecondarySm}>
          Cancel
        </button>
        {state.error && (
          <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
        )}
      </div>
    </form>
  )
}

function FieldGroup({
  title,
  fields,
}: {
  title: string
  fields: (typeof SHAREABLE_FIELDS)[number][]
}) {
  return (
    <fieldset className="mt-3 first:mt-0">
      <legend className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {title}
      </legend>
      <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="flex cursor-pointer items-center gap-2">
            {/* Uncontrolled on purpose: the form only exists while it's open,
                so closing it naturally resets every tick to the defaults. */}
            <input
              type="checkbox"
              name={`field:${field.key}`}
              defaultChecked={field.defaultOn}
              className={checkboxCls}
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{field.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
