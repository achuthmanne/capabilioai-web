/**
 * Skills.jsx — 🧠 Skills (Weekly Skill Pulse, Skill Decay, Learning, Certifications)
 * New top-level module per Professional Path IA v2. Wraps two already-real
 * pieces rather than re-implementing them: the Weekly Career Check status
 * (weeklyPulse.js/user_skills) and the full Skill Graph (SkillGraphView.jsx,
 * also user_skills-backed since the retarget in skillGraph.js).
 *
 * Never call the weekly check-in "assessment" — product naming rule.
 */
import { useEffect, useState } from "react"
import { weeklyCheckApi } from "../lib/api"
import SkillGraphView from "../components/SkillGraphView"

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

export default function Skills({ user, userData, onNavigate }) {
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: BG, fontFamily: BODY, color: INK }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500;600&display=swap');`}</style>

      <div style={{ padding: "24px 24px 0", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: P, fontFamily: MONO }}>Professional Path · Skills</div>
        <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 800, color: INK, marginTop: 4, marginBottom: 18 }}>Skill Pulse, decay, and learning</div>

        <WeeklyPulseBanner onNavigate={onNavigate} />

        <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 20, padding: 4, marginBottom: 40 }}>
          <SkillGraphView user={user} />
        </div>
      </div>
    </div>
  )
}
