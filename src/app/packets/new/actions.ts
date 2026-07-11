'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SHAREABLE_FIELDS } from '../fields'

export type PacketFormState = { ok: boolean; error?: string }

// Every field key the app knows about. Anything else in the form data (say,
// from a hand-crafted request) is silently ignored.
const VALID_FIELD_KEYS = new Set<string>(SHAREABLE_FIELDS.map((f) => f.key))

export async function createSharePacket(
  _prevState: PacketFormState,
  formData: FormData
): Promise<PacketFormState> {
  const supabase = await createClient()

  // Security: a server action can be POSTed to directly, so we verify the user
  // here rather than trusting the page. (Row-Level Security is the second net.)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to create a share packet.' }
  }

  // 1. Which co-investor is this packet for?
  const coInvestorId = formData.get('co_investor_id')
  if (typeof coInvestorId !== 'string' || coInvestorId === '') {
    return { ok: false, error: 'Pick a co-investor first.' }
  }

  // 2. Which deals, and which fields for each? The form names its checkboxes
  //    "deal:<dealId>" and "field:<dealId>:<fieldKey>", so we can read the
  //    whole selection straight out of the form data.
  const dealIds: string[] = []
  const fieldsByDeal = new Map<string, string[]>()

  for (const name of formData.keys()) {
    if (name.startsWith('deal:')) {
      dealIds.push(name.slice('deal:'.length))
    } else if (name.startsWith('field:')) {
      const rest = name.slice('field:'.length)
      const splitAt = rest.lastIndexOf(':')
      const dealId = rest.slice(0, splitAt)
      const fieldKey = rest.slice(splitAt + 1)
      if (!VALID_FIELD_KEYS.has(fieldKey)) continue
      fieldsByDeal.set(dealId, [...(fieldsByDeal.get(dealId) ?? []), fieldKey])
    }
  }

  if (dealIds.length === 0) {
    return { ok: false, error: 'Select at least one deal to share.' }
  }

  // 3. Confirm every selected deal really belongs to this user. RLS hides
  //    other people's deals, so anything that doesn't come back isn't theirs —
  //    this stops a forged request from linking someone else's deal.
  const { data: ownedDeals, error: dealsError } = await supabase
    .from('deals')
    .select('id, company_name')
    .in('id', dealIds)
  if (dealsError) {
    return { ok: false, error: dealsError.message }
  }
  if (!ownedDeals || ownedDeals.length !== dealIds.length) {
    return { ok: false, error: 'One of the selected deals could not be found.' }
  }

  // A packet entry with zero fields would share nothing — catch it here with a
  // helpful message naming the deal.
  for (const deal of ownedDeals) {
    if ((fieldsByDeal.get(deal.id) ?? []).length === 0) {
      return {
        ok: false,
        error: `“${deal.company_name}” has no fields ticked — tick at least one field, or unselect it.`,
      }
    }
  }

  // Same ownership check for the co-investor.
  const { data: coInvestor, error: coInvestorError } = await supabase
    .from('co_investors')
    .select('id')
    .eq('id', coInvestorId)
    .maybeSingle()
  if (coInvestorError) {
    return { ok: false, error: coInvestorError.message }
  }
  if (!coInvestor) {
    return { ok: false, error: 'That co-investor could not be found.' }
  }

  // 4. The secret link token: 32 random bytes from Node's crypto module
  //    (a CSPRNG), printed as 43 URL-safe characters. 256 bits of randomness —
  //    far too many possibilities for anyone to ever guess a link.
  const linkToken = randomBytes(32).toString('base64url')

  // 5. Create the packet row first, so we get its id...
  const { data: packet, error: packetError } = await supabase
    .from('share_packets')
    .insert({ user_id: user.id, co_investor_id: coInvestorId, link_token: linkToken })
    .select('id')
    .single()
  if (packetError) {
    // The one setup step this feature needs: migration 0003 turns link_token
    // from a uuid column into text. Until it runs, this insert fails — point
    // at the fix instead of showing a cryptic Postgres error.
    if (packetError.message.includes('uuid')) {
      return {
        ok: false,
        error:
          'The database needs one small upgrade first: run supabase/migrations/0003_longer_link_tokens.sql in Supabase → SQL Editor, then try again.',
      }
    }
    return { ok: false, error: packetError.message }
  }

  // 6. ...then one packet_deals row per selected deal, each remembering
  //    exactly which fields you chose to reveal.
  const { error: packetDealsError } = await supabase.from('packet_deals').insert(
    dealIds.map((dealId) => ({
      user_id: user.id,
      packet_id: packet.id,
      deal_id: dealId,
      included_fields: fieldsByDeal.get(dealId)!,
    }))
  )
  if (packetDealsError) {
    // The packet row exists but its deals didn't save — remove the half-made
    // packet so the list never shows an empty one.
    await supabase.from('share_packets').delete().eq('id', packet.id)
    return { ok: false, error: packetDealsError.message }
  }

  // Refresh the /packets list and jump straight to it.
  revalidatePath('/packets')
  redirect('/packets')
}
