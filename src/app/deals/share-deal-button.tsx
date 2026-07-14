'use client'

import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import {
  btnPrimarySm,
  btnSecondarySm,
  checkboxCls,
  fieldLabel,
  inlineLink,
  inputCls,
} from '@/app/ui'
import {
  DEFAULT_ON_KEYS,
  SHAREABLE_FIELDS,
  type ShareableFieldKey,
} from '@/app/packets/fields'
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
  const [shared, setShared] = useState(false)

  if (!open) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setOpen(true)} className={btnSecondarySm}>
          Share with co-investor
        </button>
        {shared && (
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
    <ShareDealForm
      dealId={dealId}
      founderConsent={founderConsent}
      coInvestors={coInvestors}
      onDone={() => {
        setOpen(false)
        setShared(true)
      }}
      onCancel={() => setOpen(false)}
    />
  )
}

// The form proper. It mounts fresh every time the panel opens and unmounts on
// close, so a reopened form always starts clean: default ticks, no recipient
// picked, no leftover error from an earlier attempt.
function ShareDealForm({
  dealId,
  founderConsent,
  coInvestors,
  onDone,
  onCancel,
}: {
  dealId: string
  founderConsent: boolean
  coInvestors: CoInvestorOption[]
  onDone: () => void
  onCancel: () => void
}) {
  const [state, formAction, pending] = useActionState(createDealShare, initialState)

  // Controlled on purpose: React 19 resets a form's UNcontrolled inputs back
  // to their defaults whenever the action finishes — even when it returns an
  // error. Keeping the recipient and the ticks in state means a failed submit
  // can never silently revert the choices you made before retrying.
  const [coInvestorId, setCoInvestorId] = useState('')
  const [ticked, setTicked] = useState<ShareableFieldKey[]>(DEFAULT_ON_KEYS)

  useEffect(() => {
    if (state.ok) onDone()
  }, [state]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleField(key: ShareableFieldKey) {
    setTicked((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
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
        <select
          name="co_investor_id"
          required
          value={coInvestorId}
          onChange={(event) => setCoInvestorId(event.target.value)}
          className={inputCls}
        >
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
        <FieldGroup
          title="Shared by default"
          fields={DEFAULT_ON_FIELDS}
          ticked={ticked}
          onToggle={toggleField}
        />
        <FieldGroup
          title="Private — only shared if you tick them"
          fields={DEFAULT_OFF_FIELDS}
          ticked={ticked}
          onToggle={toggleField}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending} className={btnPrimarySm}>
          {pending ? 'Sharing…' : 'Share deal'}
        </button>
        <button type="button" onClick={onCancel} className={btnSecondarySm}>
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
  ticked,
  onToggle,
}: {
  title: string
  fields: (typeof SHAREABLE_FIELDS)[number][]
  ticked: ShareableFieldKey[]
  onToggle: (key: ShareableFieldKey) => void
}) {
  return (
    <fieldset className="mt-3 first:mt-0">
      <legend className="text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {title}
      </legend>
      <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              name={`field:${field.key}`}
              checked={ticked.includes(field.key)}
              onChange={() => onToggle(field.key)}
              className={checkboxCls}
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{field.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
