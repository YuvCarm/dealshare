'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionState = { ok: boolean; error?: string }

// Flip a deal share between active and revoked. One action handles both
// directions: the form sends revoke="true" to revoke and revoke="false" to
// restore, so the button always matches the share's current state. Revoking
// takes effect on the recipient's very next query — the row simply stops
// matching their read policy.
export async function setDealShareRevoked(
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
    return { ok: false, error: 'You must be signed in to change a share.' }
  }

  const id = formData.get('id')
  if (typeof id !== 'string' || id === '') {
    return { ok: false, error: 'Missing share id.' }
  }

  const revoke = formData.get('revoke') === 'true'

  // RLS makes sure this only ever touches a share this user created.
  const { error } = await supabase
    .from('deal_shares')
    .update({ status: revoke ? 'revoked' : 'active' })
    .eq('id', id)

  if (error) {
    // Only one ACTIVE share per deal per person — restoring while a newer
    // active share exists would create a duplicate.
    if (error.code === '23505') {
      return {
        ok: false,
        error:
          'There is already an active share of this deal with this person — revoke that one first.',
      }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/shared')
  return { ok: true }
}
