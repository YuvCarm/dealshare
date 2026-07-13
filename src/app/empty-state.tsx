import Link from 'next/link'

// Friendly placeholder shown instead of an empty list: a short heading, one
// line of context, and a button pointing at the way to create the first item.
// `href` can be another page (/packets/new) or an anchor (#add-deal) that
// scrolls to the form higher up on the same page.
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
    <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-black/[.12] px-6 py-12 text-center dark:border-white/[.2]">
      <p className="text-base font-semibold text-black dark:text-zinc-50">{heading}</p>
      <p className="mt-1 max-w-md text-sm text-zinc-500 dark:text-zinc-400">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        {cta}
      </Link>
    </div>
  )
}
