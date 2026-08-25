import { useState, useRef, useEffect } from "react"
import { motion, useReducedMotion, useInView, animate, AnimatePresence } from "framer-motion"
import {
  ClipboardCheck, Network, BookOpen, Swords, FolderCheck, Search, FileText,
  ArrowRight, Check, ChevronDown, Plus, User, AlertTriangle, CheckCircle2,
  ShieldCheck, XCircle, Play, Loader2, Rocket, Building2, Factory, TrendingUp, Menu, X,
  GraduationCap, Briefcase, Landmark
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
function PrimaryButton({ children, onClick, href, target, className = "" }) {
  const Tag = href ? "a" : "button"
  return (
    <Tag
      href={href} target={target} rel={target ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#FF5701] hover:bg-[#E64A00] text-white text-[15px] font-bold cursor-pointer transition-colors active:scale-95 no-underline ${className}`}
    >
      {children}
    </Tag>
  )
}

function GhostButton({ children, onClick, href, target, className = "" }) {
  const Tag = href ? "a" : "button"
  return (
    <Tag
      href={href} target={target} rel={target ? "noopener noreferrer" : undefined}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-transparent border border-[#E4E6E9] hover:border-[#A4AAB5] text-[#14161A] text-[15px] font-bold cursor-pointer transition-colors active:scale-95 no-underline ${className}`}
    >
      {children}
    </Tag>
  )
}

function Eyebrow({ children }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
      color: T.accent, marginBottom: 12, fontFamily: "'Inter', sans-serif",
    }}>{children}</div>
  )
}

// ─── IllustrativeTag — every fictional persona/company/mission on this page
// carries this, consistently, so nothing reads as real user or platform
// data. Quiet by design (DESIGN.md's "quiet, not loud" rule) — plain text,
// no border/background ceremony.


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
function EloSparkline({ points, width = 340, height = 64, animDelay = 0, showAxes = false }) {
  const reduce = useReducedMotion()
  if (!points || points.length < 2) return null
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1
  
  // Leave padding for axes if showAxes is true
  const padLeft = showAxes ? 24 : 0;
  const padRight = showAxes ? 24 : 0;
  const padBottom = showAxes ? 24 : 0;
  const padTop = showAxes ? 10 : 0;
  
  const drawWidth = width - padLeft - padRight;
  const drawHeight = height - padBottom - padTop;
  
  const xs = points.map((_, i) => padLeft + (i / (points.length - 1)) * drawWidth)
  const ys = points.map(v => padTop + drawHeight - ((v - min) / range) * (drawHeight * 0.8) - drawHeight * 0.1)
  
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ")
  const fill = `${path} L${xs[xs.length-1]},${padTop + drawHeight} L${xs[0]},${padTop + drawHeight} Z`
  
  const animDuration = showAxes ? 2.5 : 1.2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", width: "100%" }}>
      <defs>
        <linearGradient id="eloFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={T.accent} stopOpacity={showAxes ? "0.2" : "0.14"} />
          <stop offset="100%" stopColor={T.accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {showAxes && (
        <g stroke="#E4E6E9" strokeWidth="1" strokeDasharray="4 4">
          <line x1={padLeft - 5} y1={padTop + drawHeight} x2={width - padRight + 15} y2={padTop + drawHeight} strokeDasharray="none" stroke="#D1D5DB" strokeWidth="2" />
          <line x1={padLeft} y1={padTop - 5} x2={padLeft} y2={padTop + drawHeight + 5} strokeDasharray="none" stroke="#D1D5DB" strokeWidth="2" />
          <line x1={padLeft} y1={padTop + drawHeight * 0.5} x2={width - padRight + 10} y2={padTop + drawHeight * 0.5} />
          <line x1={padLeft} y1={padTop + drawHeight * 0.1} x2={width - padRight + 10} y2={padTop + drawHeight * 0.1} />
        </g>
      )}

      <motion.path d={fill} fill="url(#eloFill)"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: animDelay + animDuration * 0.5, ease: EASE }}
      />
      <motion.path d={path} fill="none" stroke={T.accent} strokeWidth={showAxes ? "3" : "2"} strokeLinecap="round" strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: animDuration, delay: animDelay, ease: EASE }}
      />
      <motion.circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} fill={T.accent}
        initial={reduce ? false : { r: 0, opacity: 0, scale: 0 }}
        whileInView={{ r: showAxes ? 5 : 3.5, opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: animDelay + animDuration, type: "spring" }}
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
    <div className="bg-white border border-[#A4AAB5] rounded-3xl p-10 shadow-sm flex flex-col lg:flex-row gap-10 items-center justify-between overflow-hidden relative">
      
      {/* Left Side: Timeline (Journey) */}
      <div className="flex flex-col gap-1 w-full lg:w-1/2 z-10">
        {FLOW_NODES.map((node, i) => {
          const Icon = node.icon
          return (
            <motion.div 
              key={node.label} 
              className="flex items-center gap-5 cursor-default group"
              whileHover={{ x: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="flex flex-col items-center w-10">
                <motion.div
                  initial={reduce ? false : { opacity: 0, scale: 0.5, rotate: -15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", stiffness: 200, damping: 15, 
                    delay: reduce ? 0 : i * 0.5 
                  }}
                  className="w-10 h-10 rounded-xl bg-white border border-[#A4AAB5] group-hover:border-[#FF5701] flex items-center justify-center shrink-0 shadow-sm transition-colors duration-300 relative"
                >
                  <Icon size={18} className="text-[#FF5701] transition-transform duration-300 group-hover:scale-110" strokeWidth={2} />
                  
                  {/* Subtle infinite pulse ring */}
                  <motion.div 
                    className="absolute inset-0 rounded-xl border-2 border-[#FF5701] opacity-0"
                    animate={{ scale: [1, 1.5], opacity: [0, 0.2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 + 0.5 }}
                  />
                </motion.div>
                
                {i < FLOW_NODES.length - 1 && (
                  <motion.div
                    initial={reduce ? false : { scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.5 + 0.25, ease: "linear" }}
                    className="w-px h-8 bg-[#A4AAB5] group-hover:bg-[#FF5701] transition-colors duration-300 origin-top"
                  />
                )}
              </div>
              <motion.span
                initial={reduce ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 20, delay: reduce ? 0 : i * 0.5 }}
                className={`text-[16px] font-bold text-[#14161A] group-hover:text-[#FF5701] transition-colors duration-300 ${i < FLOW_NODES.length - 1 ? 'pb-8' : ''}`}
              >
                {node.label}
              </motion.span>
            </motion.div>
          )
        })}
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: reduce ? 0 : FLOW_NODES.length * 0.15 + 0.2, ease: "easeOut" }}
          className="text-[13px] font-semibold text-[#8A8F98] mt-3 pt-5 border-t border-[#A4AAB5]"
        >
          Every step is logged. Nothing is self-reported.
        </motion.p>
      </div>

      {/* Right Side: 3D Illustration Area */}
      <div className="w-full lg:w-1/2 h-[350px] lg:h-full lg:absolute lg:right-0 lg:top-0 flex items-center justify-end pointer-events-none pr-4 lg:pr-8">
         <img 
            src="/workflow-illustration.png" 
            alt="Verified Career Journey" 
            className="w-full h-full object-contain object-right transform -translate-y-4 lg:-translate-y-6"
         />
      </div>

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
  const reduce = useReducedMotion()
  
  return (
    <div className="relative mt-16 w-full">
      {/* Background track line */}
      <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-[1px] bg-[#E4E6E9]" />
      
      {/* Animated progress line */}
      <motion.div 
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-[1px] bg-[#FF5701] origin-left z-0"
      />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-12 md:gap-6 relative z-10">
        {HOW_IT_WORKS.map((step, i) => {
          const Icon = step.icon
          return (
            <motion.div 
              key={step.label}
              initial={reduce ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: i * 0.2, ease: "easeOut" }}
              className="flex flex-col items-center text-center group cursor-default"
            >
              {/* Animated Icon Node */}
              <motion.div 
                whileHover={{ scale: 1.1, y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="w-14 h-14 rounded-full bg-white border border-[#E4E6E9] flex items-center justify-center mb-6 shadow-sm group-hover:border-[#FF5701] group-hover:shadow-md transition-all duration-300 relative z-10"
              >
                <Icon size={22} className="text-[#4B5058] group-hover:text-[#FF5701] transition-colors duration-300" strokeWidth={2} />
              </motion.div>
              
              {/* Step number */}
              <div className="text-[11px] font-extrabold text-[#FF5701] uppercase tracking-[0.15em] mb-2.5">
                Step 0{i + 1}
              </div>
              
              {/* Text */}
              <h4 className="text-[16px] font-bold text-[#14161A] mb-2.5">{step.label}</h4>
              <p className="text-[13.5px] text-[#4B5058] leading-relaxed max-w-[220px]">{step.detail}</p>
            </motion.div>
          )
        })}
      </div>
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

function ArenaPreview({ outcome = "pass", setOutcome = () => {} }) {
  const [phase, setPhase] = useState("typing") // typing -> running -> executed -> output -> eval
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const script = ARENA_SCRIPTS[outcome]
  const eloTarget = ARENA_ELO_BASE + script.eloDelta
  
  // Only start counting ELO when eval phase is reached
  const eloValue = useCountUp(eloTarget, { 
    start: ARENA_ELO_BASE, 
    duration: 2.5, // Slowed down from 0.7s to 2.5s for a suspenseful roll
    delay: 0.5, 
    active: phase === "eval", 
    reduce 
  })
  
  const VerdictIcon = script.passed ? ShieldCheck : XCircle
  const verdictColor = script.passed ? T.success : T.error
  const verdictDim = script.passed ? T.successDim : T.errorDim

  // Reset timeline when user switches tabs (pass/fail)
  useEffect(() => {
    setPhase("typing")
  }, [outcome])

  // Master Timeline execution
  useEffect(() => {
    if (!inView) return;
    if (reduce) { setPhase("eval"); return; }
    
    if (phase === "typing") {
      // 3 lines * 0.8s + small buffer = ~2.6s
      const t = setTimeout(() => setPhase("running"), 2600);
      return () => clearTimeout(t);
    } else if (phase === "running") {
      // Pretend to execute code for 1.2s
      const t = setTimeout(() => setPhase("executed"), 1200);
      return () => clearTimeout(t);
    } else if (phase === "executed") {
      // Show checkmark/X briefly before sliding in output
      const t = setTimeout(() => setPhase("output"), 800);
      return () => clearTimeout(t);
    } else if (phase === "output") {
      // Wait for output to render, then show AI evaluation
      const t = setTimeout(() => setPhase("eval"), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, inView, reduce])

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["pass", "Passing attempt"], ["fail", "Failing attempt"]].map(([key, label]) => (
          <button key={key} onClick={() => setOutcome(key)} style={{
            padding: "5px 11px", borderRadius: 999, border: `1px solid ${outcome === key ? T.accent : T.border}`,
            background: "transparent",
            color: outcome === key ? T.accent : T.ink3, fontSize: 11.5, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
          }}>{label}</button>
        ))}
      </div>
      <div ref={ref} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.hairline}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FC8019", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <path d="M12.034 24c-.376-.411-2.075-2.584-3.95-5.513-.547-.916-.901-1.63-.833-1.814.178-.48 3.355-.743 4.333-.308.298.132.29.307.29.409 0 .44-.022 1.619-.022 1.619a.441.441 0 1 0 .883-.002l-.005-2.939c0-.255-.278-.319-.331-.329-.511-.002-1.548-.006-2.661-.006-2.457 0-3.006.101-3.423-.172-.904-.591-2.383-4.577-2.417-6.819C3.849 4.964 5.723 2.225 8.362.868A8.13 8.13 0 0 1 12.026 0c4.177 0 7.617 3.153 8.075 7.209l.001.011c.084.981-5.321 1.189-6.39.904-.164-.044-.206-.212-.206-.284L13.5 4.996a.442.442 0 0 0-.884.002l.009 3.866a.33.33 0 0 0 .268.32l3.354-.001c1.79 0 2.542.207 3.042.588.333.254.461.739.349 1.37C18.633 16.755 12.273 23.71 12.034 24z"/>
            </svg>
          </div>
          <div style={{ minWidth: 0, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#14161A" }}>Swiggy (Example) — Data Analyst mission</div>
          </div>
        </div>
        <div key={outcome + String(inView)} style={{ padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 8 }}>Mission</div>
          <p style={{ fontSize: 14.5, color: T.ink2, lineHeight: 1.6, margin: "0 0 20px" }}>
            Weekend order cancellations spike after 9 PM. Find the dominant cause in the last 30 days of order data.
          </p>
          
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 8 }}>Notebook</div>
          <div style={{
            background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 12,
            padding: "16px 20px", fontFamily: "'DM Mono',monospace", fontSize: 13, color: T.ink,
            lineHeight: 1.7, marginBottom: 6, overflowX: "auto",
          }}>
            {/* TYPEWRITER EFFECT */}
            {script.code.map((line, i) => (
              <motion.div key={i}
                initial={reduce || !inView ? false : { width: 0, opacity: 0 }}
                animate={inView ? { width: "100%", opacity: 1 } : {}}
                transition={{ duration: 0.7, delay: i * 0.8, ease: "linear" }}
                style={{ whiteSpace: "pre", overflow: "hidden" }}
              >{line}</motion.div>
            ))}
          </div>

          {/* DYNAMIC RUN BEAT */}
          {phase !== "typing" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 mb-4 mt-2"
              style={{ fontSize: 11, fontWeight: 700, color: phase === "executed" || phase === "output" || phase === "eval" ? (script.passed ? T.success : T.error) : T.ink3 }}
            >
              {phase === "running" && <Loader2 size={13} className="animate-spin text-[#8A8F98]" />}
              {(phase === "executed" || phase === "output" || phase === "eval") && (
                script.passed ? <Check size={13} color={T.success} strokeWidth={3} /> : <XCircle size={13} color={T.error} strokeWidth={3} />
              )}
              {phase === "running" && "Executing notebook..."}
              {(phase === "executed" || phase === "output" || phase === "eval") && (script.passed ? "Executed successfully" : "Execution failed")}
            </motion.div>
          )}

          {/* OUTPUT GRID */}
          {(phase === "output" || phase === "eval") && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 6 }}>Output</div>
              <div style={{
                background: T.ink, borderRadius: 10, padding: "12px 14px",
                fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#D4F5DE", lineHeight: 1.7, marginBottom: 16,
              }}>
                {script.output.map(([label, count], i) => (
                  <motion.div key={label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.15 }}
                    style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                  >
                    <span>{label}</span><span>{count}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* AI EVALUATION */}
          {phase === "eval" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: verdictDim, border: `1px solid ${verdictColor}30`, borderRadius: 10, marginBottom: 10 }}
              >
                <VerdictIcon size={16} color={verdictColor} strokeWidth={2} />
                <span style={{ fontSize: 13, fontWeight: 700, color: verdictColor }}>{script.passed ? "Verified" : "Not verified"}</span>
                <span style={{ fontSize: 12, color: T.ink3, marginLeft: "auto" }}>Score {script.score}</span>
              </div>

              <div
                style={{ padding: "12px 14px", background: T.surfaceRaised, border: `1px solid ${T.hairline}`, borderRadius: 10, marginBottom: 14 }}
              >
                <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink3, marginBottom: 4 }}>Feedback</div>
                <p style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.55, margin: 0 }}>{script.feedback}</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 600, color: T.ink, fontVariantNumeric: "tabular-nums" }}>{eloValue.toLocaleString()}</div>
                  <span style={{ fontSize: 10, color: T.ink3, letterSpacing: "0.05em", textTransform: "uppercase" }}>ELO</span>
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 3.0 }}
                    style={{ fontSize: 12, fontWeight: 700, color: script.passed ? T.success : T.error }}
                  >
                    {script.passed ? "+" : ""}{script.eloDelta}
                  </motion.span>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SkillStudio preview — an original animated skill graph ───────────────
function SkillStudioPreview() {
  const reveal = useReveal()
  const reduce = useReducedMotion()
  
  return (
    <motion.div ref={reveal.ref} {...reveal}
      style={{ 
        background: "#FAF7F2", // Actual SkillStudio D.base
        border: `1px solid ${T.border}`, 
        borderRadius: 20, 
        padding: 24,
        boxShadow: "0 4px 30px rgba(0,0,0,0.03)"
      }}
    >
      {/* Header Matter */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#14161A", marginBottom: 4 }}>Skill Studio Workspace (Example)</div>
        <p style={{ fontSize: 12.5, color: "#8A8F98", margin: 0 }}>Grows with every SkillStudio lesson and Arena mission.</p>
      </div>

      {/* Mini Dashboard Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 20 }}>
      {/* Left Sidebar (The Brain) */}
      <div style={{ background: "#FFFFFF", borderRadius: 14, border: `1px solid ${T.border}`, padding: 16, display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Learning Path */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#6366F1", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12, fontFamily: "'DM Mono',monospace" }}>Learning Path</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {["Phase 1", "Phase 2", "Phase 3"].map((phase, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: i === 0 ? "#10B981" : i === 1 ? "#6366F1" : "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: i < 2 ? "#fff" : "#999", boxShadow: i < 2 ? `0 0 8px ${i === 0 ? '#10B98160' : '#6366F160'}` : 'none' }}>
                  {i === 0 ? "✓" : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: i < 2 ? "#14161A" : "#8A8F98" }}>{phase}</div>
                  <div style={{ height: 3, background: "#F5F5F5", borderRadius: 99, marginTop: 4, overflow: "hidden" }}>
                    <motion.div 
                      initial={{ width: 0 }} 
                      whileInView={{ width: i === 0 ? "100%" : i === 1 ? "50%" : "0%" }} 
                      transition={{ duration: 1, delay: 0.5 + i * 0.2 }}
                      style={{ height: "100%", background: i === 0 ? "#10B981" : "#6366F1" }} 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Role DNA Map */}
        <div>
           <div style={{ fontSize: 9, fontWeight: 800, color: "#8A8F98", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12, fontFamily: "'DM Mono',monospace" }}>Role DNA</div>
           <svg width="100%" height="60" viewBox="0 0 100 60">
             <path d="M10,30 L40,12 L70,30 L40,48 Z" stroke="#E4E6E9" strokeWidth="1" fill="none" />
             <path d="M40,12 L40,48 M10,30 L70,30" stroke="#E4E6E9" strokeWidth="1" />
             <circle cx="10" cy="30" r="3.5" fill="#3B82F6" />
             <circle cx="40" cy="12" r="3.5" fill="#8B5CF6" />
             <circle cx="70" cy="30" r="3.5" fill="#10B981" />
             <circle cx="40" cy="48" r="3.5" fill="#F59E0B" />
             <circle cx="40" cy="30" r="5" fill="#6366F1" />
           </svg>
        </div>
      </div>

      {/* Main Workspace */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        
        {/* Dark Glass Tab Bar */}
        <div style={{ background: "rgba(17,24,39,0.8)", backdropFilter: "blur(12px)", borderRadius: 12, padding: 5, display: "flex", gap: 4 }}>
          {["Diagnose", "Roadmap", "Modules"].map((tab, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", padding: "6px 0", fontSize: 9.5, fontWeight: 700, color: i === 1 ? "#6366F1" : "#8A8F98", background: i === 1 ? "rgba(99,102,241,0.15)" : "transparent", borderRadius: 8, borderBottom: i === 1 ? "1.5px solid #6366F1" : "1.5px solid transparent", transition: "all 0.2s" }}>
              {tab}
            </div>
          ))}
        </div>

        {/* Header Stats */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ padding: "6px 12px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 99, fontSize: 9, fontWeight: 700, color: "#F59E0B", display: "flex", alignItems: "center", gap: 5 }}>
             <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#F59E0B" }}></span> 2 decaying
          </div>
          <div style={{ padding: "6px 12px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 99, fontSize: 9, fontWeight: 700, color: "#8B5CF6", display: "flex", alignItems: "center", gap: 5 }}>
             <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#8B5CF6" }}></span> 1,240 XP
          </div>
        </div>

        {/* Content Card (Next Best Action) */}
        <motion.div 
          initial={reduce ? false : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          style={{ background: "#FFFFFF", borderRadius: 14, border: `1px solid ${T.border}`, padding: 16, flex: 1, display: "flex", flexDirection: "column" }}
        >
          <div style={{ fontSize: 9, fontWeight: 800, color: "#8A8F98", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12, fontFamily: "'DM Mono',monospace" }}>Next Best Action</div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1 }}>
             <div style={{ width: 28, height: 28, borderRadius: 8, background: "#F5F3FF", border: "1px solid #EDE9FE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
               <div style={{ width: 12, height: 12, borderRadius: 3, border: "2px solid #8B5CF6" }}></div>
             </div>
             <div>
               <div style={{ fontSize: 11.5, fontWeight: 700, color: "#14161A", marginBottom: 3 }}>Advanced SQL Joins</div>
               <div style={{ fontSize: 9.5, color: "#8A8F98", lineHeight: 1.5 }}>Fill gap identified in your last Arena task.</div>
             </div>
          </div>
          <div style={{ marginTop: "auto", paddingTop: 12 }}>
            <div style={{ padding: "8px 0", background: "#6366F1", color: "#FFF", fontSize: 10.5, fontWeight: 700, textAlign: "center", borderRadius: 8, cursor: "pointer" }}>
              Start Action
            </div>
          </div>
        </motion.div>

      </div>
      </div>
    </motion.div>
  )
}

// ─── Recruiter preview — what a recruiter actually receives ───────────────
function RecruiterPreview({ outcome = "pass" }) {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  
  const isPass = outcome === "pass"
  const s2 = useCountUp(isPass ? 92 : 24, { start: 0, duration: 1.5, delay: 0.5, active: inView, reduce })

  const scoreColor = isPass ? "#4ADE80" : "#EF4444"
  const badgeColor = isPass ? "#4ADE80" : "#EF4444"

  return (
    <motion.div ref={ref}
      initial={reduce ? false : { opacity: 0, y: 15 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: "easeOut" }}
      style={{ 
        background: "#0F172A", 
        border: "1px solid #1E293B", 
        borderRadius: 24, 
        padding: 24,
        boxShadow: "0 10px 40px rgba(0,0,0,0.15)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>Ananya Rao (Example)</div>
          <div style={{ fontSize: 13, color: "#94A3B8" }}>Data Analyst · Verified Profile</div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, padding: "6px 10px", borderRadius: 8, background: "#1E293B", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Recruiter View
        </div>
      </div>

      {/* Mini Evidence Card Replica */}
      <div style={{ background: "#0F172A", borderRadius: 14, border: "1px solid #1E293B", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0", marginBottom: 4 }}>Swiggy - cancellation root-cause</div>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>
              Data Analyst · Hard · Food Tech
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: scoreColor, marginBottom: 2 }}>{s2}/100</div>
            <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Verified</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, fontSize: 12, color: "#CBD5E1" }}>
          <div>Time taken: <strong style={{ color: "#E2E8F0" }}>{isPass ? "42m 15s" : "2h 10m"}</strong></div>
          <div>ELO delta: <strong style={{ color: scoreColor }}>{isPass ? "+24" : "-14"}</strong></div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["Advanced SQL", "Root Cause Analysis", "Data Visualization"].map((s) => (
            <span key={s} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: "#1E293B", color: "#93C5FD", fontWeight: 600 }}>{s}</span>
          ))}
        </div>

        <div>
          <div style={{ color: "#94A3B8", marginBottom: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 10 }}>{isPass ? "Strengths" : "Weaknesses"}</div>
          <ul style={{ margin: 0, paddingLeft: 18, color: badgeColor, lineHeight: 1.6, fontSize: 12 }}>
            {isPass ? (
              <>
                <li>Perfect use of window functions to isolate 9 PM cohort.</li>
                <li>Identified rider-allocation delay as the primary bottleneck.</li>
              </>
            ) : (
              <>
                <li>Missed critical edge cases in window functions.</li>
                <li>Failed to isolate the 9 PM cohort accurately.</li>
              </>
            )}
          </ul>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20, color: "#4ADE80", fontSize: 12, fontWeight: 600 }}>
        <ShieldCheck size={16} strokeWidth={2} /> Links directly to real code submission.
      </div>
    </motion.div>
  )
}

// ─── Claim vs. proof section — ELO number ticks up, sparkline draws itself,
// claim/reality rows stagger in after, all keyed off one scroll-into-view
// trigger so the eye lands on the number first, then the supporting rows.
function ParadigmShiftSection() {
  const reduce = useReducedMotion()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-100px" })

  const badClaims = [
    { title: "Python & REST APIs — 2 Years Experience", desc: "Self-reported duration with zero code quality proof or testing metrics." },
    { title: "Machine Learning & AI Expert", desc: "Generic keyword stuffing without precision, recall, or dataset evaluation proof." },
    { title: "AWS & Database Certified", desc: "Multiple-choice memorization certificate with no live incident triage evidence." },
    { title: "Proactive Problem Solver & Fast Learner", desc: "Subjective buzzword that 98% of candidates copy-paste onto PDF resumes." },
  ];

  const goodProofs = [
    { title: "Python & Backend APIs", desc: "Debugged 4 live microservice outages • 100% unit assertions passed", metric: "82 ELO" },
    { title: "Machine Learning Pipelines", desc: "Tuned churn model F1-score from 0.82 to 0.89 on real customer dataset", metric: "74 ELO" },
    { title: "PostgreSQL & Cloud Tuning", desc: "Eliminated table scan with B-Tree functional index (latency dropped 94%)", metric: "68 ELO" },
    { title: "Complete Verified Track Record", desc: "12 tasks • 4 simulations • 2 projects • 1 AI technical interview", metric: "Verified" },
  ];

  return (
    <section ref={ref} className="w-full py-16 md:py-20 bg-white relative">
      <div className="max-w-[1100px] mx-auto px-6 md:px-12">
        <div className="text-center mb-12 md:mb-16">
          <div className="text-[#FF5701] font-extrabold text-[12px] md:text-[14px] tracking-[0.2em] uppercase mb-4">
            The Paradigm Shift
          </div>
          <h2 className="text-[28px] md:text-[36px] lg:text-[42px] font-extrabold text-[#14161A] leading-[1.2] tracking-[-0.02em] mb-6 max-w-4xl mx-auto text-balance">
            Your resume tells people what you claim. Capabilio shows what you can prove.
          </h2>
          <p className="text-[17px] text-[#4B5058] leading-[1.6] max-w-3xl mx-auto font-medium">
            Hiring managers spend 6 seconds scanning unverified bullet points. Capabilio gives them cryptographic work samples, deterministic test results, and calibrated skill ELO.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-start">
          
          {/* TRADITIONAL RESUME - NEGATIVE */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="rounded-[24px] border border-[#E4E6E9] bg-white flex flex-col h-full overflow-hidden"
          >
            <div className="p-8 border-b border-[#E4E6E9] bg-white">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></div>
                  <h3 className="text-[16px] font-bold text-[#14161A] tracking-tight uppercase">Traditional Resume</h3>
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-grow divide-y divide-[#E4E6E9]/60 px-8">
              {badClaims.map((item, i) => (
                <div key={i} className="py-6 flex gap-4 h-auto md:h-[120px] lg:h-[110px] items-start">
                  <X size={18} className="text-[#EF4444] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <h4 className="text-[14.5px] font-bold text-[#14161A] mb-1.5">{item.title}</h4>
                    <p className="text-[13.5px] text-[#8A8F98] font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-auto px-8 py-5 border-t border-[#E4E6E9] bg-[#F9FAFB]">
              <p className="text-[13px] font-semibold text-[#8A8F98]">
                Recruiter trust level: <span className="text-[#EF4444]">12%</span> (Requires extensive screening)
              </p>
            </div>
          </motion.div>

          {/* CAPABILIO PROOF - POSITIVE */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="rounded-[24px] border border-[#E4E6E9] bg-white flex flex-col h-full overflow-hidden"
          >
            <div className="p-8 border-b border-[#E4E6E9] bg-white relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div>
                  <h3 className="text-[16px] font-bold text-[#14161A] tracking-tight uppercase">Capabilio Proof</h3>
                </div>
              </div>
            </div>

            <div className="flex flex-col flex-grow divide-y divide-[#E4E6E9]/60 px-8">
              {goodProofs.map((item, i) => (
                <div key={i} className="py-6 flex gap-4 h-auto md:h-[120px] lg:h-[110px] items-start">
                  <Check size={18} className="text-[#10B981] shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14.5px] font-bold text-[#14161A] mb-1.5 ">{item.title}</h4>
                    <p className="text-[13.5px] text-[#4B5058] font-medium leading-relaxed ">{item.desc}</p>
                  </div>
                  <div className="text-[13.5px] font-extrabold shrink-0 text-[#FF5701] bg-[#FFF0E8] px-2.5 py-1 rounded-md">
                    {item.metric}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-auto px-8 py-5 border-t border-[#E4E6E9] bg-[#F0FDF4]/30">
              <p className="text-[13px] font-semibold text-[#14161A]">
                Recruiter trust level: <span className="text-[#10B981]">98%</span> (Instant interview bypass)
              </p>
            </div>
          </motion.div>

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
  institution: { name: "VIT Vellore", role: "Organization" },
}

// One reused animated mechanism per path — same patterns already built for
// the "Show, don't explain" section (sparkline draw, node-graph draw,
// verified-badge pop), miniaturized. No fabricated stat grids, no numbers
// presented as real — student's sparkline reuses the exact same
// illustrative ELO_HISTORY the Claim vs. Proof section already uses.
function JourneyProof({ pathKey, color, isReplay = false }) {
  const reduce = useReducedMotion()
  const baseDelay = isReplay ? 0 : 0.8 // Wait 0.8s only on initial load, replay instantly on hover

  if (pathKey === "student") {
    return (
      <div className="h-[76px] flex flex-col justify-end overflow-visible relative">
        <div className="mb-0 -mt-3 relative z-0 pointer-events-none">
          <EloSparkline points={ELO_HISTORY} width={220} height={70} animDelay={baseDelay} />
        </div>
        <p className="text-[11px] text-[#8A8F98] font-medium mt-0.5 relative z-10">ELO grows with every submission.</p>
      </div>
    )
  }

  if (pathKey === "professional") {
    // Symmetrical peak: 1st and 3rd dot at the same height (55). Middle dot shoots up (5).
    const nodes = [{ x: 10, y: 55 }, { x: 110, y: 5 }, { x: 210, y: 55 }]
    return (
      <div className="h-[76px] flex flex-col justify-end overflow-visible relative">
        <div className="mb-0 -mt-3 relative z-0 pointer-events-none">
          <svg width="100%" height="70" viewBox="0 0 220 70" className="block w-full">
            {[[0, 1], [1, 2]].map(([a, b], i) => (
              <motion.line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
                stroke="#E4E6E9" strokeWidth="2"
                initial={reduce ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }}
                transition={{ duration: 0.8, delay: baseDelay + i * 0.2, ease: "easeOut" }}
              />
            ))}
            {nodes.map((n, i) => (
              <motion.circle key={i} cx={n.x} cy={n.y} fill={color} stroke={color} strokeWidth="1.5"
                initial={reduce ? false : { r: 0 }} whileInView={{ r: 4.5 }} viewport={{ once: true }}
                transition={{ duration: 0.4, delay: baseDelay + 0.6 + i * 0.15, ease: "backOut" }}
              />
            ))}
          </svg>
        </div>
        <p className="text-[11px] text-[#8A8F98] font-medium mt-0.5 relative z-10">Skills stay verified automatically.</p>
      </div>
    )
  }

  if (pathKey === "executive") {
    return (
      <div className="h-[76px] flex items-center gap-3">
        <motion.div
          initial={reduce ? false : { scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: baseDelay }}
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ backgroundColor: withAlpha(color, 0.15) }}
        >
          <ShieldCheck size={18} color={color} strokeWidth={2} />
        </motion.div>
        <p className="text-[11px] text-[#4B5058] leading-tight font-medium">Every profile identity-verified before it goes live.</p>
      </div>
    )
  }

  // institution
  const bars = [{ label: "Cohort avg", pct: 55 }, { label: "Top scorer", pct: 90 }]
  return (
    <div className="h-[76px] flex flex-col justify-end">
      <div className="flex flex-col gap-1.5 mb-1.5">
        {bars.map((b, i) => (
          <div key={b.label} className="w-full">
            <div className="flex justify-between text-[10px] font-bold text-[#8A8F98] mb-0.5">
              <span>{b.label}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#E4E6E9] overflow-hidden w-full">
              <motion.div
                initial={reduce ? false : { width: 0 }} whileInView={{ width: `${b.pct}%` }} viewport={{ once: true }}
                transition={{ duration: 0.8, delay: baseDelay + i * 0.25, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#8A8F98] font-medium mt-1">Every bar reflects real submitted work.</p>
    </div>
  )
}

function JourneyCard({ item, onViewDetails }) {
  const Icon = item.icon
  const persona = JOURNEY_PERSONAS[item.key]
  const [hoverCount, setHoverCount] = useState(0)
  
  return (
    <div
      onMouseEnter={() => setHoverCount(c => c + 1)}
      onClick={() => onViewDetails(item)}
      className="group bg-white rounded-2xl border border-[#E4E6E9] p-8 transition-all duration-300 relative overflow-hidden flex flex-col h-full cursor-pointer"
    >
      {/* Coming Soon absolute corner badge */}
      {item.comingSoon && (
        <div 
          className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-extrabold uppercase tracking-[0.15em] text-white z-20 shadow-sm"
          style={{ backgroundColor: item.color }}
        >
          Coming Soon
        </div>
      )}

      {/* Dynamic top accent line on hover */}
      <div 
        className="absolute top-0 left-0 right-0 h-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: item.color }} 
      />

      <div className="flex justify-between items-start mb-6">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 shadow-sm group-hover:scale-110"
          style={{ backgroundColor: withAlpha(item.color, 0.1) }}
        >
          <Icon size={22} color={item.color} strokeWidth={2} />
        </div>
      </div>

      <h3 className="text-[20px] font-extrabold mb-2 text-[#14161A]">{item.title}</h3>
      <p className="text-[14px] text-[#4B5058] leading-relaxed mb-6 font-medium flex-grow">{item.desc}</p>

      {persona && (
        <div className="border-t border-b border-[#E4E6E9]/60 py-5 mb-6 transition-colors duration-300 group-hover:border-[#D1D5DB]">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-[#14161A] truncate">{persona.name}</div>
              <div className="text-[11.5px] text-[#8A8F98] font-medium mt-0.5 truncate">{persona.role}</div>
            </div>
            <div className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-[#8A8F98] bg-[#F4F5F7] px-2 py-0.5 rounded-full border border-[#E4E6E9]">
              Example
            </div>
          </div>
          <div className="pt-1">
            <JourneyProof key={hoverCount} pathKey={item.key} color={item.color} isReplay={hoverCount > 0} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3.5 mb-8">
        {item.points.map(p => (
          <div key={p} className="flex items-start gap-3">
            <Check size={16} color={item.color} strokeWidth={2.5} className="mt-[1px] shrink-0" />
            <span className="text-[13.5px] text-[#4B5058] font-medium leading-tight">{p}</span>
          </div>
        ))}
      </div>
      
      <motion.div 
        whileHover="hover"
        className="mt-auto w-full flex items-center justify-center gap-2.5 py-3 bg-white border border-[#E4E6E9] hover:border-[#D1D5DB] rounded-xl text-[14px] text-[#14161A] transition-all duration-300 font-bold"
      >
        Learn more
        <motion.span 
          variants={{ 
            hover: { x: 4, backgroundColor: item.color } 
          }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4F5F7]"
        >
          <motion.div variants={{ hover: { color: "#FFFFFF" } }} className="text-[#14161A] flex items-center justify-center">
             <ArrowRight size={12} strokeWidth={3} />
          </motion.div>
        </motion.span>
      </motion.div>
    </div>
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
function FAQItem({ q, a, isLast }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`overflow-hidden ${isLast ? '' : 'border-b border-[#E4E6E9]'}`}>
      <button 
        onClick={() => setOpen(o => !o)} 
        className="w-full text-left py-6 flex items-center justify-between gap-4 group cursor-pointer bg-transparent border-none outline-none"
      >
        <span className="text-[17px] font-semibold text-[#14161A] tracking-tight group-hover:text-[#FF5701] transition-colors duration-200">
          {q}
        </span>
        <motion.div 
          animate={{ rotate: open ? 45 : 0 }} 
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex-shrink-0 text-[#8A8F98] group-hover:text-[#FF5701] transition-colors duration-200"
        >
          <Plus size={20} strokeWidth={2} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="pb-6 pr-8">
              <p className="text-[15px] leading-relaxed text-[#5E636E] m-0">{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function TrustBadge({ imgSrc, label, sub }) {
  return (
    <div className="group flex items-center gap-4 bg-white border border-[#E4E6E9] hover:border-[#D1D5DB] rounded-2xl px-5 py-4 transition-all duration-200 cursor-default">
      <div className="flex-shrink-0 w-16 h-12 flex items-center justify-center">
        <img 
          src={imgSrc} 
          alt={label} 
          className="w-full h-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105" 
        />
      </div>
      <div>
        <div className="text-[14px] font-bold text-[#14161A] tracking-tight">{label}</div>
        {sub && <div className="text-[12px] font-medium text-[#8A8F98] mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

// ─── Typewriter Effect ──────────────────────────────────────────────────
function TypewriterText({ words }) {
  const [index, setIndex] = useState(0)
  
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [words])

  return (
    <motion.span
      key={index}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: EASE }}
      style={{ display: "inline-block" }}
    >
      {words[index]}
    </motion.span>
  )
}

// ═══════════════════════════════════════════════════════════════════════
function JourneyExplanationModal({ item, onClose, onSignUp }) {
  if (!item) return null;

  const getStory = (key) => {
    if (key === 'student') return {
      who: "Undergraduates & Early-Career Talent",
      why: "Academic degrees no longer guarantee employment. Modern hiring teams filter out unverified resumes, demanding tangible proof of capability over traditional certificates.",
      what: "Complete real-world engineering tasks in The Arena to build a mathematically verified ELO rating. Bypass the resume stack and get discovered by top organizations purely on merit."
    }
    if (key === 'professional') return {
      who: "Working Professionals & Specialists",
      why: "Your true career impact is buried in easily-falsified PDFs and keyword-driven ATS systems, making it difficult for top recruiters to validate your actual worth.",
      what: "Securely link your UAN/EPFO to generate an immutable, auto-verified career timeline. Allow elite recruiters to approach you directly with precision job matches."
    }
    if (key === 'executive') return {
      who: "Industry Leaders & Domain Experts",
      why: "Coordinating mentorship, consulting, or advisory roles is fragmented. There is no centralized, verified ecosystem to formally monetize your acquired industry authority.",
      what: "Maintain an exclusive, invite-only authority profile. Seamlessly monetize your time and expertise through Capabilio's premium verification and networking layer."
    }
    if (key === 'institution') return {
      who: "Universities & Organizations",
      why: "Placement cells lack data-driven visibility into real-time student capabilities, making it difficult to accurately map cohort talent to the specific demands of hiring companies.",
      what: "Monitor live cohort ELO, track continuous skill growth, and automate placement drives by matching verified student profiles directly with top-tier hiring partners."
    }
    return {}
  }

  const story = getStory(item.key)

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
         <motion.div 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
           className="absolute inset-0 bg-[#14161A]/80 backdrop-blur-sm"
           onClick={onClose}
         />
         <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 20 }}
           className="bg-white rounded-3xl w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl flex flex-col"
         >
            <div className="p-8 border-b border-[#E4E6E9] flex items-center gap-5 relative">
               <button onClick={onClose} className="absolute top-6 right-6 text-[#8A8F98] hover:text-[#14161A] transition-colors"><X size={24} /></button>
               <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: withAlpha(item.color, 0.1) }}>
                 <item.icon size={28} color={item.color} strokeWidth={2.5} />
               </div>
               <div>
                  <h2 className="text-2xl font-extrabold text-[#14161A] mb-1">{item.title} Journey</h2>
                  <p className="text-[15px] font-medium text-[#4B5058]">{item.desc}</p>
               </div>
            </div>
            
            <div className="p-8 md:p-10 flex flex-col gap-8 bg-white flex-grow">
               
               {/* WHO */}
               <div className="pl-5 border-l-[3px]" style={{ borderColor: item.color }}>
                 <h4 className="text-[11px] font-extrabold uppercase tracking-widest mb-2" style={{ color: item.color }}>Target Profile</h4>
                 <p className="text-[17px] font-bold text-[#14161A] leading-relaxed">
                   {story.who}
                 </p>
               </div>

               {/* WHY */}
               <div className="pl-5 border-l-[3px] border-[#EF4444]">
                 <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#EF4444] mb-2">The Problem</h4>
                 <p className="text-[15px] font-medium text-[#4B5058] leading-relaxed">
                   {story.why}
                 </p>
               </div>

               {/* WHAT */}
               <div className="pl-5 border-l-[3px] border-[#10B981]">
                 <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-[#10B981] mb-2">The Solution</h4>
                 <p className="text-[15.5px] font-semibold text-[#14161A] leading-relaxed">
                   {story.what}
                 </p>
               </div>
               
            </div>

            <div className="p-6 bg-white border-t border-[#E4E6E9] flex justify-end gap-3">
              <button onClick={onClose} className="px-6 py-3 rounded-xl text-[14.5px] font-bold text-[#4B5058] hover:bg-[#F4F5F7] transition-colors">Cancel</button>
              <button onClick={() => onSignUp(item)} className="px-8 py-3 rounded-xl text-[14.5px] font-bold text-white transition-colors hover:opacity-90" style={{ backgroundColor: item.color }}>
                {item.comingSoon ? 'Join Waitlist' : 'Join Now'}
              </button>
            </div>
         </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default function LandingPage({ onGetStarted, onLogin }) {
  const [pricingFlow, setPricingFlow] = useState("student")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activePreview, setActivePreview] = useState("arena")
  const [previewOutcome, setPreviewOutcome] = useState("pass")
  const reduce = useReducedMotion()

  // extra.instType seeds AuthModal's institution sub-type toggle (Organization/
  // Company/...). Always writes or clears the key on every call — never
  // leaves a stale value from a previous click (e.g. clicking the Organization
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



  const FAQ_ITEMS = [
    { q: "What actually is ELO here, and how is it different from a resume claim?", a: "The same rating-system idea as chess.com — a number that only moves when you complete real, scored Arena tasks. Students start at 400. It rises when you solve harder problems well, and can drop if you're inactive. Nobody can type in a higher number." },
    { q: "Is Capabilio free to start?", a: "Yes. Student, Professional, and Organization all have a free tier with no card required. Paid plans unlock more daily Arena tasks and AI interview sessions — they're not required to build a verified profile." },
    { q: "How does verification work for professionals?", a: "You upload a resume or LinkedIn URL and AI extracts your career timeline. Employment history is then cross-matched against UAN/EPFO records. Anything that can't be verified this way is shown as “self-claimed,” not presented as fact." },
    { q: "What happens if I stop doing Arena tasks for a while?", a: "Your ELO can decay after 7+ days of inactivity, the same way a chess rating drifts without play — it reflects current skill, not a score you can bank and coast on." },
  ]

  const PRICING = {
    student: { plans: [
      { label: "Free", price: null, sub: "100% Free Forever", features: ["1 Arena task per day (IST reset)", "Basic profile & sharing", "Limited skill tracking & graph", "Basic portfolio & evidence", "Basic job & internship discovery", "Basic opportunity browsing"], cta: "START FREE" },
      { label: "Pro", price: "₹299/mo", sub: "Billed monthly • Cancel anytime", recommended: true, features: ["3 Arena tasks per day (IST reset)", "1 monthly skill report & diagnostics", "3 AI interview sessions / month", "Internship readiness score & tracking", "1 monthly market analysis report", "Interview feedback & improvement areas"], cta: "GO PRO" },
      { label: "Elite", price: "₹499/mo", sub: "BEST FOR SERIOUS CAREER BUILDING", features: ["6 Arena tasks per day (IST reset)", "2 monthly skill reports", "5 AI interview sessions / month", "Personal branding video (Included)", "2 monthly market analysis reports", "Priority access & Elite profile badge"], cta: "GO ELITE" },
    ]},
    professional: { plans: [
      { label: "Free", price: null, features: ["Basic Orbit dashboard", "1 Forge challenge/week", "Public verified profile", "UAN verification"], cta: "Start free" },
      { label: "Capabilio Pro", price: "₹499/mo", sub: "₹3,999/yr — save 33%", recommended: true, features: ["Full Orbit — all 4 career signals", "Unlimited Forge challenges", "Signal — 3 market reports/mo", "Compensation Intelligence", "Gap Mode + Gap Narrative Engine", "Vault full verification", "Nexus verified network"], cta: "Go Capabilio Pro" },
      { label: "Capabilio Elite", price: "₹999/mo", sub: "₹7,999/yr — save 33%", features: ["Everything in Capabilio Pro", "AI Interview — 5 sessions/mo", "Mentor Hub listing (15% commission)", "Transition Tracks access", "Return-Ready Sprint", "Signal — unlimited reports", "Priority Launchpad matching"], cta: "Go Capabilio Elite" },
    ]},
    organization: {
      custom: true,
      sub: "A bad hire costs ₹80,000+. One better placement decision pays for the year. Pricing is scoped to your student/employee count.",
      cta: "Talk to us",
    },
  }

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const [explanationModal, setExplanationModal] = useState(null)

  return (
    <div style={{ minHeight: "100vh", background: T.surface, color: T.ink, fontFamily: "'DM Sans',sans-serif" }}>
      <JourneyExplanationModal 
        item={explanationModal} 
        onClose={() => setExplanationModal(null)} 
        onSignUp={(item) => {
          setExplanationModal(null)
          openPath(item.path, "journey-modal", item.instType ? { instType: item.instType } : {})
        }} 
      />
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
      <nav className="sticky top-0 z-50 bg-white border-b border-[#E4E6E9] w-full font-sans">
        <div className="w-full px-6 md:px-12 h-20 flex items-center justify-between">
          
          {/* Left: LOGO */}
          <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
             <img src="/capabilio-logo-dark.png" alt="Capabilio AI" className="h-9 md:h-[38px] w-auto object-contain" />
          </div>
          
          {/* Center: Desktop Links */}
          <div className="hidden md:flex items-center gap-10 absolute left-1/2 -translate-x-1/2">
            <a href="#about-us" onClick={(e) => handleNavClick(e, "about-us")} className="text-[15px] font-semibold text-[#4B5058] hover:text-[#FF5701] transition-colors">About Us</a>
            <a href="#workflow" onClick={(e) => handleNavClick(e, "workflow")} className="text-[15px] font-semibold text-[#4B5058] hover:text-[#FF5701] transition-colors">Workflow</a>
            <a href="#how-it-works" onClick={(e) => handleNavClick(e, "how-it-works")} className="text-[15px] font-semibold text-[#4B5058] hover:text-[#FF5701] transition-colors">How it works</a>
            <a href="#pricing" onClick={(e) => handleNavClick(e, "pricing")} className="text-[15px] font-semibold text-[#4B5058] hover:text-[#FF5701] transition-colors">Pricing</a>
          </div>

          {/* Right: Desktop Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <GhostButton onClick={onLogin} className="border-transparent hover:border-[#E4E6E9]">Sign in</GhostButton>
            <PrimaryButton onClick={() => openPath(null, "nav")}>Get started</PrimaryButton>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-[#14161A] hover:text-[#FF5701] p-2 transition-colors"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <motion.div
          initial={false}
          animate={{ height: isMobileMenuOpen ? "auto" : 0, opacity: isMobileMenuOpen ? 1 : 0 }}
          className="md:hidden overflow-hidden bg-white border-b border-[#E4E6E9]"
        >
          <div className="px-6 py-8 flex flex-col gap-6">
            <a href="#about-us" onClick={(e) => { setIsMobileMenuOpen(false); handleNavClick(e, "about-us"); }} className="text-lg font-bold text-[#14161A]">About Us</a>
            <a href="#workflow" onClick={(e) => { setIsMobileMenuOpen(false); handleNavClick(e, "workflow"); }} className="text-lg font-bold text-[#14161A]">Workflow</a>
            <a href="#how-it-works" onClick={(e) => { setIsMobileMenuOpen(false); handleNavClick(e, "how-it-works"); }} className="text-lg font-bold text-[#14161A]">How it works</a>
            <a href="#pricing" onClick={(e) => { setIsMobileMenuOpen(false); handleNavClick(e, "pricing"); }} className="text-lg font-bold text-[#14161A]">Pricing</a>
            <div className="flex flex-col gap-4 pt-6 border-t border-[#E4E6E9]">
              <GhostButton onClick={() => { setIsMobileMenuOpen(false); onLogin(); }} className="w-full justify-center">Sign in</GhostButton>
              <PrimaryButton onClick={() => { setIsMobileMenuOpen(false); openPath(null, "nav"); }} className="w-full justify-center">Get started</PrimaryButton>
            </div>
          </div>
        </motion.div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────── */}
      <section className="w-full px-6 md:px-12 pt-4 pb-12 md:pb-16 bg-white overflow-hidden">
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* Left Side: Typography & Buttons */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: EASE }}
              className="text-[#FF5701] font-extrabold text-[13px] md:text-[15px] tracking-[0.2em] uppercase mb-4"
            >
              Verified Career OS
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-extrabold text-[#14161A] leading-[1.1] tracking-tight mb-6">
              Your Career Needs <br className="hidden lg:block" />
              More Than A <br className="hidden lg:block" />
              <span className="text-[#FF5701] inline-flex min-w-[300px]">
                <TypewriterText words={["Resume.", "Static PDF.", "LinkedIn Bio.", "Fake Claim."]} />
              </span>
            </h1>
            
            <p className="text-[17px] text-[#4B5058] leading-relaxed max-w-[480px] mb-10 font-medium">
              Capabilio is the AI ecosystem that continuously builds, verifies, and showcases your professional skills through live ELO ratings.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <PrimaryButton onClick={() => openPath(null, "hero")} className="px-8 py-3.5 rounded-xl text-[16px]">
                Get started <ArrowRight size={18} strokeWidth={2.5} />
              </PrimaryButton>
              <GhostButton onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: 'smooth' })} className="px-8 py-3.5 rounded-xl text-[16px]">
                See how it works
              </GhostButton>
            </div>

            <div className="mt-10 flex items-center gap-6 text-[13px] font-semibold text-[#8A8F98]">
              <div className="flex items-center gap-1.5"><Check size={16} className="text-[#16A34A]" strokeWidth={3}/> Live Skill ELO</div>
              <div className="flex items-center gap-1.5"><Check size={16} className="text-[#16A34A]" strokeWidth={3}/> AI Verified</div>
              <div className="flex items-center gap-1.5"><Check size={16} className="text-[#16A34A]" strokeWidth={3}/> Resume-Free</div>
            </div>
          </motion.div>

          {/* Right Side: Workflow Diagram (untouched internally) */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: EASE }}>
            <WorkflowDiagram />
          </motion.div>
        </div>
      </section>

      {/* ── ABOUT US ─────────────────────────────────────────────────── */}
      <section id="about-us" className="w-full px-6 md:px-12 py-12 md:py-16 bg-white relative overflow-hidden">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div>
            <div className="text-[#FF5701] font-extrabold text-[13px] md:text-[15px] tracking-[0.2em] uppercase mb-4">
              About Us
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#14161A] tracking-tight leading-[1.1] mb-6">
              Transforming skills into verified careers.
            </h2>
            <p className="text-[17px] text-[#4B5058] leading-relaxed font-medium">
              We are building a future where your career isn't defined by a static piece of paper or a college name, but by the actual skills you possess. Capabilio AI is India's first Career Operating System designed to replace traditional resumes with living, AI-verified ELO ratings. 
              <br /><br />
              Through rigorous Arena missions and continuous skill tracking, we bridge the gap between dedicated learning and premier hiring opportunities.
            </p>
          </div>
          <div className="bg-[#FAF7F2] p-8 md:p-12 rounded-[24px] border border-[#E4E6E9] relative">
             <p className="text-xl md:text-2xl font-serif font-bold text-[#14161A] leading-relaxed relative z-10 italic">
               "Skills should be proven, not claimed. We are building the ecosystem where true talent gets discovered without bias."
             </p>
             <div className="mt-8 text-right">
                <div className="font-bold text-[#14161A]">— Venkata Kopuri</div>
                <div className="text-sm font-medium text-[#8A8F98]">Founder, Capabilio AI</div>
             </div>
          </div>
        </div>
      </section>

      {/* ── CHOOSE YOUR JOURNEY ─────────────────────────────────────── */}
      <section className="w-full px-6 md:px-12 py-16 md:py-20 bg-white relative overflow-hidden">
        
        <div className="max-w-[1200px] mx-auto relative z-10">
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto mb-12 md:mb-16"
          >
            <motion.h3 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[#FF5701] font-extrabold tracking-[0.2em] uppercase text-[13px] md:text-[15px] mb-4"
            >
              Choose your journey
            </motion.h3>
            <h2 className="text-4xl md:text-5xl lg:text-[54px] font-extrabold text-[#14161A] tracking-tight leading-[1.1] mb-8">
              One platform. Four journeys.
            </h2>
            <p className="text-[18px] md:text-[20px] text-[#4B5058] leading-relaxed font-medium">
              Students prove readiness. Professionals stay verified. Executives monetize authority. Organizations measure cohort health.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pb-16">
            {PRIMARY_PATHS.map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: i % 2 !== 0 ? 48 : 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
                className={`h-full ${i % 2 !== 0 ? 'lg:translate-y-12' : ''}`}
              >
                <JourneyCard item={item} onViewDetails={setExplanationModal} />
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-16 lg:mt-24 flex justify-center">
            <motion.div
              whileHover="hover"
              onClick={() => openPath("institution", "journey-company-link", { instType: "Company" })} 
              className="inline-flex items-center gap-2.5 px-6 py-2.5 bg-white border border-[#E4E6E9] hover:border-[#D1D5DB] hover:shadow-sm rounded-full text-[14px] text-[#4B5058] cursor-pointer transition-all duration-300 font-bold group"
            >
              Building a company profile instead? 
              <motion.span 
                variants={{ hover: { x: 4 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4F5F7] group-hover:bg-[#FF5701] transition-colors duration-300"
              >
                <ArrowRight size={12} className="text-[#14161A] group-hover:text-white transition-colors duration-300" strokeWidth={3} />
              </motion.span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────── */}
      {/* ── WORKFLOW / WHO IT'S FOR ─────────────────────────────────── */}
      <section id="workflow" className="w-full px-6 md:px-12 py-16 md:py-20 relative">
        <div className="max-w-[1200px] mx-auto text-center mb-16">
           <div className="text-[#FF5701] font-extrabold text-[13px] md:text-[15px] tracking-[0.2em] uppercase mb-4">
              Workflow
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-[#14161A] tracking-tight leading-[1.1] mb-6">
              How it fits for you.
            </h2>
            <p className="text-[17px] text-[#8A8F98] max-w-2xl mx-auto font-medium">
              Three simple steps to unlock your potential, no matter where you are in your career journey.
            </p>
        </div>

        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Students */}
          <div className="bg-white rounded-[24px] p-8 text-center border border-[#E4E6E9]">
            <div className="w-14 h-14 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-6 text-[#FF5701]">
              <GraduationCap size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#14161A] mb-6">For Students</h3>
            <div className="flex flex-col items-start w-max mx-auto gap-3.5 text-[14.5px] font-bold text-[#4B5058] mb-8">
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#FF5701]" strokeWidth={3} /> Take Arena tasks</div>
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#FF5701]" strokeWidth={3} /> Build verified ELO</div>
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#FF5701]" strokeWidth={3} /> Land top jobs</div>
            </div>
            <motion.div 
              whileHover="hover"
              onClick={() => openPath("student", "workflow")} 
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-white border border-[#E4E6E9] hover:border-[#D1D5DB] hover:shadow-sm rounded-xl text-[14px] text-[#14161A] cursor-pointer transition-all duration-300 font-bold group"
            >
              Sign up now
              <motion.span 
                variants={{ hover: { x: 4 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4F5F7] group-hover:bg-[#FF5701] transition-colors duration-300"
              >
                <ArrowRight size={12} className="text-[#14161A] group-hover:text-white transition-colors duration-300" strokeWidth={3} />
              </motion.span>
            </motion.div>
          </div>

          {/* Professionals */}
          <div className="bg-white rounded-[24px] p-8 text-center border border-[#E4E6E9] relative overflow-hidden">
            <div 
              className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-extrabold uppercase tracking-[0.15em] text-white z-20 shadow-sm"
              style={{ backgroundColor: '#2563EB' }}
            >
              Coming Soon
            </div>
            <div className="w-14 h-14 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-6 text-[#2563EB]">
              <Briefcase size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#14161A] mb-6">For Professionals</h3>
            <div className="flex flex-col items-start w-max mx-auto gap-3.5 text-[14.5px] font-bold text-[#4B5058] mb-8">
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#2563EB]" strokeWidth={3} /> Connect UAN</div>
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#2563EB]" strokeWidth={3} /> Verify timeline</div>
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#2563EB]" strokeWidth={3} /> Attract recruiters</div>
            </div>
            <div className="w-full flex items-center justify-center gap-2.5 py-3 bg-[#F4F5F7] rounded-xl text-[14px] text-[#A4AAB5] font-bold">
              Waitlist opening soon
            </div>
          </div>

          {/* Organizations */}
          <div className="bg-white rounded-[24px] p-8 text-center border border-[#E4E6E9]">
            <div className="w-14 h-14 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-6 text-[#7C3AED]">
              <Landmark size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#14161A] mb-6">For Organizations</h3>
            <div className="flex flex-col items-start w-max mx-auto gap-3.5 text-[14.5px] font-bold text-[#4B5058] mb-8">
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#7C3AED]" strokeWidth={3} /> Assess team health</div>
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#7C3AED]" strokeWidth={3} /> Track skill growth</div>
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#7C3AED]" strokeWidth={3} /> Automate hiring</div>
            </div>
            <motion.div 
              whileHover="hover"
              onClick={() => openPath("institution", "workflow")} 
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-white border border-[#E4E6E9] hover:border-[#D1D5DB] hover:shadow-sm rounded-xl text-[14px] text-[#14161A] cursor-pointer transition-all duration-300 font-bold group"
            >
              Sign up now
              <motion.span 
                variants={{ hover: { x: 4 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4F5F7] group-hover:bg-[#7C3AED] transition-colors duration-300"
              >
                <ArrowRight size={12} className="text-[#14161A] group-hover:text-white transition-colors duration-300" strokeWidth={3} />
              </motion.span>
            </motion.div>
          </div>

          {/* Recruiters */}
          <div className="bg-white rounded-[24px] p-8 text-center border border-[#E4E6E9]">
            <div className="w-14 h-14 bg-[#F8F9FA] rounded-full flex items-center justify-center mx-auto mb-6 text-[#059669]">
              <Search size={24} strokeWidth={2.5} />
            </div>
            <h3 className="text-[20px] font-extrabold text-[#14161A] mb-6">For Recruiters</h3>
            <div className="flex flex-col items-start w-max mx-auto gap-3.5 text-[14.5px] font-bold text-[#4B5058] mb-8">
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#059669]" strokeWidth={3} /> Search exact ELO</div>
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#059669]" strokeWidth={3} /> Trust verification</div>
              <div className="flex items-center gap-2.5"><Check size={18} className="text-[#059669]" strokeWidth={3} /> Hire instantly</div>
            </div>
            <motion.div 
              whileHover="hover"
              onClick={() => window.open('https://recruiter.capabilio.online', '_blank')} 
              className="w-full flex items-center justify-center gap-2.5 py-3 bg-white border border-[#E4E6E9] hover:border-[#D1D5DB] hover:shadow-sm rounded-xl text-[14px] text-[#14161A] cursor-pointer transition-all duration-300 font-bold group"
            >
              Start searching
              <motion.span 
                variants={{ hover: { x: 4 } }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center justify-center w-6 h-6 rounded-full bg-[#F4F5F7] group-hover:bg-[#059669] transition-colors duration-300"
              >
                <ArrowRight size={12} className="text-[#14161A] group-hover:text-white transition-colors duration-300" strokeWidth={3} />
              </motion.span>
            </motion.div>
          </div>

        </div>
      </section>

      <section id="how-it-works" className="py-16 md:py-20 relative bg-white">
        {/* Background Paper Rocket Illustration */}
        <div className="absolute inset-x-0 top-0 z-0 pointer-events-none opacity-30 md:opacity-40 flex items-start justify-center">
          <img 
            src="/paper-plane-bg.png" 
            alt="Journey blueprint" 
            className="w-full max-w-[1200px] h-auto object-contain object-top -mt-10 md:-mt-24"
            style={{ mixBlendMode: 'multiply' }}
          />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="text-center mb-12 md:mb-16">
            <div className="text-[#FF5701] font-extrabold tracking-[0.2em] uppercase text-[13px] md:text-[15px] mb-4">
              How it works
            </div>
            <h2 className="text-[32px] lg:text-[54px] font-extrabold text-[#14161A] tracking-tight leading-[1.1] max-w-2xl mx-auto">
              Five steps. One verified career.
            </h2>
          </div>
          <HowItWorksLine />
        </div>
      </section>

      {/* ── SHOW, DON'T EXPLAIN ─────────────────────────────────────── */}
      <section className="relative pb-16 md:pb-20">
        {/* Abstract Background Curves & Floating Elements (Zomato Style) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Left Looping String */}
          <svg className="absolute left-0 top-0 h-full w-[400px] lg:w-[500px]" viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMinYMin slice">
            <path d="M 100,-50 C -50,150 350,200 150,300 C -50,400 -100,550 150,550 C 400,550 200,800 0,900" stroke="#FF5701" strokeWidth="0.4" strokeOpacity="0.2" vectorEffect="non-scaling-stroke" />
            <path d="M 250,-50 C 400,250 -50,350 200,500 C 450,650 350,850 150,900" stroke="#FF5701" strokeWidth="0.3" strokeOpacity="0.15" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Right Looping String */}
          <svg className="absolute right-0 top-0 h-full w-[400px] lg:w-[500px]" viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMaxYMin slice">
            <path d="M 200,-50 C 450,150 50,300 250,450 C 450,600 500,750 200,750 C -100,750 300,900 400,950" stroke="#FF5701" strokeWidth="0.4" strokeOpacity="0.2" vectorEffect="non-scaling-stroke" />
            <path d="M 50,-50 C -100,250 450,350 150,550 C -150,750 100,900 300,950" stroke="#FF5701" strokeWidth="0.3" strokeOpacity="0.15" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Floating 2D Icons (Minimal Line-art) */}
          <motion.img src="/bug.png" alt="Bug" className="absolute top-[15%] left-[10%] lg:left-[12%] w-24 md:w-32 lg:w-40 mix-blend-multiply opacity-80" animate={{ y: [0, -15, 0], rotate: [-2, 2, -2] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }} />
          <motion.img src="/coffee.png" alt="Coffee" className="absolute top-[55%] left-[2%] lg:left-[5%] w-20 md:w-28 lg:w-36 mix-blend-multiply opacity-80" animate={{ y: [0, 10, 0], rotate: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 5.5, ease: "easeInOut", delay: 1 }} />
          <motion.img src="/keycap.png" alt="Keycap" className="absolute bottom-[2%] left-[12%] lg:left-[16%] w-28 md:w-36 lg:w-44 mix-blend-multiply opacity-80" animate={{ y: [0, -20, 0], rotate: [2, -2, 2] }} transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 2 }} />
          
          <motion.img src="/git-flat.png" alt="Git" className="absolute top-[8%] right-[12%] lg:right-[15%] w-32 md:w-40 lg:w-48 mix-blend-multiply opacity-80" animate={{ y: [0, 20, 0], rotate: [-3, 3, -3] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut", delay: 0.5 }} />
          <motion.img src="/terminal.png" alt="Terminal" className="absolute top-[48%] right-[4%] lg:right-[6%] w-24 md:w-32 lg:w-44 mix-blend-multiply opacity-80" animate={{ y: [0, -12, 0], rotate: [2, -2, 2] }} transition={{ repeat: Infinity, duration: 6.2, ease: "easeInOut", delay: 1.2 }} />
          <motion.img src="/rocket-flat.png" alt="Rocket" className="absolute bottom-[15%] right-[8%] lg:right-[12%] w-28 md:w-36 lg:w-44 mix-blend-multiply opacity-80" animate={{ y: [0, -15, 0], rotate: [3, -3, 3] }} transition={{ repeat: Infinity, duration: 6.5, ease: "easeInOut", delay: 1.5 }} />
        </div>

        <div className="max-w-[1200px] mx-auto px-6 pt-20 lg:pt-32 pb-4 relative z-10">
          <div className="text-center mb-12 lg:mb-16">
            <div className="text-[#FF5701] font-extrabold tracking-[0.2em] uppercase text-[13px] md:text-[15px] mb-4">
              See it, don't read about it
            </div>
            <h2 className="text-[32px] lg:text-[54px] font-extrabold text-[#14161A] tracking-tight leading-[1.1] max-w-2xl mx-auto mb-10">
              What actually happens on Capabilio.
            </h2>
            
            {/* Interactive Tabs */}
            <div className="inline-flex items-center bg-[#E4E6E9]/40 p-1.5 rounded-full mx-auto relative z-20">
              {[
                { id: "arena", label: "The Arena" },
                { id: "skill", label: "SkillStudio" },
                { id: "recruiter", label: "Recruiter View" }
              ].map(tab => {
                const isActive = activePreview === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActivePreview(tab.id)}
                    className={`relative px-6 py-2.5 rounded-full text-[14px] font-bold transition-all duration-300 z-10 ${isActive ? 'text-[#14161A] shadow-sm' : 'text-[#8A8F98] hover:text-[#14161A]'}`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabPreview"
                        className="absolute inset-0 bg-white rounded-full border border-[#D1D5DB]"
                        style={{ zIndex: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Window */}
          <div className="max-w-[650px] mx-auto relative">
            {/* Window Mac-like styling wrapper for extra premium feel */}
            <div className="w-full bg-white rounded-2xl border border-[#E4E6E9] overflow-hidden">
              <div className="h-10 bg-[#F4F5F7] border-b border-[#E4E6E9] flex items-center px-4 gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${activePreview === 'arena' ? 'bg-[#FF5701]' : 'bg-[#D1D5DB]'}`} />
                <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${activePreview === 'skill' ? 'bg-[#FF5701]' : 'bg-[#D1D5DB]'}`} />
                <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${activePreview === 'recruiter' ? 'bg-[#FF5701]' : 'bg-[#D1D5DB]'}`} />
              </div>
              <div className="p-6 md:p-10 bg-white">
                <motion.div 
                  key={activePreview}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full"
                >
                  {activePreview === "arena" && <ArenaPreview outcome={previewOutcome} setOutcome={setPreviewOutcome} />}
                  {activePreview === "skill" && <SkillStudioPreview />}
                  {activePreview === "recruiter" && <RecruiterPreview outcome={previewOutcome} />}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST / PROOF ───────────────────────────────────────────── */}
      <ParadigmShiftSection />

      {/* ── PRICING ─────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 md:py-20 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-12">
            <div className="text-[#FF5701] font-extrabold tracking-[0.2em] uppercase text-[13px] md:text-[15px] mb-4">
              Pricing
            </div>
            <h2 className="text-[32px] lg:text-[54px] font-extrabold text-[#14161A] tracking-tight leading-[1.1] max-w-2xl mx-auto mb-10">
              Simple pricing.
            </h2>

            {/* Premium Toggle */}
            <div className="inline-flex items-center bg-[#F4F5F7] p-1.5 rounded-full mx-auto relative border border-[#E4E6E9]">
              {["student", "organization"].map((key) => {
                const isActive = pricingFlow === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPricingFlow(key)}
                    className={`relative px-8 py-2.5 rounded-full text-[14px] font-bold transition-all duration-300 capitalize z-10 ${isActive ? 'text-[#14161A]' : 'text-[#8A8F98] hover:text-[#14161A]'}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="pricingTab"
                        className="absolute inset-0 bg-white rounded-full shadow-sm border border-[#D1D5DB]"
                        style={{ zIndex: -1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{key}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-w-[1140px] mx-auto">
            <motion.div 
              key={pricingFlow}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {PRICING[pricingFlow].custom ? (
                <div className="w-full bg-white border border-[#E4E6E9] rounded-3xl p-10 lg:p-16 text-center max-w-3xl mx-auto">
                  <div className="w-16 h-16 bg-[#FDF2F2] rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building2 size={28} className="text-[#FF5701]" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-[28px] lg:text-[36px] font-bold text-[#14161A] tracking-tight mb-4">Custom pricing</h3>
                  <p className="text-[17px] text-[#4A4E54] leading-[1.6] max-w-lg mx-auto mb-10">
                    {PRICING.organization.sub}
                  </p>
                  <button 
                    onClick={() => openPath("institution", "pricing-organization-cta")}
                    className="bg-[#14161A] text-white px-8 py-4 rounded-full text-[15px] font-bold hover:bg-[#2A2E35] transition-colors"
                  >
                    {PRICING.organization.cta}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                  {PRICING[pricingFlow].plans.map((plan, idx) => (
                    <div 
                      key={plan.label} 
                      className={`relative flex flex-col bg-white rounded-3xl p-8 lg:p-10 transition-colors duration-300 ${plan.recommended ? 'border-2 border-[#14161A] z-10' : 'border border-[#E4E6E9] hover:border-[#D1D5DB] z-0'}`}
                    >
                      {plan.recommended && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#14161A] text-white text-[11px] font-bold uppercase tracking-[0.15em] py-1.5 px-4 rounded-full">
                          Recommended
                        </div>
                      )}
                      <div className="text-[18px] font-bold text-[#14161A] mb-4">{plan.label}</div>
                      <div className="flex items-baseline gap-1 mb-2">
                        <div className="text-[36px] lg:text-[44px] font-bold text-[#14161A] tracking-tighter leading-none">
                          {plan.price ? plan.price.split('/')[0] : "₹0"}
                        </div>
                        <div className="text-[15px] font-medium text-[#8A8F98]">/mo</div>
                      </div>
                      
                      <div className="text-[14px] font-medium text-[#8A8F98] h-[20px] mb-8">
                        {plan.sub || ""}
                      </div>

                      <button 
                        onClick={() => openPath(pricingFlow, `pricing-${plan.label}`)}
                        className={`w-full py-3.5 rounded-xl text-[14px] font-bold mb-10 transition-colors ${plan.recommended ? 'bg-[#FF5701] text-white hover:bg-[#E04B01]' : 'bg-[#F4F5F7] text-[#14161A] hover:bg-[#E4E6E9]'}`}
                      >
                        {plan.cta}
                      </button>

                      <div className="flex flex-col gap-4 mt-auto">
                        {plan.features.map(f => (
                          <div key={f} className="flex items-start gap-3">
                            <Check size={18} className="text-[#FF5701] shrink-0 mt-0.5" strokeWidth={3} />
                            <span className="text-[14px] text-[#4A4E54] font-medium leading-snug">{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── NETWORK ─────────────────────────────────────────────────── */}
      <section className="relative py-32 overflow-hidden bg-[#14161A]">
        {/* Cinematic Background Image with Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1920&q=80" 
            alt="Corporate Office" 
            className="w-full h-full object-cover object-center opacity-40 grayscale"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#14161A] via-[#14161A]/90 to-[#14161A]/60"></div>
        </div>

        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="text-[#FF5701] font-extrabold tracking-[0.2em] uppercase text-[13px] md:text-[15px] mb-4">
              Verified network
            </div>
            <h2 className="text-[32px] lg:text-[54px] font-extrabold text-white tracking-tight leading-[1.1] max-w-2xl mx-auto">
              Learn from people who proved it.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Rohan Mehta", role: "Founder & CEO", co: "PayStack India", color: "#0DBB96" },
              { name: "Dr. Priya Singh", role: "Professor", co: "IIT Hyderabad", color: "#F37021" },
              { name: "Arjun Kapoor", role: "CTO", co: "Razorpay", color: "#004CE6" },
              { name: "BITS Pilani", role: "Premier Institution", co: "Est. 1964", color: "#F5A623" },
            ].map((n, i) => (
              <motion.div 
                key={n.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4, transition: { duration: 0.2, delay: 0, ease: "easeOut" } }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 1.2, delay: i * 0.2, ease: "easeOut" }}
                className="group relative bg-[#1C1F26]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-[#1C1F26]/80 transition-colors duration-300 cursor-pointer overflow-hidden"
              >
                {/* Brand Theme Glow */}
                <div 
                  className="absolute top-0 right-0 w-32 h-32 opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-300"
                  style={{ backgroundColor: n.color }}
                ></div>

                <div className="flex flex-col h-full relative z-10">
                  <div className="flex items-center gap-4 mb-8">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-[18px] font-bold text-white shadow-lg"
                      style={{ backgroundColor: n.color }}
                    >
                      {n.name[0]}
                    </div>
                    <div>
                      <div className="text-[17px] font-bold text-white leading-snug">{n.name}</div>
                      <div className="text-[13px] font-medium text-[#8A8F98]">{n.role}</div>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-white/90">{n.co}</span>
                    <ArrowRight size={16} className="text-white/40 group-hover:text-white transition-colors" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-16">
            <a href="https://recruiter.capabilio.online" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[15px] font-semibold text-[#8A8F98] hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-6 py-3 rounded-full border border-white/10">
              Hiring? Search verified talent at <span className="text-[#FF5701]">recruiter.capabilio.online</span> <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-[720px] mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <div className="text-[#FF5701] font-extrabold tracking-[0.2em] uppercase text-[13px] md:text-[15px] mb-4">
              Frequently asked
            </div>
            <h2 className="text-[32px] lg:text-[54px] font-extrabold text-[#14161A] tracking-tight leading-[1.1]">
              Questions people actually ask.
            </h2>
          </motion.div>
          <div className="flex flex-col border-t border-[#E4E6E9]">
            {FAQ_ITEMS.map((item, i) => (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <FAQItem q={item.q} a={item.a} isLast={i === FAQ_ITEMS.length - 1} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM DOCK (Badges + Footer) ───────────────────── */}
      <div className="bg-white w-full">
        <section className="pt-8 pb-8 overflow-hidden">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8 }}
            className="max-w-[1200px] mx-auto px-6 text-center"
          >
            <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F8F9FA] border border-[#E4E6E9]">
              <span className="text-[12px] font-bold text-[#14161A] tracking-[0.15em] uppercase">
                Recognised & Registered By
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <TrustBadge imgSrc="/dpiit-logo.png" label="DPIIT Recognised" sub="Startup India" />
              <TrustBadge imgSrc="/msme-logo.png" label="Udyam Registered" sub="MSME, Govt. of India" />
              <TrustBadge imgSrc="/mca-logo.png" label="MCA Incorporated" sub="Ministry of Corporate Affairs" />
            </div>
          </motion.div>
        </section>

        <footer className="relative bg-[#14161A] pt-20 pb-8 mt-10 overflow-hidden">
          {/* Top Glowing Edge */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#FF5701]/40 to-transparent"></div>
          
          {/* Scattered Tiny Glowing Nodes */}
          <div className="absolute top-[20%] left-[10%] w-[4px] h-[4px] bg-[#FF5701] shadow-[0_0_12px_4px_#FF5701] opacity-50 rounded-full pointer-events-none"></div>
          <div className="absolute top-[40%] right-[15%] w-[6px] h-[6px] bg-[#004CE6] shadow-[0_0_15px_5px_#004CE6] opacity-40 rounded-full pointer-events-none"></div>
          <div className="absolute bottom-[30%] left-[35%] w-[3px] h-[3px] bg-[#0DBB96] shadow-[0_0_10px_3px_#0DBB96] opacity-60 rounded-full pointer-events-none"></div>
          <div className="absolute top-[70%] right-[30%] w-[5px] h-[5px] bg-[#FF5701] shadow-[0_0_12px_4px_#FF5701] opacity-40 rounded-full pointer-events-none"></div>
          <div className="absolute top-[15%] left-[60%] w-[3px] h-[3px] bg-white shadow-[0_0_8px_2px_white] opacity-30 rounded-full pointer-events-none"></div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2 }}
            className="relative z-10 max-w-[1200px] mx-auto px-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
              {/* Brand Column */}
              <div>
                <img src="/capabilio-logo-light.png" alt="Capabilio AI" className="h-6 w-auto mb-5" />
                <p className="text-[14.5px] text-[#8A8F98] leading-relaxed max-w-[280px]">
                  Building India’s AI Career Operating System | Transforming Skills into Verified Careers
                </p>
              </div>

              {/* Product Column */}
              <div>
                <h3 className="text-[12px] font-bold text-white tracking-[0.15em] uppercase mb-6">Product</h3>
                <ul className="flex flex-col gap-4 text-[14.5px] font-medium text-[#8A8F98]">
                  <li><a href="#" className="hover:text-[#FF5701] transition-colors">The Arena</a></li>
                  <li><a href="#" className="hover:text-[#FF5701] transition-colors">Skill Studio</a></li>
                  <li><a href="#" className="hover:text-[#FF5701] transition-colors">Professional Vault</a></li>
                  <li>
                    <a href="https://recruiter.capabilio.online" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF5701] transition-colors flex items-center gap-1.5">
                      Recruiter Search <ArrowRight size={14} />
                    </a>
                  </li>
                </ul>
              </div>

              {/* Contact Column */}
              <div>
                <h3 className="text-[12px] font-bold text-white tracking-[0.15em] uppercase mb-6">Contact Founder</h3>
                <ul className="flex flex-col gap-4 text-[14.5px] font-medium text-[#8A8F98]">
                  <li>
                    <a href="https://mail.google.com/mail/?view=cm&fs=1&to=founder@capabilio.in" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF5701] transition-colors">founder@capabilio.in</a>
                  </li>
                  <li>
                    <a href="https://www.linkedin.com/in/venkata-kopuri-725184376/" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF5701] transition-colors">LinkedIn Profile</a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-[#FF5701] transition-colors">Twitter / X</a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 border-t border-[#2A2E37] flex flex-wrap items-center justify-between gap-4">
              <div className="text-[13px] font-medium text-[#5E636E]">
                © {new Date().getFullYear()} Capabilio AI. All rights reserved.
              </div>
              <div className="text-[13px] font-medium text-[#5E636E]">
                Amaravati, Andhra Pradesh
              </div>
            </div>
          </motion.div>
        </footer>
      </div>
    </div>
  )
}

