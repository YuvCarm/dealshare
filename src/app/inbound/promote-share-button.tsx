'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { btnSecondarySm } from '@/app/ui'
import { promoteShareToPipeline, type ActionState } from './actions'

const initialState: ActionState = { ok: false }

// "Add to my pipeline" for a LIVE in-app share. On success the button becomes
// a confirmation linking straight to the tab the copy landed under — which
// also stops accidental double-adds. (Unlike the manual card, this card has no
// edit/delete faces to toggle through, so state.ok alone is enough here.)
export default function PromoteShareButton({ shareId }: { shareId: string }) {
  const [state, action, pending] = useActionState(promoteShareToPipeline, initialState)

  if (state.ok) {
    return (
      <p className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">
        Added ✓{' '}
        <Link
          href="/deals?tab=promoted_from_inbound"
          className="underline underline-offset-4 hover:text-emerald-700 dark:hover:text-emerald-300"
        >
          view in Deals
        </Link>
      </p>
    )
  }

  return (
    <form action={action} className="mt-4 flex flex-wrap items-center gap-2">
      <input type="hidden" name="share_id" value={shareId} />
      <button type="submit" disabled={pending} className={btnSecondarySm}>
        {pending ? 'Adding…' : 'Add to my pipeline'}
      </button>
      {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  )
}
