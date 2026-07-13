'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { btnPrimaryLg, inputLg } from '@/app/ui'

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
        // This value becomes {{ .RedirectTo }} in the email template, so the
        // link returns to /auth/confirm on whichever origin started the sign-in
        // — localhost in development, your Vercel domain in production.
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
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
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-up rounded-2xl border border-zinc-950/[.06] bg-surface p-8 shadow-pop dark:border-white/[.08] dark:shadow-none">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Enter your email and we&apos;ll send you a magic link — no password needed.
        </p>

        {status === 'sent' ? (
          <div className="mt-6 rounded-lg border border-emerald-600/20 bg-emerald-500/[.08] p-4 text-sm leading-relaxed text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/[.08] dark:text-emerald-200">
            Check your inbox at <strong>{email}</strong> and click the link to finish
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
              className={inputLg}
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className={`${btnPrimaryLg} w-full`}
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
