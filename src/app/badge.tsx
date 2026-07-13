// Small status chips. Color is semantic: a value only gets color when it
// carries meaning (open = emerald, evaluating = amber, investing = indigo,
// passed = rose) — everything else stays quiet zinc. Pass the RAW enum value
// as `value`; unknown values fall back to neutral.
const VARIANTS: Record<string, string> = {
  neutral:
    'bg-zinc-100 text-zinc-600 ring-zinc-950/[.06] dark:bg-white/[.06] dark:text-zinc-300 dark:ring-white/[.08]',
  open: 'bg-emerald-500/[.08] text-emerald-700 ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20',
  closed:
    'bg-zinc-100 text-zinc-600 ring-zinc-950/[.06] dark:bg-white/[.04] dark:text-zinc-400 dark:ring-white/[.06]',
  evaluating:
    'bg-amber-500/[.08] text-amber-700 ring-amber-600/25 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20',
  investing:
    'bg-indigo-500/[.08] text-indigo-700 ring-indigo-600/20 dark:bg-indigo-400/10 dark:text-indigo-300 dark:ring-indigo-400/25',
  passed:
    'bg-rose-500/[.08] text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/20',
}

export default function Badge({
  value,
  children,
}: {
  value?: string | null
  children: React.ReactNode
}) {
  const variant = VARIANTS[value ?? ''] ?? VARIANTS.neutral
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${variant}`}
    >
      {children}
    </span>
  )
}
