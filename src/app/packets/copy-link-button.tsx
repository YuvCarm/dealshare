'use client'

import { useEffect, useState } from 'react'

// Shows a packet's shareable link with a copy button. The server doesn't know
// which domain the app is running on (localhost while developing,
// dealshare.dev in production), so the full URL is built here in the browser,
// where window.location.origin always knows.
export default function CopyLinkButton({ path }: { path: string }) {
  const [fullUrl, setFullUrl] = useState(path)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setFullUrl(new URL(path, window.location.origin).href)
  }, [path])

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
        className="min-w-0 truncate rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      >
        {fullUrl}
      </code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg border border-black/[.12] px-3 py-1.5 text-sm font-medium text-black hover:bg-black/[.04] dark:border-white/[.2] dark:text-white dark:hover:bg-white/[.06]"
      >
        {copied ? 'Copied ✓' : 'Copy link'}
      </button>
    </div>
  )
}
