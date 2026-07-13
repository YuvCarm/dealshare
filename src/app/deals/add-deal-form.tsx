'use client'

import { useActionState, useCallback, useEffect, useRef } from 'react'
import { createDeal, type DealFormState } from './actions'
import ExtractBox from './extract-box'
import type { ExtractedDealFields } from './extract'

// These match the enum values in the database exactly.
const STAGES = ['pre-seed', 'seed', 'A', 'B+']
const ROUND_STATUSES = ['open', 'closed']
const ROUND_TYPES = ['priced_equity', 'safe', 'convertible_note', 'bridge']
const FUND_STATUSES = ['evaluating', 'investing', 'passed']

const inputCls =
  'h-10 rounded-lg border border-black/[.12] bg-white px-3 text-sm text-black outline-none focus:border-black dark:border-white/[.2] dark:bg-black dark:text-white'
const areaCls =
  'rounded-lg border border-black/[.12] bg-white px-3 py-2 text-sm text-black outline-none focus:border-black dark:border-white/[.2] dark:bg-black dark:text-white'

function Field({
  label,
  className = '',
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  )
}

const initialState: DealFormState = { ok: false }

export default function AddDealForm() {
  const [state, formAction, pending] = useActionState(createDeal, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the form after a successful save.
  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  // Copy Claude's extracted values into the form fields. The form stays a
  // plain uncontrolled form (nothing is saved here) — the user reviews and
  // edits, then clicks "Add deal" like always. Fields Claude couldn't find
  // (null) are skipped so anything already typed isn't wiped out.
  const applyExtracted = useCallback((fields: ExtractedDealFields) => {
    const form = formRef.current
    if (!form) return
    for (const [name, value] of Object.entries(fields)) {
      if (value == null) continue
      const el = form.elements.namedItem(name)
      if (
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement
      ) {
        el.value = String(value)
      }
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <ExtractBox onExtracted={applyExtracted} />
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company name *" className="sm:col-span-2">
          <input name="company_name" required placeholder="Acme Inc." className={inputCls} />
        </Field>

        <Field label="One-liner" className="sm:col-span-2">
          <input name="one_liner" placeholder="What they do, in a sentence" className={inputCls} />
        </Field>

        <Field label="Website">
          <input name="website" type="url" placeholder="https://…" className={inputCls} />
        </Field>
        <Field label="Lead investor">
          <input name="lead_investor" placeholder="e.g. Sequoia" className={inputCls} />
        </Field>

        <Field label="Sector">
          <input name="sector" placeholder="e.g. Fintech" className={inputCls} />
        </Field>
        <Field label="Geography">
          <input name="geography" placeholder="e.g. US / Europe" className={inputCls} />
        </Field>

        <Field label="Stage">
          <select name="company_stage" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Round type">
          <select name="round_type" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {ROUND_TYPES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Round size (USD)">
          <input name="round_size" type="number" min="0" step="any" placeholder="1000000" className={inputCls} />
        </Field>
        <Field label="Valuation / cap (USD)">
          <input name="valuation_or_cap" type="number" min="0" step="any" placeholder="10000000" className={inputCls} />
        </Field>

        <Field label="Committed so far (USD)">
          <input name="committed_so_far" type="number" min="0" step="any" placeholder="250000" className={inputCls} />
        </Field>
        <Field label="Round status">
          <select name="round_status" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {ROUND_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Your fund status">
          <select name="your_fund_status" defaultValue="" className={inputCls}>
            <option value="">—</option>
            {FUND_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Deck URL">
          <input name="deck_url" type="url" placeholder="https://…" className={inputCls} />
        </Field>

        <Field label="KPIs" className="sm:col-span-2">
          <textarea name="kpis" rows={2} placeholder="Revenue, growth, burn, etc." className={areaCls} />
        </Field>

        <Field label="Notes" className="sm:col-span-2">
          <textarea name="notes" rows={3} placeholder="Anything else worth remembering" className={areaCls} />
        </Field>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input name="founder_consent" type="checkbox" className="h-4 w-4" />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Founder has consented to sharing this deal
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-lg bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {pending ? 'Saving…' : 'Add deal'}
        </button>
        {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        {state.ok && <p className="text-sm text-green-600 dark:text-green-400">Deal added ✓</p>}
      </div>
      </form>
    </div>
  )
}
