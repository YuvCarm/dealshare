// The shared looks of the "Graphite Signal" theme, in one place.
// These are plain Tailwind class strings — import them from any component
// (server or client) instead of re-typing the same classes in every file.

// ---- Buttons ---------------------------------------------------------------
// Primary: solid zinc-950 (inverts to white in dark mode), with an inset
// hairline highlight and a small press-in on click so it feels machined.
const primaryBase =
  'inline-flex items-center justify-center rounded-lg bg-zinc-950 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_1px_2px_rgb(0_0_0/0.2)] transition-[background-color,scale] duration-150 hover:bg-zinc-800 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:shadow-[inset_0_-1px_0_rgb(0_0_0/0.12)] dark:hover:bg-white'

export const btnPrimary = `h-10 px-5 ${primaryBase}` // form submits, empty-state CTAs
export const btnPrimaryLg = `h-11 px-6 ${primaryBase}` // hero, login, page-level CTAs
export const btnPrimarySm = `h-8 px-3 ${primaryBase}` // inside list cards

// Secondary: quiet bordered button; hover brightens the border, not just the fill.
const secondaryBase =
  'inline-flex items-center justify-center rounded-lg border border-zinc-950/10 bg-white text-sm font-medium text-zinc-900 shadow-[0_1px_2px_rgb(9_9_11/0.04)] transition-colors duration-150 hover:border-zinc-950/20 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-white/[.04] dark:text-zinc-100 dark:shadow-none dark:hover:border-white/20 dark:hover:bg-white/[.08]'

export const btnSecondary = `h-9 px-3.5 ${secondaryBase}` // standalone
export const btnSecondarySm = `h-8 px-3 ${secondaryBase}` // header + inside list cards
export const btnSecondaryLg = `h-11 px-5 ${secondaryBase}` // next to a large primary

// Danger: quiet red outline at rest; solid red only at the "are you sure" step.
export const btnDanger =
  'inline-flex h-8 items-center justify-center rounded-lg border border-red-600/20 px-3 text-sm font-medium text-red-600 transition-colors duration-150 hover:border-red-600/40 hover:bg-red-500/[.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 dark:border-red-400/25 dark:text-red-400 dark:hover:border-red-400/45 dark:hover:bg-red-400/[.08]'

export const btnDangerSolid =
  'inline-flex h-8 items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.15)] transition-[background-color,scale] duration-150 hover:bg-red-500 active:scale-[.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50'

// ---- Form fields -----------------------------------------------------------
// The soft 3px indigo halo on focus is where the accent color lives.
const fieldBase =
  'w-full rounded-lg border border-zinc-950/10 bg-white text-zinc-950 shadow-[0_1px_2px_rgb(9_9_11/0.03)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-500 focus:border-indigo-500 focus:ring-[3px] focus:ring-indigo-500/15 dark:border-white/10 dark:bg-white/[.04] dark:text-zinc-50 dark:shadow-none dark:placeholder:text-zinc-400 dark:focus:border-indigo-400 dark:focus:ring-indigo-400/20'

export const inputCls = `h-10 px-3 text-sm ${fieldBase}`
// text-base (16px) on the large variant: it's the login page's only field,
// and anything smaller makes iOS zoom the page when the input is focused.
export const inputLg = `h-11 px-3 text-base ${fieldBase}`
export const areaCls = `px-3 py-2 text-sm ${fieldBase}`
export const checkboxCls = 'h-4 w-4 rounded accent-indigo-600 dark:accent-indigo-400'
export const radioCls = 'h-4 w-4 accent-indigo-600 dark:accent-indigo-400'
export const fieldLabel = 'text-[13px] font-medium text-zinc-600 dark:text-zinc-400'

// ---- Surfaces ----------------------------------------------------------------
export const sectionCard =
  'rounded-2xl border border-zinc-950/[.06] bg-surface p-6 shadow-card dark:border-white/[.08] dark:shadow-none'

// List items lift 1px and sharpen their border on hover — the list feels alive.
export const itemCard =
  'rounded-xl border border-zinc-950/[.06] bg-surface p-5 shadow-card transition-[border-color,box-shadow,translate] duration-200 hover:-translate-y-px hover:border-zinc-950/[.12] hover:shadow-card-hover dark:border-white/[.08] dark:shadow-none dark:hover:border-white/[.16]'

export const errorBox =
  'rounded-lg border border-red-600/15 bg-red-500/[.06] p-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/[.08] dark:text-red-300'

// ---- Text -------------------------------------------------------------------
export const inlineLink = 'font-medium text-accent underline-offset-4 hover:underline'

// Money and counts render in Geist Mono with tabular figures, so columns of
// $ values line up and read like a term sheet.
export const moneyCls =
  'font-mono text-[13px] font-medium tabular-nums text-zinc-800 dark:text-zinc-200'
export const countCls =
  'ml-1.5 font-mono text-sm font-normal tabular-nums text-zinc-500 dark:text-zinc-400'
