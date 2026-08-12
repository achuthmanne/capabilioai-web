// AttestPage.jsx — resolves /attest/:token employer-attestation links
// (employer_attestations table, backend/server/routes/employerAttestation.js).
//
// Deliberately never requires login — the visitor is a former employer/
// manager with no Capabilio account. The token itself is the access control
// (256-bit random, see routes/employerAttestation.js's generateToken), same
// trust model as a password-reset link. Mirrors JoinOrgPage.jsx's structure
// but has no auth branch at all.
import { useEffect, useState } from "react"
import { attestationApi } from "../lib/api"

export default function AttestPage({ token }) {
  const [status, setStatus] = useState("loading") // loading | preview | submitting | confirmed | declined | invalid
  const [claim, setClaim] = useState(null)
  const [error, setError] = useState(null)
  const [slowHint, setSlowHint] = useState(false)

  useEffect(() => {
    if (status !== "loading") return
    const t = setTimeout(() => setSlowHint(true), 6000)
    return () => clearTimeout(t)
  }, [status])

  useEffect(() => {
    if (!token) { setStatus("invalid"); return }
    async function resolve() {
      try {
        const res = await attestationApi.resolve(token)
        if (!res.valid) { setError(res.reason); setStatus("invalid"); return }
        setClaim(res)
        setStatus("preview")
      } catch (err) {
        console.error("AttestPage: resolve failed", err)
        setError(err.message)
        setStatus("invalid")
      }
    }
    resolve()
  }, [token])

  async function respond(action) {
    setStatus("submitting")
    try {
      if (action === "confirm") await attestationApi.confirm(token)
      else await attestationApi.decline(token)
      setStatus(action === "confirm" ? "confirmed" : "declined")
    } catch (err) {
      console.error("AttestPage: respond failed", err)
      setError(err.message)
      setStatus("preview")
    }
  }

  const wrap = { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F6F6F1", fontFamily: "'Inter', system-ui, sans-serif", padding: 24, gap: 20, textAlign: "center" }
  const card = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "40px 48px", maxWidth: 460, width: "100%", boxShadow: "0 4px 24px rgba(17,24,39,0.07)" }
  const btnPrimary = { background: "#3D4EAC", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }
  const btnSecondary = { background: "#fff", color: "#374151", border: "1px solid #D1D5DB", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }
  const claimBox = { background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, padding: "16px 20px", textAlign: "left", margin: "16px 0 24px" }

  const INVALID_MESSAGES = {
    not_found: "This attestation link doesn't exist.",
    expired: "This attestation link has expired. Ask the candidate to send a new one.",
    confirmed: "This attestation has already been confirmed. Thank you.",
    declined: "This attestation has already been declined.",
  }

  if (status === "loading" || status === "submitting") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            {status === "submitting" ? "Recording your response…" : "Loading the request…"}
          </div>
          {status === "loading" && slowHint && (
            <div style={{ fontSize: 12.5, color: "#6B7280", lineHeight: 1.6 }}>
              Waking up the server — this can take up to a minute the first time. Hang tight, don&apos;t close this tab.
            </div>
          )}
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "#3D4EAC", borderRadius: "50%", animation: "attest-spin 0.7s linear infinite" }} />
          </div>
          <style>{`@keyframes attest-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (status === "invalid") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Link not valid</div>
          <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7 }}>
            {INVALID_MESSAGES[error] || "This link may have expired or already been used."}
          </div>
        </div>
      </div>
    )
  }

  if (status === "confirmed" || status === "declined") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>{status === "confirmed" ? "✅" : "🚫"}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            {status === "confirmed" ? "Thanks — confirmed" : "Thanks — declined"}
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7 }}>
            {status === "confirmed"
              ? "Your confirmation has been recorded and the candidate's employment record has been verified."
              : "Your response has been recorded. The candidate's claim was not verified through this channel."}
          </div>
        </div>
      </div>
    )
  }

  // preview
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 4 }}>Confirm employment claim</div>
        <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>
          {claim?.attesterName ? `Hi ${claim.attesterName}, ` : ""}a Capabilio candidate listed you to confirm this claim.
        </div>
        <div style={claimBox}>
          <div style={{ fontSize: 13, color: "#111827" }}><strong>Role:</strong> {claim?.role || "—"}</div>
          <div style={{ fontSize: 13, color: "#111827" }}><strong>Company:</strong> {claim?.company || "—"}</div>
          {(claim?.startDate || claim?.endDate) && (
            <div style={{ fontSize: 13, color: "#111827" }}>
              <strong>Dates:</strong> {claim?.startDate || "—"} – {claim?.endDate || "present"}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 20 }}>
          No account needed. Your response is recorded permanently and can&apos;t be changed afterward.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button style={btnSecondary} onClick={() => respond("decline")}>Decline</button>
          <button style={btnPrimary} onClick={() => respond("confirm")}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
