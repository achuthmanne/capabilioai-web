/**
 * ArenaStreaks.jsx — Arena Streaks Tab
 *
 * Real data: reads from /api/arena/v2/streaks/:uid
 * Displays:
 *   - Current + longest streak hero
 *   - Coding streak + domain streak separate counters
 *   - 52-week contribution heatmap (GitHub-style, IST-aware)
 *   - Streak milestones with progress rings
 *   - Freeze status
 *   - Streak impact on trust/consistency score
 *   - Suggested next action
 */
import { useState, useEffect, useRef } from "react"

const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

// ─── DESIGN TOKENS (match Arena.jsx) ────────────────────────────────────────
const T = {
  cream:  "#F6F6F1",
  cream2: "#EFEFE9",
  cream3: "#E8E8E1",
  ink:    "#1A1A18",
  ink2:   "#3A3A38",
  ink3:   "#6B6B68",
  ink4:   "#9A9A97",
  indigo: "#3D4EAC",
  indigo2:"#5B6FD4",
  indigo3:"#EEF0FB",
  green:  "#1A7A4A",
  green2: "#E8F7EF",
  amber:  "#B8620A",
  amber2: "#FEF3E2",
  red:    "#C0392B",
  red2:   "#FDF0EF",
  border: "rgba(26,26,24,0.09)",
}

// ─── HEATMAP HELPERS ──────────────────────────────────────────────────────────

function buildWeekGrid(heatmapData) {
  // Build a map of date → count
  const dateMap = {}
  ;(heatmapData || []).forEach(e => { dateMap[e.date] = e })

  // Find the start of 52-week window (Sunday)
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sunday
  const gridEnd = new Date(today)
  const gridStart = new Date(today)
  gridStart.setDate(gridStart.getDate() - (52 * 7) + (7 - dayOfWeek))

  const weeks = []
  let current = new Date(gridStart)

  while (current <= gridEnd) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const iso = current.toISOString().slice(0, 10)
      week.push({
        date:    iso,
        count:   dateMap[iso]?.count || 0,
        elo:     dateMap[iso]?.elo_gained || 0,
        domains: dateMap[iso]?.domains || [],
        isToday: iso === today.toISOString().slice(0, 10),
        isFuture: current > today,
      })
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
  }

  return weeks
}

function heatColor(count, maxCount) {
  if (count === 0) return "#F0EFE9"
  const pct = Math.min(1, count / Math.max(1, maxCount))
  if (pct < 0.25) return "#B6E4CA"
  if (pct < 0.50) return "#6BCCA0"
  if (pct < 0.75) return "#2E9E6A"
  return "#1A7A4A"
}

// ─── MICRO COMPONENTS ────────────────────────────────────────────────────────

function Spinner({ color = T.indigo, size = 14 }) {
  return <div style={{ width: size, height: size, border: `2px solid ${color}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .8s linear infinite", display: "inline-block" }} />
}

function StatCard({ value, label, sub, color = T.indigo, icon }) {
  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", flex: 1, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
        <div style={{ fontSize: 10, fontWeight: 700, color: T.ink4, letterSpacing: 1.5, textTransform: "uppercase" }}>{label}</div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color, fontFamily: "'DM Mono','Fira Code',monospace", lineHeight: 1, letterSpacing: -1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: T.ink3, marginTop: 6, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  )
}

// ─── PROGRESS RING ────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 52, color = T.indigo, children }) {
  const r    = size / 2 - 4
  const circ = 2 * Math.PI * r
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color + "20"} strokeWidth={3.5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3.5}
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - Math.min(100, pct) / 100)}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  )
}

// ─── MILESTONE CARD ───────────────────────────────────────────────────────────

function MilestoneCard({ milestone, currentStreak }) {
  const pct     = Math.min(100, Math.round((currentStreak / milestone.days) * 100))
  const reached = milestone.reached
  const isNext  = milestone.is_next

  return (
    <div style={{
      background: reached ? T.green2 : "#fff",
      border: `1.5px solid ${reached ? T.green + "40" : isNext ? T.amber + "50" : T.border}`,
      borderRadius: 14, padding: "14px 16px",
      display: "flex", alignItems: "center", gap: 14,
      opacity: reached ? 1 : 0.85,
    }}>
      <ProgressRing pct={reached ? 100 : pct} size={52} color={reached ? T.green : isNext ? T.amber : T.ink4}>
        <span style={{ fontSize: 18, filter: reached ? "none" : "grayscale(0.5)" }}>{milestone.icon}</span>
      </ProgressRing>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: reached ? T.green : T.ink }}>{milestone.label}</span>
          {reached && <span style={{ fontSize: 9, fontWeight: 800, background: T.green, color: "#fff", padding: "2px 7px", borderRadius: 99 }}>EARNED</span>}
          {isNext && !reached && <span style={{ fontSize: 9, fontWeight: 800, background: T.amber + "20", color: T.amber, padding: "2px 7px", borderRadius: 99 }}>NEXT</span>}
        </div>
        <div style={{ fontSize: 11, color: T.ink3 }}>{milestone.description}</div>
        {!reached && (
          <div style={{ marginTop: 7, height: 4, background: T.cream3, borderRadius: 99, overflow: "hidden" }}>
            <div style={{
              width: `${pct}%`, height: "100%",
              background: isNext ? T.amber : T.indigo2,
              borderRadius: 99,
              transition: "width 1s ease",
            }} />
          </div>
        )}
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: reached ? T.green : T.ink4, fontFamily: "'DM Mono',monospace" }}>
          {reached ? "✓" : `${currentStreak}/${milestone.days}`}
        </div>
        <div style={{ fontSize: 10, color: T.ink4 }}>days</div>
      </div>
    </div>
  )
}

// ─── HEATMAP TOOLTIP ─────────────────────────────────────────────────────────

function HeatmapTooltip({ day, position }) {
  if (!day || day.isFuture) return null
  return (
    <div style={{
      position: "fixed", zIndex: 999,
      left: position.x, top: position.y - 60,
      background: T.ink, color: "#fff",
      borderRadius: 8, padding: "6px 10px",
      fontSize: 10, fontWeight: 600, pointerEvents: "none",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      maxWidth: 180, transform: "translateX(-50%)",
    }}>
      <div style={{ fontWeight: 800, marginBottom: 2 }}>{day.date}</div>
      {day.count > 0 ? (
        <>
          <div>{day.count} challenge{day.count !== 1 ? "s" : ""} completed</div>
          {day.elo > 0 && <div>+{day.elo} ELO</div>}
          {day.domains?.length > 0 && <div style={{ color: "#A8A29E", marginTop: 2 }}>{day.domains.join(", ")}</div>}
        </>
      ) : (
        <div style={{ color: "#A8A29E" }}>No activity</div>
      )}
    </div>
  )
}

// ─── CONTRIBUTION HEATMAP ─────────────────────────────────────────────────────

function ContributionHeatmap({ heatmapData, currentStreak }) {
  const [tooltip, setTooltip] = useState({ day: null, position: { x: 0, y: 0 } })

  const weeks   = buildWeekGrid(heatmapData)
  const maxCount = Math.max(1, ...heatmapData.map(e => e.count || 0))

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  const DAYS   = ["","M","","W","","F",""]

  // Month labels: find first cell of each month
  const monthLabels = []
  weeks.forEach((week, wi) => {
    const firstDay = week.find(d => d.date && !d.isFuture)
    if (!firstDay) return
    const month = new Date(firstDay.date).getMonth()
    if (monthLabels.length === 0 || monthLabels[monthLabels.length - 1].month !== month) {
      monthLabels.push({ month, weekIndex: wi })
    }
  })

  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 16, padding: "20px 20px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.ink }}>Contribution Heatmap</div>
          <div style={{ fontSize: 11, color: T.ink3, marginTop: 2 }}>52 weeks · {heatmapData.length} active days</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontSize: 9, color: T.ink4 }}>Less</span>
          {["#F0EFE9","#B6E4CA","#6BCCA0","#2E9E6A","#1A7A4A"].map((c, i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 2.5, background: c }} />
          ))}
          <span style={{ fontSize: 9, color: T.ink4 }}>More</span>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 0 }}>
          {/* Month labels */}
          <div style={{ display: "flex", gap: 2, marginLeft: 18, marginBottom: 4 }}>
            {weeks.map((_, wi) => {
              const label = monthLabels.find(m => m.weekIndex === wi)
              return (
                <div key={wi} style={{ width: 11, fontSize: 8, color: T.ink4, fontWeight: 600, textAlign: "left" }}>
                  {label ? MONTHS[label.month] : ""}
                </div>
              )
            })}
          </div>

          {/* Grid */}
          <div style={{ display: "flex", gap: 2 }}>
            {/* Day-of-week labels */}
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 4 }}>
              {DAYS.map((d, i) => (
                <div key={i} style={{ width: 10, height: 11, fontSize: 8, color: T.ink4, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>{d}</div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {week.map((day, di) => {
                  const bg = day.isFuture ? "transparent" : heatColor(day.count, maxCount)
                  const isToday = day.isToday
                  return (
                    <div
                      key={di}
                      onMouseEnter={e => setTooltip({ day, position: { x: e.clientX, y: e.clientY } })}
                      onMouseLeave={() => setTooltip({ day: null, position: { x: 0, y: 0 } })}
                      style={{
                        width: 11, height: 11,
                        borderRadius: 2.5,
                        background: bg,
                        border: isToday ? `1.5px solid ${T.indigo}` : day.isFuture ? "none" : "none",
                        cursor: day.count > 0 ? "pointer" : "default",
                        transition: "transform 0.1s",
                        flexShrink: 0,
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {tooltip.day && <HeatmapTooltip day={tooltip.day} position={tooltip.position} />}
    </div>
  )
}

// ─── FREEZE STATUS ────────────────────────────────────────────────────────────

function FreezeStatus({ freezeAvailable, freezeUsed, currentStreak }) {
  return (
    <div style={{ background: currentStreak > 0 ? "#FEF3E2" : "#fff", border: `1px solid ${currentStreak > 0 ? T.amber + "40" : T.border}`, borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 22 }}>🧊</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.ink }}>Streak Freeze</div>
          <div style={{ fontSize: 11, color: T.ink3 }}>Miss a day without breaking your streak</div>
        </div>
        <div style={{ marginLeft: "auto", fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 900, color: T.amber }}>
          {freezeAvailable}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 6, borderRadius: 99,
            background: i < freezeAvailable ? T.amber : T.cream3,
            transition: "background 0.3s",
          }} />
        ))}
      </div>
      <div style={{ fontSize: 10, color: T.ink3, marginTop: 8 }}>
        {freezeAvailable === 0
          ? "No freezes available — complete a challenge to earn one"
          : `${freezeAvailable} freeze${freezeAvailable !== 1 ? "s" : ""} available · ${freezeUsed} used this month`}
      </div>
    </div>
  )
}

// ─── STREAK IMPACT SCORE ─────────────────────────────────────────────────────

function StreakImpact({ currentStreak, longestStreak, totalDays }) {
  // Consistency score: weighted blend of streak + total active days
  const consistency = Math.min(100, Math.round(
    (currentStreak * 0.5) + (longestStreak * 0.3) + (Math.min(50, totalDays) * 0.4)
  ))
  const color = consistency >= 70 ? T.green : consistency >= 40 ? T.amber : T.indigo

  const impacts = [
    { label: "ELO Multiplier",    value: currentStreak >= 30 ? "1.15×" : currentStreak >= 7 ? "1.08×" : currentStreak >= 3 ? "1.04×" : "1.00×", positive: currentStreak >= 3 },
    { label: "Recruiter Trust",   value: currentStreak >= 14 ? "High" : currentStreak >= 7 ? "Medium" : "Normal", positive: currentStreak >= 7 },
    { label: "Consistency Score", value: `${consistency}/100`, positive: consistency >= 60 },
    { label: "Profile Boost",     value: currentStreak >= 30 ? "Fire Badge 🔥" : currentStreak >= 7 ? "Active Badge ⚡" : "None", positive: currentStreak >= 7 },
  ]

  return (
    <div style={{ background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: T.ink }}>Streak Impact</div>
          <div style={{ fontSize: 11, color: T.ink3 }}>How your streak affects your profile</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 24, fontWeight: 900, color, fontFamily: "'DM Mono',monospace" }}>{consistency}</div>
          <div style={{ fontSize: 10, color: T.ink4 }}>consistency</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {impacts.map((imp, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: imp.positive ? T.green2 : T.cream, borderRadius: 9, border: `1px solid ${imp.positive ? T.green + "30" : T.border}` }}>
            <span style={{ fontSize: 12, color: T.ink2 }}>{imp.label}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: imp.positive ? T.green : T.ink3, fontFamily: "'DM Mono',monospace" }}>{imp.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── SUGGESTED NEXT ACTION ───────────────────────────────────────────────────

function NextActionCard({ currentStreak, lastActiveDate, onGoToTasks }) {
  const today       = new Date().toISOString().slice(0, 10)
  const activeToday = lastActiveDate === today
  const nextMilestone = [3,7,14,30,60,100].find(n => n > currentStreak) || 100
  const daysLeft = nextMilestone - currentStreak

  return (
    <div style={{
      background: activeToday ? T.green2 : `linear-gradient(135deg, ${T.indigo3}, #fff)`,
      border: `1.5px solid ${activeToday ? T.green + "40" : T.indigo + "30"}`,
      borderRadius: 16, padding: "18px 20px",
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{ fontSize: 32, flexShrink: 0 }}>
        {activeToday ? "✅" : currentStreak > 0 ? "⚡" : "🚀"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.ink, marginBottom: 4 }}>
          {activeToday
            ? "You're active today! Keep going."
            : currentStreak > 0
              ? `Don't break your ${currentStreak}-day streak!`
              : "Start your streak today."}
        </div>
        <div style={{ fontSize: 12, color: T.ink3 }}>
          {activeToday
            ? `Next milestone: ${nextMilestone}-day streak in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}.`
            : `Complete a challenge to ${currentStreak > 0 ? "extend" : "begin"} your streak.`}
        </div>
      </div>
      {!activeToday && (
        <button
          onClick={onGoToTasks}
          style={{
            padding: "9px 16px", borderRadius: 10, border: "none",
            background: currentStreak > 0 ? T.amber : T.indigo,
            color: "#fff", fontSize: 12, fontWeight: 800,
            cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {currentStreak > 0 ? "Extend Streak →" : "Start Now →"}
        </button>
      )}
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function ArenaStreaks({ uid, domain, onGoToTasks }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    setLoading(true)
    fetch(`${SERVER}/api/arena/v2/streaks/${uid}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [uid])

  if (!uid) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: T.ink3, fontSize: 13 }}>
      Sign in to see your streak data.
    </div>
  )

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12 }}>
      <Spinner size={22} color={domain?.color || T.indigo} />
      <span style={{ fontSize: 12, color: T.ink3 }}>Loading streak data…</span>
    </div>
  )

  // Graceful: show skeleton state if error or no data
  const streakData = data || {
    current_streak:    0,
    longest_streak:    0,
    last_active_date:  null,
    total_active_days: 0,
    total_submissions: 0,
    freeze_available:  2,
    freeze_used_count: 0,
    coding_streak:     0,
    domain_streak:     0,
    heatmap:           [],
    milestones:        [],
  }

  return (
    <div style={{
      fontFamily: "'DM Sans',sans-serif",
      background: T.cream,
      minHeight: "100%",
      overflowY: "auto",
      padding: "20px 20px 40px",
    }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: T.ink4, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 4 }}>Arena Streaks</div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: T.ink, margin: 0, letterSpacing: -0.4 }}>
          Your consistency record
        </h2>
      </div>

      {/* ── Next action card ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <NextActionCard
          currentStreak={streakData.current_streak}
          lastActiveDate={streakData.last_active_date}
          onGoToTasks={onGoToTasks}
        />
      </div>

      {/* ── Top stats row ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <StatCard
          value={streakData.current_streak}
          label="Current Streak"
          sub={streakData.current_streak === 0 ? "Complete a challenge to start" : `${streakData.current_streak} day${streakData.current_streak !== 1 ? "s" : ""} running`}
          color={streakData.current_streak >= 7 ? "#E8620A" : T.indigo}
          icon={streakData.current_streak >= 30 ? "🔥" : streakData.current_streak >= 7 ? "⚡" : "🌱"}
        />
        <StatCard
          value={streakData.longest_streak}
          label="Longest Streak"
          sub={`Personal best`}
          color={T.green}
          icon="🏆"
        />
      </div>

      {/* ── Secondary stats ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[
          { value: streakData.coding_streak, label: "Coding Streak",  icon: "💻", color: T.indigo },
          { value: streakData.domain_streak, label: "Domain Streak",  icon: "🧠", color: "#7C3AED" },
          { value: streakData.total_active_days, label: "Active Days Total", icon: "📅", color: T.green },
          { value: streakData.total_submissions, label: "Challenges Done",   icon: "✅", color: T.amber },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: "#FFFFFF", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", minWidth: 0 }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color, fontFamily: "'DM Mono',monospace", lineHeight: 1, letterSpacing: -0.5 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: T.ink4, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginTop: 4, lineHeight: 1.3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Heatmap ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <ContributionHeatmap
          heatmapData={streakData.heatmap}
          currentStreak={streakData.current_streak}
        />
      </div>

      {/* ── Milestones ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.ink4, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Milestones</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(streakData.milestones.length > 0 ? streakData.milestones : [
            { days: 3,   label: "Ignition",       icon: "🔥", description: "3-day streak", reached: false, is_next: streakData.current_streak >= 0 && streakData.current_streak < 3 },
            { days: 7,   label: "Weekly Warrior", icon: "⚔️",  description: "7-day streak", reached: false, is_next: streakData.current_streak >= 3 && streakData.current_streak < 7 },
            { days: 14,  label: "Fortnight Focus",icon: "💎", description: "14-day streak", reached: false, is_next: false },
            { days: 30,  label: "Monthly Master", icon: "🏆", description: "30-day streak", reached: false, is_next: false },
            { days: 60,  label: "Iron Streak",    icon: "🦾", description: "60-day streak", reached: false, is_next: false },
            { days: 100, label: "Century Club",   icon: "💯", description: "100-day streak", reached: false, is_next: false },
          ]).map((m, i) => (
            <MilestoneCard key={i} milestone={m} currentStreak={streakData.current_streak} />
          ))}
        </div>
      </div>

      {/* ── Freeze + Impact ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <FreezeStatus
          freezeAvailable={streakData.freeze_available}
          freezeUsed={streakData.freeze_used_count}
          currentStreak={streakData.current_streak}
        />
        <StreakImpact
          currentStreak={streakData.current_streak}
          longestStreak={streakData.longest_streak}
          totalDays={streakData.total_active_days}
        />
      </div>

    </div>
  )
}
