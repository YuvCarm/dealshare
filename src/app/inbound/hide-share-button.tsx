'use client'

import { useActionState, useState } from 'react'
import { btnSecondarySm } from '@/app/ui'
import { hideInboundShare, type ActionState } from './actions'

const initialState: ActionState = { ok: false }

// A deliberately quiet "Hide" for one in-app share: plain text at rest, so it
// never competes with "Add to my pipeline". Clicking it swaps in a small
// confirm strip — hiding is one click from permanent (there's no unhide
// surface yet), so it deserves an "are you sure", same as deleting a share
// on /shared.
export default function HideShareButton({ shareId }: { shareId: string }) {
  const [confirming, setConfirming] = useState(false)

  // The confirm step lives in its own component so it mounts fresh every time
  // it opens — no error left over from a previous attempt (same shape as
  // DeleteConfirm in share-row-actions).
  if (confirming) {
    return <HideConfirm shareId={shareId} onCancel={() => setConfirming(false)} />
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
    >
      Hide
    </button>
  )
}

function HideConfirm({ shareId, onCancel }: { shareId: string; onCancel: () => void }) {
  const [state, action, pending] = useActionState(hideInboundShare, initialState)

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="share_id" value={shareId} />
      <span className="text-sm text-zinc-600 dark:text-zinc-400">
        Hide this deal? Only you stop seeing it — the sharer isn&apos;t notified.
      </span>
      <button type="submit" disabled={pending} className={`shrink-0 ${btnSecondarySm}`}>
        {pending ? 'Hiding…' : 'Yes, hide'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={pending}
        className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Cancel
      </button>
      {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  )
}
