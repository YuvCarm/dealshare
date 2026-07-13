'use client'

import { useActionState } from 'react'
import { btnDanger, btnSecondarySm } from '@/app/ui'
import { setPacketRevoked, type ActionState } from './actions'

const initialState: ActionState = { ok: false }

// "Revoke link" / "Restore link", depending on the packet's current state.
// Revoking makes the public /p/<token> page stop working immediately; it's
// fully reversible, which is why there's no "are you sure?" step.
export default function RevokeButton({
  packetId,
  revoked,
}: {
  packetId: string
  revoked: boolean
}) {
  const [state, action, pending] = useActionState(setPacketRevoked, initialState)

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={packetId} />
      <input type="hidden" name="revoke" value={revoked ? 'false' : 'true'} />
      <button
        type="submit"
        disabled={pending}
        className={`shrink-0 ${revoked ? btnSecondarySm : btnDanger}`}
      >
        {pending ? 'Working…' : revoked ? 'Restore link' : 'Revoke link'}
      </button>
      {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  )
}
