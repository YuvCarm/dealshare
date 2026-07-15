'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { INBOUND_STATUSES, type InAppShare } from './types'

// One shared result shape for every action on this page: did it work, and if
// not, why. The forms read this to show a green ✓ or a red error message.
export type ActionState = { ok: boolean; error?: string }

// Turn an empty form value into null; otherwise the trimmed string.
function text(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : ''
  return s === '' ? null : s
}

const VALID_STATUSES = new Set<string>(INBOUND_STATUSES.map((s) => s.value))

// Read and check the editable fields out of the submitted form. Shared by
// create and update so they can never drift apart. Returns either the fields
// ready for the database, or the error to show.
//
// requireCoInvestor: creating always needs a sharer, but editing a deal whose
// sharer was deleted (co_investor_id already null) must be allowed to keep it
// that way — otherwise the deal could never be edited again without falsely
// attributing it to someone else.
async function validatedFields(
  supabase: SupabaseClient,
  formData: FormData,
  { requireCoInvestor }: { requireCoInvestor: boolean }
): Promise<
  | {
      fields: {
        company_name: string
        co_investor_id: string | null
        status: string
        notes: string | null
      }
    }
  | { error: string }
> {
  const companyName = text(formData.get('company_name'))
  if (!companyName) {
    return { error: 'Company name is required.' }
  }

  const coInvestorId = text(formData.get('co_investor_id'))
  if (!coInvestorId && requireCoInvestor) {
    return { error: 'Pick which co-investor shared it.' }
  }

  if (coInvestorId) {
    // Confirm the co-investor really belongs to this user. RLS hides other
    // people's co-investors, so if nothing comes back it isn't theirs — this
    // stops a forged request from pointing at someone else's contact.
    const { data: coInvestor, error: coInvestorError } = await supabase
      .from('co_investors')
      .select('id')
      .eq('id', coInvestorId)
      .maybeSingle()
    if (coInvestorError) {
      return { error: coInvestorError.message }
    }
    if (!coInvestor) {
      return { error: 'That co-investor could not be found.' }
    }
  }

  const status = text(formData.get('status')) ?? 'interested'
  if (!VALID_STATUSES.has(status)) {
    return { error: 'Unknown status.' }
  }

  return {
    fields: {
      company_name: companyName,
      co_investor_id: coInvestorId,
      status,
      notes: text(formData.get('notes')),
    },
  }
}

export async function createInboundDeal(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  // Security: a server action can be POSTed to directly, so we verify the user
  // here rather than trusting the page. (Row-Level Security is the second net.)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to log an inbound deal.' }
  }

  const result = await validatedFields(supabase, formData, { requireCoInvestor: true })
  if ('error' in result) {
    return { ok: false, error: result.error }
  }

  const { error } = await supabase
    .from('inbound_deals')
    .insert({ user_id: user.id, ...result.fields })
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/inbound')
  return { ok: true }
}

export async function updateInboundDeal(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to edit an inbound deal.' }
  }

  const id = text(formData.get('id'))
  if (!id) {
    return { ok: false, error: 'Missing inbound deal id.' }
  }

  const result = await validatedFields(supabase, formData, { requireCoInvestor: false })
  if ('error' in result) {
    return { ok: false, error: result.error }
  }

  // RLS makes sure this only ever touches a row this user owns.
  const { error } = await supabase.from('inbound_deals').update(result.fields).eq('id', id)
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/inbound')
  return { ok: true }
}

export async function addToPipeline(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to add a deal.' }
  }

  const id = text(formData.get('id'))
  if (!id) {
    return { ok: false, error: 'Missing inbound deal id.' }
  }

  // Load the inbound deal (RLS guarantees it's yours) together with the
  // sharer's name, so the copy can say where it came from.
  const { data: inbound, error: loadError } = await supabase
    .from('inbound_deals')
    .select('company_name, notes, co_investors ( name, fund_name )')
    .eq('id', id)
    .maybeSingle<{
      company_name: string
      notes: string | null
      co_investors: { name: string; fund_name: string | null } | null
    }>()
  if (loadError) {
    return { ok: false, error: loadError.message }
  }
  if (!inbound) {
    return { ok: false, error: 'That inbound deal could not be found.' }
  }

  // "Source: shared by Dana (Acme Ventures)" — so the deal never forgets
  // where it came from, even if the inbound row is deleted later.
  const source = inbound.co_investors
    ? `Source: shared by ${inbound.co_investors.name}${
        inbound.co_investors.fund_name ? ` (${inbound.co_investors.fund_name})` : ''
      }`
    : 'Source: shared by a co-investor (since removed)'
  const notes = inbound.notes ? `${inbound.notes}\n\n${source}` : source

  // founder_consent stays false on purpose: the deal arrived second-hand, so
  // you haven't asked the founder yet — the packet form will nudge you.
  const { error } = await supabase.from('deals').insert({
    user_id: user.id,
    company_name: inbound.company_name,
    notes,
    // Lands the deal under the "Promoted from inbound" tab on /deals.
    source: 'promoted_from_inbound',
  })
  if (error) {
    return { ok: false, error: friendlySourceError(error) }
  }

  revalidatePath('/deals')
  return { ok: true }
}

// The setup promotion needs: migration 0010 adds the `source` column and 0011
// adds `promoted_from_share_id`. Until they run, the insert fails with an
// unknown-column error — point at the fix instead of echoing Postgres jargon.
function friendlySourceError(error: { code?: string; message: string }): string {
  if (error.code === 'PGRST204' || error.code === '42703') {
    return 'The database needs one small upgrade first: run supabase/migrations/0010_deal_source.sql and 0011_share_hardening.sql in Supabase → SQL Editor, then try again.'
  }
  return error.message
}

// Copy a LIVE in-app share (a deal a co-investor shared with you inside
// DealShare) into your own pipeline. The recipient only ever holds the fields
// the sharer ticked, so that's exactly what gets copied — nothing more exists
// on this side to copy.
export async function promoteShareToPipeline(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to add a deal.' }
  }

  const shareId = text(formData.get('share_id'))
  if (!shareId) {
    return { ok: false, error: 'Missing share id.' }
  }

  // Re-fetch through the same security-definer function the page uses — it
  // only returns ACTIVE shares addressed to THIS user, already trimmed to
  // their included_fields. So a forged share_id (someone else's share, or a
  // revoked one) simply isn't in the list, and the copy below can never
  // contain a field the sharer didn't tick.
  const { data, error: loadError } = await supabase.rpc('inbound_deal_shares')
  if (loadError) {
    return { ok: false, error: loadError.message }
  }
  const share = ((data as InAppShare[] | null) ?? []).find((s) => s.share_id === shareId)
  if (!share) {
    return {
      ok: false,
      error: 'That share could not be found — it may have been revoked by the sharer.',
    }
  }
  const deal = share.deal

  // Narrow the JSON values back into columns. A field the sharer didn't tick
  // is absent here, becomes null, and the column just takes its default.
  const str = (v: unknown): string | null => (typeof v === 'string' ? v : null)
  const num = (v: unknown): number | null => (typeof v === 'number' ? v : null)

  // "Source: shared in-app by …" — your rolodex turns the sharer's email back
  // into a name when you have them as a co-investor.
  const investor = (
    await supabase.from('co_investors').select('name, fund_name, email')
  ).data?.find((ci) => ci.email?.trim().toLowerCase() === share.from_email)
  const sourceLine = investor
    ? `Source: shared in-app by ${investor.name}${investor.fund_name ? ` (${investor.fund_name})` : ''}`
    : `Source: shared in-app by ${share.from_email}`
  const sharedNotes = str(deal.notes)
  const notes = sharedNotes ? `${sharedNotes}\n\n${sourceLine}` : sourceLine

  // Deliberately NOT copied, even when the sharer ticked them:
  //   • your_fund_status — that's THEIR judgment of the deal, not yours; your
  //     copy starts unjudged.
  //   • founder_consent — stays false (default): the deal arrived second-hand,
  //     so you haven't asked the founder yet.
  const { error } = await supabase.from('deals').insert({
    user_id: user.id,
    company_name: str(deal.company_name) ?? 'Undisclosed company',
    one_liner: str(deal.one_liner),
    website: str(deal.website),
    sector: str(deal.sector),
    geography: str(deal.geography),
    company_stage: str(deal.company_stage),
    round_size: num(deal.round_size),
    valuation_or_cap: num(deal.valuation_or_cap),
    committed_so_far: num(deal.committed_so_far),
    round_status: str(deal.round_status),
    round_type: str(deal.round_type),
    lead_investor: str(deal.lead_investor),
    kpis: str(deal.kpis),
    deck_url: str(deal.deck_url),
    notes,
    source: 'promoted_from_inbound',
    // Records which share this copy came from. The unique index from
    // migration 0011 rides on it: a second promotion of the same share is
    // refused by the database, however many tabs or reloads later.
    promoted_from_share_id: share.share_id,
  })
  if (error) {
    // Unique index: this share was already promoted (maybe in another tab).
    if (error.code === '23505') {
      return {
        ok: false,
        error: 'This share is already in your pipeline — check the "Promoted from inbound" tab on Deals.',
      }
    }
    return { ok: false, error: friendlySourceError(error) }
  }

  revalidatePath('/deals')
  revalidatePath('/inbound')
  return { ok: true }
}

export async function deleteInboundDeal(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to delete an inbound deal.' }
  }

  const id = text(formData.get('id'))
  if (!id) {
    return { ok: false, error: 'Missing inbound deal id.' }
  }

  // RLS makes sure this only ever deletes a row this user owns.
  const { error } = await supabase.from('inbound_deals').delete().eq('id', id)
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/inbound')
  return { ok: true }
}
