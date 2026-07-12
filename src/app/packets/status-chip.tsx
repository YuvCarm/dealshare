// Green "Active" / red "Revoked" — whether a packet's public link works.
// Shared by the /packets list and the co-investor profile page.
export default function StatusChip({ revoked }: { revoked: boolean }) {
  return revoked ? (
    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
      Revoked
    </span>
  ) : (
    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
      Active
    </span>
  )
}
