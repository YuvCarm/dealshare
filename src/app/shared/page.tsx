import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import EmptyState from '@/app/empty-state'
import StatusChip from '@/app/packets/status-chip'
import { SHAREABLE_FIELDS } from '@/app/packets/fields'
import { countCls, errorBox, itemCard } from '@/app/ui'
import ShareRowActions from './share-row-actions'

type ShareRow = {
  id: string
  created_at: string
  to_email: string
  status: 'active' | 'revoked'
  included_fields: string[]
  deals: { company_name: string } | null
}

type InvestorLite = {
  id: string
  name: string
  fund_name: string | null
  email: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default async function SharedPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS alone isn't enough here: its policies show me shares I CREATED and
  // shares addressed TO me. This page is strictly "by me", so filter on
  // from_user_id explicitly.
  const { data: shares, error } = await supabase
    .from('deal_shares')
    .select('id, created_at, to_email, status, included_fields, deals ( company_name )')
    .eq('from_user_id', user.id)
    .order('created_at', { ascending: false })
    .returns<ShareRow[]>()

  // Shares are addressed to an email; your rolodex turns that email back into
  // a name for display. A share whose email no longer matches any co-investor
  // still renders — just under the bare address.
  const { data: investors } = await supabase
    .from('co_investors')
    .select('id, name, fund_name, email')
    .returns<InvestorLite[]>()

  const investorByEmail = new Map<string, InvestorLite>()
  for (const investor of investors ?? []) {
    if (investor.email) investorByEmail.set(investor.email.trim().toLowerCase(), investor)
  }

  // Group by recipient email, keeping the newest-first order of the query —
  // both for the groups themselves and for the shares inside each group.
  const groups = new Map<string, ShareRow[]>()
  for (const share of shares ?? []) {
    groups.set(share.to_email, [...(groups.get(share.to_email) ?? []), share])
  }

  const migrationPending = error?.message.includes('deal_shares')

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader email={user.email} active="shared" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Shared by me
          {shares && <span className={countCls}>({shares.length})</span>}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Every deal you&apos;ve shared with a co-investor, and exactly how much of it. Revoke a
          share to pull it back instantly.
        </p>

        {error && (
          <p className={`mt-4 ${errorBox}`}>
            {migrationPending
              ? 'The database needs one small upgrade first: run supabase/migrations/0006_deal_shares.sql and 0007_deal_shares_rls.sql in Supabase → SQL Editor, then reload this page.'
              : `Couldn't load shares: ${error.message}`}
          </p>
        )}

        {shares && shares.length === 0 && (
          <EmptyState
            heading="Nothing shared yet"
            body="Share a deal with one co-investor at a time — you pick exactly which fields they get, and you can revoke it whenever you like."
            href="/deals"
            cta="Share your first deal"
          />
        )}

        {[...groups.entries()].map(([email, groupShares]) => {
          const investor = investorByEmail.get(email)
          return (
            <section key={email} className="mt-8">
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
                  <li key={share.id} className={itemCard}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                        {share.deals?.company_name ?? 'Deal removed'}
                      </h3>
                      <StatusChip revoked={share.status === 'revoked'} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      Shared {formatDate(share.created_at)} ·{' '}
                      <span className="tabular-nums">
                        {share.included_fields.length} of {SHAREABLE_FIELDS.length}
                      </span>{' '}
                      fields included
                    </p>
                    <div className="mt-4">
                      <ShareRowActions
                        shareId={share.id}
                        revoked={share.status === 'revoked'}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </main>
    </div>
  )
}
