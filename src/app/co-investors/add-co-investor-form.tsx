'use client'

import { useActionState, useEffect, useRef } from 'react'
import { btnPrimary } from '@/app/ui'
import { createCoInvestor, type ActionState } from './actions'
import CoInvestorFields from './co-investor-fields'

const initialState: ActionState = { ok: false }

export default function AddCoInvestorForm() {
  const [state, formAction, pending] = useActionState(createCoInvestor, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  // Clear the form after a successful save. Calling the form's native reset()
  // empties every field; the warmth picker listens for that same reset event
  // and clears itself too (see warmth.tsx).
  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <CoInvestorFields />

      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className={btnPrimary}>
          {pending ? 'Saving…' : 'Add co-investor'}
        </button>
        {state.error && <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>}
        {state.ok && (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">Co-investor added ✓</p>
        )}
      </div>
    </form>
  )
}
