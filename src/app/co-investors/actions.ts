'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// One shared result shape for every action on this page: did it work, and if
// not, why. The forms read this to show a green ✓ or a red error message.
export type ActionState = { ok: boolean; error?: string }

// Turn an empty form value into null; otherwise the trimmed string.
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

// Turn a comma-separated string ("seed, A, B+") into a list (["seed","A","B+"]),
// dropping blanks. Returns null when nothing was entered so the column stays empty.
function list(value: FormDataEntryValue | null): string[] | null {
  const s = typeof value === 'string' ? value : ''
  const items = s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
  return items.length > 0 ? items : null
}

// Read every editable field out of the submitted form, in the exact shape the
// database expects. Shared by create and update so they can never drift apart.
function fieldsFrom(formData: FormData) {
  return {
    name: text(formData.get('name')),
    fund_name: text(formData.get('fund_name')),
    email: text(formData.get('email')),
    thesis_stages: list(formData.get('thesis_stages')),
    thesis_sectors: list(formData.get('thesis_sectors')),
    thesis_geographies: list(formData.get('thesis_geographies')),
    check_size_min: num(formData.get('check_size_min')),
    check_size_max: num(formData.get('check_size_max')),
    warmth: num(formData.get('warmth')),
    notes: text(formData.get('notes')),
  }
}

export async function createCoInvestor(
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
    return { ok: false, error: 'You must be signed in to add a co-investor.' }
  }

  const fields = fieldsFrom(formData)
  if (!fields.name) {
    return { ok: false, error: 'Name is required.' }
  }

  const { error } = await supabase.from('co_investors').insert({ user_id: user.id, ...fields })
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/co-investors')
  return { ok: true }
}

export async function updateCoInvestor(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to edit a co-investor.' }
  }

  const id = text(formData.get('id'))
  if (!id) {
    return { ok: false, error: 'Missing co-investor id.' }
  }

  const fields = fieldsFrom(formData)
  if (!fields.name) {
    return { ok: false, error: 'Name is required.' }
  }

  // RLS makes sure this only ever touches a row this user owns.
  const { error } = await supabase.from('co_investors').update(fields).eq('id', id)
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/co-investors')
  return { ok: true }
}

export async function deleteCoInvestor(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: 'You must be signed in to delete a co-investor.' }
  }

  const id = text(formData.get('id'))
  if (!id) {
    return { ok: false, error: 'Missing co-investor id.' }
  }

  // RLS makes sure this only ever deletes a row this user owns.
  const { error } = await supabase.from('co_investors').delete().eq('id', id)
  if (error) {
    return { ok: false, error: error.message }
  }

  revalidatePath('/co-investors')
  return { ok: true }
}
