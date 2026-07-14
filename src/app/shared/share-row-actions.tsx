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

  // Revoked share, mid-delete: the confirm step lives in its own component so
  // it mounts fresh every time it opens — no error left over from a previous
  // attempt (same shape as DeleteConfirm in co-investor-card / inbound-card).
  if (confirming) {
    return <DeleteConfirm shareId={shareId} onCancel={() => setConfirming(false)} />
  }

  // Revoked share, at rest: Restore, or open the delete confirmation. Delete is
  // disabled while a Restore is in flight so the two can't race each other.
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
        disabled={revokePending}
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

function DeleteConfirm({ shareId, onCancel }: { shareId: string; onCancel: () => void }) {
  const [state, action, pending] = useActionState(deleteDealShare, initialState)

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={shareId} />
      <span className="text-sm text-zinc-600 dark:text-zinc-400">Delete this share for good?</span>
      <button type="submit" disabled={pending} className={`shrink-0 ${btnDangerSolid}`}>
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button type="button" onClick={onCancel} className={`shrink-0 ${btnSecondarySm}`}>
        Cancel
      </button>
      {state.error && (
        <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>
      )}
    </form>
  )
}
