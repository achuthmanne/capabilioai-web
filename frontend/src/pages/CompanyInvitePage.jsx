// CompanyInvitePage.jsx — resolves /company-invite/:token
// A college's Talent Network invite email links here. Real consent always
// happens on this page — a college can never self-activate a link from its
// own side (backend/server/routes/orgCompanyLinks.js + the DB trigger in
// org_company_links_token_consent_migration.sql both enforce this).
import { useEffect, useState } from "react"
import { orgApi } from "../lib/api"

export default function CompanyInvitePage({ token, user, userData, onDone, onSignOut }) {
  const [status, setStatus] = useState("loading") // loading | preview | needs_company_account | acting | done_accept | done_decline | already | invalid
  const [institutionName, setInstitutionName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [error, setError] = useState(null)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (!token) { setStatus("invalid"); return }
    let cancelled = false

    async function resolve() {
      try {
        const res = await orgApi.resolveCompanyInvite(token)
        if (cancelled) return
        if (!res.valid) { setStatus("invalid"); return }
        setInstitutionName(res.institutionName)
        setCompanyName(res.companyName)

        if (res.status !== "invited") { setStatus("already"); return }

        if (!user) { setStatus("preview"); try { sessionStorage.setItem("capabilio_company_invite_token", token) } catch {}; return }

        if ((userData?.org_type || "") !== "company") {
          // Stash the token even though we're logged in — the account switch
          // below signs this user out, and App.jsx's post-login effect reads
          // this same key to auto-accept once a real company account exists.
          try { sessionStorage.setItem("capabilio_company_invite_token", token) } catch {}
          setStatus("needs_company_account")
          return
        }

        setStatus("preview") // logged in AND a company account — show real Accept/Decline buttons
      } catch (err) {
        if (!cancelled) { setError(err.message); setStatus("invalid") }
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [token, user, userData?.org_type]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAccept() {
    setStatus("acting")
    try {
      await orgApi.acceptCompanyInvite(token)
      try { sessionStorage.removeItem("capabilio_company_invite_token") } catch {}
      setStatus("done_accept")
    } catch (err) {
      setError(err.message); setStatus("preview")
    }
  }

  async function handleSwitchAccount() {
    setSigningOut(true)
    try {
      await onSignOut?.()
      // Token is already stashed in sessionStorage (see resolve() above).
      // After sign-out, `user` becomes null, this same page re-resolves into
      // the "preview" (not-logged-in) state, and its own sign-up button
      // routes to account-type selection — pick "Organisation" → "Company"
      // there. Once that new account finishes onboarding, App.jsx's post-login
      // effect auto-accepts this invite using the stashed token.
    } finally {
      setSigningOut(false)
    }
  }

  async function handleDecline() {
    setStatus("acting")
    try {
      await orgApi.declineCompanyInvite(token)
      try { sessionStorage.removeItem("capabilio_company_invite_token") } catch {}
      setStatus("done_decline")
    } catch (err) {
      setError(err.message); setStatus("preview")
    }
  }

  const wrap = { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F6F6F1", fontFamily: "'Inter', system-ui, sans-serif", padding: 24, gap: 20, textAlign: "center" }
  const card = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "40px 48px", maxWidth: 460, width: "100%", boxShadow: "0 4px 24px rgba(17,24,39,0.07)" }
  const badge = { display: "inline-flex", alignItems: "center", gap: 8, background: "#EEF7EE", color: "#166534", borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 }
  const btnPrimary = { background: "#3D4EAC", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }
  const btnOutline = { background: "#fff", color: "#374151", border: "1px solid #D1D5DB", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }

  if (status === "loading" || status === "acting") {
    return (
      <div style={wrap}><div style={card}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🏢</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{status === "acting" ? "Recording your response…" : "Loading invite…"}</div>
        <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "#3D4EAC", borderRadius: "50%", animation: "ci-spin 0.7s linear infinite" }} />
        </div>
        <style>{`@keyframes ci-spin { to { transform: rotate(360deg); } }`}</style>
      </div></div>
    )
  }

  if (status === "invalid") {
    return (
      <div style={wrap}><div style={card}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Invite not found</div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 24 }}>{error || "This invite link may be invalid."}</div>
        <button onClick={() => onDone?.()} style={btnPrimary}>Continue to Capabilio →</button>
      </div></div>
    )
  }

  if (status === "already") {
    return (
      <div style={wrap}><div style={card}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>ℹ️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Already responded</div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 24 }}>This invite from <strong>{institutionName}</strong> has already been accepted or declined.</div>
        <button onClick={() => onDone?.()} style={btnPrimary}>Go to Capabilio →</button>
      </div></div>
    )
  }

  if (status === "done_accept") {
    return (
      <div style={wrap}><div style={card}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
        <div style={badge}>🎓 {institutionName}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Connected!</div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 8 }}>You'll see {institutionName}'s verified student performance and placement data — never contact details. Reach students only through {institutionName}.</div>
        <div style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.6, marginBottom: 24 }}>This is a separate Talent Network account, not your Capabilio Recruiter dashboard.</div>
        <button onClick={() => onDone?.()} style={btnPrimary}>Go to Talent Network →</button>
      </div></div>
    )
  }

  if (status === "done_decline") {
    return (
      <div style={wrap}><div style={card}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>✓</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Invite declined</div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 24 }}>You've declined {institutionName}'s invite.</div>
        <button onClick={() => onDone?.()} style={btnPrimary}>Continue to Capabilio →</button>
      </div></div>
    )
  }

  if (status === "needs_company_account") {
    return (
      <div style={wrap}><div style={card}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🏢</div>
        <div style={badge}>🎓 {institutionName}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>This invite needs a Company account</div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 16 }}>
          You're currently signed in as <strong>{userData?.name || userData?.org_name || "an Institution account"}</strong>. Each Capabilio login is a single role, so an Institution account can't also accept a Talent Network invite — that takes a separate Company account (a different email address).
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", lineHeight: 1.7, marginBottom: 24 }}>
          Sign out below, then sign up again choosing <strong>Organisation → Company</strong> with the email your company uses. This invite link stays valid — come back to it and it'll be waiting to accept.
        </div>
        {error && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 12 }}>{error}</div>}
        <button onClick={handleSwitchAccount} disabled={signingOut} style={{ ...btnPrimary, opacity: signingOut ? 0.7 : 1, cursor: signingOut ? "not-allowed" : "pointer" }}>
          {signingOut ? "Signing out…" : "Sign out & create a Company account →"}
        </button>
      </div></div>
    )
  }

  // preview — either not logged in, or logged in as a company and ready to respond
  return (
    <div style={wrap}><div style={card}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
      <div style={badge}>🎓 {institutionName}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>Invited you to their Talent Network</div>
      <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 12 }}>
        As <strong>{companyName}</strong>, if you accept you'll see {institutionName}'s verified student performance and placement data.
        Personal contact details are never shared at any access level — reaching a student always goes through {institutionName}.
      </div>
      <div style={{ fontSize: 11, color: "#9CA3AF", lineHeight: 1.6, marginBottom: 8 }}>
        This creates a Talent Network account, separate from a Capabilio Recruiter account at recruiter.capabilio.online.
      </div>
      {error && <div style={{ fontSize: 12, color: "#DC2626", marginBottom: 12 }}>{error}</div>}
      {user ? (
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={handleDecline} style={btnOutline}>Decline</button>
          <button onClick={handleAccept} style={btnPrimary}>Accept ✓</button>
        </div>
      ) : (
        <button onClick={() => onDone?.()} style={btnPrimary}>Sign up / Log in to respond →</button>
      )}
    </div></div>
  )
}
