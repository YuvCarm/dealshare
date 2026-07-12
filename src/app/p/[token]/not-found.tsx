// Shown when someone opens /p/<token> with a token that doesn't match any
// packet — a mistyped link, or a packet that was deleted.
export default function PacketNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-black/[.08] bg-white p-8 text-center dark:border-white/[.145] dark:bg-zinc-950">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          This link isn&apos;t working
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          The share packet may have been removed, or the link wasn&apos;t copied completely.
          Ask the person who sent it for a fresh link.
        </p>
      </div>
    </div>
  )
}
