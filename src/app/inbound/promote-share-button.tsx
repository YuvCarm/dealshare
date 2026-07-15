'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { btnSecondarySm } from '@/app/ui'
import { promoteShareToPipeline, type ActionState } from './actions'

const initialState: ActionState = { ok: false }

// "Add to my pipeline" for a LIVE in-app share. On success the button becomes
// a confirmation linking straight to the tab the copy landed under.
// `alreadyAdded` is the durable version of that state: the server derives it
// from deals.promoted_from_share_id, so it survives reloads — and the unique
// index behind it (migration 0011) refuses double-adds even from a stale tab.
export default function PromoteShareButton({
  shareId,
  alreadyAdded,
}: {
  shareId: string
  alreadyAdded: boolean
}) {
  const [state, action, pending] = useActionState(promoteShareToPipeline, initialState)

  if (alreadyAdded || state.ok) {
    return (
      <p className="text-sm text-emerald-700 dark:text-emerald-400">
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
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="share_id" value={shareId} />
      <button type="submit" disabled={pending} className={btnSecondarySm}>
        {pending ? 'Adding…' : 'Add to my pipeline'}
      </button>
      {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  )
}
