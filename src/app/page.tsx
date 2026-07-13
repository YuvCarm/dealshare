import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'

// The home page. It's a Server Component, so it can securely ask Supabase "who
// is logged in?" on the server before rendering, and show the right thing: a
// short pitch with a sign-in button for visitors, a welcome back for users.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-center text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          DealShare
        </p>

        {user ? (
          <>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
              Welcome back.
            </h1>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              You&apos;re signed in as{' '}
              <strong className="font-medium text-black dark:text-zinc-50">{user.email}</strong>.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/deals"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-8 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                Go to your deals
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="h-11 rounded-lg border border-black/[.12] px-5 font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:text-white dark:hover:bg-white/[.06]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-black sm:text-5xl dark:text-zinc-50">
              Track your deals. Share them on your terms.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
              DealShare is for VCs and angels who swap deal flow — choose exactly what each
              co-investor sees, send one private link, and keep track of who shares back.
            </p>
            <Link
              href="/login"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-8 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
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
