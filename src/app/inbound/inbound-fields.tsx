'use client'

import { fieldLabel, inputCls, areaCls } from '@/app/ui'
import { INBOUND_STATUSES, type CoInvestorOption, type InboundDeal } from './types'

// The one set of form fields for an inbound deal, used by BOTH the add form
// and the edit face of a card (pre-filled via `values`), so they never drift.

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
      <span className={fieldLabel}>{label}</span>
      {children}
    </label>
  )
}

export default function InboundFields({
  coInvestors,
  values,
}: {
  coInvestors: CoInvestorOption[]
  values?: InboundDeal
}) {
  // If the sharer was deleted, the deal's co_investor_id is null. Editing it
  // must not force a false re-attribution to someone else, so in that one
  // case we offer a selectable "(removed co-investor)" choice that keeps the
  // deal unattributed — and only then is the field not required.
  const sharerRemoved = values !== undefined && values.co_investor_id === null

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Company name *" className="sm:col-span-2">
        <input
          name="company_name"
          required
          defaultValue={values?.company_name ?? ''}
          placeholder="Acme Inc."
          className={inputCls}
        />
      </Field>

      <Field label={sharerRemoved ? 'Shared by' : 'Shared by *'}>
        <select
          name="co_investor_id"
          required={!sharerRemoved}
          defaultValue={values?.co_investor_id ?? ''}
          className={inputCls}
        >
          {sharerRemoved ? (
            <option value="">(removed co-investor)</option>
          ) : (
            <option value="" disabled>
              Choose a co-investor…
            </option>
          )}
          {coInvestors.map((investor) => (
            <option key={investor.id} value={investor.id}>
              {investor.name}
              {investor.fund_name ? ` — ${investor.fund_name}` : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Status">
        <select name="status" defaultValue={values?.status ?? 'interested'} className={inputCls}>
          {INBOUND_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notes" className="sm:col-span-2">
        <textarea
          name="notes"
          rows={2}
          defaultValue={values?.notes ?? ''}
          placeholder="Intro context, your first impression, next step…"
          className={areaCls}
        />
      </Field>
    </div>
  )
}
