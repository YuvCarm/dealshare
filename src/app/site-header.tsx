import Link from 'next/link'
import { signOut } from '@/app/auth/actions'
import { btnSecondarySm } from '@/app/ui'

// The shared top bar. /deals, /co-investors, /packets, /shared, and /inbound
// render this so navigation and sign-out look and behave identically on each
// page. It's sticky with a frosted-glass blur, so content scrolls underneath
// it — anchor targets on those pages use scroll-mt-24 to land below it.
export default function SiteHeader({
  email,
  active,
}: {
  email?: string
  active: 'deals' | 'co-investors' | 'packets' | 'shared' | 'inbound'
}) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-950/[.06] bg-white/75 px-6 py-3 backdrop-blur-xl dark:border-white/[.08] dark:bg-zinc-950/75">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
          DealShare
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <NavLink href="/deals" active={active === 'deals'}>
            Deals
          </NavLink>
          <NavLink href="/co-investors" active={active === 'co-investors'}>
            Co-investors
          </NavLink>
          <NavLink href="/packets" active={active === 'packets'}>
            Packets
          </NavLink>
          <NavLink href="/shared" active={active === 'shared'}>
            Shared
          </NavLink>
          <NavLink href="/inbound" active={active === 'inbound'}>
            Inbound
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {email && (
          <span className="hidden font-mono text-xs text-zinc-500 sm:inline dark:text-zinc-400">
            {email}
          </span>
        )}
        <form action={signOut}>
          <button className={btnSecondarySm}>Sign out</button>
        </form>
      </div>
    </header>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`rounded-md px-2.5 py-1.5 font-medium transition-colors duration-150 ${
        active
          ? 'bg-zinc-950/[.05] text-zinc-950 dark:bg-white/[.08] dark:text-zinc-50'
          : 'text-zinc-500 hover:bg-zinc-950/[.04] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50'
      }`}
    >
      {children}
    </Link>
  )
}
