'use client'

import { useActionState } from 'react'
import { btnDanger, btnSecondarySm } from '@/app/ui'
import { setDealShareRevoked, type ActionState } from './actions'

const initialState: ActionState = { ok: false }

// "Revoke" / "Restore", depending on the share's current state. Revoking
// hides the share from the recipient immediately; it's fully reversible,
// which is why there's no "are you sure?" step.
export default function ShareRevokeButton({
  shareId,
  revoked,
}: {
  shareId: string
  revoked: boolean
}) {
  const [state, action, pending] = useActionState(setDealShareRevoked, initialState)

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={shareId} />
      <input type="hidden" name="revoke" value={revoked ? 'false' : 'true'} />
      <button
        type="submit"
        disabled={pending}
        className={`shrink-0 ${revoked ? btnSecondarySm : btnDanger}`}
      >
        {pending ? 'Working…' : revoked ? 'Restore' : 'Revoke'}
      </button>
      {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  )
}
