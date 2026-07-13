// Shown when someone opens /p/<token> with a token that doesn't match any
// packet — a mistyped link, or a packet that was deleted.
export default function PacketNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-fade-up rounded-2xl border border-zinc-950/[.06] bg-surface p-8 text-center shadow-pop dark:border-white/[.08] dark:shadow-none">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          This link isn&apos;t working
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          The share packet may have been removed, or the link wasn&apos;t copied completely.
          Ask the person who sent it for a fresh link.
        </p>
      </div>
    </div>
  )
}
