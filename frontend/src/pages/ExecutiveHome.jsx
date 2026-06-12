/**
 * ExecutiveHome.jsx — Executive authority command center
 * "What is moving in my authority business today?"
 */
const C = {
  gold:    "#F59E0B",
  goldL:   "rgba(245,158,11,0.12)",
  goldB:   "rgba(245,158,11,0.28)",
  navy:    "#F8F9FA",
  ink:     "#0F172A",
  ink2:    "#475569",
  ink3:    "#94A3B8",
  ink4:    "#64748B",
  border:  "rgba(0,0,0,0.05)",
  surface: "#FFFFFF",
  bg:      "#FFFFFF",
  green:   "#10B981",
  greenL:  "rgba(16,185,129,0.12)",
  blue:    "#3B82F6",
  blueL:   "rgba(59,130,246,0.12)",
  red:     "#F43F5E",
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: 20,
      boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.3)",
      ...style,
    }}>{children}</div>
  )
}

function Label({ children, color = C.gold, bg = C.goldL }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 100,
      background: bg, color, fontSize: 11, fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>{children}</span>
  )
}

export default function ExecutiveHome({ user, userData, onNavigate }) {
  const name      = userData?.name || user?.displayName || "Executive"
  const firstName = name.split(" ")[0]
  const keyword   = userData?.keyword || "Founder"

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  const todayBookings = [
    { time: "11:00 AM", title: "1:1 Strategy Session", requester: "Arjun Mehta", type: "Paid", rate: "₹8,000" },
    { time: "3:00 PM",  title: "Startup Advisory Call", requester: "Sneha Iyer",  type: "Paid", rate: "₹12,000" },
  ]

  const revenue = { today: "₹20,000", month: "₹1,84,000", pending: "₹36,000" }

  const pendingRequests = [
    { from: "Rahul Sharma",   topic: "Product GTM review",       time: "2h ago" },
    { from: "Priya Nair",     topic: "Investment opportunity",    time: "5h ago" },
    { from: "Aditya Kumar",   topic: "Technical co-founder Q&A", time: "1d ago" },
  ]

  const insights = [
    { title: "Why most B2B products fail pre-PMF",  views: "1.4k", engagement: "High" },
    { title: "Hiring your first 10 engineers",       views: "892",  engagement: "Mid"  },
  ]

  return (
    <div style={{ background: `radial-gradient(ellipse at 50% 30%, rgba(245,158,11,0.14) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(161,122,0,0.07) 0%, transparent 45%), #FFFFFF`, flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 24px", fontFamily: "Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');`}</style>

      {/* ── Greeting ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>{greeting}, {firstName} · {keyword}</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: C.ink, margin: "4px 0 0", lineHeight: 1.2 }}>
          Your authority <span style={{ color: C.gold, fontStyle: "italic" }}>today</span>
        </h1>
      </div>

      {/* ── Revenue snapshot ─────────────────────────────────── */}
      <Card style={{ marginBottom: 16, background: C.navy, border: "none" }}>
        <Label color={C.gold} bg={C.goldB}>Revenue Today</Label>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 }}>
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 30, fontWeight: 700, color: C.gold }}>{revenue.today}</div>
            <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>from {todayBookings.length} sessions</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, color: "#6B7280" }}>This month</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: "#fff" }}>{revenue.month}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>{revenue.pending} pending payout</div>
          </div>
        </div>
      </Card>

      {/* ── Today's sessions ─────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>Today's Bookings</div>
          <button onClick={() => onNavigate("timemarket")} style={{ fontSize: 12, color: C.gold, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Manage →</button>
        </div>
        {todayBookings.length === 0 ? (
          <Card style={{ textAlign: "center", color: C.ink4, fontSize: 13 }}>No bookings today. <span style={{ color: C.gold, cursor: "pointer" }} onClick={() => onNavigate("timemarket")}>Open Time Market</span></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {todayBookings.map((b, i) => (
              <Card key={i} style={{ padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{b.time}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginTop: 2 }}>{b.title}</div>
                    <div style={{ fontSize: 12, color: C.ink3, marginTop: 1 }}>with {b.requester}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <Label>{b.type}</Label>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: C.green, marginTop: 6 }}>{b.rate}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Pending session requests ─────────────────────────── */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>Pending Requests</div>
          <Label color={C.red} bg="#FEF2F2">{pendingRequests.length} new</Label>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pendingRequests.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < pendingRequests.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{r.from}</div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 1 }}>{r.topic}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: C.ink4 }}>{r.time}</span>
                <button onClick={() => onNavigate("timemarket")} style={{ padding: "5px 12px", background: C.goldL, border: `1px solid ${C.gold}30`, borderRadius: 8, color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Review</button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Top performing insights ──────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.ink2 }}>Top-Performing Insights</div>
          <button onClick={() => onNavigate("aura")} style={{ fontSize: 12, color: C.gold, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Profile →</button>
        </div>
        {insights.map((ins, i) => (
          <Card key={i} style={{ marginBottom: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, flex: 1, paddingRight: 12 }}>{ins.title}</div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: C.blue }}>{ins.views} views</div>
                <div style={{ fontSize: 11, color: ins.engagement === "High" ? C.green : C.ink3, fontWeight: 600, marginTop: 2 }}>{ins.engagement}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Quick nav ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
        {[
          { icon: "⏰", label: "Time Market",    page: "timemarket"  },
          { icon: "🎙️", label: "Signal Rooms",   page: "signalrooms" },
          { icon: "🌐", label: "Network",         page: "execnetwork" },
          { icon: "✦",  label: "My Profile",      page: "aura"        },
        ].map((a) => (
          <button key={a.page} onClick={() => onNavigate(a.page)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, color: C.ink2, transition: "border-color 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          ><span style={{ fontSize: 18 }}>{a.icon}</span>{a.label}</button>
        ))}
      </div>
    </div>
  )
}
