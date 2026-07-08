'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type DealFormState = { ok: boolean; error?: string }

// Turn an empty form value into null; otherwise the trimmed string.
// (Empty strings would be rejected by the enum columns, so null is what we want.)
function text(value: FormDataEntryValue | null): string | null {
  const s = typeof value === 'string' ? value.trim() : ''
  return s === '' ? null : s
}

// Turn a form value into a number, or null if blank/invalid.
function num(value: FormDataEntryValue | null): number | null {
  const s = typeof value === 'string' ? value.trim() : ''
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

export async function createDeal(
  _prevState: DealFormState,
  formData: FormData
): Promise<DealFormState> {
  const supabase = await createClient()

  // Security: a server action can be POSTed to directly, so we verify the user
  // here rather than trusting the page. (Row-Level Security is the second net.)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to add a deal.' }
  }

  const companyName = text(formData.get('company_name'))
  if (!companyName) {
    return { ok: false, error: 'Company name is required.' }
  }

  const { error } = await supabase.from('deals').insert({
    user_id: user.id,
    company_name: companyName,
    one_liner: text(formData.get('one_liner')),
    website: text(formData.get('website')),
    sector: text(formData.get('sector')),
    geography: text(formData.get('geography')),
    company_stage: text(formData.get('company_stage')),
    round_size: num(formData.get('round_size')),
    valuation_or_cap: num(formData.get('valuation_or_cap')),
    committed_so_far: num(formData.get('committed_so_far')),
    round_status: text(formData.get('round_status')),
    round_type: text(formData.get('round_type')),
    lead_investor: text(formData.get('lead_investor')),
    your_fund_status: text(formData.get('your_fund_status')),
    founder_consent: formData.get('founder_consent') === 'on',
    kpis: text(formData.get('kpis')),
    deck_url: text(formData.get('deck_url')),
    notes: text(formData.get('notes')),
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  // Refresh the /deals page so the new deal appears in the list.
  revalidatePath('/deals')
  return { ok: true }
}
