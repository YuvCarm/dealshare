'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ActionState = { ok: boolean; error?: string }

// Flip a packet's revoked switch. One action handles both directions: the
// form sends revoke="true" to revoke and revoke="false" to restore, so the
// button always matches the packet's current state.
export async function setPacketRevoked(
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
    return { ok: false, error: 'You must be signed in to change a packet.' }
  }

  const id = formData.get('id')
  if (typeof id !== 'string' || id === '') {
    return { ok: false, error: 'Missing packet id.' }
  }

  const revoke = formData.get('revoke') === 'true'

  // RLS makes sure this only ever touches a packet this user owns.
  const { error } = await supabase
    .from('share_packets')
    .update({ revoked_at: revoke ? new Date().toISOString() : null })
    .eq('id', id)

  if (error) {
    // The one setup step revocation needs: migration 0005 adds the revoked_at
    // column. Until it runs, point at the fix instead of a cryptic error.
    if (error.message.includes('revoked_at')) {
      return {
        ok: false,
        error:
          'The database needs one small upgrade first: run supabase/migrations/0005_packet_revocation.sql in Supabase → SQL Editor, then try again.',
      }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/packets')
  return { ok: true }
}
