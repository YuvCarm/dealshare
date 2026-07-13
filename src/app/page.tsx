import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'
import { btnPrimaryLg, btnSecondaryLg } from '@/app/ui'

// The home page. It's a Server Component, so it can securely ask Supabase "who
// is logged in?" on the server before rendering, and show the right thing: a
// short pitch with a sign-in button for visitors, a welcome back for users.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* The app's one gradient of color: a soft indigo glow behind the headline. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-[32rem] -translate-y-1/2 bg-[radial-gradient(50%_50%_at_50%_35%,rgb(79_70_229/0.12),transparent_70%)] dark:bg-[radial-gradient(50%_50%_at_50%_35%,rgb(129_140_248/0.16),transparent_70%)]"
      />

      <main className="flex w-full max-w-2xl animate-fade-up flex-col items-center text-center">
        <p className="inline-flex items-center gap-2 rounded-full border border-zinc-950/[.08] bg-white/60 px-3 py-1 text-xs font-medium text-zinc-600 backdrop-blur dark:border-white/[.1] dark:bg-white/[.05] dark:text-zinc-300">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
          DealShare
        </p>

        {user ? (
          <>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-zinc-50">
              Welcome back.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              You&apos;re signed in as{' '}
              <strong className="font-medium text-zinc-950 dark:text-zinc-50">{user.email}</strong>
              .
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/deals" className={btnPrimaryLg}>
                Go to your deals
              </Link>
              <form action={signOut}>
                <button type="submit" className={btnSecondaryLg}>
                  Sign out
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-6 max-w-2xl text-balance bg-gradient-to-b from-zinc-950 to-zinc-600 bg-clip-text pb-1 text-4xl font-semibold tracking-tight text-transparent sm:text-6xl sm:leading-[1.05] dark:from-white dark:to-zinc-400">
              Track your deals. Share them on your terms.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
              DealShare is for VCs and angels who swap deal flow — choose exactly what each
              co-investor sees, send one private link, and keep track of who shares back.
            </p>
            <Link href="/login" className={`mt-8 ${btnPrimaryLg}`}>
              Sign in
            </Link>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              Sign in with a magic link — no password needed.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
