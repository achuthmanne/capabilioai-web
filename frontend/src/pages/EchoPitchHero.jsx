import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { EchoPitchLivePreview } from "./CareerVideoGenerator"

// ─── EchoPitch — premium hero section for Aura ──────────────────────────────
// Replaces the old "Personal Brand Video" card. Split layout: copy + CTAs on
// the left, a real auto-playing muted live preview (same Canvas render engine
// as the actual export, not a static mock) on the right. Elite-gated per the
// app's real subscription tiers (frontend/src/config/plans.js) — no fake
// "premium" flag invented for this feature.
//
// HONEST SCOPE: this component and its wizard (CareerVideoGenerator.jsx) do
// NOT implement hosted sharing/analytics/recruiter click-through, voice
// cloning, or server-side cinematic rendering — those need infrastructure
// this codebase doesn't have (see CareerVideoGenerator.jsx header notes).
// Locked/"coming soon" affordances are shown honestly rather than omitted
// or faked.

const FEATURES = [
  { icon:"🧠", title:"AI Story Writer",   desc:"Turns your real Arena history and skills into a narrated script — grounded in your actual data, not templated filler." },
  { icon:"🎙️", title:"Voice Narration",   desc:"Studio-tone AI voiceover today. Your own voice and voice cloning are on the roadmap." },
  { icon:"🏆", title:"Arena Evidence",    desc:"Pulls real completed Arena tasks and ELO history — every claim traces back to something you actually did." },
  { icon:"📈", title:"Career Timeline",   desc:"Weaves your logged experience and skill growth into a coherent on-screen story." },
  { icon:"🎬", title:"5 Cinematic Themes",desc:"Apple, Netflix, Minimal, LinkedIn and Startup chrome — pick the tone that fits where you're sharing it." },
  { icon:"⬇️", title:"Instant Download",  desc:"Rendered locally in your browser and downloadable as WebM the moment it's done." },
]

export default function EchoPitchHero({ userData, skillGraph, completedTasks, experiences, isElite, onGenerate, onNavigatePricing }) {
  const [hoveredFeature, setHoveredFeature] = useState(null)
  const [showLockTip, setShowLockTip] = useState(false)

  const stats = useMemo(() => ({
    tasks: (completedTasks || []).length,
    skills: (skillGraph || []).length,
    roles: (experiences || []).length,
  }), [completedTasks, skillGraph, experiences])

  const handleCta = () => {
    if (!isElite) {
      setShowLockTip(true)
      setTimeout(() => setShowLockTip(false), 2600)
      return
    }
    onGenerate?.()
  }

  return (
    <div style={{ position:"relative", borderRadius:24, overflow:"hidden", marginBottom:20,
      background:"radial-gradient(circle at 15% 10%,#1b2440 0%,#0a0f1e 45%,#050810 100%)",
      border:"1px solid rgba(255,255,255,0.08)",
      boxShadow:"0 30px 80px rgba(0,0,0,0.45)" }}>

      {/* Floating ambient glows */}
      <div aria-hidden style={{ position:"absolute", top:-120, right:-100, width:360, height:360, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(0,210,255,0.18),transparent 70%)", filter:"blur(10px)", pointerEvents:"none" }} />
      <div aria-hidden style={{ position:"absolute", bottom:-140, left:-80, width:320, height:320, borderRadius:"50%",
        background:"radial-gradient(circle,rgba(245,158,11,0.14),transparent 70%)", filter:"blur(10px)", pointerEvents:"none" }} />
      {[...Array(10)].map((_, i) => (
        <motion.div key={i} aria-hidden
          initial={{ opacity: 0.15 + (i % 3) * 0.08, y: 0 }}
          animate={{ y: [0, -14, 0], opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 5 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          style={{ position:"absolute", left:`${8 + i * 9.5}%`, top:`${12 + (i % 5) * 15}%`,
            width: 3 + (i % 3), height: 3 + (i % 3), borderRadius:"50%",
            background: i % 2 === 0 ? "#00D2FF" : "#F59E0B", pointerEvents:"none" }} />
      ))}

      <div style={{ position:"relative", display:"flex", flexWrap:"wrap", gap:32, padding:"36px 32px" }}>

        {/* Left — copy */}
        <motion.div initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.5 }}
          style={{ flex:"1 1 320px", minWidth:280 }}>

          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:99,
              background:"linear-gradient(135deg,#F5C453,#D89B2A)", color:"#1a1408", fontSize:10.5, fontWeight:900,
              letterSpacing:1, boxShadow:"0 4px 14px rgba(245,196,83,0.35)" }}>
              ✦ ELITE EXCLUSIVE
            </span>
          </div>

          <h2 style={{ fontSize:30, fontWeight:900, color:"#f8fafc", margin:"0 0 6px", letterSpacing:"-0.02em",
            fontFamily:"'Syne',sans-serif" }}>EchoPitch</h2>
          <div style={{ fontSize:13.5, fontWeight:600, color:"#00D2FF", marginBottom:14 }}>
            Your Career. Your Voice. Your Story.
          </div>
          <p style={{ fontSize:13.5, color:"rgba(240,246,255,0.6)", lineHeight:1.7, maxWidth:440, margin:"0 0 18px" }}>
            A cinematic, narrated pitch of your real Capabilio profile — Arena evidence, ELO growth and skills,
            rendered into a video you can download and share. Built from your actual data, not a template.
          </p>

          {/* Stat chips — real numbers, zero placeholders */}
          <div style={{ display:"flex", gap:8, marginBottom:18, flexWrap:"wrap" }}>
            {[
              { label:"Arena tasks", value: stats.tasks },
              { label:"Skills tracked", value: stats.skills },
              { label:"Roles logged", value: stats.roles },
            ].map(s => (
              <div key={s.label} style={{ padding:"7px 12px", borderRadius:10, background:"rgba(255,255,255,0.05)",
                border:"1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize:15, fontWeight:800, color:"#f8fafc" }}>{s.value}</div>
                <div style={{ fontSize:9.5, color:"rgba(240,246,255,0.45)", fontWeight:600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ position:"relative", display:"flex", gap:10, flexWrap:"wrap" }}>
            <motion.button whileHover={{ scale: isElite ? 1.03 : 1 }} whileTap={{ scale: isElite ? 0.98 : 1 }}
              onClick={handleCta}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"13px 22px", borderRadius:12, border:"none",
                background: isElite ? "linear-gradient(135deg,#00D2FF,#78FF9E)" : "rgba(255,255,255,0.08)",
                color: isElite ? "#04141a" : "rgba(240,246,255,0.55)",
                fontSize:13.5, fontWeight:800, cursor:"pointer",
                boxShadow: isElite ? "0 10px 30px rgba(0,210,255,0.25)" : "none" }}>
              {isElite ? "🎬 Generate My EchoPitch" : "🔒 Generate My EchoPitch"}
            </motion.button>
            {!isElite && (
              <button onClick={() => onNavigatePricing?.()}
                style={{ padding:"13px 20px", borderRadius:12, border:"1px solid rgba(245,196,83,0.4)",
                  background:"rgba(245,196,83,0.08)", color:"#F5C453", fontSize:13, fontWeight:800, cursor:"pointer" }}>
                Upgrade to Elite
              </button>
            )}
            {showLockTip && (
              <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                style={{ position:"absolute", top:-40, left:0, background:"#141b2e", border:"1px solid rgba(245,196,83,0.35)",
                  borderRadius:10, padding:"7px 12px", fontSize:11.5, color:"#F5C453", whiteSpace:"nowrap",
                  boxShadow:"0 8px 20px rgba(0,0,0,0.4)" }}>
                🔒 Upgrade to Elite to unlock EchoPitch
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Right — glassmorphism live preview */}
        <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.5, delay:0.1 }}
          style={{ flex:"1 1 380px", minWidth:300, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ position:"relative", width:"100%", maxWidth:480, borderRadius:18, overflow:"hidden",
            aspectRatio:"16/9", background:"rgba(255,255,255,0.04)", backdropFilter:"blur(14px)",
            border:"1px solid rgba(255,255,255,0.12)", boxShadow:"0 24px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ position:"absolute", inset:0, filter: isElite ? "none" : "blur(6px) brightness(0.55)" }}>
              <EchoPitchLivePreview userData={userData} skillGraph={skillGraph}
                completedTasks={completedTasks} experiences={experiences} width={480} height={270} />
            </div>
            {!isElite && (
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", gap:6, background:"rgba(4,10,20,0.35)" }}>
                <div style={{ fontSize:26 }}>🔒</div>
                <div style={{ fontSize:12, fontWeight:800, color:"#f8fafc" }}>Elite Feature</div>
              </div>
            )}
            {isElite && (
              <div style={{ position:"absolute", bottom:10, left:10, display:"flex", alignItems:"center", gap:6,
                background:"rgba(0,0,0,0.65)", borderRadius:8, padding:"4px 10px" }}>
                <span style={{ width:6, height:6, borderRadius:99, background:"#78FF9E" }} />
                <span style={{ fontSize:10, fontWeight:700, color:"#78FF9E" }}>LIVE · MUTED PREVIEW</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Feature grid */}
      <div style={{ position:"relative", padding:"0 32px 32px", display:"grid",
        gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12 }}>
        {FEATURES.map((f, i) => (
          <motion.div key={f.title}
            initial={{ opacity:0, y:12 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true, margin:"-40px" }}
            transition={{ duration:0.35, delay:i * 0.05 }}
            onMouseEnter={() => setHoveredFeature(i)} onMouseLeave={() => setHoveredFeature(null)}
            style={{ padding:"14px 16px", borderRadius:14, background:"rgba(255,255,255,0.04)",
              border:`1px solid ${hoveredFeature === i ? "rgba(0,210,255,0.35)" : "rgba(255,255,255,0.07)"}`,
              transition:"border-color .2s", cursor:"default" }}>
            <div style={{ fontSize:20, marginBottom:6 }}>{f.icon}</div>
            <div style={{ fontSize:12.5, fontWeight:800, color:"#f8fafc", marginBottom:3 }}>{f.title}</div>
            <div style={{ fontSize:11, color:"rgba(240,246,255,0.5)", lineHeight:1.55 }}>{f.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
