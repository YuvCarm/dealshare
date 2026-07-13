import Link from 'next/link'
import { btnPrimaryLg } from '@/app/ui'

// Shown when a magic link couldn't be used (expired, or already clicked once).
export default function AuthCodeError() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-up rounded-2xl border border-zinc-950/[.06] bg-surface p-8 text-center shadow-pop dark:border-white/[.08] dark:shadow-none">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          That link didn&apos;t work
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Magic links can only be used once and expire after a while. Please request a
          fresh one.
        </p>
        <Link href="/login" className={`mt-6 ${btnPrimaryLg}`}>
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
