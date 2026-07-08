'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// A Server Action: code that runs on the server when a form is submitted.
// Here it ends the Supabase session (clearing the login cookies) and sends the
// user back to the sign-in page.
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
