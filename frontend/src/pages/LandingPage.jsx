import { useState, useRef, useEffect } from "react"
import { motion, useReducedMotion, useInView, animate } from "framer-motion"
import {
  ClipboardCheck, Network, BookOpen, Swords, FolderCheck, Search,
  ArrowRight, Check, ChevronDown,
  ShieldCheck, XCircle, Play, Loader2, Rocket, Factory, TrendingUp,
} from "lucide-react"
import { T, EASE } from "../lib/osDesignTokens"
import { PRIMARY_PATHS, withAlpha } from "../lib/pathIdentity"

// ─── useCountUp — imperative numeric tween via framer-motion's animate().
// Shared by the Arena preview's ELO step and the ELO Growth card so both
// use the exact same mechanism (no separate counter implementation).
function useCountUp(target, { start = target, duration = 0.7, delay = 0, active = true, reduce = false } = {}) {
  const [value, setValue] = useState(reduce ? target : start)
  useEffect(() => {
    if (!active) return
    if (reduce) { setValue(target); return }
    setValue(start)
    const controls = animate(start, target, { duration, delay, ease: EASE, onUpdate: v => setValue(Math.round(v)) })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target, start, duration, delay, reduce])
  return value
}

// ─── useReveal — scroll-triggered entrance, no-op under reduced motion ────
function useReveal() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  return {
    ref,
    initial: reduce ? false : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5, ease: EASE },
  }
}

// ─── Primitives ─────────────────────────────────────────────────────────
function PrimaryButton({ children, onClick, href, target }) {
  const Tag = href ? "a" : "button"
  return (
    <Tag
      href={href} target={target} rel={target ? "noopener noreferrer" : undefined}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "12px 20px", borderRadius: 10, border: "none",
        background: T.accent, color: "#fff", fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textDecoration: "none",
        transition: "background 150ms ease, transform 150ms ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.background = T.accentDark }}
      onMouseLeave={e => { e.currentTarget.style.background = T.accent }}
      onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)" }}
      onMouseUp={e => { e.currentTarget.style.transform = "scale(1)" }}
    >{children}</Tag>
  )
}

function GhostButton({ children, onClick, href, target }) {
  const Tag = href ? "a" : "button"
  return (
    <Tag
      href={href} target={target} rel={target ? "noopener noreferrer" : undefined}
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "12px 20px", borderRadius: 10, border: `1px solid ${T.border}`,
        background: "transparent", color: T.ink, fontSize: 14, fontWeight: 600,
        cursor: "pointer", fontFamily: "'DM Sans',sans-serif", textDecoration: "none",
        transition: "border-color 150ms ease",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderHover }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border }}
    >{children}</Tag>
  )
}

function Eyebrow({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
      color: T.accent, marginBottom: 12, fontFamily: "'DM Sans',sans-serif",
    }}>{children}</div>
  )
}

// ─── IllustrativeTag — every fictional persona/company/mission on this page
// carries this, consistently, so nothing reads as real user or platform
// data. Quiet by design (DESIGN.md's "quiet, not loud" rule) — plain text,
// no border/background ceremony.
function IllustrativeTag({ style }) {
  return (
    <span style={{ fontSize: 10.5, color: T.ink3, fontWeight: 500, ...style }}>Illustrative example</span>
  )
}

// ─── Hover-lift card wrapper — the entire hover vocabulary for this page ──
// hoverColor: optional per-path accent (pathIdentity.js) for the four
// signup-path cards — every other LiftCard use stays neutral (T.borderHover).
function LiftCard({ children, style, onClick, as = "div", hoverColor }) {
  const [hov, setHov] = useState(false)
  const Tag = as
  return (
    <Tag
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: T.surface, border: `1px solid ${hov ? (hoverColor || T.borderHover) : T.border}`,
        borderRadius: 16, transform: hov ? "translateY(-4px)" : "translateY(0)",
        transition: "transform 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms ease",
        cursor: onClick ? "pointer" : "default", textAlign: "left",
        fontFamily: "inherit", textDecoration: "none", color: "inherit",
        ...style,
      }}
    >{children}</Tag>
  )
}

// ─── EloSparkline — kept, restyled flat (no glow, no drop-shadow) ─────────
function EloSparkline({ points, width = 340, height = 64 }) {
  const reduce = useReducedMotion()
  if (!points || points.length < 2) return null
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1
  const xs = points.map((_, i) => (i / (points.length - 1)) * width)
  const ys = points.map(v => height - ((v - min) / range) * (height * 0.8) - height * 0.1)
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ")
  const fill = `${path} L${width},${height} L0,${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", width: "100%" }}>
      <defs>
        <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent} stopOpacity="0.14" />
          <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path d={fill} fill="url(#eloFill)"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.7, ease: EASE }}
      />
      <motion.path d={path} fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: EASE }}
      />
      <motion.circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} fill={T.accent}
        initial={reduce ? false : { r: 0, opacity: 0 }}
        whileInView={{ r: 3.5, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.25, delay: 0.9, ease: EASE }}
      />
    </svg>
  )
}

// Illustrative growth arc — reused by both the Claim vs. Proof section's
// chart and the Student journey card's mini sparkline, so the "1,847"
// story is the same thread in both places, not two different numbers.
const ELO_HISTORY = [400, 420, 450, 490, 560, 640, 750, 900, 1050, 1200, 1400, 1620, 1847]

// ─── Hero workflow diagram — the "live animated workflow" ─────────────────
const FLOW_NODES = [
  { icon: ClipboardCheck, label: "Assessment" },
  { icon: Network,        label: "Skill Graph" },
  { icon: BookOpen,       label: "SkillStudio" },
  { icon: Swords,         label: "Arena" },
  { icon: FolderCheck,    label: "Portfolio" },
  { icon: Search,         label: "Recruiters" },
]

function WorkflowDiagram() {
  const reduce = useReducedMotion()
  return (
    <div style={{
      background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 20,
      padding: "40px 28px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      {FLOW_NODES.map((node, i) => {
        const Icon = node.icon
        return (
          <div key={node.label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40 }}>
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.35, ease: EASE }}
                style={{
                  width: 40, height: 40, borderRadius: 10, background: T.surface,
                  border: `1px solid ${T.border}`, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0,
                }}
              >
                <Icon size={18} color={T.accent} strokeWidth={1.75} />
              </motion.div>
              {i < FLOW_NODES.length - 1 && (
                <motion.div
                  initial={reduce ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.35 + 0.25, ease: EASE }}
                  style={{ width: 1, height: 28, background: T.border, transformOrigin: "top" }}
                />
              )}
            </div>
            <motion.span
              initial={reduce ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: reduce ? 0 : i * 0.35 + 0.1, ease: EASE }}
              style={{ fontSize: 15, fontWeight: 600, color: T.ink, paddingBottom: i < FLOW_NODES.length - 1 ? 28 : 0 }}
            >{node.label}</motion.span>
          </div>
        )
      })}
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: reduce ? 0 : (FLOW_NODES.length - 1) * 0.35 + 0.5, ease: EASE }}
        style={{ fontSize: 12.5, color: T.ink3, margin: "12px 0 0", paddingTop: 16, borderTop: `1px solid ${T.hairline}` }}
      >Every step is logged. Nothing is self-reported.</motion.p>
    </div>
  )
}

// ─── How It Works — one line, each node expands ────────────────────────────
const HOW_IT_WORKS = [
  { icon: ClipboardCheck, label: "Assessment", detail: "A short calibration sets your starting ELO — no guessing your own level." },
  { icon: BookOpen,       label: "SkillStudio", detail: "Targeted lessons close the exact gaps your assessment found, not a generic course path." },
  { icon: Swords,         label: "Arena",       detail: "Real, scored tasks from real company scenarios. Every submission updates your ELO." },
  { icon: FolderCheck,    label: "Aura",        detail: "Your living skill graph and portfolio — every Arena task becomes verifiable proof." },
  { icon: Search,         label: "Recruiters",  detail: "Recruiters search by verified ELO and real task history, not keywords on a resume." },
]

function HowItWorksLine() {
  const [openIdx, setOpenIdx] = useState(null)
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 0, alignItems: "flex-start" }}>
      {HOW_IT_WORKS.map((step, i) => {
        const Icon = step.icon
        const open = openIdx === i
        return (
          <div key={step.label} style={{ display: "flex", alignItems: "flex-start", flex: "1 1 180px", minWidth: 160 }}>
            <button
              onClick={() => setOpenIdx(open ? null : i)}
              style={{
                background: "none", border: "none", cursor: "pointer", textAlign: "left",
                padding: 0, fontFamily: "inherit", width: "100%",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: open ? T.accentDim : T.surfaceRaised,
                  border: `1px solid ${open ? T.accent : T.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 150ms ease, border-color 150ms ease",
                }}>
                  <Icon size={16} color={open ? T.accent : T.ink2} strokeWidth={1.75} />
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{step.label}</span>
              </div>
              <motion.div
                initial={false}
                animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
                transition={{ duration: 0.25, ease: EASE }}
                style={{ overflow: "hidden" }}
              >
                <p style={{ fontSize: 13, color: T.ink2, lineHeight: 1.6, margin: "0 24px 4px 0" }}>{step.detail}</p>
              </motion.div>
            </button>
            {i < HOW_IT_WORKS.length - 1 && (
              <div style={{ height: 1, background: T.border, flex: 1, marginTop: 18, minWidth: 16 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Arena preview — Company → Mission → Notebook → Output → AI Eval → Verified
// Illustrative only — fictional student, fictional company, matching every
// other demo figure on this page (never presented as live platform data).
// -3 ELO on the fail path is the real medium-difficulty fail penalty from
// CAPABILIO_ARCHITECTURE.md §8.4, not an invented number.
const ARENA_SCRIPTS = {
  pass: {
    code: [
      'cancelled = orders[orders.status == "cancelled"]',
      'late = cancelled[(cancelled.day.isin(["Sat","Sun"])) & (cancelled.hour >= 21)]',
      'late.groupby("reason").order_id.count().sort_values(ascending=False).head(3)',
    ],
    output: [
      ["delivery_partner_unavailable", 342],
      ["restaurant_closed", 198],
      ["payment_failed", 87],
    ],
    passed: true, score: 88, eloDelta: 16,
    feedback: "Correct filter logic and a clean groupby — you identified delivery-partner availability as the dominant driver.",
  },
  fail: {
    code: [
      'cancelled = orders[orders.status == "cancelled"]',
      'late = cancelled[(cancelled.day.isin(["Sat","Sun"])) & (cancelled.hour >= 12)]',
      'late.groupby("reason").order_id.count().sort_values(ascending=False).head(3)',
    ],
    output: [
      ["restaurant_closed", 511],
      ["delivery_partner_unavailable", 289],
      ["payment_failed", 140],
    ],
    passed: false, score: 34, eloDelta: -3,
    feedback: "Your filter used hour ≥ 12, not hour ≥ 21 — this captures afternoon cancellations, not the weekend-night spike the mission asked about. This didn't pass.",
  },
}
const ARENA_ELO_BASE = 1324

// Three-state Run/Submit beat (idle → running → executed) — a small,
// self-contained timer distinct from the ELO tween above; skipped entirely
// under reduced motion (renders straight to "executed").
function ArenaRunBeat({ reduce }) {
  const [phase, setPhase] = useState(reduce ? "done" : "idle")
  useEffect(() => {
    if (reduce) return
    const t1 = setTimeout(() => setPhase("running"), 700)
    const t2 = setTimeout(() => setPhase("done"), 1100)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [reduce])
  const Icon = phase === "running" ? Loader2 : phase === "done" ? Check : Play
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: phase === "done" ? T.success : T.ink2, margin: "2px 0 14px" }}>
      <Icon size={13} strokeWidth={2.5} style={phase === "running" ? { animation: "arenaSpin 0.6s linear infinite" } : undefined} />
      {phase === "idle" ? "Run notebook" : phase === "running" ? "Running…" : "Executed"}
    </div>
  )
}

function ArenaPreview() {
  const [outcome, setOutcome] = useState("pass")
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const script = ARENA_SCRIPTS[outcome]
  const eloTarget = ARENA_ELO_BASE + script.eloDelta
  const eloValue = useCountUp(eloTarget, { start: ARENA_ELO_BASE, duration: 0.7, delay: 2.7, active: inView, reduce })
  const VerdictIcon = script.passed ? ShieldCheck : XCircle
  const verdictColor = script.passed ? T.success : T.error
  const verdictDim = script.passed ? T.successDim : T.errorDim

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["pass", "Passing attempt"], ["fail", "Failing attempt"]].map(([key, label]) => (
          <button key={key} onClick={() => setOutcome(key)} style={{
            padding: "5px 11px", borderRadius: 999, border: `1px solid ${outcome === key ? T.accent : T.border}`,
            background: outcome === key ? T.accentDim : "transparent",
            color: outcome === key ? T.accent : T.ink3, fontSize: 11.5, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>{label}</button>
        ))}
      </div>
      <div ref={ref} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.hairline}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.surfaceRaised, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: T.ink2 }}>S</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Swiggy — Data Analyst mission</div>
            <IllustrativeTag />
          </div>
        </div>
        <div key={outcome + String(inView)} style={{ padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 6 }}>Mission</div>
          <p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6, margin: "0 0 16px" }}>
            Weekend order cancellations spike after 9 PM. Find the dominant cause in the last 30 days of order data.
          </p>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 6 }}>Notebook</div>
          <div style={{
            background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 10,
            padding: "12px 14px", fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.ink,
            lineHeight: 1.7, marginBottom: 4, overflowX: "auto",
          }}>
            {script.code.map((line, i) => (
              <motion.div key={i}
                initial={reduce || !inView ? false : { opacity: 0, x: -6 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.15 }}
                style={{ whiteSpace: "pre" }}
              >{line}</motion.div>
            ))}
          </div>

          <ArenaRunBeat reduce={reduce || !inView} />

          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 6 }}>Output</div>
          <div style={{
            background: T.ink, borderRadius: 10, padding: "12px 14px",
            fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#D4F5DE", lineHeight: 1.7, marginBottom: 16,
          }}>
            {script.output.map(([label, count], i) => (
              <motion.div key={label}
                initial={reduce || !inView ? false : { opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.2, delay: reduce ? 0 : 1.15 + i * 0.12 }}
                style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
              >
                <span>{label}</span><span>{count}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={reduce || !inView ? false : { opacity: 0, scale: 0.96 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.25, delay: reduce ? 0 : 1.9 }}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: verdictDim, border: `1px solid ${verdictColor}30`, borderRadius: 10, marginBottom: 10 }}
          >
            <VerdictIcon size={16} color={verdictColor} strokeWidth={2} />
            <span style={{ fontSize: 13, fontWeight: 700, color: verdictColor }}>{script.passed ? "Verified" : "Not verified"}</span>
            <span style={{ fontSize: 12, color: T.ink3, marginLeft: "auto" }}>Score {script.score}</span>
          </motion.div>

          <motion.div
            initial={reduce || !inView ? false : { opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.25, delay: reduce ? 0 : 2.35 }}
            style={{ padding: "12px 14px", background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 10, marginBottom: 14 }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 4 }}>Feedback</div>
            <p style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.55, margin: 0 }}>{script.feedback}</p>
          </motion.div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{eloValue.toLocaleString()}</div>
              <span style={{ fontSize: 10, color: T.ink3, letterSpacing: "0.05em", textTransform: "uppercase" }}>ELO</span>
              <motion.span
                initial={reduce || !inView ? false : { opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.2, delay: reduce ? 0 : 3.1 }}
                style={{ fontSize: 12, fontWeight: 600, color: script.passed ? T.success : T.error }}
              >{script.passed ? `+${script.eloDelta}` : script.eloDelta}</motion.span>
            </div>
            <motion.div
              initial={reduce || !inView ? false : { opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.2, delay: reduce ? 0 : 3.5 }}
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <motion.div
                initial={reduce || !inView ? false : { scale: 0.85 }}
                animate={inView && script.passed ? { scale: [0.85, 1.15, 1] } : {}}
                transition={{ duration: 0.4, delay: reduce ? 0 : 3.6 }}
                style={{
                  width: 18, height: 18, borderRadius: "50%",
                  background: script.passed ? T.accent : "transparent",
                  border: `1.5px solid ${script.passed ? T.accent : T.border}`,
                }}
              />
              <span style={{ fontSize: 11, color: T.ink3 }}>SQL skill</span>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SkillStudio preview — an original animated skill graph ───────────────
function SkillStudioPreview() {
  const reveal = useReveal()
  const reduce = useReducedMotion()
  const nodes = [
    { id: "py",  label: "Python",         x: 40,  y: 40,  mastered: true },
    { id: "sql", label: "SQL",            x: 200, y: 24,  mastered: true },
    { id: "api", label: "APIs",           x: 320, y: 70,  mastered: false },
    { id: "sd",  label: "System Design",  x: 150, y: 120, mastered: false },
  ]
  const edges = [["py", "sql"], ["sql", "api"], ["py", "sd"], ["sd", "api"]]
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]))
  return (
    <motion.div ref={reveal.ref} {...reveal}
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink, marginBottom: 4 }}>Your skill graph</div>
      <p style={{ fontSize: 12.5, color: T.ink3, margin: "0 0 4px" }}>Grows with every SkillStudio lesson and Arena mission.</p>
      <IllustrativeTag style={{ display: "block", marginBottom: 12 }} />
      <svg width="100%" height="160" viewBox="0 0 360 160" style={{ display: "block" }}>
        {edges.map(([a, b], i) => {
          const n1 = byId[a], n2 = byId[b]
          return (
            <motion.line
              key={i} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y}
              stroke={T.border} strokeWidth="1.5"
              initial={reduce ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: EASE }}
            />
          )
        })}
        {nodes.map((n, i) => (
          <g key={n.id}>
            <motion.circle
              cx={n.x} cy={n.y} r={n.mastered ? 7 : 6}
              fill={n.mastered ? T.accent : T.surface}
              stroke={n.mastered ? T.accent : T.ink3} strokeWidth="1.5"
              initial={reduce ? false : { scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: 0.5 + i * 0.12, ease: EASE }}
            />
            <text x={n.x} y={n.y - 14} textAnchor="middle" fontSize="11" fontWeight="600" fill={T.ink2} fontFamily="'DM Sans',sans-serif">{n.label}</text>
          </g>
        ))}
      </svg>
    </motion.div>
  )
}

// ─── Recruiter preview — what a recruiter actually receives ───────────────
function RecruiterPreview() {
  const reveal = useReveal()
  return (
    <motion.div ref={reveal.ref} {...reveal}
      style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Ananya Rao</div>
          <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 3 }}>Data Analyst · Verified</div>
          <IllustrativeTag />
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 22, fontWeight: 600, color: T.accent, lineHeight: 1 }}>1,340</div>
          <div style={{ fontSize: 10, color: T.ink3, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 3 }}>ELO</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { t: "Swiggy — cancellation root-cause", s: 88 },
          { t: "Razorpay — payment failure analysis", s: 92 },
          { t: "BigBasket — inventory SQL audit", s: 79 },
        ].map(row => (
          <div key={row.t} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 8 }}>
            <span style={{ fontSize: 12.5, color: T.ink2 }}>{row.t}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12.5, fontWeight: 600, color: T.ink }}>{row.s}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, color: T.success, fontSize: 12, fontWeight: 600 }}>
        <ShieldCheck size={14} strokeWidth={2} /> Every score links back to the real submission — nothing self-reported.
      </div>
    </motion.div>
  )
}

// ─── Claim vs. proof section — ELO number ticks up, sparkline draws itself,
// claim/reality rows stagger in after, all keyed off one scroll-into-view
// trigger so the eye lands on the number first, then the supporting rows.
function ClaimVsProofSection({ problemRows, eloHistory }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const eloTarget = eloHistory[eloHistory.length - 1]
  const eloValue = useCountUp(eloTarget, { start: eloHistory[0], duration: 0.9, active: inView, reduce })

  return (
    <section ref={ref} style={{ padding: "96px 0" }}>
      <div className="lp-container lp-grid-2" style={{ alignItems: "center", gap: 64 }}>
        <div>
          <Eyebrow>Claim vs. proof</Eyebrow>
          <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: "0 0 16px" }}>A number that can&apos;t be faked.</h2>
          <p style={{ fontSize: 15, color: T.ink2, lineHeight: 1.65, marginBottom: 24 }}>
            Like chess.com — ELO is earned through real performance. It rises when you solve hard problems, and it cannot be self-reported or inflated.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {problemRows.map((r, i) => (
              <motion.div key={r.claim}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.3, delay: reduce ? 0 : 0.9 + i * 0.12, ease: EASE }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}
              >
                <div style={{ padding: "12px 14px", fontSize: 13, color: T.ink3, fontStyle: "italic", borderRight: `1px solid ${T.hairline}` }}>{r.claim}</div>
                <div style={{ padding: "12px 14px", fontSize: 13, color: T.error }}>{r.reality}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <div style={{ background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <TrendingUp size={16} color={T.accent} strokeWidth={2} />
            <span style={{ fontSize: 12, fontWeight: 600, color: T.ink3, letterSpacing: "0.04em", textTransform: "uppercase" }}>ELO growth</span>
          </div>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 42, fontWeight: 600, color: T.ink, margin: "8px 0 6px", fontVariantNumeric: "tabular-nums" }}>{eloValue.toLocaleString()}</div>
          <p style={{ fontSize: 12.5, color: T.ink3, margin: "0 0 16px" }}>Every point on this line is a real submission.</p>
          <EloSparkline points={eloHistory} />
        </div>
      </div>
    </section>
  )
}

// ─── Journey cards ─────────────────────────────────────────────────────────
// Sourced from pathIdentity.js's PRIMARY_PATHS (shared with AuthModal's
// in-modal chooser step) — see that file for why "path"/"instType" are
// kept separate from each card's own "key"/"title".

// Persona per card — kept local to this page (not pathIdentity.js) since
// AuthModal's compact step-1 chooser doesn't need personas, only these
// marketing cards do. Checked against every other name on this page
// (RecruiterPreview's Ananya Rao; the Network section's Rohan Mehta, Dr.
// Priya Singh, Arjun Kapoor, BITS Pilani) — all four below are distinct,
// each used exactly once.
const JOURNEY_PERSONAS = {
  student: { name: "Meera Iyer", role: "Student · Computer Science" },
  professional: { name: "Vikram Nair", role: "Professional · Full Stack Developer" },
  executive: { name: "Devika Shah", role: "Executive · Founder" },
  institution: { name: "VIT Vellore", role: "College" },
}

// One reused animated mechanism per path — same patterns already built for
// the "Show, don't explain" section (sparkline draw, node-graph draw,
// verified-badge pop), miniaturized. No fabricated stat grids, no numbers
// presented as real — student's sparkline reuses the exact same
// illustrative ELO_HISTORY the Claim vs. Proof section already uses.
function JourneyProof({ pathKey, color }) {
  const reduce = useReducedMotion()

  if (pathKey === "student") {
    return (
      <div>
        <EloSparkline points={ELO_HISTORY} width={200} height={36} />
        <p style={{ fontSize: 11.5, color: T.ink3, margin: "6px 0 0" }}>ELO grows with every submission.</p>
      </div>
    )
  }

  if (pathKey === "professional") {
    const nodes = [{ x: 20, y: 26 }, { x: 100, y: 12 }, { x: 180, y: 30 }]
    return (
      <div>
        <svg width="200" height="40" viewBox="0 0 200 40" style={{ display: "block" }}>
          {[[0, 1], [1, 2]].map(([a, b], i) => (
            <motion.line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
              stroke={T.border} strokeWidth="1.5"
              initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: EASE }}
            />
          ))}
          {nodes.map((n, i) => (
            <motion.circle key={i} cx={n.x} cy={n.y} fill={color} stroke={color} strokeWidth="1.5"
              initial={reduce ? false : { r: 0 }} whileInView={{ r: 4.5 }} viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.12, ease: EASE }}
            />
          ))}
        </svg>
        <p style={{ fontSize: 11.5, color: T.ink3, margin: "2px 0 0" }}>Skills stay verified automatically.</p>
      </div>
    )
  }

  if (pathKey === "executive") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <motion.div
          initial={reduce ? false : { scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.35, ease: EASE }}
          style={{ width: 30, height: 30, borderRadius: 9, background: withAlpha(color, 0.12), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
        >
          <ShieldCheck size={15} color={color} strokeWidth={2} />
        </motion.div>
        <p style={{ fontSize: 11.5, color: T.ink3, margin: 0 }}>Every profile identity-verified before it goes live.</p>
      </div>
    )
  }

  // institution
  const bars = [{ label: "Cohort avg", pct: 55 }, { label: "Top scorer", pct: 90 }]
  return (
    <div>
      {bars.map((b, i) => (
        <div key={b.label} style={{ marginBottom: i === 0 ? 6 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: T.ink3, marginBottom: 3 }}>
            <span>{b.label}</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: T.hairline, overflow: "hidden" }}>
            <motion.div
              initial={reduce ? false : { width: 0 }} whileInView={{ width: `${b.pct}%` }} viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: EASE }}
              style={{ height: "100%", borderRadius: 99, background: color }}
            />
          </div>
        </div>
      ))}
      <p style={{ fontSize: 11.5, color: T.ink3, margin: "6px 0 0" }}>Every bar reflects real submitted work.</p>
    </div>
  )
}

function JourneyCard({ item, onOpen }) {
  const Icon = item.icon
  const persona = JOURNEY_PERSONAS[item.key]
  return (
    <LiftCard
      onClick={() => onOpen(item.path, "journey-card", item.instType ? { instType: item.instType } : {})}
      style={{ padding: 28 }}
      hoverColor={withAlpha(item.color, 0.5)}
    >
      <div style={{ width: 44, height: 44, borderRadius: 11, background: withAlpha(item.color, 0.12), display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
        <Icon size={20} color={item.color} strokeWidth={1.75} />
      </div>
      <div style={{ fontSize: 19, fontWeight: 700, color: T.ink, marginBottom: 8 }}>{item.title}</div>
      <p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6, margin: "0 0 16px" }}>{item.desc}</p>

      {persona && (
        <div style={{ padding: "14px 14px", background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{persona.name}</div>
          <div style={{ fontSize: 11, color: T.ink3, marginBottom: 3 }}>{persona.role}</div>
          <IllustrativeTag style={{ display: "block", marginBottom: 10 }} />
          <JourneyProof pathKey={item.key} color={item.color} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
        {item.points.map(p => (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: T.ink3 }}>
            <Check size={13} color={item.color} strokeWidth={2.5} /> {p}
          </div>
        ))}
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: item.color }}>
        Get started <ArrowRight size={13} />
      </span>
    </LiftCard>
  )
}

// ─── Network card (verified authority network) ─────────────────────────────
function NetworkCard({ item }) {
  return (
    <LiftCard style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: T.surfaceRaised, border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.ink2, flexShrink: 0 }}>{item.name[0]}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</div>
          <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{item.role} · {item.co}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: T.success, fontWeight: 600 }}>
        <ShieldCheck size={13} strokeWidth={2} /> Verified
      </div>
    </LiftCard>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────
function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", textAlign: "left", padding: "16px 18px", background: "none", border: "none",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontFamily: "inherit",
      }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: T.ink, lineHeight: 1.4 }}>{q}</span>
        <ChevronDown size={16} color={T.ink3} strokeWidth={2} style={{ flexShrink: 0, transition: "transform 200ms ease", transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>
      {open && <div style={{ padding: "0 18px 18px" }}><p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.7, margin: 0 }}>{a}</p></div>}
    </div>
  )
}

function TrustBadge({ icon: Icon, label, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 16px" }}>
      <Icon size={16} color={T.ink3} strokeWidth={1.75} />
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color: T.ink3, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
export default function LandingPage({ onGetStarted, onLogin }) {
  const [pricingFlow, setPricingFlow] = useState("student")

  // extra.instType seeds AuthModal's institution sub-type toggle (College/
  // Company/...). Always writes or clears the key on every call — never
  // leaves a stale value from a previous click (e.g. clicking the College
  // card after the "company profile instead" link) to leak into the next.
  // path=null (the generic nav/hero "Get started" buttons) clears any
  // stale path instead — AuthModal opens fresh at its step-1 chooser
  // rather than inheriting a path from an earlier, unrelated visit.
  const openPath = (path, source = "landing", extra = {}) => {
    try {
      if (path) localStorage.setItem("capabilio_selected_path", path)
      else localStorage.removeItem("capabilio_selected_path")
      if (extra.instType) localStorage.setItem("capabilio_selected_inst_type", extra.instType)
      else localStorage.removeItem("capabilio_selected_inst_type")
    } catch (_) { /* localStorage unavailable */ }
    if (typeof onGetStarted === "function") onGetStarted({ path, source })
  }

  const PROBLEM_ROWS = [
    { claim: "“5 years Python experience”", reality: "Can't explain list comprehensions" },
    { claim: "“Machine Learning Expert”", reality: "Never trained an end-to-end model" },
    { claim: "“AWS Certified”", reality: "Watched 3 YouTube videos" },
  ]

  const FAQ_ITEMS = [
    { q: "What actually is ELO here, and how is it different from a resume claim?", a: "The same rating-system idea as chess.com — a number that only moves when you complete real, scored Arena tasks. Students start at 400. It rises when you solve harder problems well, and can drop if you're inactive. Nobody can type in a higher number." },
    { q: "Is Capabilio free to start?", a: "Yes. Student, Professional, and College all have a free tier with no card required. Paid plans unlock more daily Arena tasks and AI interview sessions — they're not required to build a verified profile." },
    { q: "How does verification work for professionals?", a: "You upload a resume or LinkedIn URL and AI extracts your career timeline. Employment history is then cross-matched against UAN/EPFO records. Anything that can't be verified this way is shown as “self-claimed,” not presented as fact." },
    { q: "What happens if I stop doing Arena tasks for a while?", a: "Your ELO can decay after 7+ days of inactivity, the same way a chess rating drifts without play — it reflects current skill, not a score you can bank and coast on." },
  ]

  const PRICING = {
    student: { plans: [
      { label: "Free", price: null, features: ["1 Arena task every 15 days", "Portfolio generation", "Locked premium previews", "Market reports at ₹49/report"], cta: "Get started free" },
      { label: "Pro", price: "₹299/mo", sub: "Billed monthly", features: ["3 Arena tasks per day", "3 AI Interview sessions/month", "1 market report/month", "Full Arena access", "Portfolio generation"], cta: "Start Pro" },
      { label: "Elite", price: "₹599/mo", sub: "Best value", recommended: true, features: ["6 Arena tasks per day", "5 AI Interview sessions/month", "2 market reports/month", "Personal branding video", "Full advanced Arena", "Portfolio generation"], cta: "Go Elite" },
    ]},
    professional: { plans: [
      { label: "Free", price: null, features: ["Basic Orbit dashboard", "1 Forge challenge/week", "Public verified profile", "UAN verification"], cta: "Start free" },
      { label: "Capabilio Pro", price: "₹499/mo", sub: "₹3,999/yr — save 33%", recommended: true, features: ["Full Orbit — all 4 career signals", "Unlimited Forge challenges", "Signal — 3 market reports/mo", "Compensation Intelligence", "Gap Mode + Gap Narrative Engine", "Vault full verification", "Nexus verified network"], cta: "Go Capabilio Pro" },
      { label: "Capabilio Elite", price: "₹999/mo", sub: "₹7,999/yr — save 33%", features: ["Everything in Capabilio Pro", "AI Interview — 5 sessions/mo", "Mentor Hub listing (15% commission)", "Transition Tracks access", "Return-Ready Sprint", "Signal — unlimited reports", "Priority Launchpad matching"], cta: "Go Capabilio Elite" },
    ]},
    college: {
      custom: true,
      sub: "A bad hire costs ₹80,000+. One better placement decision pays for the year. Pricing is scoped to your student/employee count.",
      cta: "Talk to us",
    },
  }

  return (
    <div style={{ minHeight: "100vh", background: T.surface, color: T.ink, fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');
        * { box-sizing: border-box; }
        .lp-container { max-width: 1120px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
        .lp-hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 64px; align-items: center; }
        .lp-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 16px; }
        .lp-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
        .lp-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 16px; }
        @media (max-width: 960px) { .lp-hero-grid, .lp-grid-2, .lp-grid-3, .lp-grid-4 { grid-template-columns: 1fr; } }
        @keyframes arenaSpin { to { transform: rotate(360deg) } }
        @media (prefers-reduced-motion: reduce) { .lp-hero-grid *, .lp-grid-2 *, .lp-grid-3 *, .lp-grid-4 * { animation: none !important; } }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, background: T.surface, zIndex: 50 }}>
        <div className="lp-container" style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src="/capabilio-logo-dark.png" alt="Capabilio AI" style={{ height: 24, width: "auto" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="#how-it-works" style={{ fontSize: 14, color: T.ink2, textDecoration: "none", fontWeight: 500 }}>How it works</a>
            <a href="#pricing" style={{ fontSize: 14, color: T.ink2, textDecoration: "none", fontWeight: 500 }}>Pricing</a>
            <GhostButton onClick={onLogin}>Sign in</GhostButton>
            <PrimaryButton onClick={() => openPath(null, "nav")}>Get started</PrimaryButton>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section style={{ padding: "88px 0 96px" }}>
        <div className="lp-container lp-hero-grid">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <h1 style={{ fontSize: "clamp(34px,4.6vw,54px)", lineHeight: 1.08, fontWeight: 700, letterSpacing: "-0.02em", color: T.ink, margin: "0 0 20px" }}>
              Your Career Needs More Than A Resume.<br />Build. Practice. Prove. Get Hired.
            </h1>
            <p style={{ fontSize: 17, color: T.ink2, lineHeight: 1.6, maxWidth: 480, margin: "0 0 32px" }}>
              Capabilio is an AI Career Operating System that continuously builds, verifies, and showcases your professional skills.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <PrimaryButton onClick={() => openPath(null, "hero")}>Get started <ArrowRight size={15} /></PrimaryButton>
              <GhostButton href="#how-it-works">See how it works</GhostButton>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: EASE }}>
            <WorkflowDiagram />
          </motion.div>
        </div>
      </section>

      {/* ── CHOOSE YOUR JOURNEY ─────────────────────────────────────── */}
      <section style={{ padding: "0 0 96px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Eyebrow>Choose your journey</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: "0 0 12px" }}>One platform. Four journeys.</h2>
            <p style={{ fontSize: 15, color: T.ink2, maxWidth: 560, margin: "0 auto" }}>Students prove readiness. Professionals stay verified. Executives monetize authority. Colleges measure cohort health.</p>
          </div>
          <div className="lp-grid-4">
            {PRIMARY_PATHS.map(item => <JourneyCard key={item.key} item={item} onOpen={openPath} />)}
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <a onClick={() => openPath("institution", "journey-company-link", { instType: "Company" })} style={{ fontSize: 13, color: T.ink3, cursor: "pointer", textDecoration: "none" }}>
              Building a company profile instead? <span style={{ color: T.accent, fontWeight: 600 }}>&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "0 0 96px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <Eyebrow>How it works</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>Five steps. One verified career.</h2>
          </div>
          <HowItWorksLine />
        </div>
      </section>

      {/* ── SHOW, DON'T EXPLAIN ─────────────────────────────────────── */}
      <section style={{ padding: "0 0 96px", background: T.surfaceRaised, borderTop: `1px solid ${T.hairline}`, borderBottom: `1px solid ${T.hairline}` }}>
        <div className="lp-container" style={{ paddingTop: 80, paddingBottom: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <Eyebrow>See it, don&apos;t read about it</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>What actually happens on Capabilio.</h2>
          </div>
          <div className="lp-grid-3">
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 12 }}>Arena</div>
              <ArenaPreview />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 12 }}>SkillStudio</div>
              <SkillStudioPreview />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 12 }}>Recruiter view</div>
              <RecruiterPreview />
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST / PROOF ───────────────────────────────────────────── */}
      <ClaimVsProofSection problemRows={PROBLEM_ROWS} eloHistory={ELO_HISTORY} />

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "0 0 96px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Eyebrow>Pricing</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: "0 0 12px" }}>Simple pricing.</h2>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
            {["student", "professional", "college"].map(key => (
              <button key={key} onClick={() => setPricingFlow(key)} style={{
                padding: "8px 16px", borderRadius: 999, border: `1px solid ${pricingFlow === key ? T.accent : T.border}`,
                background: pricingFlow === key ? T.accentDim : "transparent",
                color: pricingFlow === key ? T.accent : T.ink2, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
              }}>{key}</button>
            ))}
          </div>
          {PRICING[pricingFlow].custom ? (
            <div style={{ maxWidth: 480, margin: "0 auto", textAlign: "center", border: `1px solid ${T.border}`, borderRadius: 16, padding: "36px 28px" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 8 }}>Custom pricing</div>
              <p style={{ fontSize: 13.5, color: T.ink2, lineHeight: 1.6, margin: "0 0 20px" }}>{PRICING.college.sub}</p>
              <PrimaryButton onClick={() => openPath("institution", "pricing-college-cta")}>{PRICING.college.cta}</PrimaryButton>
            </div>
          ) : (
            <div className="lp-grid-3">
              {PRICING[pricingFlow].plans.map(plan => (
                <div key={plan.label} style={{
                  border: `1px solid ${T.border}`, borderTop: plan.recommended ? `3px solid ${T.accent}` : `1px solid ${T.border}`,
                  borderRadius: 16, padding: "24px 22px", display: "flex", flexDirection: "column",
                }}>
                  {plan.recommended && <div style={{ fontSize: 10.5, fontWeight: 700, color: T.accent, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>Recommended</div>}
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink3, marginBottom: 6 }}>{plan.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 700, color: T.ink, marginBottom: plan.sub ? 4 : 18 }}>{plan.price || "Free"}</div>
                  {plan.sub && <div style={{ fontSize: 12, color: T.ink3, marginBottom: 18 }}>{plan.sub}</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22, flex: 1 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, fontSize: 13, color: T.ink2 }}>
                        <Check size={14} color={T.accent} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} /> {f}
                      </div>
                    ))}
                  </div>
                  {plan.recommended
                    ? <PrimaryButton onClick={() => openPath(pricingFlow, `pricing-${plan.label}`)}>{plan.cta}</PrimaryButton>
                    : <GhostButton onClick={() => openPath(pricingFlow, `pricing-${plan.label}`)}>{plan.cta}</GhostButton>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── NETWORK ─────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 96px" }}>
        <div className="lp-container">
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Eyebrow>Verified network</Eyebrow>
            <h2 style={{ fontSize: "clamp(28px,3.6vw,40px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>Learn from people who proved it.</h2>
          </div>
          <div className="lp-grid-4">
            {[
              { name: "Rohan Mehta", role: "Founder & CEO", co: "PayStack India" },
              { name: "Dr. Priya Singh", role: "Professor", co: "IIT Hyderabad" },
              { name: "Arjun Kapoor", role: "CTO", co: "Razorpay" },
              { name: "BITS Pilani", role: "Premier Institution", co: "Est. 1964" },
            ].map(n => <NetworkCard key={n.name} item={n} />)}
          </div>
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <a href="https://recruiter.capabilio.online" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: T.ink3, textDecoration: "none" }}>
              Hiring? Search verified talent at <span style={{ color: T.accent, fontWeight: 600 }}>recruiter.capabilio.online &rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "0 0 96px" }}>
        <div className="lp-container" style={{ maxWidth: 720 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <Eyebrow>Frequently asked</Eyebrow>
            <h2 style={{ fontSize: "clamp(26px,3.4vw,36px)", fontWeight: 700, letterSpacing: "-0.015em", color: T.ink, margin: 0 }}>Questions people actually ask.</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {FAQ_ITEMS.map(item => <FAQItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      {/* ── TRUST BADGES + FOOTER ───────────────────────────────────── */}
      <section style={{ padding: "0 0 32px" }}>
        <div className="lp-container" style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <TrustBadge icon={Rocket} label="DPIIT Recognised" sub="Startup India" />
          <TrustBadge icon={Factory} label="Udyam Registered" sub="MSME, Govt. of India" />
          <TrustBadge icon={ShieldCheck} label="MCA Incorporated" sub="Ministry of Corporate Affairs" />
        </div>
      </section>

      <footer style={{ borderTop: `1px solid ${T.border}`, padding: "28px 0 44px" }}>
        <div className="lp-container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <img src="/capabilio-logo-dark.png" alt="Capabilio AI" style={{ height: 20, width: "auto" }} />
          <div style={{ fontSize: 12.5, color: T.ink3 }}>
            Hiring team?{" "}
            <a href="https://recruiter.capabilio.online" target="_blank" rel="noopener noreferrer" style={{ color: T.accent, textDecoration: "none", fontWeight: 600 }}>
              Search verified talent at recruiter.capabilio.online
            </a>
          </div>
          <div style={{ fontSize: 12.5, color: T.ink3 }}>Amaravati, Andhra Pradesh</div>
        </div>
      </footer>
    </div>
  )
}
