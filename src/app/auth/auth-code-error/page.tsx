import Link from 'next/link'

// Shown when a magic link couldn't be used (expired, or already clicked once).
export default function AuthCodeError() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-8 text-center dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          That link didn&apos;t work
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Magic links can only be used once and expire after a while. Please request a
          fresh one.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 font-medium text-background hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
