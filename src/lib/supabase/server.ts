import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This creates a Supabase client for use on the SERVER (Server Components,
// Server Actions, and Route Handlers). It reads the logged-in user's session
// from the browser's cookies so the server knows who is making the request.
//
// Note: in Next.js 16, `cookies()` is async, so this function is async too and
// must be called with `await createClient()`.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // `setAll` was called from a Server Component, which is not allowed
            // to set cookies. This is safe to ignore because the middleware we
            // add in Step 2 (login) refreshes the session on every request.
          }
        },
      },
    }
  )
}
