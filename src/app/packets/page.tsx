import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SiteHeader from '@/app/site-header'
import CopyLinkButton from './copy-link-button'
import RevokeButton from './revoke-button'

// One row from share_packets, with the co-investor's name pulled in through
// the foreign key and the linked packet_deals rows (just their ids, to count).
// revoked_at is optional because it only exists once migration 0005 has run;
// selecting * below means the page works either way (missing column = active).
type PacketRow = {
  id: string
  created_at: string
  link_token: string
  revoked_at?: string | null
  co_investors: { name: string; fund_name: string | null } | null
  packet_deals: { id: string }[]
}

// A fixed locale so the server always renders dates the same way.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Green-ish "Active" / red-ish "Revoked" — whether the public link works.
function StatusChip({ revoked }: { revoked: boolean }) {
  return revoked ? (
    <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
      Revoked
    </span>
  ) : (
    <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
      Active
    </span>
  )
}

export default async function PacketsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Thanks to RLS, this returns ONLY this user's packets — no filtering here.
  const { data: packets, error } = await supabase
    .from('share_packets')
    .select('*, co_investors ( name, fund_name ), packet_deals ( id )')
    .order('created_at', { ascending: false })
    .returns<PacketRow[]>()

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-black">
      <SiteHeader email={user.email} active="packets" />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
              Share packets{packets ? ` (${packets.length})` : ''}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Each packet is a private link you send to one co-investor.
            </p>
          </div>
          <Link
            href="/packets/new"
            className="inline-flex h-11 items-center justify-center rounded-lg bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            New share packet
          </Link>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            Couldn&apos;t load packets: {error.message}
          </p>
        )}

        {packets && packets.length === 0 && (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            No packets yet — create your first one to share deals with a co-investor.
          </p>
        )}

        <ul className="mt-4 flex flex-col gap-3">
          {packets?.map((packet) => {
            const dealCount = packet.packet_deals.length
            return (
              <li
                key={packet.id}
                className="rounded-xl border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-black dark:text-zinc-50">
                    {packet.co_investors?.name ?? 'Co-investor removed'}
                    {packet.co_investors?.fund_name && (
                      <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
                        {packet.co_investors.fund_name}
                      </span>
                    )}
                  </h2>
                  <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <StatusChip revoked={!!packet.revoked_at} />
                    {formatDate(packet.created_at)} · {dealCount}{' '}
                    {dealCount === 1 ? 'deal' : 'deals'}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <CopyLinkButton path={`/p/${packet.link_token}`} />
                  <RevokeButton packetId={packet.id} revoked={!!packet.revoked_at} />
                </div>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
