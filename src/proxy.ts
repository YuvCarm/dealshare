import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// In Next.js 16 this file is called `proxy.ts` (older tutorials call it
// `middleware.ts` — same idea, renamed). It runs on every matching request
// BEFORE the page does. Its only job here: keep the logged-in session fresh by
// re-reading it from cookies and, if the tokens are about to expire, refreshing
// them — then handing the updated cookies back to the browser. This is the
// piece the note in src/lib/supabase/server.ts referred to.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: call getUser() immediately, with no other code in between. This
  // is what actually refreshes an expired session. Don't remove or reorder it.
  await supabase.auth.getUser()

  return response
}

export const config = {
  // Run on every request except Next.js internals and static image files.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
