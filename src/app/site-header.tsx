import Link from 'next/link'
import { signOut } from '@/app/auth/actions'

// The shared top bar. /deals, /co-investors, and /packets render this so the
// navigation and sign-out button look and behave identically on each page.
// `active` decides which nav link is highlighted.
export default function SiteHeader({
  email,
  active,
}: {
  email?: string
  active: 'deals' | 'co-investors' | 'packets' | 'inbound'
}) {
  return (
    <header className="flex items-center justify-between border-b border-black/[.08] px-6 py-4 dark:border-white/[.145]">
      <div className="flex items-center gap-4 sm:gap-6">
        <Link href="/" className="text-lg font-semibold text-black dark:text-zinc-50">
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
          <NavLink href="/inbound" active={active === 'inbound'}>
            Inbound
          </NavLink>
        </nav>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {email && (
          <span className="hidden text-zinc-500 sm:inline dark:text-zinc-400">{email}</span>
        )}
        <form action={signOut}>
          <button className="rounded-lg border border-black/[.12] px-3 py-1.5 font-medium text-black transition-colors hover:bg-black/[.04] dark:border-white/[.2] dark:text-white dark:hover:bg-white/[.06]">
            Sign out
          </button>
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
      className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
        active
          ? 'bg-black/[.06] text-black dark:bg-white/[.1] dark:text-zinc-50'
          : 'text-zinc-500 hover:bg-black/[.04] hover:text-black dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-50'
      }`}
    >
      {children}
    </Link>
  )
}
