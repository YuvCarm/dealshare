import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/app/auth/actions'

// The home page. It's a Server Component, so it can securely ask Supabase "who
// is logged in?" on the server before rendering, and show the right thing.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <main className="w-full max-w-md rounded-2xl border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          DealShare
        </h1>

        {user ? (
          <>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              You&apos;re signed in as{' '}
              <strong className="text-black dark:text-zinc-50">{user.email}</strong>.
            </p>
            <form action={signOut} className="mt-6">
              <button
                type="submit"
                className="h-11 rounded-lg border border-black/[.12] px-5 font-medium text-black hover:bg-black/[.04] dark:border-white/[.2] dark:text-white dark:hover:bg-white/[.06]"
              >
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              You&apos;re not signed in yet.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
            >
              Sign in
            </Link>
          </>
        )}
      </main>
    </div>
  )
}
