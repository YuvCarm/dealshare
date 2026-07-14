'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SHAREABLE_FIELDS } from '@/app/packets/fields'
import { sendShareNotification } from './share-notification'

export type ShareFormState = { ok: boolean; error?: string }

// Every field key the app knows about. Anything else in the form data (say,
// from a hand-crafted request) is silently ignored.
const VALID_FIELD_KEYS = new Set<string>(SHAREABLE_FIELDS.map((f) => f.key))

// Create one deal share: this deal, to this co-investor's email, showing
// exactly the ticked fields. The share is keyed to the EMAIL (not the
// co-investor row) — see supabase/migrations/0006_deal_shares.sql for why.
export async function createDealShare(
  _prevState: ShareFormState,
  formData: FormData
): Promise<ShareFormState> {
  const supabase = await createClient()

  // Security: a server action can be POSTed to directly, so we verify the user
  // here rather than trusting the page. (Row-Level Security is the second net.)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to share a deal.' }
  }

  const dealId = formData.get('deal_id')
  if (typeof dealId !== 'string' || dealId === '') {
    return { ok: false, error: 'Missing deal id.' }
  }

  const coInvestorId = formData.get('co_investor_id')
  if (typeof coInvestorId !== 'string' || coInvestorId === '') {
    return { ok: false, error: 'Pick a co-investor first.' }
  }

  // Which fields to include? The form names its checkboxes "field:<fieldKey>".
  const includedFields: string[] = []
  for (const name of formData.keys()) {
    if (name.startsWith('field:')) {
      const fieldKey = name.slice('field:'.length)
      if (VALID_FIELD_KEYS.has(fieldKey)) includedFields.push(fieldKey)
    }
  }
  if (includedFields.length === 0) {
    return { ok: false, error: 'Tick at least one field to share.' }
  }

  // Confirm the deal really belongs to this user. RLS hides other people's
  // deals, so if nothing comes back it isn't theirs.
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, company_name')
    .eq('id', dealId)
    .maybeSingle()
  if (dealError) {
    return { ok: false, error: dealError.message }
  }
  if (!deal) {
    return { ok: false, error: 'That deal could not be found.' }
  }

  // Same ownership check for the co-investor — and this is where the share's
  // address comes from: their email, lowercased to match the database rule.
  const { data: coInvestor, error: coInvestorError } = await supabase
    .from('co_investors')
    .select('id, name, email')
    .eq('id', coInvestorId)
    .maybeSingle()
  if (coInvestorError) {
    return { ok: false, error: coInvestorError.message }
  }
  if (!coInvestor) {
    return { ok: false, error: 'That co-investor could not be found.' }
  }
  if (!coInvestor.email) {
    return {
      ok: false,
      error: `“${coInvestor.name}” has no email on file — add one on their profile first.`,
    }
  }
  const toEmail = coInvestor.email.trim().toLowerCase()

  // to_user_id stays empty on purpose: it gets filled in the moment an
  // account with this email signs in (migration 0008). Until then the
  // recipient can already be matched by email alone.
  const { error: insertError } = await supabase.from('deal_shares').insert({
    deal_id: deal.id,
    from_user_id: user.id,
    to_email: toEmail,
    included_fields: includedFields,
  })
  if (insertError) {
    // Unique index: one ACTIVE share per deal per person.
    if (insertError.code === '23505') {
      return {
        ok: false,
        error: `You already have an active share of “${deal.company_name}” with ${coInvestor.name}. Revoke it on the Shared page first if you want to change what's included.`,
      }
    }
    // The setup this feature needs: migrations 0006 + 0007 create the table
    // and its policies. Until they run, point at the fix.
    if (insertError.message.includes('deal_shares')) {
      return {
        ok: false,
        error:
          'The database needs one small upgrade first: run supabase/migrations/0006_deal_shares.sql and 0007_deal_shares_rls.sql in Supabase → SQL Editor, then try again.',
      }
    }
    return { ok: false, error: insertError.message }
  }

  // Tell the co-investor by email — but only AFTER the response is sent.
  // `after()` runs this once the share is already saved and acknowledged, so
  // a slow or broken email service can't block or break sharing (and the
  // function itself never throws — see share-notification.ts).
  after(() =>
    sendShareNotification({
      to: toEmail,
      sharedBy: user.email ?? 'A DealShare user',
      sharerEmail: user.email,
      companyName: deal.company_name,
    })
  )

  // Refresh the "Shared by me" page so the new share is there when they look.
  revalidatePath('/shared')
  return { ok: true }
}
