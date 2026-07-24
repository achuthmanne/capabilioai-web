/**
 * Skills.jsx — 🧠 Skills (Weekly Skill Pulse, Skill Decay, Learning, Certifications)
 * New top-level module per Professional Path IA v2. Wraps two already-real
 * pieces rather than re-implementing them: the Weekly Career Check status
 * (weeklyPulse.js/user_skills) and the full Skill Graph (SkillGraphView.jsx,
 * also user_skills-backed since the retarget in skillGraph.js).
 *
 * Never call the weekly check-in "assessment" — product naming rule.
 */
import { useEffect, useState, useMemo } from "react"
import { weeklyCheckApi, skillsApi } from "../lib/api"
import SkillGraphView from "../components/SkillGraphView"
import { DOMAIN_CONFIG } from "../config/skillGroups"

const P    = "#8B5CF6"
const INK  = "#1A1714"
const MUT  = "#6B6560"
const BG   = "#FAFAFA"
const SURF = "#FFFFFF"
const BDR  = "rgba(17,24,39,0.08)"
const MONO = "'DM Mono', 'Fira Mono', monospace"
const SERIF= "'DM Sans', Georgia, serif"
const BODY = "DM Sans, system-ui, sans-serif"

function WeeklyPulseBanner({ onNavigate }) {
  const [state, setState] = useState("loading")

  useEffect(() => {
    let cancelled = false
    weeklyCheckApi.current()
      .then(res => {
        if (cancelled) return
        if (!res.available) { setState("none"); return }
        if (res.pulse.status === "completed") setState("done")
        else if (res.pulse.status === "in_progress") setState("in_progress")
        else setState("due")
      })
      .catch(() => !cancelled && setState("error"))
    return () => { cancelled = true }
  }, [])

  if (state === "loading" || state === "error") return null

  const copy = {
    none:        { title: "Weekly Skill Pulse isn't set up yet", desc: "Add a few skills below and this comes alive — a 5-minute check-in that keeps your skill scores current.", cta: null, color: MUT },
    due:         { title: "This week's Skill Pulse is ready", desc: "5 quick scenario questions based on your skills. About a minute.", cta: "Start check-in →", color: P },
    in_progress: { title: "Pick up where you left off", desc: "A couple questions left in this week's check-in.", cta: "Continue →", color: "#D97706" },
    done:        { title: "This week's Skill Pulse is done", desc: "Skill confidence signals are current. Next check-in opens next week.", cta: null, color: "#16A34A" },
  }[state]

  return (
    <div style={{ padding: "16px 20px", background: SURF, border: `1.5px solid ${copy.color}30`, borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: copy.color, fontFamily: MONO }}>Weekly Skill Pulse</div>
        <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 800, color: INK, marginTop: 3 }}>{copy.title}</div>
        <div style={{ fontSize: 12, color: MUT, marginTop: 2 }}>{copy.desc}</div>
      </div>
      {copy.cta && (
        <button onClick={() => onNavigate("weeklycheck")} style={{ background: copy.color, color: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: MONO, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {copy.cta}
        </button>
      )}
    </div>
  )
}

// ── Domain bucketing for the readiness radar ──────────────────────────────────
// user_skills rows from resume import all land in group_type "core" (see
// skillGraph.js bulk route) — that's a real, honest limitation of what the
// parser can infer, not something to fake. Rather than invent fictitious
// category scores, we bucket each skill's *name* against the existing
// DOMAIN_CONFIG taxonomy from skillGroups.js (same taxonomy already used for
// skill-gap analysis elsewhere) so radar axes reflect real skill data grouped
// by a real, existing classification — frontend/backend/devops/data/etc.
const DOMAIN_LOOKUP = (() => {
  const map = {}
  for (const [domainKey, cfg] of Object.entries(DOMAIN_CONFIG)) {
    for (const sub of Object.values(cfg.subDomains || {})) {
      for (const s of sub.skills || []) map[s.toLowerCase()] = { key: domainKey, label: cfg.label, color: cfg.color }
    }
  }
  return map
})()

function domainForSkill(name) {
  const n = (name || "").toLowerCase().trim()
  if (!n) return null
  if (DOMAIN_LOOKUP[n]) return DOMAIN_LOOKUP[n]
  // loose match for near-variants the exact taxonomy list won't have verbatim
  // (e.g. "ReactJS" vs "React", "Node" vs "Node.js")
  for (const [skillName, meta] of Object.entries(DOMAIN_LOOKUP)) {
    if (n.includes(skillName) || skillName.includes(n)) return meta
  }
  return null
}

function useSkillReadiness(skills) {
  return useMemo(() => {
    const buckets = {}
    for (const s of skills) {
      const d = domainForSkill(s.name)
      const key = d?.key || "other"
      if (!buckets[key]) buckets[key] = { key, label: d?.label || "Other", color: d?.color || "#6B7280", total: 0, count: 0 }
      buckets[key].total += (s.level_score || 0)
      buckets[key].count += 1
    }
    const axes = Object.values(buckets)
      .map(b => ({ ...b, avg: Math.round(b.total / b.count) }))
      .sort((a, b) => b.count - a.count)
    const overall = skills.length
      ? Math.round(skills.reduce((sum, s) => sum + (s.level_score || 0), 0) / skills.length)
      : 0
    return { axes, overall }
  }, [skills])
}

function RadarChart({ axes, size = 260 }) {
  const cx = size / 2, cy = size / 2, r = size / 2 - 46
  const n = axes.length
  const angleFor = i => (Math.PI * 2 * i) / n - Math.PI / 2
  const pointFor = (i, value) => {
    const a = angleFor(i)
    const dist = Math.max(0, Math.min(100, value)) / 100 * r
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)]
  }
  const ringLevels = [25, 50, 75, 100]
  const polygonPoints = axes.map((ax, i) => pointFor(i, ax.avg).join(",")).join(" ")

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {ringLevels.map(lvl => (
        <polygon key={lvl} points={axes.map((_, i) => pointFor(i, lvl).join(",")).join(" ")}
          fill="none" stroke="rgba(26,26,24,0.08)" strokeWidth="1" />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pointFor(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(26,26,24,0.08)" strokeWidth="1" />
      })}
      <polygon points={polygonPoints} fill="#8B5CF622" stroke="#8B5CF6" strokeWidth="2" />
      {axes.map((ax, i) => {
        const [x, y] = pointFor(i, ax.avg)
        return <circle key={i} cx={x} cy={y} r="4" fill={ax.color} stroke="#fff" strokeWidth="1.5" />
      })}
      {axes.map((ax, i) => {
        const [x, y] = pointFor(i, 122)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            style={{ fontSize: 10, fontWeight: 700 }} fill="#3A3A38">
            {ax.label}
          </text>
        )
      })}
    </svg>
  )
}

function SkillReadinessCard({ skills }) {
  const { axes, overall } = useSkillReadiness(skills)
  if (!skills.length) return null
  const hasRadar = axes.length >= 3
  return (
    <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 20, padding: 24, marginBottom: 24, display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
      <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", width: hasRadar ? 260 : "auto" }}>
        {hasRadar
          ? <RadarChart axes={axes} />
          : <div style={{ fontSize: 12, color: MUT, maxWidth: 200, textAlign: "center" }}>Add skills across a few more areas to unlock the full readiness radar.</div>}
      </div>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: P, fontFamily: MONO }}>Skills Readiness</div>
        <div style={{ fontFamily: SERIF, fontSize: 36, fontWeight: 800, color: INK, marginTop: 4 }}>
          {overall}<span style={{ fontSize: 16, color: MUT, fontWeight: 600 }}>/100</span>
        </div>
        <div style={{ fontSize: 12, color: MUT, marginTop: 4, marginBottom: 14 }}>
          Average level across {skills.length} mapped skill{skills.length !== 1 ? "s" : ""} · {axes.length} area{axes.length !== 1 ? "s" : ""}
        </div>
        {axes.map(ax => (
          <div key={ax.key} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: INK, fontWeight: 600 }}>{ax.label}</span>
              <span style={{ color: MUT, fontFamily: MONO }}>{ax.avg}% · {ax.count} skill{ax.count !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "#F0F0EC" }}>
              <div style={{ height: "100%", width: `${ax.avg}%`, background: ax.color, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Skills({ user, userData, onNavigate }) {
  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    skillsApi.list()
      .then(data => { if (!cancelled) setSkills(data || []) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: BG, fontFamily: BODY, color: INK }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500;600&display=swap');`}</style>

      <div style={{ padding: "24px 24px 0", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: P, fontFamily: MONO }}>Professional Path · Skills</div>
        <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 800, color: INK, marginTop: 4, marginBottom: 18 }}>Skill Pulse, decay, and learning</div>

        <WeeklyPulseBanner onNavigate={onNavigate} />

        {!loading && <SkillReadinessCard skills={skills} />}

        <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 20, padding: 4, marginBottom: 40 }}>
          <SkillGraphView user={user} />
        </div>
      </div>
    </div>
  )
}
