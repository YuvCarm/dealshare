'use client'

import { useActionState, useState } from 'react'
import { btnDanger, btnDangerSolid, btnSecondarySm } from '@/app/ui'
import { deleteDealShare, setDealShareRevoked, type ActionState } from './actions'

const initialState: ActionState = { ok: false }

// The action buttons for one share on the "Shared by me" page.
//   • active share  → Revoke
//   • revoked share → Restore, plus Delete (with an "are you sure?" step,
//     because deleting is permanent — unlike revoke, it can't be undone).
export default function ShareRowActions({
  shareId,
  revoked,
}: {
  shareId: string
  revoked: boolean
}) {
  const [revokeState, revokeAction, revokePending] = useActionState(
    setDealShareRevoked,
    initialState
  )
  const [deleteState, deleteAction, deletePending] = useActionState(deleteDealShare, initialState)
  const [confirming, setConfirming] = useState(false)

  // Active share: a single Revoke button (unchanged behaviour).
  if (!revoked) {
    return (
      <form action={revokeAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={shareId} />
        <input type="hidden" name="revoke" value="true" />
        <button type="submit" disabled={revokePending} className={`shrink-0 ${btnDanger}`}>
          {revokePending ? 'Working…' : 'Revoke'}
        </button>
        {revokeState.error && (
          <span className="text-sm text-red-600 dark:text-red-400">{revokeState.error}</span>
        )}
      </form>
    )
  }

  // Revoked share, mid-delete: the "are you sure?" step.
  if (confirming) {
    return (
      <form action={deleteAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={shareId} />
        <span className="text-sm text-zinc-600 dark:text-zinc-400">Delete this share for good?</span>
        <button type="submit" disabled={deletePending} className={`shrink-0 ${btnDangerSolid}`}>
          {deletePending ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className={`shrink-0 ${btnSecondarySm}`}
        >
          Cancel
        </button>
        {deleteState.error && (
          <span className="text-sm text-red-600 dark:text-red-400">{deleteState.error}</span>
        )}
      </form>
    )
  }

  // Revoked share, at rest: Restore or open the delete confirmation.
  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={revokeAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={shareId} />
        <input type="hidden" name="revoke" value="false" />
        <button type="submit" disabled={revokePending} className={`shrink-0 ${btnSecondarySm}`}>
          {revokePending ? 'Working…' : 'Restore'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`shrink-0 ${btnDanger}`}
      >
        Delete
      </button>
      {revokeState.error && (
        <span className="text-sm text-red-600 dark:text-red-400">{revokeState.error}</span>
      )}
    </div>
  )
}
