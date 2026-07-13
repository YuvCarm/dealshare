'use client'

import { useEffect, useRef, useState } from 'react'

const DOTS = [1, 2, 3, 4, 5]

// The interactive warmth picker used inside the forms.
//
// It keeps the chosen number in React state and mirrors it into a hidden text
// input, because that hidden input is what actually gets submitted with the
// form (a row of <button>s wouldn't send any value on its own). A value of 0
// means "not set", and we submit an empty string so the database stores null.
export function WarmthInput({
  name = 'warmth',
  defaultValue = null,
}: {
  name?: string
  defaultValue?: number | null
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

  return (
    <div className="flex items-center gap-3">
      <input ref={ref} type="hidden" name={name} value={value === 0 ? '' : String(value)} />
      <div className="flex items-center gap-1.5">
        {DOTS.map((n) => {
          const filled = n <= value
          return (
            <button
              key={n}
              type="button"
              // Click a dot to set that level; click the current top dot again to clear.
              onClick={() => setValue((v) => (v === n ? 0 : n))}
              aria-label={`Set warmth to ${n} of 5`}
              aria-pressed={filled}
              className="-m-1 p-1"
            >
              <span
                className={`block h-4 w-4 rounded-full border transition-colors ${
                  filled
                    ? 'border-amber-500 bg-amber-500'
                    : 'border-zinc-950/20 bg-transparent hover:border-amber-400 dark:border-white/25'
                }`}
              />
            </button>
          )
        })}
      </div>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {value === 0 ? 'Not set' : `${value}/5`}
      </span>
    </div>
  )
}

// The read-only warmth display used in the list: filled/empty dots, no number.
export function WarmthDots({ value }: { value: number | null }) {
  const level = value ?? 0
  return (
    <span
      className="inline-flex items-center gap-1"
      title={value == null ? 'Warmth not set' : `Warmth ${value} of 5`}
      aria-label={value == null ? 'Warmth not set' : `Warmth ${value} out of 5`}
    >
      {DOTS.map((n) => (
        <span
          key={n}
          className={`h-2.5 w-2.5 rounded-full ${
            n <= level ? 'bg-amber-500' : 'bg-zinc-950/[.08] dark:bg-white/[.12]'
          }`}
        />
      ))}
    </span>
  )
}
