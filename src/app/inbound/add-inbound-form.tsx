'use client'

import { useActionState, useEffect, useRef } from 'react'
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
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-lg bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
        >
          {pending ? 'Saving…' : 'Log inbound deal'}
        </button>
        {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        {state.ok && <p className="text-sm text-green-600 dark:text-green-400">Inbound deal logged ✓</p>}
      </div>
    </form>
  )
}
