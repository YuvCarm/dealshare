'use client'

import { useEffect, useRef, useState } from 'react'

const DOTS = [1, 2, 3, 4, 5]

// Warmth is AUTOMATIC by default: computed from the reciprocity ratio (deals
// they sent you ÷ deals you sent them — see auto-warmth.ts). The `warmth`
// column only stores a MANUAL OVERRIDE; null means "automatic". These two
// components are the override picker (forms) and the read-only dots (lists).

// The manual-override picker used inside the forms.
//
// It keeps the chosen number in React state and mirrors it into a hidden text
// input, because that hidden input is what actually gets submitted with the
// form (a row of <button>s wouldn't send any value on its own). A value of 0
// means "automatic", and we submit an empty string so the database stores
// null. While automatic, the dots preview the computed value (`autoValue`) in
// a softer amber, so you can see what you'd be overriding.
export function WarmthInput({
  name = 'warmth',
  defaultValue = null,
  autoValue = null,
}: {
  name?: string
  defaultValue?: number | null
  autoValue?: number | null
}) {
  const [value, setValue] = useState<number>(defaultValue ?? 0)
  const ref = useRef<HTMLInputElement>(null)

  // Subscribe to the surrounding form's native "reset" event so the picker
  // clears along with the rest of the fields after a successful add. Setting
  // state inside this event callback (not in the effect body) is the allowed,
  // idiomatic way to sync React state to an external event.
  useEffect(() => {
    const form = ref.current?.form
    if (!form) return
    const handleReset = () => setValue(defaultValue ?? 0)
    form.addEventListener('reset', handleReset)
    return () => form.removeEventListener('reset', handleReset)
  }, [defaultValue])

  const automatic = value === 0

  return (
    <div className="flex items-center gap-3">
      <input ref={ref} type="hidden" name={name} value={value === 0 ? '' : String(value)} />
      <div className="flex items-center gap-1.5">
        {DOTS.map((n) => {
          const filled = n <= value
          // The ghost preview: while on automatic, show the computed level in
          // washed-out amber (a hint, not a hand-set choice).
          const ghosted = automatic && n <= (autoValue ?? 0)
          return (
            <button
              key={n}
              type="button"
              // Click a dot to override at that level; click the current top
              // dot again to clear back to automatic.
              onClick={() => setValue((v) => (v === n ? 0 : n))}
              aria-label={`Override warmth to ${n} of 5`}
              aria-pressed={filled}
              className="-m-1 p-1"
            >
              <span
                className={`block h-4 w-4 rounded-full border transition-colors ${
                  filled
                    ? 'border-amber-500 bg-amber-500'
                    : ghosted
                      ? 'border-amber-400/40 bg-amber-400/40'
                      : 'border-zinc-950/20 bg-transparent hover:border-amber-400 dark:border-white/25'
                }`}
              />
            </button>
          )
        })}
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {automatic
          ? autoValue == null
            ? 'Automatic — no deal history yet'
            : `Automatic — ${autoValue}/5 from deal flow`
          : `${value}/5 manual override`}
      </span>
    </div>
  )
}

// The read-only warmth display used in the lists: filled/empty dots, plus a
// small "auto" tag when the value is computed rather than hand-set.
export function WarmthDots({ value, auto = false }: { value: number | null; auto?: boolean }) {
  const level = value ?? 0
  const label =
    value == null
      ? auto
        ? 'Warmth: automatic, no deal history yet'
        : 'Warmth not set'
      : `Warmth ${value} of 5 (${auto ? 'automatic, from deal flow' : 'manual override'})`
  return (
    <span className="inline-flex items-center gap-1.5" title={label} aria-label={label}>
      <span className="inline-flex items-center gap-1">
        {DOTS.map((n) => (
          <span
            key={n}
            className={`h-2.5 w-2.5 rounded-full ${
              n <= level ? 'bg-amber-500' : 'bg-zinc-950/[.08] dark:bg-white/[.12]'
            }`}
          />
        ))}
      </span>
      {auto && value != null && (
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          auto
        </span>
      )}
    </span>
  )
}
