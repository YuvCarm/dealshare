import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import EmptyState from '@/app/empty-state'
import { countCls, errorBox, sectionCard } from '@/app/ui'
import AddCoInvestorForm from './add-co-investor-form'
import CoInvestorCard from './co-investor-card'
import type { CoInvestor } from './types'

export default async function CoInvestorsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Thanks to RLS, this returns ONLY this user's co-investors — no filtering here.
  const { data: investors, error } = await supabase
    .from('co_investors')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<CoInvestor[]>()

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <SiteHeader email={user.email} active="co-investors" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <section id="add-co-investor" className={`scroll-mt-24 ${sectionCard}`}>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Add a co-investor
          </h1>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Only <strong>name</strong> is required. Enter thesis stages, sectors, and geographies as
            comma-separated lists.
          </p>
          <AddCoInvestorForm />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Your co-investors
            {investors && <span className={countCls}>({investors.length})</span>}
          </h2>

          {error && (
            <p className={`mt-4 ${errorBox}`}>
              Couldn&apos;t load co-investors: {error.message}
            </p>
          )}

          {investors && investors.length === 0 && (
            <EmptyState
              heading="No co-investors yet"
              body="Add the people you swap deal flow with — their thesis, check size, and how warm the relationship is."
              href="#add-co-investor"
              cta="Add your first co-investor"
            />
          )}

          <ul className="mt-4 flex flex-col gap-3">
            {investors?.map((investor) => (
              <CoInvestorCard key={investor.id} investor={investor} />
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
