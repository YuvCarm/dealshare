import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import EmptyState from '@/app/empty-state'
import { countCls, errorBox, inlineLink, sectionCard } from '@/app/ui'
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
  const hasCoInvestors = (coInvestors?.length ?? 0) > 0

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader email={user.email} active="inbound" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <section id="log-inbound" className={`scroll-mt-24 ${sectionCard}`}>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Log an inbound deal
          </h1>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Deals other funds shared <strong>with you</strong> — the other half of the
            relationship.
          </p>

          {hasCoInvestors ? (
            <AddInboundForm coInvestors={coInvestors ?? []} />
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You need at least one co-investor to log who shared the deal.{' '}
              <Link href="/co-investors" className={inlineLink}>
                Add a co-investor first →
              </Link>
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Inbound deals
            {deals && <span className={countCls}>({deals.length})</span>}
          </h2>

          {loadError && (
            <p className={`mt-4 ${errorBox}`}>
              Couldn&apos;t load inbound deals: {loadError.message}
            </p>
          )}

          {deals && deals.length === 0 && (
            <EmptyState
              heading="No inbound deals yet"
              body="When a co-investor shares a deal with you, log it here so both sides of the relationship stay visible."
              href={hasCoInvestors ? '#log-inbound' : '/co-investors'}
              cta={hasCoInvestors ? 'Log your first inbound deal' : 'Add a co-investor first'}
            />
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
