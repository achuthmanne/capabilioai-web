/**
 * SignalRooms.jsx — Executive verified live authority sessions
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
  red:     "#DC2626",
  blue:    "#1D4ED8",
  blueL:   "#EFF6FF",
  purple:  "#6D28D9",
  purpleL: "#F4F0FF",
}

const ROOMS = [
  {
    id: 1, status: "live",
    title: "Scaling B2B SaaS beyond ₹1 Cr ARR",
    host: "You",
    speakers: ["Arjun Mehta", "Sneha Iyer"],
    audience: 142, gated: false,
    scheduled: null, duration: "32 min live",
    tags: ["SaaS", "GTM", "Founders"],
  },
  {
    id: 2, status: "upcoming",
    title: "Hiring your first CTO — what nobody tells you",
    host: "You",
    speakers: [],
    audience: 0, gated: true, price: "₹499",
    scheduled: "Tomorrow · 11:00 AM",
    tags: ["Hiring", "Leadership", "Startups"],
  },
  {
    id: 3, status: "recorded",
    title: "AMA: From IC to VP Engineering in 4 years",
    host: "You",
    speakers: ["Rahul Garg"],
    audience: 1840, gated: false,
    scheduled: null,
    duration: "1h 12m",
    tags: ["Career", "Engineering", "Leadership"],
    clips: 3,
  },
  {
    id: 4, status: "recorded",
    title: "System Design for Scale — live walkthrough",
    host: "You",
    speakers: [],
    audience: 3200, gated: false,
    duration: "48 min",
    tags: ["System Design", "Architecture"],
    clips: 5,
  },
]

function StatusBadge({ status }) {
  const map = {
    live:     { label: "● LIVE",     bg: "#FEF2F2", color: "#DC2626" },
    upcoming: { label: "🕐 UPCOMING", bg: C.blueL,   color: C.blue   },
    recorded: { label: "▶ RECORDED", bg: "#F4F0FF",  color: C.purple },
  }
  const s = map[status] || map.recorded
  return (
    <span style={{ padding: "3px 10px", borderRadius: 100, background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
      {s.label}
    </span>
  )
}

export default function SignalRooms({ user, userData }) {
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle]           = useState("")
  const [gated, setGated]           = useState(false)

  return (
    <div style={{ background: C.bg, flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 24px", fontFamily: "Inter, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap');`}</style>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: C.ink, margin: 0 }}>
            Signal <span style={{ color: C.gold, fontStyle: "italic" }}>Rooms</span>
          </h1>
          <p style={{ fontSize: 13, color: C.ink3, margin: "4px 0 0" }}>Your verified live stage. Build audience. Sell access.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: "10px 16px", background: C.navy, border: "none", borderRadius: 12, color: C.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
        >+ New Room</button>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { val: "5.2k",  label: "Total Audience",  color: C.gold   },
          { val: "4",     label: "Recordings",      color: C.purple },
          { val: "₹2.4k", label: "Gated Revenue",   color: C.green  },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: C.ink4, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Rooms ────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ROOMS.map(room => (
          <div key={room.id} style={{ background: C.surface, border: `1px solid ${room.status === "live" ? C.red + "40" : C.border}`, borderRadius: 16, padding: 18, boxShadow: room.status === "live" ? "0 0 0 3px rgba(220,38,38,0.08)" : "0 1px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 6 }}><StatusBadge status={room.status} /></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink, lineHeight: 1.3, fontFamily: "'Playfair Display', serif" }}>{room.title}</div>
                {room.scheduled && <div style={{ fontSize: 12, color: C.blue, fontWeight: 600, marginTop: 4 }}>🕐 {room.scheduled}</div>}
                {room.duration  && room.status !== "upcoming" && <div style={{ fontSize: 12, color: C.ink4, marginTop: 2 }}>⏱ {room.duration}</div>}
              </div>
              {room.gated && (
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: C.gold }}>{room.price}</div>
                  <div style={{ fontSize: 11, color: C.ink4 }}>gated</div>
                </div>
              )}
            </div>

            {/* Tags */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {room.tags.map(t => (
                <span key={t} style={{ padding: "2px 8px", background: C.goldL, color: C.gold, borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{t}</span>
              ))}
            </div>

            {/* Speakers */}
            {room.speakers.length > 0 && (
              <div style={{ fontSize: 12, color: C.ink3, marginBottom: 10 }}>
                🎙 Speakers: {room.speakers.join(", ")}
              </div>
            )}

            {/* Audience + actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: C.ink4 }}>
                {room.status === "live" ? `👥 ${room.audience} listening live` : room.status === "recorded" ? `👁 ${room.audience.toLocaleString()} views` : "Awaiting participants"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {room.status === "live" && (
                  <button style={{ padding: "7px 14px", background: C.red, border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Join Live</button>
                )}
                {room.status === "upcoming" && (
                  <button style={{ padding: "7px 14px", background: C.blueL, border: `1px solid ${C.blue}30`, borderRadius: 8, color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Invite Speakers</button>
                )}
                {room.status === "recorded" && (
                  <>
                    <button style={{ padding: "7px 12px", background: C.purpleL, border: `1px solid ${C.purple}30`, borderRadius: 8, color: C.purple, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>▶ Replay</button>
                    {room.clips > 0 && <button style={{ padding: "7px 12px", background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink3, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{room.clips} Clips</button>}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create Room Modal ─────────────────────────────────── */}
      {showCreate && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setShowCreate(false)} />
          <div style={{ position: "relative", background: C.surface, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480, zIndex: 1 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 800, color: C.ink, marginBottom: 16 }}>Schedule a Signal Room</div>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Room title / topic"
              style={{ width: "100%", padding: "12px 14px", background: "#FFFFFF", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 14, fontFamily: "inherit", color: C.ink, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }}>
              <div
                onClick={() => setGated(g => !g)}
                style={{ width: 40, height: 22, background: gated ? C.gold : "#E5E7EB", borderRadius: 99, position: "relative", transition: "background 0.2s", cursor: "pointer" }}
              >
                <div style={{ position: "absolute", top: 2, left: gated ? 20 : 2, width: 18, height: 18, background: "#FFFFFF", borderRadius: "50%", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
              </div>
              <span style={{ fontSize: 14, color: C.ink2 }}>Gate access (charge entry)</span>
            </label>
            <button
              disabled={!title.trim()}
              style={{ width: "100%", padding: "14px", background: title.trim() ? C.navy : "#F3F4F6", border: "none", borderRadius: 12, color: title.trim() ? C.gold : C.ink4, fontSize: 15, fontWeight: 700, cursor: title.trim() ? "pointer" : "not-allowed", fontFamily: "'Playfair Display', serif" }}
            >Schedule Room →</button>
          </div>
        </div>
      )}
    </div>
  )
}
