// JoinPage.jsx — resolves /join/:code invite links
// Fetches the invite code from Supabase, stores context in sessionStorage,
// then redirects the student to the onboarding flow with college pricing active.
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function JoinPage({ code, onDone }) {
  const [status, setStatus] = useState("loading") // "loading" | "found" | "invalid"
  const [institutionName, setInstitutionName] = useState("")

  useEffect(() => {
    if (!code) { setStatus("invalid"); return }

    async function resolveCode() {
      try {
        const { data, error } = await supabase
          .from("institution_invite_codes")
          .select(`
            id,
            institution_id,
            label,
            discount_pct,
            cohort_id,
            department,
            batch,
            max_uses,
            uses_count,
            expires_at,
            institutions ( name )
          `)
          .eq("code", code)
          .eq("is_active", true)
          .single()

        if (error || !data) { setStatus("invalid"); return }

        // Check expiry
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setStatus("invalid"); return
        }

        // Check max uses
        if (data.max_uses !== null && data.uses_count >= data.max_uses) {
          setStatus("invalid"); return
        }

        const instName = data.institutions?.name ?? data.label ?? "Your College"
        setInstitutionName(instName)

        // Persist invite context for plan step to read
        sessionStorage.setItem("capabilio_invite", JSON.stringify({
          code,
          institution_id:    data.institution_id,
          institution_label: instName,
          discount_pct:      data.discount_pct ?? 50,
          cohort_id:         data.cohort_id ?? null,
          department:        data.department ?? null,
          batch:             data.batch ?? null,
          invite_code_id:    data.id,
        }))

        setStatus("found")

        // Brief 1.2s welcome flash then hand off to app
        setTimeout(() => onDone?.(), 1200)

      } catch (err) {
        console.error("JoinPage: invite resolution failed", err)
        setStatus("invalid")
      }
    }

    resolveCode()
  }, [code]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Styles ──────────────────────────────────────────────────────────────────
  const wrap = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#F6F6F1",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: 24,
    gap: 20,
    textAlign: "center",
  }

  const card = {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 20,
    padding: "40px 48px",
    maxWidth: 440,
    width: "100%",
    boxShadow: "0 4px 24px rgba(17,24,39,0.07)",
  }

  const badge = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "#EEF7EE",
    color: "#166534",
    borderRadius: 999,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 20,
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🎓</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            Verifying your college invite…
          </div>
          <div style={{ fontSize: 13, color: "#6B7280" }}>Just a moment</div>
          <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
            <div style={{
              width: 28, height: 28,
              border: "3px solid #E5E7EB",
              borderTopColor: "#3D4EAC",
              borderRadius: "50%",
              animation: "join-spin 0.7s linear infinite",
            }} />
          </div>
          <style>{`@keyframes join-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )
  }

  // ── Invalid / expired code ───────────────────────────────────────────────────
  if (status === "invalid") {
    return (
      <div style={wrap}>
        <div style={card}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
            Invite link not valid
          </div>
          <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7, marginBottom: 24 }}>
            This link may have expired, reached its limit, or been deactivated.<br />
            Ask your TPO or professor for a fresh link.
          </div>
          <button
            onClick={() => onDone?.()}
            style={{
              background: "#3D4EAC", color: "#fff", border: "none",
              borderRadius: 10, padding: "12px 28px", fontSize: 14,
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Continue without invite →
          </button>
        </div>
      </div>
    )
  }

  // ── Success flash ────────────────────────────────────────────────────────────
  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
        <div style={badge}>🎓 {institutionName}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#111827", marginBottom: 8, letterSpacing: "-0.02em" }}>
          College invite confirmed!
        </div>
        <div style={{ fontSize: 13, color: "#6B7280", lineHeight: 1.7 }}>
          You'll see exclusive college-discounted pricing when you choose your plan.
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: "#9CA3AF" }}>Taking you to sign up…</div>
      </div>
    </div>
  )
}
