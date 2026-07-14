import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import EmptyState from '@/app/empty-state'
import { countCls, errorBox, inlineLink, sectionCard } from '@/app/ui'
import AddInboundForm from './add-inbound-form'
import InboundCard from './inbound-card'
import InboundShareCard from './inbound-share-card'
import type { CoInvestorOption, InAppShare, InboundDeal } from './types'

export default async function InboundPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 1. LIVE in-app shares — deals a co-investor shared with you INSIDE
  //    DealShare. These come from the inbound_deal_shares() database function
  //    (migration 0009), NOT from a table the browser can read: the function
  //    runs on the server, checks the share is active and addressed to you, and
  //    returns each deal already trimmed to the fields the sharer chose. An
  //    unshared field never leaves Postgres, so it can't reach this page.
  const { data: sharesData, error: sharesError } = await supabase.rpc('inbound_deal_shares')
  const inAppShares = (sharesData as InAppShare[] | null) ?? []
  // The one setup step this needs: migration 0009 creates the function.
  const sharesMigrationPending = sharesError?.code === 'PGRST202'

  // 2. The co-investor list does double duty: it feeds the manual form's
  //    "Shared by" dropdown, AND it turns a sharer's email back into a name
  //    for the in-app section (your rolodex, keyed by email).
  const { data: coInvestors, error: coInvestorsError } = await supabase
    .from('co_investors')
    .select('id, name, fund_name, email')
    .order('name')
    .returns<CoInvestorOption[]>()

  // 3. Manually-logged inbound deals (someone told you about a deal verbally).
  //    Thanks to RLS this returns ONLY your rows; the nested select pulls each
  //    sharer's name in through the foreign key.
  const { data: manualDeals, error: manualError } = await supabase
    .from('inbound_deals')
    .select('*, co_investors ( id, name, fund_name )')
    .order('created_at', { ascending: false })
    .returns<InboundDeal[]>()

  const hasCoInvestors = (coInvestors?.length ?? 0) > 0

  // Turn the flat rolodex into an email → co-investor lookup, so an in-app
  // share from jane@acme.vc can show "Jane (Acme Ventures)" when she's a
  // contact of yours, and just her email when she isn't.
  const investorByEmail = new Map<string, CoInvestorOption>()
  for (const investor of coInvestors ?? []) {
    if (investor.email) investorByEmail.set(investor.email.trim().toLowerCase(), investor)
  }

  // Group the in-app shares by the co-investor who sent them, keeping the
  // newest-first order the function already returned them in.
  const sharesByEmail = new Map<string, InAppShare[]>()
  for (const share of inAppShares) {
    sharesByEmail.set(share.from_email, [
      ...(sharesByEmail.get(share.from_email) ?? []),
      share,
    ])
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader email={user.email} active="inbound" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        {/* ---- Live in-app shares (auto-populated) ------------------------- */}
        <section>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Shared with you
            {!sharesMigrationPending && (
              <span className={countCls}>({inAppShares.length})</span>
            )}
          </h1>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Deals co-investors shared with you <strong>inside DealShare</strong> — live, and
            trimmed to exactly the fields they chose to show. These appear here automatically;
            there&apos;s nothing to enter.
          </p>

          {sharesMigrationPending ? (
            <p className={errorBox}>
              The database needs one small upgrade first: run{' '}
              <span className="font-mono">supabase/migrations/0009_inbound_deal_shares.sql</span>{' '}
              in Supabase → SQL Editor, then reload this page.
            </p>
          ) : sharesError ? (
            <p className={errorBox}>Couldn&apos;t load in-app shares: {sharesError.message}</p>
          ) : inAppShares.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-950/[.1] px-4 py-6 text-center text-sm text-zinc-500 dark:border-white/[.12] dark:text-zinc-400">
              Nothing yet. When a co-investor shares a deal with you inside DealShare, it shows up
              here on its own.
            </p>
          ) : (
            [...sharesByEmail.entries()].map(([email, groupShares]) => {
              const investor = investorByEmail.get(email)
              return (
                <div key={email} className="mt-6 first:mt-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {investor ? (
                        <Link href={`/co-investors/${investor.id}`} className="hover:underline">
                          {investor.name}
                        </Link>
                      ) : (
                        email
                      )}
                    </h2>
                    {investor?.fund_name && (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">
                        {investor.fund_name}
                      </span>
                    )}
                    {investor && (
                      <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {email}
                      </span>
                    )}
                  </div>
                  <ul className="mt-3 flex flex-col gap-3">
                    {groupShares.map((share) => (
                      <InboundShareCard key={share.share_id} share={share} />
                    ))}
                  </ul>
                </div>
              )
            })
          )}
        </section>

        {/* ---- Manually-logged inbound deals ------------------------------- */}
        <section id="log-inbound" className={`mt-12 scroll-mt-24 ${sectionCard}`}>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Log an inbound deal
          </h2>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Heard about a deal <strong>verbally</strong> — a call, an email, a coffee? Jot it down
            here. (Deals shared through DealShare show up above on their own.)
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
            Logged manually
            {manualDeals && <span className={countCls}>({manualDeals.length})</span>}
          </h2>

          {(coInvestorsError || manualError) && (
            <p className={`mt-4 ${errorBox}`}>
              Couldn&apos;t load inbound deals: {(coInvestorsError || manualError)?.message}
            </p>
          )}

          {manualDeals && manualDeals.length === 0 && (
            <EmptyState
              heading="Nothing logged manually yet"
              body="When a co-investor mentions a deal outside DealShare, log it here so both sides of the relationship stay visible."
              href={hasCoInvestors ? '#log-inbound' : '/co-investors'}
              cta={hasCoInvestors ? 'Log your first inbound deal' : 'Add a co-investor first'}
            />
          )}

          <ul className="mt-4 flex flex-col gap-3">
            {manualDeals?.map((deal) => (
              <InboundCard key={deal.id} deal={deal} coInvestors={coInvestors ?? []} />
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
