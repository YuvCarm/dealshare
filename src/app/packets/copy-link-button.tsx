'use client'

import { useState, useSyncExternalStore } from 'react'

// Shows a packet's shareable link with a copy button. The server doesn't know
// which domain the app is running on (localhost while developing,
// dealshare.dev in production), so the full URL is built here in the browser,
// where window.location.origin always knows.

// The origin never changes while the page is open, so there's nothing to
// subscribe to — this no-op satisfies useSyncExternalStore's contract.
const noopSubscribe = () => () => {}

// Same skeleton as ui.ts's btnSecondarySm, but with the text color split out
// so it can flip to emerald while the "Copied ✓" confirmation is showing.
const copyBtnBase =
  'inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-zinc-950/10 bg-white px-3 text-sm font-medium shadow-[0_1px_2px_rgb(9_9_11/0.04)] transition-colors duration-150 hover:border-zinc-950/20 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/10 dark:bg-white/[.04] dark:shadow-none dark:hover:border-white/20 dark:hover:bg-white/[.08]'

export default function CopyLinkButton({ path }: { path: string }) {
  // Server (and the first hydration render) shows the bare path; the client
  // immediately upgrades to the absolute URL. useSyncExternalStore gives us
  // that server/client split without a hydration mismatch — and without
  // setting state from an effect.
  const fullUrl = useSyncExternalStore(
    noopSubscribe,
    () => new URL(path, window.location.origin).href, // client snapshot
    () => path // server snapshot
  )
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access can be blocked — fall back to showing the link so it
      // can be copied by hand.
      window.prompt('Copy this link:', fullUrl)
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <code
        title={fullUrl}
        className="min-w-0 truncate rounded-md border border-zinc-950/[.06] bg-zinc-950/[.03] px-2.5 py-1.5 font-mono text-xs text-zinc-600 dark:border-white/[.07] dark:bg-white/[.05] dark:text-zinc-400"
      >
        {fullUrl}
      </code>
      <button
        type="button"
        onClick={copy}
        className={`${copyBtnBase} ${
          copied
            ? 'text-emerald-700 dark:text-emerald-400'
            : 'text-zinc-900 dark:text-zinc-100'
        }`}
      >
        {copied ? 'Copied ✓' : 'Copy link'}
      </button>
    </div>
  )
}
