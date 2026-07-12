import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import AddInboundForm from './add-inbound-form'
import InboundCard from './inbound-card'
import type { CoInvestorOption, InboundDeal } from './types'

export default async function InboundPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // The co-investor list feeds the "Shared by" dropdowns (add + edit forms).
  const { data: coInvestors, error: coInvestorsError } = await supabase
    .from('co_investors')
    .select('id, name, fund_name')
    .order('name')
    .returns<CoInvestorOption[]>()

  // Thanks to RLS, this returns ONLY this user's inbound deals. The nested
  // select pulls each sharer's name in through the foreign key.
  const { data: deals, error: dealsError } = await supabase
    .from('inbound_deals')
    .select('*, co_investors ( id, name, fund_name )')
    .order('created_at', { ascending: false })
    .returns<InboundDeal[]>()

  const loadError = coInvestorsError || dealsError

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader email={user.email} active="inbound" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <section className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            Log an inbound deal
          </h1>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Deals other funds shared <strong>with you</strong> — the other half of the
            relationship.
          </p>

          {(coInvestors?.length ?? 0) > 0 ? (
            <AddInboundForm coInvestors={coInvestors ?? []} />
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You need at least one co-investor to log who shared the deal.{' '}
              <Link
                href="/co-investors"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                Add a co-investor first →
              </Link>
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Inbound deals{deals ? ` (${deals.length})` : ''}
          </h2>

          {loadError && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              Couldn&apos;t load inbound deals: {loadError.message}
            </p>
          )}

          {deals && deals.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Nothing logged yet — when a fund sends a deal your way, note it here.
            </p>
          )}

          <ul className="mt-4 flex flex-col gap-3">
            {deals?.map((deal) => (
              <InboundCard key={deal.id} deal={deal} coInvestors={coInvestors ?? []} />
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
