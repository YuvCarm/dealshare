// Green "Active" / red "Revoked" — whether a packet's public link works.
// Shared by the /packets list and the co-investor profile page. The tiny dot
// pulses while the link is live (and stays still when it's revoked).
export default function StatusChip({ revoked }: { revoked: boolean }) {
  return revoked ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/[.08] px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20 dark:bg-red-400/10 dark:text-red-300 dark:ring-red-400/20">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-500 dark:bg-red-400" />
      Revoked
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/[.08] px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20">
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse dark:bg-emerald-400"
      />
      Active
    </span>
  )
}
