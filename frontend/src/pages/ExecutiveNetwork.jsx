/**
 * ExecutiveNetwork.jsx — Curated executive peer graph
 * Peer circles · Venture radar · Board opportunities · Trusted intros
 */
import { useState } from "react"

const C = {
  gold:    "#C9A84C",
  goldL:   "#FFFDF0",
  goldB:   "rgba(201,168,76,0.15)",
  navy:    "#1a1a2e",
  ink:     "#FFFFFF",
  ink2:    "#374151",
  ink3:    "#6B7280",
  ink4:    "#9CA3AF",
  border:  "#E5E7EB",
  surface: "#fff",
  bg:      "#F6F6F1",
  green:   "#16A34A",
  greenL:  "#F0FDF4",
  blue:    "#1D4ED8",
  blueL:   "#EFF6FF",
  red:     "#DC2626",
  purple:  "#6D28D9",
  purpleL: "#F4F0FF",
}

const PEERS = [
  { name: "Anita Kapoor",    role: "Co-Founder & CEO",   company: "FinStack",    mutual: 4, verified: true,  connected: true  },
  { name: "Rajesh Menon",    role: "CTO",                company: "Zeno AI",     mutual: 2, verified: true,  connected: true  },
  { name: "Priya Nambiar",   role: "VP Engineering",     company: "Razorpay",    mutual: 6, verified: true,  connected: false },
  { name: "Siddharth Shah",  role: "Founder",            company: "CloudMorph",  mutual: 1, verified: false, connected: false },
]

const VENTURE_SIGNALS = [
  { company: "DataPipe AI",    stage: "Seed",    ask: "Technical Co-Founder", fit: 91, sector: "AI/ML"     },
  { company: "HealthLedger",   stage: "Series A",ask: "Advisory Board",       fit: 78, sector: "HealthTech" },
  { company: "BricksAI",       stage: "Pre-Seed", ask: "CTO / Advisor",       fit: 85, sector: "PropTech"  },
]

const BOARD_OPPS = [
  { org: "Tech Mahindra Foundation", type: "Advisory Board", domain: "Education + Tech",  deadline: "15 Jul" },
  { org: "NSRCEL · IIMB",            type: "Mentor Network", domain: "SaaS Founders",     deadline: "Open"   },
]

const TABS = ["Peer Circles", "Venture Radar", "Board Seats", "Introductions"]

export default function ExecutiveNetwork({ user, userData }) {
  const [tab, setTab]         = useState("Peer Circles")
  const [connected, setConn]  = useState(PEERS.filter(p => p.connected).map(p => p.name))

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", fontFamily: "Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');`}</style>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ padding: "20px 16px 0" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: C.ink, margin: 0 }}>
          Network <span style={{ color: C.gold, fontStyle: "italic" }}>Graph</span>
        </h1>
        <p style={{ fontSize: 13, color: C.ink3, margin: "4px 0 16px" }}>Your curated executive circle. Private by design.</p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { val: connected.length, label: "Connected",     color: C.gold   },
            { val: "3",              label: "Opportunities", color: C.green  },
            { val: "2",              label: "Intros Waiting", color: C.blue  },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: C.ink4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, overflowX: "auto", background: C.surface, padding: "0 16px" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "12px 14px", border: "none", borderBottom: tab === t ? `2px solid ${C.gold}` : "2px solid transparent", borderTop: "2px solid transparent", background: "transparent", color: tab === t ? C.gold : C.ink3, fontSize: 13, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 16px 24px" }}>

        {/* ── Peer Circles ─────────────────────────────────────── */}
        {tab === "Peer Circles" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PEERS.map(p => {
              const isConn = connected.includes(p.name)
              return (
                <div key={p.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: C.gold, fontFamily: "'Playfair Display', serif", flexShrink: 0 }}>
                      {p.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{p.name}</span>
                        {p.verified && <span style={{ fontSize: 11, color: C.gold }}>✓</span>}
                      </div>
                      <div style={{ fontSize: 12, color: C.ink3 }}>{p.role} · {p.company}</div>
                      <div style={{ fontSize: 11, color: C.ink4, marginTop: 2 }}>{p.mutual} mutual connections</div>
                    </div>
                    <button
                      onClick={() => setConn(prev => isConn ? prev.filter(n => n !== p.name) : [...prev, p.name])}
                      style={{ padding: "7px 14px", background: isConn ? C.greenL : C.goldL, border: `1px solid ${isConn ? C.green : C.gold}40`, borderRadius: 10, color: isConn ? C.green : C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
                    >{isConn ? "Connected" : "Connect"}</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── Venture Radar ─────────────────────────────────────── */}
        {tab === "Venture Radar" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "12px 14px", background: C.goldL, border: `1px solid ${C.gold}30`, borderRadius: 12, fontSize: 13, color: C.ink2, marginBottom: 4 }}>
              🔭 Matched to your profile · Updated weekly · Private introductions via Capabilio
            </div>
            {VENTURE_SIGNALS.map((v, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <span style={{ padding: "2px 8px", background: C.blueL, color: C.blue, borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{v.stage}</span>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 6, fontFamily: "'Playfair Display', serif" }}>{v.company}</div>
                    <div style={{ fontSize: 13, color: C.ink3, marginTop: 2 }}>Looking for: <strong>{v.ask}</strong></div>
                    <div style={{ fontSize: 12, color: C.ink4, marginTop: 1 }}>Sector: {v.sector}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: v.fit >= 85 ? C.green : C.amber }}>{v.fit}%</div>
                    <div style={{ fontSize: 11, color: C.ink4 }}>Profile fit</div>
                  </div>
                </div>
                <button style={{ width: "100%", padding: "10px", background: C.navy, border: "none", borderRadius: 10, color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Request Trusted Introduction →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Board Seats ───────────────────────────────────────── */}
        {tab === "Board Seats" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {BOARD_OPPS.map((b, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <span style={{ padding: "2px 8px", background: C.purpleL, color: C.purple, borderRadius: 6, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{b.type}</span>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 6, fontFamily: "'Playfair Display', serif" }}>{b.org}</div>
                    <div style={{ fontSize: 13, color: C.ink3, marginTop: 2 }}>Domain: {b.domain}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: C.ink4 }}>Deadline</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: b.deadline === "Open" ? C.green : C.amber }}>{b.deadline}</div>
                  </div>
                </div>
                <button style={{ width: "100%", padding: "10px", background: C.goldL, border: `1px solid ${C.gold}40`, borderRadius: 10, color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  Express Interest →
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Introductions ─────────────────────────────────────── */}
        {tab === "Introductions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ padding: "12px 14px", background: C.blueL, border: `1px solid ${C.blue}20`, borderRadius: 12, fontSize: 13, color: C.ink2 }}>
              🤝 Trusted introductions are mutual — both parties must agree before contact is shared.
            </div>
            {[
              { from: "Rajesh Menon", to: "Kiran Reddy · VP Product · Swiggy", reason: "You both focus on B2B SaaS GTM", time: "2d ago" },
              { from: "Anita Kapoor", to: "Meera Nair · Partner · Blume VC",  reason: "Seed-stage funding context",     time: "4d ago" },
            ].map((intro, i) => (
              <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
                <div style={{ fontSize: 12, color: C.ink4, marginBottom: 4 }}>Introduction from <strong style={{ color: C.ink }}>{intro.from}</strong> · {intro.time}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{intro.to}</div>
                <div style={{ fontSize: 13, color: C.ink3, marginBottom: 12 }}>"{intro.reason}"</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ flex: 1, padding: "9px", background: C.greenL, border: `1px solid ${C.green}30`, borderRadius: 10, color: C.green, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Accept</button>
                  <button style={{ padding: "9px 14px", background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 10, color: C.ink3, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
