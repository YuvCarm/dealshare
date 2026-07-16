'use client'

import { fieldLabel, inputCls, areaCls } from '@/app/ui'
import { WarmthInput } from './warmth'
import type { CoInvestor } from './types'

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

// The full set of co-investor inputs. Passing `values` pre-fills them (edit
// mode); leaving it out gives an empty form (add mode). Because both the add
// and edit forms render this, they can never fall out of sync.
//
// `autoWarmth` is the computed warmth for this person (null for a brand-new
// co-investor — no deal history yet), shown by the picker as the value a
// manual override would replace.
export default function CoInvestorFields({
  values,
  autoWarmth = null,
}: {
  values?: CoInvestor
  autoWarmth?: number | null
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Name *">
        <input
          name="name"
          required
          defaultValue={values?.name ?? ''}
          placeholder="Jane Doe"
          className={inputCls}
        />
      </Field>
      <Field label="Fund">
        <input
          name="fund_name"
          defaultValue={values?.fund_name ?? ''}
          placeholder="Acme Ventures"
          className={inputCls}
        />
      </Field>

      <Field label="Email" className="sm:col-span-2">
        <input
          name="email"
          type="email"
          defaultValue={values?.email ?? ''}
          placeholder="jane@acme.vc"
          className={inputCls}
        />
      </Field>

      <Field label="Thesis — stages" className="sm:col-span-2">
        <input
          name="thesis_stages"
          defaultValue={values?.thesis_stages?.join(', ') ?? ''}
          placeholder="seed, A, B+  (comma-separated)"
          className={inputCls}
        />
      </Field>

      <Field label="Thesis — sectors">
        <input
          name="thesis_sectors"
          defaultValue={values?.thesis_sectors?.join(', ') ?? ''}
          placeholder="Fintech, SaaS"
          className={inputCls}
        />
      </Field>
      <Field label="Thesis — geographies">
        <input
          name="thesis_geographies"
          defaultValue={values?.thesis_geographies?.join(', ') ?? ''}
          placeholder="US, Europe"
          className={inputCls}
        />
      </Field>

      <Field label="Check size min (USD)">
        <input
          name="check_size_min"
          type="number"
          min="0"
          step="any"
          defaultValue={values?.check_size_min ?? ''}
          placeholder="250000"
          className={inputCls}
        />
      </Field>
      <Field label="Check size max (USD)">
        <input
          name="check_size_max"
          type="number"
          min="0"
          step="any"
          defaultValue={values?.check_size_max ?? ''}
          placeholder="1000000"
          className={inputCls}
        />
      </Field>

      {/* Deliberately NOT a <label> (unlike Field): a label forwards clicks on
          its text to its first button, so clicking "Warmth" or the hint below
          would silently set a 1/5 manual override. A plain div keeps them inert. */}
      <div className="flex flex-col gap-1 sm:col-span-2">
        <span className={fieldLabel}>Warmth</span>
        <WarmthInput defaultValue={values?.warmth ?? null} autoValue={autoWarmth} />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Set automatically from your deal flow with them — pick dots only to override.
        </span>
      </div>

      <Field label="Notes" className="sm:col-span-2">
        <textarea
          name="notes"
          rows={3}
          defaultValue={values?.notes ?? ''}
          placeholder="How you know them, what they like, last touch…"
          className={areaCls}
        />
      </Field>
    </div>
  )
}
