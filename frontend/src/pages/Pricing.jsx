// Pricing.jsx — Capabilio Subscription Plans
// Free · Capabilio Pro (₹499/mo) · Capabilio Elite (₹999/mo)

import { userDoc } from "../lib/db";
import { useState } from "react"
import { PLANS, getPlan, getPlansByPath } from "../config/plans"
import { useRazorpay } from "../hooks/useRazorpay"

const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

const T = {
  cream:"#F6F6F1", cream2:"#EFEFE9", cream3:"#E8E8E1",
  ink:"#1A1A18",   ink2:"#3A3A38",  ink3:"#6B6B68",  ink4:"#9A9A97",
  indigo:"#3D4EAC",indigo2:"#5B6FD4",indigo3:"#EEF0FB",
  green:"#1A7A4A", green2:"#E8F7EF",
  amber:"#B8620A", amber2:"#FDF3E7",
  red:"#C0392B",   red2:"#FDECEA",
  border:"rgba(26,26,24,0.09)",
  shadow:"0 2px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.05)",
}

// ── Feature group section inside a card ─────────────────────────────────────
function FeatureGroup({ group, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color, letterSpacing: 1.2,
        textTransform: "uppercase", marginBottom: 7, fontFamily: "'DM Mono', monospace",
        display: "flex", alignItems: "center", gap: 5,
      }}>
        {group.label}
      </div>
      <div style={{ display: "grid", gap: 5 }}>
        {group.items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: T.green, fontWeight: 800, flexShrink: 0, fontSize: 12, marginTop: 1 }}>✓</span>
            <span style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ p, isCurrent, isUpgraded, upgrading, onUpgrade, FREE_IDS }) {
  const [hov, setHov] = useState(false)
  const isFree = FREE_IDS.has(p.id)
  const hasGroups = p.featureGroups?.length > 0

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 22,
        border: `2px solid ${isCurrent ? p.color : p.highlight ? p.color + "80" : T.border}`,
        background: p.highlight
          ? `linear-gradient(160deg, #FFFCF8 0%, ${p.colorBg} 100%)`
          : "#fff",
        padding: "28px 24px 24px",
        boxShadow: hov || p.highlight
          ? `0 16px 48px rgba(0,0,0,0.11), 0 4px 12px rgba(0,0,0,0.06)`
          : T.shadow,
        position: "relative", overflow: "hidden",
        transform: hov ? "translateY(-3px)" : "none",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Glow stripe for highlight */}
      {p.highlight && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 4,
          background: `linear-gradient(90deg, ${p.color}, ${p.color}88)`,
          borderRadius: "22px 22px 0 0",
        }} />
      )}

      {/* Badges */}
      <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {isCurrent && (
          <div style={{
            background: p.color, color: "#fff", fontSize: 10, fontWeight: 800,
            padding: "4px 10px", borderRadius: 99, letterSpacing: 0.5,
            textTransform: "uppercase", fontFamily: "'DM Mono', monospace",
          }}>Your Plan</div>
        )}
        {p.badge && !isCurrent && (
          <div style={{
            background: p.color, color: "#fff", fontSize: 10, fontWeight: 800,
            padding: "4px 10px", borderRadius: 99, letterSpacing: 0.5,
            textTransform: "uppercase", fontFamily: "'DM Mono', monospace",
          }}>{p.badge}</div>
        )}
      </div>

      {/* Plan identity */}
      <div style={{ marginBottom: 18 }}>
        <div style={{
          fontSize: 11, fontWeight: 800, color: p.color, letterSpacing: 1.8,
          textTransform: "uppercase", marginBottom: 8,
          fontFamily: "'DM Mono', monospace",
        }}>{p.label}</div>

        {/* Price */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 10 }}>
          {p.price === 0
            ? <span style={{ fontSize: 42, fontWeight: 900, color: T.ink, letterSpacing: -1, lineHeight: 1 }}>Free</span>
            : <>
                <span style={{ fontSize: 15, fontWeight: 700, color: T.ink3, alignSelf: "flex-start", marginTop: 10, lineHeight: 1 }}>₹</span>
                <span style={{ fontSize: 44, fontWeight: 900, color: T.ink, letterSpacing: -2, lineHeight: 1 }}>{p.price.toLocaleString()}</span>
                <span style={{ fontSize: 13, color: T.ink3, marginBottom: 8 }}>/month</span>
              </>
          }
        </div>
        {p.yearlyPrice && (
          <div style={{ fontSize: 11, color: T.green, fontWeight: 700, marginBottom: 8 }}>
            ₹{p.yearlyPrice}/yr · {p.yearlySaving}
          </div>
        )}

        {/* Tagline */}
        {p.tagline && (
          <div style={{
            fontSize: 13, fontWeight: 700, color: p.color, lineHeight: 1.4,
            marginBottom: 4, fontFamily: "'DM Sans', sans-serif",
          }}>{p.tagline}</div>
        )}

        {/* Description */}
        <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.6 }}>
          {p.description || p.features?.[0] || ""}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: T.border, marginBottom: 18 }} />

      {/* Feature groups OR flat list */}
      <div style={{ flex: 1 }}>
        {hasGroups
          ? p.featureGroups.map((g, i) => <FeatureGroup key={i} group={g} color={p.color} />)
          : (p.features || []).map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                <span style={{ color: T.green, fontWeight: 800, flexShrink: 0, fontSize: 12, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.5 }}>{f}</span>
              </div>
            ))
        }

        {/* Not included */}
        {(p.notIncluded || []).length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.border}` }}>
            {p.notIncluded.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5, opacity: 0.45 }}>
                <span style={{ color: T.ink4, fontWeight: 600, flexShrink: 0, fontSize: 12, marginTop: 1 }}>✕</span>
                <span style={{ fontSize: 12, color: T.ink4, lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ marginTop: 20 }}>
        {isFree ? (
          <div style={{
            padding: "13px", borderRadius: 12, background: T.cream2,
            border: `1px solid ${T.border}`, textAlign: "center",
            fontSize: 13, color: T.ink4, fontWeight: 600,
          }}>
            {isCurrent ? "You're on the Free plan" : "Downgrade to Free"}
          </div>
        ) : isUpgraded ? (
          <div style={{
            padding: "13px", borderRadius: 12, background: T.green2,
            border: `1px solid rgba(26,122,74,0.2)`, textAlign: "center",
            fontSize: 13, color: T.green, fontWeight: 700,
          }}>
            ✓ Upgraded to {p.label}!
          </div>
        ) : (
          <button
            onClick={() => onUpgrade(p.id)}
            disabled={upgrading === p.id || isCurrent}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: isCurrent
                ? T.cream2
                : p.highlight
                  ? `linear-gradient(135deg, ${p.color}, ${p.color}CC)`
                  : p.color,
              border: "none",
              color: isCurrent ? T.ink4 : "#fff",
              fontSize: 14, fontWeight: 800,
              cursor: isCurrent || upgrading === p.id ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: upgrading && upgrading !== p.id ? 0.5 : 1,
              transition: "all 0.15s",
              boxShadow: isCurrent ? "none" : `0 4px 16px ${p.color}40`,
              letterSpacing: 0.2,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {upgrading === p.id
              ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />Processing...</>
              : isCurrent
                ? "Current Plan"
                : p.ctaLabel || `Upgrade to ${p.label} →`}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Value proof row ──────────────────────────────────────────────────────────
function ValuePill({ icon, text }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 16px", background: "#fff",
      border: `1px solid ${T.border}`, borderRadius: 12,
      fontSize: 13, color: T.ink2, fontWeight: 500,
      boxShadow: T.shadow,
    }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      {text}
    </div>
  )
}

// ── Main export ──────────────────────────────────────────────────────────────
export default function Pricing({ user, userData, setUserData, onBack }) {
  const currentPlan = getPlan(userData)
  const userPath    = userData?.path || "student"
  const pathPlans   = getPlansByPath(userPath)
  const planOrder   = pathPlans.map(p => p.id)

  const [upgrading, setUpgrading] = useState(null)
  const [upgraded,  setUpgraded]  = useState(null)
  const [error,     setError]     = useState("")
  const { openCheckout }          = useRazorpay()

  const FREE_IDS = new Set(["free", "authority", "org_trial"])

  const handleUpgrade = async (planId) => {
    if (planId === "free") return
    setUpgrading(planId); setError("")
    try {
      const uid = user?.id || user?.uid
      const orderRes = await fetch(`${SERVER}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, uid }),
      })
      if (!orderRes.ok) throw new Error("Could not create payment order.")
      const { orderId, amount, currency, keyId } = await orderRes.json()
      const plan = pathPlans.find(p => p.id === planId)
      openCheckout({
        orderId, amount, currency, keyId,
        name: "Capabilio",
        description: `${plan?.label} Plan`,
        userEmail: user?.email,
        userName: userData?.name || user?.user_metadata?.full_name,
        onSuccess: async (paymentData) => {
          const verifyRes = await fetch(`${SERVER}/api/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...paymentData, planId, uid }),
          })
          if (!verifyRes.ok) throw new Error("Payment verification failed.")
          await userDoc.update(uid, { subscription: planId })
          if (setUserData) setUserData(prev => ({ ...prev, subscription: planId }))
          setUpgraded(planId)
          setUpgrading(null)
        },
        onError: (msg) => {
          if (msg !== "Payment cancelled.") setError(msg)
          setUpgrading(null)
        },
      })
    } catch(e) {
      setError(e.message || "Upgrade failed. Please try again.")
      setUpgrading(null)
    }
  }

  const plan = (id) => PLANS[id] || {}

  // Stats for social proof bar
  const PROOF = [
    { icon: "⚡", text: "Daily missions reset at midnight" },
    { icon: "📈", text: "ELO updates live after every submission" },
    { icon: "🔒", text: "Cancel anytime, no lock-in" },
    { icon: "💳", text: "Powered by Razorpay · INR billing" },
  ]

  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: "auto",
      background: `linear-gradient(180deg, ${T.cream} 0%, ${T.cream2} 100%)`,
      fontFamily: "'DM Sans', sans-serif", color: T.ink, paddingBottom: 80,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Back bar */}
      <div style={{
        borderBottom: `1px solid ${T.border}`,
        background: `${T.cream}EE`, backdropFilter: "blur(14px)",
        padding: "14px 24px", display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <button onClick={onBack} style={{
          padding: "7px 16px", background: "transparent",
          border: `1px solid ${T.border}`, borderRadius: 9,
          color: T.ink3, fontSize: 13, fontWeight: 600, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>← Back</button>
        <div>
          <span style={{ fontWeight: 800, fontSize: 16, color: T.ink }}>Capabilio Plans</span>
          <span style={{ fontSize: 12, color: T.ink3, marginLeft: 10 }}>Choose the plan that fits your growth</span>
        </div>
        <div style={{
          marginLeft: "auto", padding: "5px 14px", borderRadius: 99,
          background: currentPlan.colorBg, border: `1px solid ${currentPlan.color}40`,
          fontSize: 12, fontWeight: 700, color: currentPlan.color,
        }}>
          Current: {currentPlan.label}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "44px 24px" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "#fff", border: `1px solid ${T.border}`,
            borderRadius: 99, padding: "5px 14px",
            fontSize: 11, fontWeight: 700, color: T.indigo,
            letterSpacing: 1.5, textTransform: "uppercase",
            marginBottom: 16, boxShadow: T.shadow,
          }}>
            ✦ Pricing
          </div>
          <h1 style={{
            fontSize: 38, fontWeight: 900, color: T.ink,
            margin: "0 0 14px 0", letterSpacing: -0.8, lineHeight: 1.15,
          }}>
            Invest in your career,<br />not your job hunt
          </h1>
          <p style={{
            fontSize: 15, color: T.ink3, maxWidth: 500,
            margin: "0 auto 28px", lineHeight: 1.75,
          }}>
            ELO-ranked daily missions. Real AI interview practice.
            Live market intelligence. Pick the pace that fits you.
          </p>

          {/* Proof pills */}
          <div style={{
            display: "flex", gap: 10, flexWrap: "wrap",
            justifyContent: "center", marginBottom: 8,
          }}>
            {PROOF.map((p, i) => <ValuePill key={i} icon={p.icon} text={p.text} />)}
          </div>
        </div>

        {error && (
          <div style={{
            background: T.red2, border: `1px solid rgba(192,57,43,0.2)`,
            borderRadius: 12, padding: "12px 18px", marginBottom: 24,
            color: T.red, fontSize: 13, textAlign: "center",
          }}>{error}</div>
        )}

        {/* Plan cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(planOrder.length, 3)}, 1fr)`,
          gap: 20, marginBottom: 52,
          alignItems: "start",
        }}>
          {planOrder.map(pid => (
            <PlanCard
              key={pid}
              p={plan(pid)}
              isCurrent={currentPlan.id === pid}
              isUpgraded={upgraded === pid}
              upgrading={upgrading}
              onUpgrade={handleUpgrade}
              FREE_IDS={FREE_IDS}
            />
          ))}
        </div>

        {/* Feature comparison table — student path only */}
        {userPath !== "professional" && userPath !== "authority" && userPath !== "institution" && (
          <div style={{
            background: "#fff", borderRadius: 20,
            border: `1px solid ${T.border}`, overflow: "hidden",
            boxShadow: T.shadow, marginBottom: 40,
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: `1px solid ${T.border}`,
              background: T.cream2, display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>Full comparison</div>
              <div style={{ fontSize: 12, color: T.ink4, marginLeft: 4 }}>Everything side by side</div>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <th style={{ padding: "14px 20px", textAlign: "left", fontWeight: 700, color: T.ink3, fontSize: 11, textTransform: "uppercase", letterSpacing: 1, width: "34%" }}>Feature</th>
                    {planOrder.map(pid => (
                      <th key={pid} style={{
                        padding: "14px 16px", textAlign: "center",
                        fontWeight: 800, color: plan(pid).color,
                        fontSize: 12, textTransform: "uppercase", letterSpacing: 1,
                        background: currentPlan.id === pid ? `${plan(pid).color}08` : "transparent",
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        {plan(pid).label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Daily missions",         vals: ["1 / day", "3 / day", "6 / day"] },
                    { label: "AI mock interviews",      vals: ["✕", "3 / month", "5 / month"] },
                    { label: "Market analysis reports", vals: ["₹49 each", "1 included / month", "2 included / month"] },
                    { label: "Capi Career Copilot",     vals: ["5 free questions", "Unlimited", "Unlimited + roadmap"] },
                    { label: "Skill gap deep-dive",     vals: ["✕", "✓", "✓"] },
                    { label: "Post-submit AI review",   vals: ["✕", "✕", "✓"] },
                    { label: "Personal branding video", vals: ["✕", "✕", "✓"] },
                    { label: "Hard+ missions",          vals: ["✓", "✓", "✓ (custom)"] },
                    { label: "Portfolio generation",    vals: ["✓", "✓", "✓"] },
                    { label: "ELO skill radar",         vals: ["✓", "✓", "✓"] },
                    { label: "Extra report price",      vals: ["₹49 / report", "₹49 / report", "₹49 / report"] },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? "transparent" : T.cream2 + "80" }}>
                      <td style={{ padding: "12px 20px", color: T.ink2, fontWeight: 600 }}>{row.label}</td>
                      {row.vals.map((v, j) => (
                        <td key={j} style={{
                          padding: "12px 16px", textAlign: "center",
                          background: currentPlan.id === planOrder[j] ? `${plan(planOrder[j]).color}06` : "transparent",
                          fontSize: 13,
                          color: v === "✕" ? T.ink4 : v === "✓" ? T.green : T.ink2,
                          fontWeight: v === "✕" ? 400 : 600,
                        }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ strip */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14, marginBottom: 32,
        }}>
          {[
            { q: "When do daily missions reset?", a: "Every 24 hours from your last completion. Play at midnight or noon — your streak resets on the same schedule." },
            { q: "Can I cancel anytime?", a: "Yes. Cancel from Settings before your next billing date and you won't be charged again. Your plan stays active until the period ends." },
            { q: "What counts as an AI interview session?", a: "One full mock interview round — 20–40 minutes with role-specific questions, transcript, and a detailed feedback report." },
            { q: "What's a market analysis report?", a: "A deep-dive into your target domain: hiring velocity, salary ranges, in-demand skills, and competitor candidate benchmarks." },
          ].map((faq, i) => (
            <div key={i} style={{
              background: "#fff", border: `1px solid ${T.border}`,
              borderRadius: 14, padding: "16px 18px", boxShadow: T.shadow,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{faq.q}</div>
              <div style={{ fontSize: 12.5, color: T.ink3, lineHeight: 1.65 }}>{faq.a}</div>
            </div>
          ))}
        </div>

        {/* Fine print */}
        <div style={{ textAlign: "center", color: T.ink4, fontSize: 12, lineHeight: 1.9 }}>
          <p>Monthly plans billed on the same date each month. Unused included reports do not roll over.</p>
          <p>Prices in INR inclusive of taxes. Powered by Razorpay. Cancel anytime from your account settings.</p>
        </div>

      </div>
    </div>
  )
}
