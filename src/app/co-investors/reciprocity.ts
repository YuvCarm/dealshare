import { createClient } from '@/lib/supabase/server'

// One shared answer to "how many deals have I sent this co-investor, and how
// many have they sent me?" — the numbers that drive automatic warmth. The
// dashboard, the co-investors list, and the profile page all count through
// here, so warmth can never disagree between pages.
//
//   Sent     = distinct deals that reached them by either route: a packet
//              addressed to them, or a direct share to their email. The Set
//              dedupes a deal that traveled both ways.
//   Received = manually-logged inbound rows from them, plus live in-app
//              shares from their email. Two different record kinds, so a
//              plain sum — there's no shared deal id to dedupe on.

export type Reciprocity = {
  sent: number
  received: number
  lastSentAt: string | null
  lastReceivedAt: string | null
}

// The minimal slice of each record kind the math needs. Callers with richer
// rows (the dashboard already fetches all of these for its own charts) can
// pass them straight in.
type InvestorSlice = { id: string; email: string | null }
type PacketSlice = { created_at: string; co_investor_id: string | null; packet_deals: { deal_id: string }[] }
type DirectShareSlice = { created_at: string; deal_id: string; to_email: string }
type ManualInboundSlice = { created_at: string; co_investor_id: string | null }
type InAppShareSlice = { created_at: string; from_email: string }

// Pure aggregation over already-fetched rows. `investors` must be ordered
// oldest-first: shares arrive as bare emails, and if two rolodex entries share
// an email the OLDEST entry owns its counts on every load (deterministic,
// matching the dashboard's long-standing tie-break).
export function aggregateReciprocity(
  investors: InvestorSlice[],
  packets: PacketSlice[],
  directShares: DirectShareSlice[],
  manualInbound: ManualInboundSlice[],
  inAppShares: InAppShareSlice[],
): Map<string, Reciprocity> {
  const investorByEmail = new Map<string, string>()
  for (const investor of investors) {
    if (!investor.email) continue
    const key = investor.email.trim().toLowerCase()
    if (!investorByEmail.has(key)) investorByEmail.set(key, investor.id)
  }

  const sentDeals = new Map<string, Set<string>>()
  const lastSent = new Map<string, string>()
  const addSent = (investorId: string, dealId: string, when: string) => {
    const set = sentDeals.get(investorId) ?? new Set<string>()
    set.add(dealId)
    sentDeals.set(investorId, set)
    const prev = lastSent.get(investorId)
    if (!prev || prev < when) lastSent.set(investorId, when)
  }
  for (const packet of packets) {
    if (!packet.co_investor_id) continue
    for (const pd of packet.packet_deals) addSent(packet.co_investor_id, pd.deal_id, packet.created_at)
  }
  for (const share of directShares) {
    const investorId = investorByEmail.get(share.to_email)
    if (investorId) addSent(investorId, share.deal_id, share.created_at)
  }

  const receivedCount = new Map<string, number>()
  const lastReceived = new Map<string, string>()
  const addReceived = (investorId: string, when: string) => {
    receivedCount.set(investorId, (receivedCount.get(investorId) ?? 0) + 1)
    const prev = lastReceived.get(investorId)
    if (!prev || prev < when) lastReceived.set(investorId, when)
  }
  for (const row of manualInbound) {
    if (row.co_investor_id) addReceived(row.co_investor_id, row.created_at)
  }
  for (const share of inAppShares) {
    const investorId = investorByEmail.get(share.from_email)
    if (investorId) addReceived(investorId, share.created_at)
  }

  const result = new Map<string, Reciprocity>()
  for (const investor of investors) {
    result.set(investor.id, {
      sent: sentDeals.get(investor.id)?.size ?? 0,
      received: receivedCount.get(investor.id) ?? 0,
      lastSentAt: lastSent.get(investor.id) ?? null,
      lastReceivedAt: lastReceived.get(investor.id) ?? null,
    })
  }
  return result
}

// Fetch-and-aggregate for pages that don't already hold the rows. Failed
// queries are reported, not thrown, so a page can keep rendering and show a
// banner — but counts are all-or-nothing: on ANY failure the map comes back
// empty, because warmth computed from half the data would render as a
// confident (and wrong) level. PGRST202 doesn't count as a failure — it just
// means migration 0009 hasn't created the inbound function yet, which the
// whole app treats as "no in-app shares".
//
// (Callers that already fetched co_investors for display still let this run
// its own tiny id/email query: firing both in parallel is faster than
// serializing the page behind one shared query.)
export async function fetchReciprocity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<{ counts: Map<string, Reciprocity>; errors: string[] }> {
  // RLS scopes co_investors, share_packets, and inbound_deals to this user;
  // deal_shares needs the explicit from_user_id filter because its policies
  // also expose shares addressed TO this user.
  const [investorsRes, packetsRes, sharesRes, manualRes, inAppRes] = await Promise.all([
    supabase.from('co_investors').select('id, email').order('created_at').returns<InvestorSlice[]>(),
    supabase
      .from('share_packets')
      .select('created_at, co_investor_id, packet_deals ( deal_id )')
      .returns<PacketSlice[]>(),
    supabase
      .from('deal_shares')
      .select('created_at, deal_id, to_email')
      .eq('from_user_id', userId)
      .returns<DirectShareSlice[]>(),
    supabase.from('inbound_deals').select('created_at, co_investor_id').returns<ManualInboundSlice[]>(),
    supabase.rpc('inbound_deal_shares'),
  ])

  const errors = [
    investorsRes.error && `co-investors: ${investorsRes.error.message}`,
    packetsRes.error && `packets: ${packetsRes.error.message}`,
    sharesRes.error && `shares sent: ${sharesRes.error.message}`,
    manualRes.error && `inbound deals: ${manualRes.error.message}`,
    inAppRes.error && inAppRes.error.code !== 'PGRST202' && `inbound shares: ${inAppRes.error.message}`,
  ].filter((e): e is string => Boolean(e))

  // All-or-nothing (see the header comment): report what broke, count nothing.
  if (errors.length > 0) return { counts: new Map(), errors }

  const counts = aggregateReciprocity(
    investorsRes.data ?? [],
    packetsRes.data ?? [],
    sharesRes.data ?? [],
    manualRes.data ?? [],
    ((inAppRes.data as InAppShareSlice[] | null) ?? []),
  )
  return { counts, errors }
}
