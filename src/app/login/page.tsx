'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// The login screen. It runs in the browser (hence 'use client') because it has
// a form with state. When submitted, it asks Supabase to email a magic link.
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Where Supabase sends the user after they click the emailed link.
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      // Log the FULL error object to the console for debugging — error.message
      // is sometimes terse or unhelpful (it can even be "{}"), whereas the full
      // object shows the status, code, and name behind the failure.
      console.log('Magic-link sign-in error:', error)
      setStatus('error')
      // Show the message as readable text, with a friendly fallback so an empty
      // or blank message never renders as nothing (or a bare "{}") on screen.
      setErrorMsg(error.message || 'Something went wrong sending your magic link. Please try again.')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter your email and we&apos;ll send you a magic link — no password needed.
        </p>

        {status === 'sent' ? (
          <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            ✅ Check your inbox at <strong>{email}</strong> and click the link to finish
            signing in. You can close this tab.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-lg border border-black/[.12] bg-white px-3 text-black outline-none focus:border-black dark:border-white/[.2] dark:bg-black dark:text-white dark:focus:border-white"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="h-11 rounded-lg bg-foreground font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-60 dark:hover:bg-[#ccc]"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && (
              <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
