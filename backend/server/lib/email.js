// ─── Transactional email (Resend) ────────────────────────────────────────────
// No email-sending capability existed anywhere in this codebase before this —
// grep confirmed no nodemailer/SendGrid/Resend/SMTP config, only Supabase
// Auth's inviteUserByEmail (account-creation only, not general notifications).
//
// Setup: add RESEND_API_KEY to your .env (Render → Environment).
//   Sign up at resend.com, verify a sending domain (or use their shared
//   onboarding@resend.dev sender for testing), create an API key.
//
// Fails soft: if RESEND_API_KEY isn't set, sendEmail() logs a warning and
// returns { sent: false, reason: "not_configured" } instead of throwing —
// callers (e.g. orgCompanyLinks.js) must not let a missing/failed email break
// the underlying database operation it's attached to.
const RESEND_API_URL = "https://api.resend.com/emails"
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || "Capabilio <onboarding@resend.dev>"

export async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipping email to ${to} ("${subject}")`)
    return { sent: false, reason: "not_configured" }
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.error(`[email] Resend send failed (${res.status}) to ${to}:`, body)
      return { sent: false, reason: "provider_error", status: res.status }
    }
    const data = await res.json()
    return { sent: true, id: data.id }
  } catch (err) {
    console.error(`[email] send threw for ${to}:`, err.message)
    return { sent: false, reason: "network_error" }
  }
}
