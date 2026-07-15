// The "someone shared a deal with you" email, sent through the Resend API.
//
// Best-effort BY DESIGN. This is called inside `after()` from the share
// action, which means the share is already saved and the success response is
// already on its way to the browser before this code even starts — so a slow,
// misconfigured, or down email service can only ever cost a server log line,
// never the share itself. On top of that, every failure path in here is
// caught and logged rather than thrown.

// Sender + recipient-facing link. The link is always the live site: a share
// made from local dev should still point the co-investor at the real app.
const FROM = 'DealShare <notifications@dealshare.dev>'
const APP_URL = 'https://dealshare.dev'

// Company names are free text; keep the version that goes into the email to a
// sane length so a pathologically long name can't bloat the message.
const MAX_COMPANY_LEN = 120

// A deliberately loose check — just enough to reject obvious non-addresses
// (the fallback display string, a stray newline that could try to inject a
// header). Resend does the real validation; this is our own front door.
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// The company name is user-typed text going into an HTML email — escape it,
// or a deal named "<img src=…>" would inject markup into the message.
function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function sendShareNotification({
  to,
  sharedBy,
  sharerEmail,
  companyName,
  dealCount = 1,
}: {
  to: string
  // Display name for the sharer (their email, or a generic fallback).
  sharedBy: string
  // The sharer's real email, if we have one — used only for reply-to.
  sharerEmail?: string
  companyName: string
  // How many deals this notification covers. The app shares one deal at a
  // time today, so this is 1 — but the copy pluralizes correctly if a batch
  // share path ever passes more.
  dealCount?: number
}): Promise<void> {
  // Server-only secret: no NEXT_PUBLIC_ prefix, so Next.js never bundles it
  // into code the browser can see. If it isn't set (fresh checkout, or the
  // Vercel env var is missing), sharing still works — we just say so in the
  // server log instead of sending.
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set — skipped the share notification email.')
    return
  }

  // Recipient sanity check. to_email is stored lowercase by the DB but is
  // otherwise free text the sharer typed into a co-investor; if it isn't a
  // plausible address, don't hand Resend a bad request.
  if (!looksLikeEmail(to)) {
    console.error(`Share notification skipped — "${to}" is not a valid email address.`)
    return
  }

  const displayCompany =
    companyName.length > MAX_COMPANY_LEN
      ? companyName.slice(0, MAX_COMPANY_LEN) + '…'
      : companyName

  const sharer = escapeHtml(sharedBy)
  const company = escapeHtml(displayCompany)

  // "1 deal" / "3 deals" — and the recipient lands straight on their Inbound
  // page, where in-app shares appear.
  const deals = `${dealCount} ${dealCount === 1 ? 'deal' : 'deals'}`
  const inboundUrl = `${APP_URL}/inbound`

  const html = `<div style="margin:0 auto;max-width:480px;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <p style="margin:0 0 24px;font-size:15px;font-weight:600;"><span style="color:#6366f1;">&#9679;</span> DealShare</p>
  <h1 style="margin:0 0 12px;font-size:18px;font-weight:600;">${sharer} shared ${deals} with you</h1>
  <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#52525b;">&ldquo;${company}&rdquo; was shared with you on DealShare. It&rsquo;s waiting on your Inbound page.</p>
  <a href="${inboundUrl}" style="display:inline-block;background:#18181b;color:#ffffff;padding:11px 22px;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none;">See what they shared</a>
  <p style="margin:32px 0 0;font-size:12px;line-height:1.6;color:#a1a1aa;">You&rsquo;re receiving this because ${sharer} added you as a co-investor on DealShare.</p>
</div>`

  // Plain-text twin for clients (and people) who prefer it.
  const text = `${sharedBy} shared ${deals} with you on DealShare: “${displayCompany}”.\n\nSee it here: ${inboundUrl}\n\nYou're receiving this because ${sharedBy} added you as a co-investor on DealShare.`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // A hung request gets cut off rather than occupying the server forever.
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: `${sharedBy} shared ${deals} with you on DealShare`,
        html,
        text,
        // Replying goes straight to the sharer — but only when we actually
        // have their email. A non-address here would make Resend reject the
        // whole send, so omit the field rather than risk that.
        ...(sharerEmail && looksLikeEmail(sharerEmail)
          ? { reply_to: sharerEmail }
          : {}),
      }),
    })

    if (!response.ok) {
      console.error(
        `Share notification email to ${to} failed:`,
        response.status,
        await response.text()
      )
      return
    }
    console.log(`Share notification email sent to ${to} for “${displayCompany}”.`)
  } catch (error) {
    // Network trouble, DNS, the 10s timeout — all end here as a log line.
    console.error(`Share notification email to ${to} failed:`, error)
  }
}
