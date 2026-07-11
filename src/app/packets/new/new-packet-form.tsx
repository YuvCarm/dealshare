'use client'

import { useActionState, useState } from 'react'
import { createSharePacket, type PacketFormState } from './actions'
import { DEFAULT_ON_KEYS, SHAREABLE_FIELDS, type ShareableFieldKey } from '../fields'

// The slices of each table this form needs — the page queries exactly these.
export type CoInvestorOption = {
  id: string
  name: string
  fund_name: string | null
}

export type DealOption = {
  id: string
  company_name: string
  one_liner: string | null
  founder_consent: boolean
}

const DEFAULT_ON_FIELDS = SHAREABLE_FIELDS.filter((f) => f.defaultOn)
const DEFAULT_OFF_FIELDS = SHAREABLE_FIELDS.filter((f) => !f.defaultOn)

const initialState: PacketFormState = { ok: false }

export default function NewPacketForm({
  coInvestors,
  deals,
}: {
  coInvestors: CoInvestorOption[]
  deals: DealOption[]
}) {
  const [state, formAction, pending] = useActionState(createSharePacket, initialState)

  // Which deals are ticked, and which fields are ticked for each deal.
  // A deal's field choices are remembered even if you untick and re-tick it.
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [fieldsByDeal, setFieldsByDeal] = useState<Record<string, ShareableFieldKey[]>>({})

  function toggleDeal(dealId: string) {
    setSelectedIds((ids) =>
      ids.includes(dealId) ? ids.filter((id) => id !== dealId) : [...ids, dealId]
    )
    // First time a deal is selected, start it from the default field set.
    setFieldsByDeal((prev) => (prev[dealId] ? prev : { ...prev, [dealId]: DEFAULT_ON_KEYS }))
  }

  function toggleField(dealId: string, key: ShareableFieldKey) {
    setFieldsByDeal((prev) => {
      const current = prev[dealId] ?? []
      return {
        ...prev,
        [dealId]: current.includes(key)
          ? current.filter((k) => k !== key)
          : [...current, key],
      }
    })
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {/* Step 1 — who is this packet for? */}
      <section>
        <h2 className="text-base font-semibold text-black dark:text-zinc-50">
          1 · Who is it for?
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Each packet goes to exactly one co-investor.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {coInvestors.map((investor) => (
            <label
              key={investor.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-black/[.08] bg-white p-4 has-[:checked]:border-black dark:border-white/[.145] dark:bg-zinc-950 dark:has-[:checked]:border-white"
            >
              <input
                type="radio"
                name="co_investor_id"
                value={investor.id}
                required
                className="h-4 w-4"
              />
              <span className="text-sm font-medium text-black dark:text-zinc-50">
                {investor.name}
              </span>
              {investor.fund_name && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {investor.fund_name}
                </span>
              )}
            </label>
          ))}
        </div>
      </section>

      {/* Step 2 — which deals, and which fields of each? */}
      <section>
        <h2 className="text-base font-semibold text-black dark:text-zinc-50">
          2 · Which deals?
        </h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Tick a deal to include it, then fine-tune exactly which details are shared.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {deals.map((deal) => {
            const isSelected = selectedIds.includes(deal.id)
            const dealFields = fieldsByDeal[deal.id] ?? []
            return (
              <div
                key={deal.id}
                className={`rounded-xl border bg-white p-4 dark:bg-zinc-950 ${
                  isSelected
                    ? 'border-black dark:border-white'
                    : 'border-black/[.08] dark:border-white/[.145]'
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    name={`deal:${deal.id}`}
                    checked={isSelected}
                    onChange={() => toggleDeal(deal.id)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-black dark:text-zinc-50">
                      {deal.company_name}
                    </span>
                    {deal.one_liner && (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {deal.one_liner}
                      </span>
                    )}
                  </span>
                </label>

                {/* The field picker only exists in the page (and so in the
                    submitted form) while its deal is ticked. */}
                {isSelected && (
                  <div className="mt-4 border-t border-black/[.06] pt-4 dark:border-white/[.1]">
                    {!deal.founder_consent && (
                      <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                        Have you confirmed the founder is OK with sharing this?
                      </p>
                    )}

                    <FieldGroup
                      title="Shared by default"
                      fields={DEFAULT_ON_FIELDS}
                      dealId={deal.id}
                      ticked={dealFields}
                      onToggle={toggleField}
                    />
                    <FieldGroup
                      title="Private — only shared if you tick them"
                      fields={DEFAULT_OFF_FIELDS}
                      dealId={deal.id}
                      ticked={dealFields}
                      onToggle={toggleField}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-lg bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {pending ? 'Creating…' : 'Create share packet'}
        </button>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {selectedIds.length === 0
            ? 'No deals selected yet'
            : `${selectedIds.length} ${selectedIds.length === 1 ? 'deal' : 'deals'} selected`}
        </span>
      </div>
      {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  )
}

function FieldGroup({
  title,
  fields,
  dealId,
  ticked,
  onToggle,
}: {
  title: string
  fields: typeof SHAREABLE_FIELDS[number][]
  dealId: string
  ticked: ShareableFieldKey[]
  onToggle: (dealId: string, key: ShareableFieldKey) => void
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
              name={`field:${dealId}:${field.key}`}
              checked={ticked.includes(field.key)}
              onChange={() => onToggle(dealId, field.key)}
              className="h-4 w-4"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">{field.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
