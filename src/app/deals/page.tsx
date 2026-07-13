import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import EmptyState from '@/app/empty-state'
import AddDealForm from './add-deal-form'

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

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader email={user.email} active="deals" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <section
          id="add-deal"
          className="scroll-mt-6 rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950"
        >
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Add a deal</h1>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Only <strong>company name</strong> is required — fill in whatever you have.
          </p>
          <AddDealForm />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Your deals{deals ? ` (${deals.length})` : ''}
          </h2>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              Couldn&apos;t load deals: {error.message}
            </p>
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
              <li
                key={deal.id}
                className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-black dark:text-zinc-50">
                    {deal.company_name}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {deal.company_stage && <Badge>{deal.company_stage}</Badge>}
                    {deal.round_status && <Badge>{deal.round_status}</Badge>}
                    {deal.your_fund_status && <Badge>{deal.your_fund_status}</Badge>}
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
                  {usd(deal.round_size) && <span>Round: {usd(deal.round_size)}</span>}
                  {usd(deal.valuation_or_cap) && <span>Val/cap: {usd(deal.valuation_or_cap)}</span>}
                  {usd(deal.committed_so_far) && <span>Committed: {usd(deal.committed_so_far)}</span>}
                </div>

                {(deal.website || deal.deck_url) && (
                  <div className="mt-2 flex gap-4 text-sm">
                    {deal.website && (
                      <a
                        href={deal.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Website ↗
                      </a>
                    )}
                    {deal.deck_url && (
                      <a
                        href={deal.deck_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline dark:text-blue-400"
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
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
      {children}
    </span>
  )
}
