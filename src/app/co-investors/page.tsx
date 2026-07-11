import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
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
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader email={user.email} active="co-investors" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <section className="rounded-2xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Add a co-investor</h1>
          <p className="mt-1 mb-5 text-sm text-zinc-500 dark:text-zinc-400">
            Only <strong>name</strong> is required. Enter thesis stages, sectors, and geographies as
            comma-separated lists.
          </p>
          <AddCoInvestorForm />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Your co-investors{investors ? ` (${investors.length})` : ''}
          </h2>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              Couldn&apos;t load co-investors: {error.message}
            </p>
          )}

          {investors && investors.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              No co-investors yet — add your first one above.
            </p>
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
