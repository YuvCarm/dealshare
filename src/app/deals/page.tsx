import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import EmptyState from '@/app/empty-state'
import Badge from '@/app/badge'
import { countCls, errorBox, inlineLink, itemCard, moneyCls, sectionCard } from '@/app/ui'
import AddDealForm from './add-deal-form'
import ShareDealButton, { type CoInvestorOption } from './share-deal-button'

type Deal = {
  id: string
  company_name: string
  one_liner: string | null
  website: string | null
  sector: string | null
  geography: string | null
  company_stage: string | null
  round_size: number | null
  valuation_or_cap: number | null
  committed_so_far: number | null
  round_status: string | null
  round_type: string | null
  lead_investor: string | null
  your_fund_status: string | null
  founder_consent: boolean
  kpis: string | null
  deck_url: string | null
  notes: string | null
}

function usd(n: number | null): string | null {
  return n == null ? null : '$' + n.toLocaleString('en-US')
}

export default async function DealsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Thanks to RLS, this returns ONLY this user's deals — no filtering needed here.
  const { data: deals, error } = await supabase
    .from('deals')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Deal[]>()

  // For the per-deal share form. If this load fails the deals still render —
  // the share form just behaves as if there were no co-investors yet.
  const { data: coInvestors } = await supabase
    .from('co_investors')
    .select('id, name, fund_name, email')
    .order('name')
    .returns<CoInvestorOption[]>()

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader email={user.email} active="deals" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <section id="add-deal" className={`scroll-mt-24 ${sectionCard}`}>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Add a deal
          </h1>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Only <strong>company name</strong> is required — fill in whatever you have.
          </p>
          <AddDealForm />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Your deals
            {deals && <span className={countCls}>({deals.length})</span>}
          </h2>

          {error && (
            <p className={`mt-4 ${errorBox}`}>Couldn&apos;t load deals: {error.message}</p>
          )}

          {deals && deals.length === 0 && (
            <EmptyState
              heading="No deals yet"
              body="Track a company you're evaluating, then share it with co-investors when you're ready."
              href="#add-deal"
              cta="Add your first deal"
            />
          )}

          <ul className="mt-4 flex flex-col gap-3">
            {deals?.map((deal) => (
              <li key={deal.id} className={itemCard}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                    {deal.company_name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {deal.company_stage && <Badge>{deal.company_stage}</Badge>}
                    {deal.round_status && (
                      <Badge value={deal.round_status}>{deal.round_status}</Badge>
                    )}
                    {deal.your_fund_status && (
                      <Badge value={deal.your_fund_status}>{deal.your_fund_status}</Badge>
                    )}
                  </div>
                </div>

                {deal.one_liner && (
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{deal.one_liner}</p>
                )}

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {deal.sector && <span>Sector: {deal.sector}</span>}
                  {deal.geography && <span>Geo: {deal.geography}</span>}
                  {deal.round_type && <span>Type: {deal.round_type.replace(/_/g, ' ')}</span>}
                  {deal.lead_investor && <span>Lead: {deal.lead_investor}</span>}
                  {usd(deal.round_size) && (
                    <span>
                      Round: <span className={moneyCls}>{usd(deal.round_size)}</span>
                    </span>
                  )}
                  {usd(deal.valuation_or_cap) && (
                    <span>
                      Val/cap: <span className={moneyCls}>{usd(deal.valuation_or_cap)}</span>
                    </span>
                  )}
                  {usd(deal.committed_so_far) && (
                    <span>
                      Committed: <span className={moneyCls}>{usd(deal.committed_so_far)}</span>
                    </span>
                  )}
                </div>

                {(deal.website || deal.deck_url) && (
                  <div className="mt-2 flex gap-4 text-sm">
                    {deal.website && (
                      <a
                        href={deal.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={inlineLink}
                      >
                        Website ↗
                      </a>
                    )}
                    {deal.deck_url && (
                      <a
                        href={deal.deck_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={inlineLink}
                      >
                        Deck ↗
                      </a>
                    )}
                  </div>
                )}

                {deal.notes && (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-500 dark:text-zinc-400">
                    {deal.notes}
                  </p>
                )}

                <ShareDealButton
                  dealId={deal.id}
                  founderConsent={deal.founder_consent}
                  coInvestors={coInvestors ?? []}
                />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
