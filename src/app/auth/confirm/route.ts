import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// The magic-link email points here. Unlike the older /auth/callback (which
// needed a `code` the server often couldn't read), this route receives a
// `token_hash` in the query string — which the server CAN read — and calls
// verifyOtp. verifyOtp makes a server-to-server request to Supabase; the
// session comes back in the response body and is written to cookies. That's
// what makes this flow reliable for server-side rendering.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/deals'

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      // On Vercel, request.url's origin can be an internal address, so prefer
      // the public host from x-forwarded-host when deployed (never localhost).
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalDev = process.env.NODE_ENV === 'development'
      if (!isLocalDev && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Missing/expired/already-used link — send them to the readable error page.
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
