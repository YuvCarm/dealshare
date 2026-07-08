import { createBrowserClient } from '@supabase/ssr'

// This creates a Supabase client for use in the BROWSER (Client Components —
// files that start with 'use client'). It only ever uses the public URL and
// the public "anon" key, so it is safe to run in the user's browser.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
