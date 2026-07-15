import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// The magic link in the email points here. Supabase sends the user back with a
// one-time `code` in the URL. We swap that code for a real logged-in session
// (saved into cookies), then forward the user on. This is a Route Handler — a
// URL that runs code on the server instead of rendering a page.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // On a hosting platform like Vercel, `origin` (derived from request.url)
      // can be an internal address rather than your public domain. Prefer the
      // public host from the `x-forwarded-host` header when deployed, so the
      // post-login redirect lands on the real site — never on localhost.
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalDev = process.env.NODE_ENV === 'development'
      if (!isLocalDev && forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // No code, or it was expired/already used — show a friendly error page.
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
