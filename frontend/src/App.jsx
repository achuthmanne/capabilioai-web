import { useState, useEffect, useRef } from "react"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/react"
import { supabase } from "./lib/supabase"
import { userDoc } from "./lib/db"
import { Analytics as PH, identifyUser, resetAnalytics } from "./lib/analytics"

import PathNav             from "./components/PathNav"
import LandingPage         from "./pages/LandingPage"
import AccountType         from "./pages/AccountType"
import Onboarding          from "./pages/Onboarding"
import Aura                from "./pages/Aura"
import Arena               from "./pages/Arena"
import Pulse               from "./pages/Pulse"
import SkillStudio         from "./pages/SkillStudio"
import Launchpad           from "./pages/Launchpad"
import Portfolio           from "./pages/Portfolio"
import AuthorityProfile    from "./pages/AuthorityProfile"
import Nexus               from "./pages/Nexus"
import Pricing             from "./pages/Pricing"
// ── Path-specific home dashboards ────────────────────────────────────────────
import StudentHome         from "./pages/StudentHome"
import ProfessionalHome    from "./pages/ProfessionalHome"
import ExecutiveHome       from "./pages/ExecutiveHome"
import OrgHome             from "./pages/OrgHome"
// ── Professional pages ────────────────────────────────────────────────────────
import Forge               from "./pages/Forge"
import Orbit               from "./pages/Orbit"
// ── Executive pages ───────────────────────────────────────────────────────────
import SignalRooms         from "./pages/SignalRooms"
import ExecutiveNetwork    from "./pages/ExecutiveNetwork"
// ── Organisation pages ────────────────────────────────────────────────────────
import OrgIntelligence     from "./pages/OrgIntelligence"
import OrgTasks            from "./pages/OrgTasks"
import OrgPeople           from "./pages/OrgPeople"
import OrgSettings         from "./pages/OrgSettings"
// ── Recruiter pages ───────────────────────────────────────────────────────────
import RecruiterDashboard  from "./pages/RecruiterDashboard"
import HiringPipeline      from "./pages/HiringPipeline"
import JobPostings         from "./pages/JobPostings"
import { PageLoader } from "./components/CapUI"
import CopilotWidget   from "./components/CopilotWidget"

const API = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

// ── Auth Modal ────────────────────────────────────────────────────────────────
// Path meta for auth modal context
const PATH_META = {
  student:      { icon: "🎓", label: "Student",      color: "#FF5701", bg: "#FFF1E8", desc: "Prove your skills through real challenges. ELO starts at 400." },
  professional: { icon: "💼", label: "Professional", color: "#7C3AED", bg: "#F4F0FF", desc: "Build your verified career intelligence. UAN-backed, AI-powered." },
  executive:    { icon: "✦",  label: "Executive",    color: "#C9A84C", bg: "#FFFDF5", desc: "Authority profile. Sell your time. Invite-only." },
  institution:  { icon: "🏛️", label: "Organisation", color: "#D97706", bg: "#FFF7E8", desc: "Track cohort ELO. Hire verified talent. Automate placements." },
}

// ── Country dial codes ────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { dial:"+91",  flag:"🇮🇳", name:"India" },
  { dial:"+1",   flag:"🇺🇸", name:"United States" },
  { dial:"+44",  flag:"🇬🇧", name:"United Kingdom" },
  { dial:"+61",  flag:"🇦🇺", name:"Australia" },
  { dial:"+1",   flag:"🇨🇦", name:"Canada" },
  { dial:"+971", flag:"🇦🇪", name:"United Arab Emirates" },
  { dial:"+65",  flag:"🇸🇬", name:"Singapore" },
  { dial:"+60",  flag:"🇲🇾", name:"Malaysia" },
  { dial:"+49",  flag:"🇩🇪", name:"Germany" },
  { dial:"+33",  flag:"🇫🇷", name:"France" },
  { dial:"+39",  flag:"🇮🇹", name:"Italy" },
  { dial:"+34",  flag:"🇪🇸", name:"Spain" },
  { dial:"+31",  flag:"🇳🇱", name:"Netherlands" },
  { dial:"+41",  flag:"🇨🇭", name:"Switzerland" },
  { dial:"+46",  flag:"🇸🇪", name:"Sweden" },
  { dial:"+47",  flag:"🇳🇴", name:"Norway" },
  { dial:"+45",  flag:"🇩🇰", name:"Denmark" },
  { dial:"+358", flag:"🇫🇮", name:"Finland" },
  { dial:"+48",  flag:"🇵🇱", name:"Poland" },
  { dial:"+7",   flag:"🇷🇺", name:"Russia" },
  { dial:"+380", flag:"🇺🇦", name:"Ukraine" },
  { dial:"+90",  flag:"🇹🇷", name:"Turkey" },
  { dial:"+30",  flag:"🇬🇷", name:"Greece" },
  { dial:"+351", flag:"🇵🇹", name:"Portugal" },
  { dial:"+420", flag:"🇨🇿", name:"Czech Republic" },
  { dial:"+36",  flag:"🇭🇺", name:"Hungary" },
  { dial:"+40",  flag:"🇷🇴", name:"Romania" },
  { dial:"+32",  flag:"🇧🇪", name:"Belgium" },
  { dial:"+43",  flag:"🇦🇹", name:"Austria" },
  { dial:"+86",  flag:"🇨🇳", name:"China" },
  { dial:"+81",  flag:"🇯🇵", name:"Japan" },
  { dial:"+82",  flag:"🇰🇷", name:"South Korea" },
  { dial:"+84",  flag:"🇻🇳", name:"Vietnam" },
  { dial:"+66",  flag:"🇹🇭", name:"Thailand" },
  { dial:"+62",  flag:"🇮🇩", name:"Indonesia" },
  { dial:"+63",  flag:"🇵🇭", name:"Philippines" },
  { dial:"+880", flag:"🇧🇩", name:"Bangladesh" },
  { dial:"+94",  flag:"🇱🇰", name:"Sri Lanka" },
  { dial:"+977", flag:"🇳🇵", name:"Nepal" },
  { dial:"+92",  flag:"🇵🇰", name:"Pakistan" },
  { dial:"+93",  flag:"🇦🇫", name:"Afghanistan" },
  { dial:"+98",  flag:"🇮🇷", name:"Iran" },
  { dial:"+964", flag:"🇮🇶", name:"Iraq" },
  { dial:"+966", flag:"🇸🇦", name:"Saudi Arabia" },
  { dial:"+962", flag:"🇯🇴", name:"Jordan" },
  { dial:"+961", flag:"🇱🇧", name:"Lebanon" },
  { dial:"+972", flag:"🇮🇱", name:"Israel" },
  { dial:"+968", flag:"🇴🇲", name:"Oman" },
  { dial:"+974", flag:"🇶🇦", name:"Qatar" },
  { dial:"+973", flag:"🇧🇭", name:"Bahrain" },
  { dial:"+965", flag:"🇰🇼", name:"Kuwait" },
  { dial:"+20",  flag:"🇪🇬", name:"Egypt" },
  { dial:"+27",  flag:"🇿🇦", name:"South Africa" },
  { dial:"+234", flag:"🇳🇬", name:"Nigeria" },
  { dial:"+254", flag:"🇰🇪", name:"Kenya" },
  { dial:"+233", flag:"🇬🇭", name:"Ghana" },
  { dial:"+251", flag:"🇪🇹", name:"Ethiopia" },
  { dial:"+255", flag:"🇹🇿", name:"Tanzania" },
  { dial:"+256", flag:"🇺🇬", name:"Uganda" },
  { dial:"+212", flag:"🇲🇦", name:"Morocco" },
  { dial:"+216", flag:"🇹🇳", name:"Tunisia" },
  { dial:"+213", flag:"🇩🇿", name:"Algeria" },
  { dial:"+55",  flag:"🇧🇷", name:"Brazil" },
  { dial:"+52",  flag:"🇲🇽", name:"Mexico" },
  { dial:"+54",  flag:"🇦🇷", name:"Argentina" },
  { dial:"+57",  flag:"🇨🇴", name:"Colombia" },
  { dial:"+56",  flag:"🇨🇱", name:"Chile" },
  { dial:"+51",  flag:"🇵🇪", name:"Peru" },
  { dial:"+58",  flag:"🇻🇪", name:"Venezuela" },
  { dial:"+64",  flag:"🇳🇿", name:"New Zealand" },
  { dial:"+63",  flag:"🇵🇭", name:"Philippines" },
]

// ── Password strength checker ─────────────────────────────────────────────────
function pwStrength(pw) {
  const checks = {
    length:    pw.length >= 8,
    uppercase: /[A-Z]/.test(pw),
    lowercase: /[a-z]/.test(pw),
    number:    /[0-9]/.test(pw),
    special:   /[^A-Za-z0-9]/.test(pw),
  }
  const passed = Object.values(checks).filter(Boolean).length
  const level  = passed <= 2 ? "weak" : passed <= 3 ? "fair" : passed === 4 ? "good" : "strong"
  const color  = { weak:"#DC2626", fair:"#D97706", good:"#2563EB", strong:"#16A34A" }[level]
  const pct    = (passed / 5) * 100
  return { checks, passed, level, color, pct }
}

function AuthModal({ show, onClose, mode, setMode }) {
  // ── Email auth only (Phone OTP removed — Twilio trial limitation) ─
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPw,   setShowPw]   = useState(false)
  const [showCfm,  setShowCfm]  = useState(false)
  const [confirm,  setConfirm]  = useState("")
  const [first,    setFirst]    = useState("")
  const [last,     setLast]     = useState("")
  const [refCode,  setRefCode]  = useState("")
  const [refValid, setRefValid] = useState(null)
  const [refData,  setRefData]  = useState(null)
  // shared
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const selectedPath = (() => { try { return localStorage.getItem("capabilio_selected_path") } catch { return null } })()
  const pw = pwStrength(password)

  useEffect(() => {
    if (show) {
      setEmail(""); setPassword(""); setConfirm(""); setShowPw(false); setShowCfm(false)
      setFirst(""); setLast(""); setRefCode(""); setRefValid(null); setRefData(null)
      setError(""); setLoading(false)
    }
  }, [show])

  if (!show) return null

  // ── Password validation ──────────────────────────────────────────
  const validatePassword = (pw) => {
    if (pw.length < 8)          return "Password must be at least 8 characters."
    if (!/[A-Z]/.test(pw))      return "Add at least one uppercase letter (A–Z)."
    if (!/[a-z]/.test(pw))      return "Add at least one lowercase letter (a–z)."
    if (!/[0-9]/.test(pw))      return "Add at least one number (0–9)."
    if (!/[^A-Za-z0-9]/.test(pw)) return "Add at least one special character (!@#$%...)."
    return null
  }

  // ── Email submit ─────────────────────────────────────────────────
  const handleEmailSubmit = async () => {
    setLoading(true); setError("")
    try {
      if (mode === "signup") {
        if (!first.trim()) { setError("First name is required"); setLoading(false); return }
        if (!last.trim())  { setError("Last name is required");  setLoading(false); return }
        const pwErr = validatePassword(password)
        if (pwErr) { setError(pwErr); setLoading(false); return }
        if (password !== confirm) { setError("Passwords do not match."); setLoading(false); return }

        const fullName = `${first.trim()} ${last.trim()}`
        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, first_name: first.trim(), last_name: last.trim() } },
        })
        if (signUpError) throw signUpError
        if (refCode.trim() && data.user) {
          try {
            await fetch(`${API}/api/referral/apply`, {
              method:"POST", headers:{"Content-Type":"application/json"},
              body: JSON.stringify({ refereeUid:data.user.id, refereeName:fullName, referrerCode:refCode.trim().toUpperCase() }),
            })
          } catch {}
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
      onClose()
    } catch (e) {
      const msg = e.message || ""
      setError(
        msg.includes("Invalid login")            ? "Incorrect email or password."
        : msg.includes("Email not confirmed")    ? "Please verify your email address first."
        : msg.includes("User already registered")? "Email already registered — sign in instead."
        : msg.includes("Password should")        ? "Password must meet all strength requirements."
        : msg.includes("Unable to validate")     ? "Please enter a valid email address."
        : msg || "Something went wrong. Try again."
      )
      setLoading(false)
    }
  }

  // ── Google OAuth ─────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true); setError("")
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin, queryParams: { access_type: "offline", prompt: "consent" } },
      })
      if (oauthErr) throw oauthErr
      onClose()
    } catch (e) {
      setError(e.message || "Google sign-in failed. Try again.")
      setGoogleLoading(false)
    }
  }

  // ── Shared input style ────────────────────────────────────────────
  const inputStyle = {
    width: "100%", padding: "12px 14px", background: "#F9FAFB",
    border: "1.5px solid #E5E7EB", borderRadius: 8, color: "#111827",
    fontSize: 14, fontFamily: "Inter,sans-serif", outline: "none",
    boxSizing: "border-box", transition: "border-color 0.15s",
  }
  const inp = (val, setter, type="text", placeholder="", extra={}) => (
    <input value={val} onChange={e=>{setter(e.target.value);setError("")}}
      onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}
      type={type} placeholder={placeholder}
      style={{...inputStyle,...extra}}
      onFocus={e=>e.target.style.borderColor="#FF5701"}
      onBlur={e=>e.target.style.borderColor="#E5E7EB"}/>
  )

  const pm     = PATH_META[selectedPath] || null
  const accent = pm?.color || "#FF5701"
  const canSubmitEmail = mode === "signup"
    ? (first && last && email && password && confirm)
    : (email && password)

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, fontFamily:"Inter,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
        @keyframes modalIn  { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes authSpin { to{transform:rotate(360deg)} }
        .auth-inp:focus{border-color:#FF5701!important}
      `}</style>

      <div style={{ position:"absolute", inset:0, background:"rgba(17,24,39,0.5)", backdropFilter:"blur(8px)" }} onClick={onClose}/>

      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ width:"100%", maxWidth:880, background:"#fff", borderRadius:20, overflow:"hidden", border:"1px solid #E5E7EB", boxShadow:"0 24px 60px rgba(0,0,0,0.15)", animation:"modalIn 0.3s cubic-bezier(0.16,1,0.3,1) both", display:"flex", maxHeight:"96vh" }}>

          {/* ── Left panel ── */}
          <div style={{ flex:"0 0 36%", background: pm ? pm.bg : "#F6F6F1", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"36px 28px", borderRight:"1px solid #E5E7EB" }}>
            <div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:800, color:"#FFFFFF", marginBottom:16 }}>Capabilio AI</div>
              {pm && (
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#fff", border:`1px solid ${accent}30`, borderRadius:999, padding:"6px 14px", marginBottom:16 }}>
                  <span style={{ fontSize:14 }}>{pm.icon}</span>
                  <span style={{ fontSize:10, fontWeight:800, color:accent, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:"'JetBrains Mono',monospace" }}>{pm.label} Path</span>
                </div>
              )}
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:800, color:"#FFFFFF", lineHeight:1.25, marginBottom:10 }}>
                {pm ? pm.desc.split(".")[0]+"." : "Prove your skills."}<br/>
                <span style={{ fontStyle:"italic", color:accent }}>{pm ? pm.desc.split(".").slice(1).join(".").trim() : "Not just claim them."}</span>
              </h2>
              <p style={{ fontSize:12, color:"#6B7280", lineHeight:1.7, marginBottom:20 }}>
                {pm ? `Your account will be set for the ${pm.label} path. Change during onboarding.` : "ELO earned through real challenges — not a Word doc."}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {(pm ? [
                  { val:pm.label,    label:"Selected path",           c:accent },
                  { val:"ELO 1,847", label:"Top performer benchmark", c:"#FFFFFF" },
                  { val:"Verified",  label:"Identity-backed profiles", c:"#16A34A" },
                ] : [
                  { val:"ELO 1,847", label:"Live skill rating",       c:"#FF5701" },
                  { val:"94 Tasks",  label:"Real company challenges",  c:"#FFFFFF" },
                  { val:"Top 3%",    label:"Verified by performance",  c:"#16A34A" },
                ]).map((s,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 12px", background:"#fff", border:"1px solid #E5E7EB", borderRadius:10 }}>
                    <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:12, fontWeight:700, color:s.c, minWidth:68 }}>{s.val}</div>
                    <div style={{ fontSize:11, color:"#9CA3AF" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:"9px 12px", background:"#fff", border:"1px solid #E5E7EB", borderRadius:10, fontSize:11, color:"#6B7280" }}>
              <span style={{ color:accent, fontWeight:700 }}>2,400+</span> joined this month · Free forever for candidates
            </div>
          </div>

          {/* ── Right form ── */}
          <div style={{ flex:1, padding:"28px 32px", overflowY:"auto", display:"flex", flexDirection:"column", justifyContent:"center", position:"relative" }}>
            <button onClick={onClose} style={{ position:"absolute", top:14, right:14, width:28, height:28, borderRadius:7, background:"#F9FAFB", border:"1px solid #E5E7EB", color:"#6B7280", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>

            {/* Create / Sign in toggle */}
            <div style={{ display:"flex", background:"#F9FAFB", borderRadius:10, padding:3, marginBottom:20, border:"1px solid #E5E7EB" }}>
              {[["signup","Create account"],["login","Sign in"]].map(([m,lbl])=>(
                <button key={m} onClick={()=>{setMode(m);setError("")}}
                  style={{ flex:1, padding:"9px", borderRadius:8, border:"none", cursor:"pointer", background:mode===m?"#FF5701":"transparent", color:mode===m?"#fff":"#6B7280", fontSize:13, fontWeight:mode===m?700:400, fontFamily:"inherit", transition:"all 0.15s" }}>
                  {lbl}
                </button>
              ))}
            </div>

            <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:800, color:"#FFFFFF", marginBottom:3 }}>
              {mode==="signup" ? "Create your account" : "Welcome back"}
            </h3>
            <p style={{ fontSize:12, color:"#9CA3AF", marginBottom:16 }}>
              {mode==="signup" ? "Free forever. No credit card required." : "Sign in to your Capabilio profile."}
            </p>

            {/* Google */}
            <button onClick={handleGoogleSignIn} disabled={googleLoading}
              style={{ width:"100%", padding:"11px 16px", marginBottom:12, background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, fontSize:14, fontWeight:600, color:"#374151", fontFamily:"Inter,sans-serif", transition:"all 0.15s", boxShadow:"0 2px 6px rgba(17,24,39,0.06)" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#D1D5DB";e.currentTarget.style.boxShadow="0 4px 12px rgba(17,24,39,0.10)"}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#E5E7EB";e.currentTarget.style.boxShadow="0 2px 6px rgba(17,24,39,0.06)"}}
            >
              {googleLoading
                ? <span style={{ width:18, height:18, border:"2px solid #E5E7EB", borderTopColor:"#6B7280", borderRadius:"50%", display:"inline-block", animation:"authSpin 0.7s linear infinite" }}/>
                : <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              }
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            {/* ── Divider ── */}
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ flex:1, height:1, background:"#E5E7EB" }}/>
              <span style={{ fontSize:11, color:"#9CA3AF", fontWeight:500 }}>or continue with email</span>
              <div style={{ flex:1, height:1, background:"#E5E7EB" }}/>
            </div>

            {/* ── EMAIL FLOW ── */}
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {mode === "signup" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                    {inp(first, setFirst, "text", "First name")}
                    {inp(last,  setLast,  "text", "Last name")}
                  </div>
                )}
                {inp(email, setEmail, "email", "Email address")}

                {/* Password with show/hide and strength meter */}
                <div>
                  <div style={{ position:"relative" }}>
                    <input value={password} onChange={e=>{setPassword(e.target.value);setError("")}}
                      onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}
                      type={showPw?"text":"password"}
                      placeholder={mode==="signup"?"Create password":"Password"}
                      style={{...inputStyle, paddingRight:44}}
                      onFocus={e=>e.target.style.borderColor="#FF5701"}
                      onBlur={e=>e.target.style.borderColor="#E5E7EB"}/>
                    <button onClick={()=>setShowPw(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", fontSize:14, padding:2 }}>
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                  {/* Strength bar — only show when typing for signup */}
                  {mode === "signup" && password.length > 0 && (
                    <div style={{ marginTop:6 }}>
                      <div style={{ height:3, background:"#E5E7EB", borderRadius:99, overflow:"hidden", marginBottom:5 }}>
                        <div style={{ height:"100%", width:`${pw.pct}%`, background:pw.color, borderRadius:99, transition:"all 0.3s" }}/>
                      </div>
                      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                        {[
                          { key:"length",    label:"8+ chars" },
                          { key:"uppercase", label:"A–Z" },
                          { key:"lowercase", label:"a–z" },
                          { key:"number",    label:"0–9" },
                          { key:"special",   label:"!@#..." },
                        ].map(c=>(
                          <span key={c.key} style={{ fontSize:10, fontWeight:600, color:pw.checks[c.key]?"#16A34A":"#9CA3AF", display:"flex", alignItems:"center", gap:3 }}>
                            <span style={{ fontSize:9 }}>{pw.checks[c.key]?"✓":"○"}</span>{c.label}
                          </span>
                        ))}
                        <span style={{ marginLeft:"auto", fontSize:10, fontWeight:700, color:pw.color, textTransform:"capitalize" }}>{pw.level}</span>
                      </div>
                    </div>
                  )}
                </div>

                {mode === "signup" && (
                  <>
                    <div style={{ position:"relative" }}>
                      <input value={confirm} onChange={e=>{setConfirm(e.target.value);setError("")}}
                        onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}
                        type={showCfm?"text":"password"} placeholder="Confirm password"
                        style={{ ...inputStyle, paddingRight:44, borderColor: confirm&&password ? (confirm===password?"rgba(22,163,74,0.5)":"#FECACA") : "#E5E7EB" }}
                        onFocus={e=>e.target.style.borderColor="#FF5701"}
                        onBlur={e=>e.target.style.borderColor=confirm&&password?(confirm===password?"rgba(22,163,74,0.5)":"#FECACA"):"#E5E7EB"}/>
                      <button onClick={()=>setShowCfm(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", fontSize:14, padding:2 }}>
                        {showCfm ? "🙈" : "👁"}
                      </button>
                    </div>
                    {confirm && password && confirm !== password && (
                      <div style={{ fontSize:11, color:"#DC2626", marginTop:-4 }}>✗ Passwords do not match</div>
                    )}
                    {/* Voucher code */}
                    <div>
                      <div style={{ fontSize:11, fontWeight:500, color:"#6B7280", marginBottom:5 }}>Skill voucher code <span style={{ fontWeight:400 }}>(optional)</span></div>
                      <input value={refCode}
                        onChange={async e=>{
                          const val=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8)
                          setRefCode(val); setRefData(null); setRefValid(null)
                          if(val.length===8){try{const r=await fetch(`${API}/api/referral/validate/${val}`);const d=await r.json();setRefValid(d.valid);setRefData(d)}catch{setRefValid(false)}}
                        }}
                        placeholder="Enter 8-char voucher code" maxLength={8}
                        style={{ width:"100%", padding:"11px 14px", background:"#F9FAFB", border:`1.5px solid ${refCode.length===8?refValid?"#BBF7D0":"#FECACA":"#E5E7EB"}`, borderRadius:8, color:"#FFFFFF", fontSize:13, fontFamily:"'JetBrains Mono',monospace", letterSpacing:3, outline:"none", boxSizing:"border-box" }}/>
                      {refCode.length===8&&refValid===true&&<div style={{ marginTop:5, padding:"6px 10px", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:7, fontSize:11, color:"#15803D" }}>✓ {refData?.message} · +50 ELO + 14-day Pro</div>}
                      {refCode.length===8&&refValid===false&&<div style={{ marginTop:4, fontSize:11, color:"#DC2626" }}>✗ Invalid voucher code</div>}
                    </div>
                  </>
                )}

                {error && <div style={{ padding:"9px 12px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:9, fontSize:12, color:"#DC2626" }}>⚠️ {error}</div>}

                <button onClick={handleEmailSubmit} disabled={loading || !canSubmitEmail}
                  style={{ width:"100%", padding:"13px", background:canSubmitEmail?"#FF5701":"#F3F4F6", border:"none", borderRadius:10, color:canSubmitEmail?"#fff":"#9CA3AF", fontSize:15, fontWeight:700, fontFamily:"'Playfair Display',serif", cursor:canSubmitEmail?"pointer":"not-allowed", transition:"background 0.15s" }}
                  onMouseEnter={e=>{if(canSubmitEmail)e.currentTarget.style.background="#E04E00"}}
                  onMouseLeave={e=>{if(canSubmitEmail)e.currentTarget.style.background="#FF5701"}}
                >
                  {loading
                    ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"authSpin 0.7s linear infinite" }}/>Please wait…</span>
                    : mode==="signup" ? "Create account →" : "Sign in →"}
                </button>
            </div>

            {/* Switch mode link */}
            <div style={{ textAlign:"center", marginTop:14, fontSize:13, color:"#9CA3AF" }}>
              {mode==="signup" ? "Already have an account? " : "New to Capabilio? "}
              <button onClick={()=>{setMode(m=>m==="signup"?"login":"signup");setError("")}}
                style={{ background:"none", border:"none", color:"#FF5701", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {mode==="signup" ? "Sign in" : "Create free account"}
              </button>
            </div>

            {mode==="signup"&&(
              <div style={{ display:"flex", gap:5, justifyContent:"center", flexWrap:"wrap", marginTop:12 }}>
                {["✓ Free forever","✓ No credit card","✓ No resume","✓ Built in India 🇮🇳"].map((b,i)=>(
                  <span key={i} style={{ fontSize:10, color:"#9CA3AF", background:"#F9FAFB", border:"1px solid #E5E7EB", borderRadius:100, padding:"2px 8px" }}>{b}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════
function App() {
  const [user,           setUser]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [currentPage,    setCurrentPage]    = useState("studentHome")
  const [activeTab,      setActiveTab]      = useState("dashboard")
  const [activeNavItem,  setActiveNavItem]  = useState("home")
  const [userData,       setUserData]       = useState(null)
  const [appStage,       setAppStage]       = useState("landing")
  const [showAuth,       setShowAuth]       = useState(false)
  const [authMode,       setAuthMode]       = useState("login")
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)

  // Portfolio standalone route
  useEffect(() => {
    if (window.location.pathname.startsWith("/portfolio/")) setCurrentPage("portfolio")
  }, [])

  // ── Supabase auth listener + profile watcher ──────────────────
  useEffect(() => {
    let profileUnsub = null

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user || null

      if (u) {
        setUser(u)
        if (event === "SIGNED_IN")       PH.signedIn(u.app_metadata?.provider || "email")
        if (event === "USER_UPDATED")    PH.signedUp(u.app_metadata?.provider || "email")

        // Subscribe to profile changes in real-time
        if (profileUnsub) profileUnsub()
        profileUnsub = userDoc.subscribe(u.id, async (data) => {
          if (data) {
            // Auto-generate username if missing
            if (!data.username) {
              const autoUsername = (u.user_metadata?.full_name || u.email || u.id)
                .toLowerCase().trim()
                .replace(/[^a-z0-9]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
              await userDoc.update(u.id, { username: autoUsername })
              data.username = autoUsername
            }
            // A user is considered onboarded ONLY if the explicit completion flag is set.
            // We intentionally do NOT check data.path here: Supabase DB triggers can
            // auto-create a profile with a default path, which would otherwise bypass
            // the path-selection + onboarding flow for brand-new users.
            const isDone =
              data.onboarding_complete === true ||
              data.onboardingComplete === true
            setOnboardingDone(isDone)
            setUserData(data)
            identifyUser(u, data)
          } else {
            setOnboardingDone(false)
          }
          setLoading(false)
        })

        // If no profile exists yet, just set loading false
        const existing = await userDoc.get(u.id)
        if (!existing) {
          setOnboardingDone(false)
          setLoading(false)
        }
      } else {
        if (profileUnsub) { profileUnsub(); profileUnsub = null }
        setUser(null)
        setOnboardingDone(false)
        setUserData(null)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      if (profileUnsub) profileUnsub()
    }
  }, [])

  const handleSignOut = async () => {
    PH.signedOut()
    resetAnalytics()
    await supabase.auth.signOut()
    setUser(null); setOnboardingDone(false); setUserData(null)
    setCurrentPage("studentHome"); setAppStage("landing")
  }

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileMenuOpen) return
    const handler = (e) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [profileMenuOpen])

  // ── Track page views (SPA — fires on every state-based navigation) ──────────
  useEffect(() => {
    if (user && currentPage) PH.pageViewed(currentPage)
  }, [currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Path helpers (must be above all early returns so hooks stay stable) ──
  const HOME_PAGE = {
    student:      "studentHome",
    professional: "orbit",       // professionals land on new Orbit intelligence cockpit
    authority:    "executiveHome",
    institution:  "orgHome",
  }

  const navPath = (() => {
    const p = userData?.path || "student"
    if (p === "authority")    return "authority"
    if (p === "institution")  return "institution"
    if (p === "professional") return "professional"
    return "student"
  })()

  // Navigate to the correct home whenever the user's path is first known
  useEffect(() => {
    if (userData?.path) {
      const home = HOME_PAGE[navPath] || "studentHome"
      setCurrentPage(home)
      // Match nav item id to home page
      const navId = navPath === "professional" ? "orbit" : "home"
      setActiveNavItem(navId)
    }
  }, [userData?.path]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Portfolio standalone route ────────────────────────────────
  if (window.location.pathname.startsWith("/portfolio/")) {
    const username = window.location.pathname.replace("/portfolio/", "").split("/")[0]
    return <Portfolio username={username} />
  }

  if (loading) return <PageLoader />

  // ── Not logged in ─────────────────────────────────────────────
  if (!user) {
    return (
      <>
        {appStage === "accountType" ? (
          <AccountType
            onSelect={type => {
              try { localStorage.setItem("capabilio_selected_path", type) } catch {}
              setAuthMode("signup"); setShowAuth(true)
            }}
            onLogin={() => { setAuthMode("login"); setShowAuth(true) }}
            onBack={() => setAppStage("landing")}
          />
        ) : (
          <LandingPage
            onGetStarted={({ path } = {}) => {
              if (path) {
                try { localStorage.setItem("capabilio_selected_path", path) } catch {}
                setAuthMode("signup"); setShowAuth(true)
              } else {
                setAppStage("accountType")
              }
            }}
            onLogin={() => { setAuthMode("login"); setShowAuth(true) }}
          />
        )}
        <AuthModal show={showAuth} onClose={() => setShowAuth(false)} mode={authMode} setMode={setAuthMode} />
      </>
    )
  }

  // ── Onboarding ────────────────────────────────────────────────
  if (!onboardingDone) {
    return (
      <Onboarding
        user={user}
        onComplete={async () => {
          // Wait briefly for Supabase writes from the plan step to propagate, then read fresh
          await new Promise(r => setTimeout(r, 400))
          const fresh = await userDoc.get(user.id)
          if (fresh) setUserData(fresh)
          // Stamp the flag LAST — this triggers the real-time listener which also sets
          // onboardingDone(true). By stamping after the fresh read, both paths (real-time
          // listener and the explicit setters below) land on the same render cycle.
          try { await userDoc.update(user.id, { onboarding_complete: true }) } catch {}
          PH.onboardingCompleted({
            path:         fresh?.path,
            keyword:      fresh?.keyword,
            subscription: fresh?.subscription,
            eloRating:    fresh?.eloRating || fresh?.elo_rating,
          })
          // These fire synchronously in the same batch — React renders once with both.
          setOnboardingDone(true)
          setCurrentPage("aura")
        }}
        onBack={() => { setUser(null); setOnboardingDone(false) }}
      />
    )
  }

  // ── Main app ──────────────────────────────────────────────────
  const isAuthority = (
    userData?.path === "authority" ||
    userData?.path === "institution" ||
    userData?.account_type === "authority" ||
    userData?.account_type === "institution"
  )

  // Called by PathNav when a tab is tapped
  const handleBottomNavTap = (itemId, page, tab) => {
    setActiveNavItem(itemId)
    setCurrentPage(page)
    if (tab) setActiveTab(tab)
  }

  const navAccent   = { student:"#FF5701", professional:"#6D28D9", authority:"#1D4ED8", institution:"#0F766E" }[navPath] || "#FF5701"
  const avatarUrl   = userData?.profilePhotoURL || null
  const initials    = (userData?.name || user?.displayName || "U").charAt(0).toUpperCase()
  const displayName = userData?.displayName || userData?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"

  // Student inline nav items (header-integrated, matching screenshot style)
  const STUDENT_HEADER_NAV = [
    { id: "aura",        label: "Aura",         page: "aura",        prefix: "+" },
    { id: "arena",       label: "Arena",        page: "arena",       prefix: "×" },
    { id: "pulse",       label: "Pulse",        page: "pulse",       prefix: "⚡" },
    { id: "skillstudio", label: "Skill Studio", page: "skillstudio", prefix: "🎓" },
    { id: "launchpad",   label: "Launchpad",    page: "launchpad",   prefix: "🚀" },
  ]

  return (
    <div style={{ background: "var(--cap-bg-page)", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap');
        .cap-nav-item { transition: color 0.12s, background 0.12s; }
        .cap-nav-item:hover { background: rgba(0,0,0,0.04) !important; }
      `}</style>

      {/* ── Integrated header: logo + student nav + user ─────── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 90,
        background: "#fff",
        borderBottom: "1px solid #E5E7EB",
        height: 56,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
        gap: 12,
      }}>
        {/* Logo */}
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.3px", flexShrink: 0 }}>
          Capabilio <span style={{ color: navAccent, fontStyle: "italic" }}>AI</span>
        </span>

        {/* Student inline nav — sits between logo and user */}
        {navPath === "student" && (
          <nav style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "flex-start", marginLeft: 8, overflowX: "auto" }}>
            {STUDENT_HEADER_NAV.map(item => {
              const active = activeNavItem === item.id || currentPage === item.page
              return (
                <button key={item.id} className="cap-nav-item"
                  onClick={() => handleBottomNavTap(item.id, item.page)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", borderRadius: 8, border: "none",
                    background: active ? `${navAccent}12` : "transparent",
                    color: active ? navAccent : "#6B7280",
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    borderBottom: active ? `2px solid ${navAccent}` : "2px solid transparent",
                  }}>
                  <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, opacity: active ? 1 : 0.6 }}>{item.prefix}</span>
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}

        {/* Right: ELO + profile dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {!isAuthority && userData?.eloRating ? (
            <div style={{ padding: "4px 10px", background: navPath === "student" ? "#FFF1E8" : `${navAccent}10`, border: `1px solid ${navAccent}30`, borderRadius: 100, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: navAccent }}>
              ELO {userData.eloRating.toLocaleString()}
            </div>
          ) : null}

          {/* Profile button + dropdown */}
          <div ref={profileMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setProfileMenuOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px 4px 4px",
                background: profileMenuOpen ? `${navAccent}10` : "#fff",
                border: `1px solid ${profileMenuOpen ? navAccent + "50" : "#E5E7EB"}`,
                borderRadius: 99, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!profileMenuOpen) { e.currentTarget.style.borderColor = navAccent + "50"; e.currentTarget.style.background = `${navAccent}08` } }}
              onMouseLeave={e => { if (!profileMenuOpen) { e.currentTarget.style.borderColor = "#E5E7EB"; e.currentTarget.style.background = "#fff" } }}
            >
              <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: `2px solid ${navAccent}44`, background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, color: navAccent }}>{initials}</span>
                }
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: "'DM Sans', sans-serif", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transition: "transform 0.2s", transform: profileMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M2 4l4 4 4-4" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Dropdown */}
            {profileMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#fff", border: "1px solid #E5E7EB",
                borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                minWidth: 200, overflow: "hidden", zIndex: 200,
              }}>
                {/* User info header */}
                <div style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: "'DM Sans', sans-serif" }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{user?.email || ""}</div>
                </div>

                {/* Settings */}
                <button
                  onClick={() => {
                    setCurrentPage("aura")
                    setActiveTab("settings")
                    setActiveNavItem("aura")
                    setProfileMenuOpen(false)
                  }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px", border: "none", background: "transparent",
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13, fontWeight: 600, color: "#374151",
                    textAlign: "left", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#F9FAFB" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                >
                  <span style={{ fontSize: 15 }}>⚙️</span>
                  Settings
                </button>

                {/* Divider */}
                <div style={{ height: 1, background: "#F3F4F6", margin: "2px 0" }} />

                {/* Sign out */}
                <button
                  onClick={() => { setProfileMenuOpen(false); handleSignOut() }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "11px 14px", border: "none", background: "transparent",
                    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13, fontWeight: 600, color: "#EF4444",
                    textAlign: "left", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FFF5F5" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                >
                  <span style={{ fontSize: 15 }}>🚪</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* PathNav only for non-student paths */}
      {navPath !== "student" && (
        <PathNav
          path={navPath}
          activeItem={activeNavItem}
          onNavigate={handleBottomNavTap}
        />
      )}

      {/* overflow:hidden is intentional for Arena/Orbit panels.
          Pages that need page-level scrolling (Aura, StudentHome, etc.) must set
          height:100%; overflow-y:auto on their own root element. */}
      <div style={{ height: "calc(100vh - 56px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* ── Path-specific Home dashboards ──────────────────── */}
        {currentPage === "studentHome"      && <StudentHome      user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        {currentPage === "professionalHome" && <ProfessionalHome user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} onNavigatePricing={() => { setCurrentPage("pricing"); setActiveNavItem("") }} />}
        {currentPage === "executiveHome"    && <ExecutiveHome    user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        {currentPage === "orgHome"          && <OrgHome          user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}

        {/* ── Shared core pages ──────────────────────────────── */}

        {/* Orbit — unified intelligence OS for all paths */}
        {currentPage === "orbit" && (
          <Orbit user={user} userData={userData} setUserData={setUserData}
            activeTab={activeTab} setActiveTab={setActiveTab}
            onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }}
            onNavigatePricing={() => { setCurrentPage("pricing"); setActiveNavItem("") }} />
        )}

        {/* Aura — Profile page: Career Timeline, Skills, Vault, AI Interview */}
        {currentPage === "aura" && (
          <Aura user={user} activeTab={activeTab} setActiveTab={setActiveTab}
            onNavigate={setCurrentPage} onNavigatePricing={() => setCurrentPage("pricing")}
            userData={userData} setUserData={setUserData} />
        )}
        {currentPage === "nexus"     && <Nexus user={user} userData={userData} setUserData={setUserData} />}
        {currentPage === "arena"     && <Arena user={user} userData={userData} onBack={() => { const home = HOME_PAGE[navPath] || "studentHome"; setCurrentPage(home); setActiveNavItem("home") }} onNavigatePricing={() => setCurrentPage("pricing")} />}
        {currentPage === "pulse"     && <Pulse user={user} userData={userData} />}
        {currentPage === "authority" && <AuthorityProfile user={user} userData={{ ...userData, uid: user?.id }} setUserData={setUserData} onNavigate={setCurrentPage} />}
        {currentPage === "skillstudio" && <SkillStudio user={user} userData={userData} />}
        {currentPage === "launchpad"   && <Launchpad   user={user} userData={userData} />}
        {currentPage === "pricing"     && <Pricing     user={user} userData={userData} setUserData={setUserData} onBack={() => { const home = HOME_PAGE[navPath] || "studentHome"; setCurrentPage(home); setActiveNavItem("home") }} />}

        {/* ── Professional pages ─────────────────────────────── */}
        {currentPage === "forge"       && <Forge          user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}

        {/* ── Executive pages ────────────────────────────────── */}
        {currentPage === "timemarket"  && <Launchpad      user={user} userData={userData} />}
        {currentPage === "signalrooms" && <SignalRooms     user={user} userData={userData} />}
        {currentPage === "execnetwork" && <ExecutiveNetwork user={user} userData={userData} />}

        {/* ── Organisation pages ─────────────────────────────── */}
        {currentPage === "orgIntel"    && <OrgIntelligence user={user} userData={userData} />}
        {currentPage === "orgTasks"    && <OrgTasks        user={user} userData={userData} />}
        {currentPage === "orgPeople"   && <OrgPeople       user={user} userData={userData} />}
        {currentPage === "orgSettings" && <OrgSettings     user={user} userData={userData} />}

        {/* ── Recruiter pages ────────────────────────────────── */}
        {currentPage === "recruiterHome" && <RecruiterDashboard user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        {currentPage === "pipeline"      && <HiringPipeline     user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        {currentPage === "jobPostings"   && <JobPostings        user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
      </div>

      {/* Capi — AI Career Copilot floating widget (shown to all logged-in users) */}
      {user && <CopilotWidget user={user} userData={userData} />}

      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App