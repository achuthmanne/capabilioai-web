// JoinOrgPage.jsx — resolves /join-org/:token invite links (org_join_links).
// Self-serve student onboarding: a professor shares one link, students who
// open it and are (or become) logged in are added to org_members automatically
// — no admin has to type each student in one at a time.
//
// If the visitor isn't logged in yet, the token is stashed in sessionStorage
// and consumed once App.jsx sees `user` become available (see the
// pendingOrgJoinToken effect in App.jsx) — mirrors the existing
// `capabilio_invite` sessionStorage pattern already used by JoinPage.jsx.
import { useEffect, useState } from "react"
import { orgApi } from "../lib/api"

export default function JoinOrgPage({ token, user, onDone }) {
  const [status, setStatus] = useState("loading") // loading | preview | joining | joined | already | invalid
  const [orgName, setOrgName] = useState("")
  const [roleInfo, setRoleInfo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) { setStatus("invalid"); return }

    async function resolve() {
      try {
        const res = await orgApi.resolveJoinLink(token)
        if (!res.valid) { setStatus("invalid"); return }
        setOrgName(res.orgName)
        setRoleInfo({ role: res.role, department: res.department, batch: res.batch })

        if (user) {
          // Already logged in — claim immediately.
          setStatus("joining")
          const claim = await orgApi.claimJoinLink(token)
          setStatus(claim.alreadyMember ? "already" : "joined")
        } else {
          // Not logged in — stash the token, send to signup/login.
          try { sessionStorage.setItem("capabilio_org_join_token", token) } catch {}
          // 2026-07-31: also stash college + department so the signup flow can
          // land the visitor straight on the student path's account-setup
          // screen (Onboarding.jsx "search" step) with College/Branch already
          // filled in and locked, instead of asking them to pick an account
          // type and re-enter what the college's own link already tells us.
          // Only forced for student-role links — faculty/admin/recruiter
          // links have no equivalent single-screen destination, so those
          // fall back to the normal account-type chooser.
          try {
            sessionStorage.setItem("capabilio_org_join_context", JSON.stringify({
              college: res.orgName || "", department: res.department || "", batch: res.batch || "",
            }))
          } catch {}
          if (res.role === "student") {
            try { localStorage.setItem("capabilio_selected_path", "student") } catch {}
          }
          setStatus("preview")
        }
      } catch (err) {
        console.error("JoinOrgPage: resolve/claim failed", err)
        setError(err.message)
        setStatus("invalid")
      }
    }
    resolve()
  }, [token, user]) // eslint-disable-line react-hooks/exhaustive-deps

  const wrap = { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F6F6F1", fontFamily: "'Inter', system-ui, sans-serif", padding: 24, gap: 20, textAlign: "center" }
  const card = { background: "#fff", border: "1px solid #E5E7EB", borderRadius: 20, padding: "40px 48px", maxWidth: 440, width: "100%", boxShadow: "0 4px 24px rgba(17,24,39,0.07)" }
  const badge = { display: "inline-flex", alignItems: "center", gap: 8, background: "#EEF7EE", color: "#166534", borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 700, marginBottom: 20 }
  const btn = { background: "#3D4EAC", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }

  if (status === "loading" || status === "joining") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🎓</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            {status === "joining" ? "Adding you to the roster…" : "Checking your invite…"}
          </div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
            <div style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "#3D4EAC", borderRadius: "50%", animation: "join-org-spin 0.7s linear infinite" }} />
          </div>
          <style>{`@keyframes join-org-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  if (status === "invalid") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>Invite link not valid</div>
          <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 24 }}>
            {error || "This link may have expired, reached its limit, or been revoked."}<br />Ask your professor or TPO for a fresh link.
          </div>
          <button onClick={() => onDone?.()} style={btn}>Continue to Capabilio →</button>
        </div>
      </div>
    )
  }

  if (status === "joined" || status === "already") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
          <div style={badge}>🎓 {orgName}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
            {status === "already" ? "You're already on the roster" : "You're in!"}
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 24 }}>
            You've been added as {roleInfo?.role}{roleInfo?.department ? ` · ${roleInfo.department}` : ""}{roleInfo?.batch ? ` · ${roleInfo.batch}` : ""}.
          </div>
          <button onClick={() => onDone?.()} style={btn}>Go to Capabilio →</button>
        </div>
      </div>
    )
  }

  // preview — not logged in yet, needs signup/login first
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎓</div>
        <div style={badge}>🎓 {orgName}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8 }}>You've been invited to join</div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 24 }}>
          Sign up or log in to be added as {roleInfo?.role}{roleInfo?.department ? ` · ${roleInfo.department}` : ""}{roleInfo?.batch ? ` · ${roleInfo.batch}` : ""} automatically.
        </div>
        <button onClick={() => onDone?.()} style={btn}>Sign up / Log in →</button>
      </div>
    </div>
  )
}
