'use client'

import { useActionState, useEffect, useRef } from 'react'
import { btnPrimary } from '@/app/ui'
import { createInboundDeal, type ActionState } from './actions'
import InboundFields from './inbound-fields'
import type { CoInvestorOption } from './types'

const initialState: ActionState = { ok: false }

export default function AddInboundForm({ coInvestors }: { coInvestors: CoInvestorOption[] }) {
  const [state, formAction, pending] = useActionState(createInboundDeal, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the form after a successful save.
  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <InboundFields coInvestors={coInvestors} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Saving…' : 'Log inbound deal'}
        </button>
        {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        {state.ok && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Inbound deal logged ✓</p>
        )}
      </div>
    </form>
  )
}
