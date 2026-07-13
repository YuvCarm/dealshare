import Link from 'next/link'
import { btnPrimary } from '@/app/ui'

// Friendly placeholder shown instead of an empty list: a short heading, one
// line of context, and a button pointing at the way to create the first item.
// `href` can be another page (/packets/new) or an anchor (#add-deal) that
// scrolls to the form higher up on the same page. The faint tinted fill makes
// it read as a designed slot, not a hole in the page.
export default function EmptyState({
  heading,
  body,
  href,
  cta,
}: {
  heading: string
  body: string
  href: string
  cta: string
}) {
  return (
    <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-zinc-950/[.12] bg-zinc-950/[.015] px-6 py-14 text-center dark:border-white/[.12] dark:bg-white/[.02]">
      <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{heading}</p>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        {body}
      </p>
      <Link href={href} className={`mt-5 ${btnPrimary}`}>
        {cta}
      </Link>
    </div>
  )
}
