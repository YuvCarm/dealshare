'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { INBOUND_STATUSES } from './types'

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
async function validatedFields(
  supabase: SupabaseClient,
  formData: FormData
): Promise<
  | { fields: { company_name: string; co_investor_id: string; status: string; notes: string | null } }
  | { error: string }
> {
  const companyName = text(formData.get('company_name'))
  if (!companyName) {
    return { error: 'Company name is required.' }
  }

  const coInvestorId = text(formData.get('co_investor_id'))
  if (!coInvestorId) {
    return { error: 'Pick which co-investor shared it.' }
  }

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

  const result = await validatedFields(supabase, formData)
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

  const result = await validatedFields(supabase, formData)
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
  })
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/deals')
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
