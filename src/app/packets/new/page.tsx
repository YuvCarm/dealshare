import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import { errorBox, inlineLink, sectionCard } from '@/app/ui'
import NewPacketForm, { type CoInvestorOption, type DealOption } from './new-packet-form'

export default async function NewPacketPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Only the columns the form needs. RLS returns just this user's rows.
  const { data: coInvestors, error: coInvestorsError } = await supabase
    .from('co_investors')
    .select('id, name, fund_name')
    .order('name')
    .returns<CoInvestorOption[]>()

  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('id, company_name, one_liner, founder_consent')
    .order('created_at', { ascending: false })
    .returns<DealOption[]>()

  const loadError = coInvestorsError || dealsError

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader email={user.email} active="packets" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <Link
          href="/packets"
          className="text-sm text-zinc-500 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          ← Back to packets
        </Link>

        <section className={`mt-4 ${sectionCard}`}>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            New share packet
          </h1>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Bundle a few deals for one co-investor. You control exactly which details of each
            deal they get to see.
          </p>

          {loadError && (
            <p className={errorBox}>Couldn&apos;t load your data: {loadError.message}</p>
          )}

          {!loadError && (coInvestors?.length ?? 0) === 0 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You need at least one co-investor to share with.{' '}
              <Link href="/co-investors" className={inlineLink}>
                Add a co-investor first →
              </Link>
            </p>
          )}

          {!loadError && (coInvestors?.length ?? 0) > 0 && (deals?.length ?? 0) === 0 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You don&apos;t have any deals to share yet.{' '}
              <Link href="/deals" className={inlineLink}>
                Add a deal first →
              </Link>
            </p>
          )}

          {!loadError && coInvestors && coInvestors.length > 0 && deals && deals.length > 0 && (
            <NewPacketForm coInvestors={coInvestors} deals={deals} />
          )}
        </section>
      </main>
    </div>
  )
}
