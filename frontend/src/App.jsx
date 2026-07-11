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
import HardwareChallenges  from "./pages/HardwareChallenges"
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
// ── Professional pages ────────────────────────────────────────────────────────
import Forge               from "./pages/Forge"
import Orbit               from "./pages/Orbit"
// ── Executive pages ───────────────────────────────────────────────────────────
import SignalRooms         from "./pages/SignalRooms"
import ExecutiveNetwork    from "./pages/ExecutiveNetwork"
// ── Organisation pages ────────────────────────────────────────────────────────
import InstitutionOS       from "./pages/InstitutionOS"
// ── Recruiter pages ───────────────────────────────────────────────────────────
import RecruiterDashboard  from "./pages/RecruiterDashboard"
import HiringPipeline      from "./pages/HiringPipeline"
import JobPostings         from "./pages/JobPostings"
import JoinPage            from "./pages/JoinPage"
import CareerPicker        from "./pages/CareerPicker"
import { PageLoader } from "./components/CapUI"
import CopilotWidget   from "./components/CopilotWidget"

const API = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

// ── Auth Modal ────────────────────────────────────────────────────────────────
const PATH_META = {
  student:      { icon: "🎓", label: "Student",      color: "#FF5701", bg: "#FFF1E8", desc: "Prove your skills through real challenges. ELO starts at 400." },
  professional: { icon: "💼", label: "Professional", color: "#7C3AED", bg: "#F4F0FF", desc: "Build your verified career intelligence. UAN-backed, AI-powered." },
  executive:    { icon: "✦",  label: "Executive",    color: "#C9A84C", bg: "#FFFDF5", desc: "Authority profile. Sell your time. Invite-only." },
  institution:  { icon: "🏛️", label: "Organisation", color: "#D97706", bg: "#FFF7E8", desc: "Track cohort ELO. Hire verified talent. Automate placements." },
}

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
  { dial:"+86",  flag:"🇨🇳", name:"China" },
  { dial:"+81",  flag:"🇯🇵", name:"Japan" },
  { dial:"+82",  flag:"🇰🇷", name:"South Korea" },
  { dial:"+55",  flag:"🇧🇷", name:"Brazil" },
  { dial:"+52",  flag:"🇲🇽", name:"Mexico" },
  { dial:"+64",  flag:"🇳🇿", name:"New Zealand" },
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
  // ── Shared fields ────────────────────────────────────────────────
  const [email,    setEmail]    = useState("")
  const [password, setPassword] = useState("")
  const [showPw,   setShowPw]   = useState(false)
  const [showCfm,  setShowCfm]  = useState(false)
  const [confirm,  setConfirm]  = useState("")
  const [first,    setFirst]    = useState("")
  const [last,     setLast]     = useState("")
  // Student fields
  const [college,  setCollege]  = useState("")
  const [branch,   setBranch]   = useState("")
  const [refCode,  setRefCode]  = useState("")
  const [refValid, setRefValid] = useState(null)
  const [refData,  setRefData]  = useState(null)
  // Professional fields
  const [company,     setCompany]     = useState("")
  const [jobTitle,    setJobTitle]    = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [experience,  setExperience]  = useState("")
  // Executive fields
  const [orgName,   setOrgName]   = useState("")
  const [execTitle, setExecTitle] = useState("")
  // Institution fields
  const [instName,    setInstName]    = useState("")
  const [instType,    setInstType]    = useState("College")
  const [instCity,    setInstCity]    = useState("")
  const [instWebsite, setInstWebsite] = useState("")
  const [adminName,   setAdminName]   = useState("")
  // shared
  const [error,    setError]    = useState("")
  const [loading,  setLoading]  = useState(false)

  const selectedPath = (() => { try { return localStorage.getItem("capabilio_selected_path") } catch { return null } })()
  const pw = pwStrength(password)

  useEffect(() => {
    if (show) {
      setEmail(""); setPassword(""); setConfirm(""); setShowPw(false); setShowCfm(false)
      setFirst(""); setLast(""); setCollege(""); setBranch("")
      setRefCode(""); setRefValid(null); setRefData(null)
      setCompany(""); setJobTitle(""); setLinkedinUrl(""); setExperience("")
      setOrgName(""); setExecTitle("")
      setInstName(""); setInstType("College"); setInstCity(""); setInstWebsite(""); setAdminName("")
      setError(""); setLoading(false)
    }
  }, [show])

  if (!show) return null

  const validatePassword = (pw) => {
    if (pw.length < 8)            return "Password must be at least 8 characters."
    if (!/[A-Z]/.test(pw))        return "Add at least one uppercase letter (A–Z)."
    if (!/[a-z]/.test(pw))        return "Add at least one lowercase letter (a–z)."
    if (!/[0-9]/.test(pw))        return "Add at least one number (0–9)."
    if (!/[^A-Za-z0-9]/.test(pw)) return "Add at least one special character (!@#$%...)."
    return null
  }

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
        let signupMeta = { full_name: fullName, first_name: first.trim(), last_name: last.trim() }

        if (selectedPath === "professional") {
          if (!company.trim())  { setError("Company name is required"); setLoading(false); return }
          if (!jobTitle.trim()) { setError("Job title is required");    setLoading(false); return }
          signupMeta = { ...signupMeta, company: company.trim(), job_title: jobTitle.trim(), linkedin_url: linkedinUrl.trim(), experience, path: "professional" }
        } else if (selectedPath === "executive") {
          if (!orgName.trim()) { setError("Organisation name is required");     setLoading(false); return }
          if (!execTitle)      { setError("Please select your executive title"); setLoading(false); return }
          signupMeta = { ...signupMeta, org_name: orgName.trim(), exec_title: execTitle, linkedin_url: linkedinUrl.trim(), path: "authority" }
        } else if (selectedPath === "institution") {
          if (!instName.trim())  { setError("Institution name is required");   setLoading(false); return }
          if (!adminName.trim()) { setError("Admin contact name is required"); setLoading(false); return }
          if (!instCity.trim())  { setError("City / State is required");       setLoading(false); return }
          signupMeta = { ...signupMeta, institution_name: instName.trim(), institution_type: instType, city: instCity.trim(), website: instWebsite.trim(), admin_name: adminName.trim(), path: "institution" }
        } else {
          // Student (default)
          if (!college.trim()) { setError("College name is required");  setLoading(false); return }
          if (!branch)         { setError("Please select your branch"); setLoading(false); return }
          signupMeta = { ...signupMeta, college: college.trim(), branch, path: "student" }
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { data: signupMeta },
        })
        if (signUpError) throw signUpError

        // Apply voucher — student path only
        if (!selectedPath || selectedPath === "student") {
          if (refCode.trim() && data.user) {
            try {
              await fetch(`${API}/api/referral/apply`, {
                method:"POST", headers:{"Content-Type":"application/json"},
                body: JSON.stringify({ refereeUid:data.user.id, refereeName:fullName, referrerCode:refCode.trim().toUpperCase() }),
              })
            } catch {}
          }
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

  const inputStyle = {
    width: "100%", padding: "12px 14px", background: "#FAF7F2",
    border: "1.5px solid #E8E3DA", borderRadius: 8, color: "#1A1714",
    fontSize: 14, fontFamily: "DM Sans,sans-serif", outline: "none",
    boxSizing: "border-box", transition: "border-color 0.15s",
  }

  const pm     = PATH_META[selectedPath] || null
  const accent = pm?.color || "#FF5701"

  const inp = (val, setter, type="text", placeholder="", extra={}) => (
    <input value={val} onChange={e=>{setter(e.target.value);setError("")}}
      onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}
      type={type} placeholder={placeholder}
      style={{...inputStyle,...extra}}
      onFocus={e=>e.target.style.borderColor=accent}
      onBlur={e=>e.target.style.borderColor="#E8E3DA"}/>
  )

  // canSubmit logic per path
  const canSubmitEmail = mode === "signup" ? (() => {
    const base = first && last && email && password && confirm
    if (selectedPath === "professional") return !!(base && company && jobTitle)
    if (selectedPath === "executive")    return !!(base && orgName && execTitle)
    if (selectedPath === "institution")  return !!(base && instName && instCity && adminName)
    return !!(base && college && branch)
  })() : !!(email && password)

  // Left panel stats per path
  const leftStats = (() => {
    if (selectedPath === "professional") return [
      { val:"UAN-Backed",  label:"Verified career identity",   c:"#7C3AED" },
      { val:"1,200+",      label:"Verified professionals",     c:"#1A1714" },
      { val:"AI-Powered",  label:"Career intelligence OS",     c:"#2563EB" },
    ]
    if (selectedPath === "executive") return [
      { val:"Invite-Only", label:"Exclusive executive network", c:"#C9A84C" },
      { val:"Authority",   label:"Signal-grade profiles",       c:"#1A1714" },
      { val:"Tier-1",      label:"Deal flow & peer access",     c:"#D97706" },
    ]
    if (selectedPath === "institution") return [
      { val:"Cohort ELO",  label:"Track team performance",     c:"#D97706" },
      { val:"500+ Orgs",   label:"Already onboard",            c:"#1A1714" },
      { val:"Verified",    label:"Hire from ranked talent",     c:"#16A34A" },
    ]
    return [
      { val:"ELO 1,847",  label:"Top performer benchmark",    c:"#FF5701" },
      { val:"94 Tasks",   label:"Real company challenges",    c:"#1A1714" },
      { val:"Top 3%",     label:"Verified by performance",    c:"#16A34A" },
    ]
  })()

  // Path-specific form fields (signup only)
  const renderPathFields = () => {
    if (selectedPath === "professional") return (
      <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp(first, setFirst, "text", "First name")}
          {inp(last,  setLast,  "text", "Last name")}
        </div>
        {inp(company,  setCompany,  "text", "Current company / employer")}
        {inp(jobTitle, setJobTitle, "text", "Job title / designation")}
        <select value={experience} onChange={e=>{setExperience(e.target.value);setError("")}}
          style={{ ...inputStyle, color: experience ? "#1A1714" : "#A8A29E" }}
          onFocus={e=>e.target.style.borderColor=accent}
          onBlur={e=>e.target.style.borderColor="#E8E3DA"}>
          <option value="">Years of experience (optional)</option>
          <option value="0-1">0–1 years (Fresher / Entry level)</option>
          <option value="1-3">1–3 years</option>
          <option value="3-5">3–5 years</option>
          <option value="5-10">5–10 years</option>
          <option value="10+">10+ years</option>
        </select>
        {inp(linkedinUrl, setLinkedinUrl, "url", "LinkedIn profile URL (optional)")}
      </>
    )

    if (selectedPath === "executive") return (
      <>
        <div style={{ padding:"10px 12px", background:"rgba(201,168,76,0.08)", border:"1px solid rgba(201,168,76,0.3)", borderRadius:10, fontSize:12, color:"#92400E", marginBottom:2 }}>
          ✦ Executive path is invite-only. Apply and our team will verify your profile within 48 hours.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp(first, setFirst, "text", "First name")}
          {inp(last,  setLast,  "text", "Last name")}
        </div>
        {inp(orgName, setOrgName, "text", "Organisation / Company name")}
        <select value={execTitle} onChange={e=>{setExecTitle(e.target.value);setError("")}}
          style={{ ...inputStyle, color: execTitle ? "#1A1714" : "#A8A29E" }}
          onFocus={e=>e.target.style.borderColor=accent}
          onBlur={e=>e.target.style.borderColor="#E8E3DA"}>
          <option value="">Select executive title</option>
          <option value="CEO">CEO – Chief Executive Officer</option>
          <option value="Founder">Founder / Co-Founder</option>
          <option value="CTO">CTO – Chief Technology Officer</option>
          <option value="CFO">CFO – Chief Financial Officer</option>
          <option value="COO">COO – Chief Operating Officer</option>
          <option value="CMO">CMO – Chief Marketing Officer</option>
          <option value="CPO">CPO – Chief Product Officer</option>
          <option value="President">President / MD / GM</option>
          <option value="VP">VP / SVP / EVP</option>
          <option value="Director">Director / Board Member</option>
          <option value="Partner">Partner / Investor</option>
          <option value="Other-C">Other C-Suite / Executive</option>
        </select>
        {inp(linkedinUrl, setLinkedinUrl, "url", "LinkedIn profile URL (speeds up verification)")}
      </>
    )

    if (selectedPath === "institution") return (
      <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp(first, setFirst, "text", "Admin first name")}
          {inp(last,  setLast,  "text", "Admin last name")}
        </div>
        {inp(instName, setInstName, "text", "Institution / Organisation name")}
        <div style={{ display:"flex", background:"#FAF7F2", borderRadius:9, padding:3, border:"1px solid #E8E3DA" }}>
          {["College","Company","Government","NGO"].map(t=>(
            <button key={t} onClick={()=>{setInstType(t);setError("")}}
              style={{ flex:1, padding:"8px 4px", borderRadius:7, border:"none", cursor:"pointer",
                background: instType===t ? accent : "transparent",
                color: instType===t ? "#fff" : "#6B6560",
                fontSize:12, fontWeight: instType===t ? 700 : 400,
                fontFamily:"inherit", transition:"all 0.15s" }}>
              {t}
            </button>
          ))}
        </div>
        {inp(adminName,   setAdminName,   "text", "Admin contact name")}
        {inp(instCity,    setInstCity,    "text", "City, State")}
        {inp(instWebsite, setInstWebsite, "url",  "Website URL (optional)")}
      </>
    )

    // Default: Student
    return (
      <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {inp(first, setFirst, "text", "First name")}
          {inp(last,  setLast,  "text", "Last name")}
        </div>
        {inp(college, setCollege, "text", "College / University name")}
        <select value={branch} onChange={e=>{setBranch(e.target.value);setError("")}}
          style={{ ...inputStyle, color: branch ? "#1A1714" : "#A8A29E" }}
          onFocus={e=>e.target.style.borderColor=accent}
          onBlur={e=>e.target.style.borderColor="#E8E3DA"}>
          <option value="">Select your branch / stream</option>
          <optgroup label="IT / CS Streams">
            <option value="CSE">Computer Science Engineering (CSE)</option>
            <option value="IT">Information Technology (IT)</option>
            <option value="MCA">MCA / Computer Applications</option>
            <option value="AI_DS">AI &amp; Data Science (AI/DS)</option>
            <option value="AI_ML">AI &amp; Machine Learning (AI/ML)</option>
          </optgroup>
          <optgroup label="Core Engineering">
            <option value="ECE">Electronics &amp; Communication (ECE)</option>
            <option value="EEE">Electrical &amp; Electronics (EEE)</option>
            <option value="Mechanical">Mechanical Engineering</option>
            <option value="Civil">Civil Engineering</option>
            <option value="IoT">Internet of Things (IoT)</option>
          </optgroup>
          <optgroup label="Management / Science">
            <option value="MBA">MBA / Business Administration</option>
            <option value="BBA">BBA / Business Management</option>
            <option value="BCom">B.Com / Commerce</option>
            <option value="BSc">B.Sc / Science</option>
          </optgroup>
          <optgroup label="Other">
            <option value="Pharmacy">Pharmacy / Pharma</option>
            <option value="Law">Law (LLB / LLM)</option>
            <option value="Arts">Arts / Humanities</option>
            <option value="Other">Other</option>
          </optgroup>
        </select>
      </>
    )
  }

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, fontFamily:"DM Sans,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500;600&display=swap');
        @keyframes modalIn  { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes authSpin { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{ position:"absolute", inset:0, background:"rgba(17,24,39,0.5)", backdropFilter:"blur(8px)" }} onClick={onClose}/>

      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
        <div style={{ width:"100%", maxWidth:880, background:"#fff", borderRadius:20, overflow:"hidden", border:"1px solid #E8E3DA", boxShadow:"0 24px 60px rgba(0,0,0,0.15)", animation:"modalIn 0.3s cubic-bezier(0.16,1,0.3,1) both", display:"flex", maxHeight:"96vh" }}>

          {/* Left panel */}
          <div style={{ flex:"0 0 36%", background: pm ? pm.bg : "#F6F6F1", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:"36px 28px", borderRight:"1px solid #E8E3DA" }}>
            <div>
              <div style={{ fontFamily:"'DM Sans',serif", fontSize:22, fontWeight:800, color:"#1A1714", marginBottom:16 }}>Capabilio AI</div>
              {pm && (
                <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"#fff", border:`1px solid ${accent}30`, borderRadius:999, padding:"6px 14px", marginBottom:16 }}>
                  <span style={{ fontSize:14 }}>{pm.icon}</span>
                  <span style={{ fontSize:10, fontWeight:800, color:accent, letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:"'DM Mono',monospace" }}>{pm.label} Path</span>
                </div>
              )}
              <h2 style={{ fontFamily:"'DM Sans',serif", fontSize:22, fontWeight:800, color:"#1A1714", lineHeight:1.25, marginBottom:10 }}>
                {pm ? pm.desc.split(".")[0]+"." : "Prove your skills."}<br/>
                <span style={{ fontStyle:"italic", color:accent }}>{pm ? pm.desc.split(".").slice(1).join(".").trim() : "Not just claim them."}</span>
              </h2>
              <p style={{ fontSize:12, color:"#6B6560", lineHeight:1.7, marginBottom:20 }}>
                {pm ? `Your account will be set for the ${pm.label} path. Change during onboarding.` : "ELO earned through real challenges — not a Word doc."}
              </p>
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {leftStats.map((s,i)=>(
                  <div key={i} style={{ display:"flex", gap:10, alignItems:"center", padding:"8px 12px", background:"#fff", border:"1px solid #E8E3DA", borderRadius:10 }}>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:700, color:s.c, minWidth:80 }}>{s.val}</div>
                    <div style={{ fontSize:11, color:"#A8A29E" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding:"9px 12px", background:"#fff", border:"1px solid #E8E3DA", borderRadius:10, fontSize:11, color:"#6B6560" }}>
              <span style={{ color:accent, fontWeight:700 }}>2,400+</span> joined this month · Free forever for candidates
            </div>
          </div>

          {/* Right form */}
          <div style={{ flex:1, padding:"28px 32px", overflowY:"auto", display:"flex", flexDirection:"column", justifyContent:"center", position:"relative" }}>
            <button onClick={onClose} style={{ position:"absolute", top:14, right:14, width:28, height:28, borderRadius:7, background:"#FAF7F2", border:"1px solid #E8E3DA", color:"#6B6560", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>

            {/* Create / Sign in toggle */}
            <div style={{ display:"flex", background:"#FAF7F2", borderRadius:10, padding:3, marginBottom:20, border:"1px solid #E8E3DA" }}>
              {[["signup","Create account"],["login","Sign in"]].map(([m,lbl])=>(
                <button key={m} onClick={()=>{setMode(m);setError("")}}
                  style={{ flex:1, padding:"9px", borderRadius:8, border:"none", cursor:"pointer", background:mode===m?accent:"transparent", color:mode===m?"#fff":"#6B6560", fontSize:13, fontWeight:mode===m?700:400, fontFamily:"inherit", transition:"all 0.15s" }}>
                  {lbl}
                </button>
              ))}
            </div>

            <h3 style={{ fontFamily:"'DM Sans',serif", fontSize:20, fontWeight:800, color:"#1A1714", marginBottom:3 }}>
              {mode==="signup" ? "Create your account" : "Welcome back"}
            </h3>
            <p style={{ fontSize:12, color:"#A8A29E", marginBottom:16 }}>
              {mode==="signup"
                ? selectedPath === "executive"  ? "Apply for executive access — reviewed within 48 hours."
                : selectedPath === "institution" ? "Set up your organisation account in minutes."
                : "Free forever. No credit card required."
                : "Sign in to your Capabilio profile."}
            </p>

            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {mode === "signup" && renderPathFields()}

              {inp(email, setEmail, "email", "Email address")}

              {/* Password */}
              <div>
                <div style={{ position:"relative" }}>
                  <input value={password} onChange={e=>{setPassword(e.target.value);setError("")}}
                    onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}
                    type={showPw?"text":"password"}
                    placeholder={mode==="signup"?"Create password":"Password"}
                    style={{...inputStyle, paddingRight:44}}
                    onFocus={e=>e.target.style.borderColor=accent}
                    onBlur={e=>e.target.style.borderColor="#E8E3DA"}/>
                  <button onClick={()=>setShowPw(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#A8A29E", fontSize:14, padding:2 }}>
                    {showPw ? "🙈" : "👁"}
                  </button>
                </div>
                {mode === "signup" && password.length > 0 && (
                  <div style={{ marginTop:6 }}>
                    <div style={{ height:3, background:"#E8E3DA", borderRadius:99, overflow:"hidden", marginBottom:5 }}>
                      <div style={{ height:"100%", width:`${pw.pct}%`, background:pw.color, borderRadius:99, transition:"all 0.3s" }}/>
                    </div>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                      {[{key:"length",label:"8+ chars"},{key:"uppercase",label:"A–Z"},{key:"lowercase",label:"a–z"},{key:"number",label:"0–9"},{key:"special",label:"!@#..."}].map(c=>(
                        <span key={c.key} style={{ fontSize:10, fontWeight:600, color:pw.checks[c.key]?"#16A34A":"#A8A29E", display:"flex", alignItems:"center", gap:3 }}>
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
                      style={{ ...inputStyle, paddingRight:44, borderColor: confirm&&password ? (confirm===password?"rgba(22,163,74,0.5)":"#FECACA") : "#E8E3DA" }}
                      onFocus={e=>e.target.style.borderColor=accent}
                      onBlur={e=>e.target.style.borderColor=confirm&&password?(confirm===password?"rgba(22,163,74,0.5)":"#FECACA"):"#E8E3DA"}/>
                    <button onClick={()=>setShowCfm(p=>!p)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#A8A29E", fontSize:14, padding:2 }}>
                      {showCfm ? "🙈" : "👁"}
                    </button>
                  </div>
                  {confirm && password && confirm !== password && (
                    <div style={{ fontSize:11, color:"#DC2626", marginTop:-4 }}>✗ Passwords do not match</div>
                  )}

                  {/* Voucher — student only */}
                  {(!selectedPath || selectedPath === "student") && (
                    <div>
                      <div style={{ fontSize:11, fontWeight:500, color:"#6B6560", marginBottom:5 }}>Skill voucher code <span style={{ fontWeight:400 }}>(optional)</span></div>
                      <input value={refCode}
                        onChange={async e=>{
                          const val=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,8)
                          setRefCode(val); setRefData(null); setRefValid(null)
                          if(val.length===8){try{const r=await fetch(`${API}/api/referral/validate/${val}`);const d=await r.json();setRefValid(d.valid);setRefData(d)}catch{setRefValid(false)}}
                        }}
                        placeholder="Enter 8-char voucher code" maxLength={8}
                        style={{ width:"100%", padding:"11px 14px", background:"#FAF7F2", border:`1.5px solid ${refCode.length===8?refValid?"#BBF7D0":"#FECACA":"#E8E3DA"}`, borderRadius:8, color:"#1A1714", fontSize:13, fontFamily:"'DM Mono',monospace", letterSpacing:3, outline:"none", boxSizing:"border-box" }}/>
                      {refCode.length===8&&refValid===true&&<div style={{ marginTop:5, padding:"6px 10px", background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:7, fontSize:11, color:"#15803D" }}>✓ {refData?.message} · +50 ELO + 14-day Pro</div>}
                      {refCode.length===8&&refValid===false&&<div style={{ marginTop:4, fontSize:11, color:"#DC2626" }}>✗ Invalid voucher code</div>}
                    </div>
                  )}
                </>
              )}

              {error && <div style={{ padding:"9px 12px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:9, fontSize:12, color:"#DC2626" }}>⚠️ {error}</div>}

              <button onClick={handleEmailSubmit} disabled={loading || !canSubmitEmail}
                style={{ width:"100%", padding:"13px", background:canSubmitEmail?accent:"#F3F4F6", border:"none", borderRadius:10, color:canSubmitEmail?"#fff":"#A8A29E", fontSize:15, fontWeight:700, fontFamily:"'DM Sans',serif", cursor:canSubmitEmail?"pointer":"not-allowed", transition:"all 0.15s" }}
                onMouseEnter={e=>{if(canSubmitEmail)e.currentTarget.style.filter="brightness(0.9)"}}
                onMouseLeave={e=>{if(canSubmitEmail)e.currentTarget.style.filter="none"}}
              >
                {loading
                  ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><span style={{ width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", display:"inline-block", animation:"authSpin 0.7s linear infinite" }}/>Please wait…</span>
                  : mode==="signup"
                    ? selectedPath === "executive"  ? "Apply for Executive Access →"
                    : selectedPath === "institution" ? "Create Organisation Account →"
                    : "Create account →"
                  : "Sign in →"}
              </button>
            </div>

            <div style={{ textAlign:"center", marginTop:14, fontSize:13, color:"#A8A29E" }}>
              {mode==="signup" ? "Already have an account? " : "New to Capabilio? "}
              <button onClick={()=>{setMode(m=>m==="signup"?"login":"signup");setError("")}}
                style={{ background:"none", border:"none", color:accent, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                {mode==="signup" ? "Sign in" : "Create free account"}
              </button>
            </div>

            {mode==="signup"&&(
              <div style={{ display:"flex", gap:5, justifyContent:"center", flexWrap:"wrap", marginTop:12 }}>
                {(selectedPath === "institution"
                  ? ["✓ Free to get started","✓ No setup fee","✓ Built in India 🇮🇳"]
                  : selectedPath === "executive"
                  ? ["✓ Invite-only","✓ Verified profiles","✓ Built in India 🇮🇳"]
                  : selectedPath === "professional"
                  ? ["✓ Free to join","✓ UAN-backed","✓ No resume","✓ Built in India 🇮🇳"]
                  : ["✓ Free forever","✓ No credit card","✓ No resume","✓ Built in India 🇮🇳"]
                ).map((b,i)=>(
                  <span key={i} style={{ fontSize:10, color:"#A8A29E", background:"#FAF7F2", border:"1px solid #E8E3DA", borderRadius:100, padding:"2px 8px" }}>{b}</span>
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

  useEffect(() => {
    if (window.location.pathname.startsWith("/portfolio/")) setCurrentPage("portfolio")
  }, [])

  useEffect(() => {
    let profileUnsub = null

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user || null

      if (u) {
        setUser(u)
        if (event === "SIGNED_IN")    PH.signedIn(u.app_metadata?.provider || "email")
        if (event === "USER_UPDATED") PH.signedUp(u.app_metadata?.provider || "email")

        if (profileUnsub) profileUnsub()
        profileUnsub = userDoc.subscribe(u.id, async (data) => {
          if (data) {
            if (!data.username) {
              // Add 6-char random suffix so same-name users never collide on the unique index.
              // Guard with a flag so we only attempt once per session, not on every subscribe fire.
              if (!window.__usernameSetAttempted) {
                window.__usernameSetAttempted = true
                const base = (u.user_metadata?.full_name || u.email?.split("@")[0] || u.id)
                  .toLowerCase().trim()
                  .replace(/[^a-z0-9]/g, "-")
                  .replace(/-+/g, "-")
                  .replace(/^-|-$/g, "")
                const suffix = Math.random().toString(36).slice(2, 8)
                const autoUsername = `${base}-${suffix}`
                await userDoc.update(u.id, { username: autoUsername }).catch(() => {})
                data.username = autoUsername
              }
            }
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

  useEffect(() => {
    if (user && currentPage) PH.pageViewed(currentPage)
  }, [currentPage]) // eslint-disable-line react-hooks/exhaustive-deps

  const HOME_PAGE = {
    student:      "studentHome",
    professional: "orbit",
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

  useEffect(() => {
    if (userData?.path && onboardingDone) {
      const home = navPath === "student" ? "aura" : (HOME_PAGE[navPath] || "studentHome")
      setCurrentPage(home)
      const navId = navPath === "professional" ? "orbit" : "home"
      setActiveNavItem(navId)
    }
  }, [userData?.path, onboardingDone]) // eslint-disable-line react-hooks/exhaustive-deps

  if (window.location.pathname.startsWith("/portfolio/")) {
    const username = window.location.pathname.replace("/portfolio/", "").split("/")[0]
    return <Portfolio username={username} />
  }

  if (window.location.pathname === "/career") {
    return <CareerPicker user={user} />
  }

  if (window.location.pathname.startsWith("/join/")) {
    const inviteCode = window.location.pathname.replace("/join/", "").split("/")[0]
    return (
      <JoinPage
        code={inviteCode}
        onDone={() => {
          window.history.replaceState({}, "", "/")
          setAppStage("landing")
        }}
      />
    )
  }

  if (loading) return <PageLoader />

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

  if (!onboardingDone) {
    return (
      <Onboarding
        user={user}
        onComplete={async (pathHint) => {
          await new Promise(r => setTimeout(r, 400))
          const fresh = await userDoc.get(user.id)
          const confirmedPath = pathHint || fresh?.path || "student"
          if (fresh) setUserData({ ...fresh, path: confirmedPath })
          try {
            await userDoc.update(user.id, {
              onboarding_complete: true,
              path: confirmedPath,
            })
          } catch {}
          PH.onboardingCompleted({
            path:         confirmedPath,
            keyword:      fresh?.keyword,
            subscription: fresh?.subscription,
            eloRating:    fresh?.eloRating || fresh?.elo_rating,
          })
          setOnboardingDone(true)
          const home = confirmedPath === "student" ? "aura" : (HOME_PAGE[confirmedPath] || "studentHome")
          setCurrentPage(home)
          setActiveNavItem(confirmedPath === "professional" ? "orbit" : "home")
        }}
        onBack={() => { setUser(null); setOnboardingDone(false) }}
      />
    )
  }

  const isAuthority = (
    userData?.path === "authority" ||
    userData?.path === "institution" ||
    userData?.account_type === "authority" ||
    userData?.account_type === "institution"
  )

  const handleBottomNavTap = (itemId, page, tab) => {
    setActiveNavItem(itemId)
    setCurrentPage(page)
    if (tab) setActiveTab(tab)
  }

  const navAccent   = { student:"#FF5701", professional:"#6D28D9", authority:"#1D4ED8", institution:"#0F766E" }[navPath] || "#FF5701"
  const avatarUrl   = userData?.profilePhotoURL || null
  const initials    = (userData?.name || user?.displayName || "U").charAt(0).toUpperCase()
  const displayName = userData?.displayName || userData?.name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"

  const STUDENT_HEADER_NAV = [
    { id: "aura",        label: "Aura",         page: "aura",        prefix: "+" },
    { id: "arena",       label: "Arena",        page: "arena",       prefix: "×" },
    { id: "pulse",       label: "Pulse",        page: "pulse",       prefix: "⚡" },
    { id: "skillstudio", label: "Skill Studio", page: "skillstudio",   prefix: "🎓" },
    { id: "launchpad",   label: "Launchpad",    page: "launchpad",     prefix: "🚀" },
    { id: "challenges",  label: "Challenges",   page: "challenges",    prefix: "🔬" },
  ]

  return (
    <div style={{ background: "var(--cap-bg-page)", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500;600&display=swap');
        .cap-nav-item { transition: color 0.12s, background 0.12s; }
        .cap-nav-item:hover { background: rgba(0,0,0,0.04) !important; }
      `}</style>

      <header style={{
        position: "sticky", top: 0, zIndex: 90,
        background: "#fff",
        borderBottom: "1px solid #E8E3DA",
        height: 56,
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        boxShadow: "0 1px 8px rgba(0,0,0,0.05)",
        gap: 12,
      }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 800, color: "#1A1714", letterSpacing: "-0.3px", flexShrink: 0 }}>
          Capabilio <span style={{ color: navAccent, fontStyle: "italic" }}>AI</span>
        </span>

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
                    color: active ? navAccent : "#6B6560",
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    borderBottom: active ? `2px solid ${navAccent}` : "2px solid transparent",
                  }}>
                  <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700, opacity: active ? 1 : 0.6 }}>{item.prefix}</span>
                  {item.label}
                </button>
              )
            })}
          </nav>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {!isAuthority && userData?.eloRating ? (
            <div style={{ padding: "4px 10px", background: navPath === "student" ? "#FFF1E8" : `${navAccent}10`, border: `1px solid ${navAccent}30`, borderRadius: 100, fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: navAccent }}>
              ELO {userData.eloRating.toLocaleString()}
            </div>
          ) : null}

          <div ref={profileMenuRef} style={{ position: "relative" }}>
            <button
              onClick={() => setProfileMenuOpen(o => !o)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px 4px 4px",
                background: profileMenuOpen ? `${navAccent}10` : "#fff",
                border: `1px solid ${profileMenuOpen ? navAccent + "50" : "#E8E3DA"}`,
                borderRadius: 99, cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!profileMenuOpen) { e.currentTarget.style.borderColor = navAccent + "50"; e.currentTarget.style.background = `${navAccent}08` } }}
              onMouseLeave={e => { if (!profileMenuOpen) { e.currentTarget.style.borderColor = "#E8E3DA"; e.currentTarget.style.background = "#fff" } }}
            >
              <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: `2px solid ${navAccent}44`, background: "#FAF7F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: navAccent }}>{initials}</span>
                }
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#3D3935", fontFamily: "'DM Sans', sans-serif", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transition: "transform 0.2s", transform: profileMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <path d="M2 4l4 4 4-4" stroke="#A8A29E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {profileMenuOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                background: "#fff", border: "1px solid #E8E3DA",
                borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                minWidth: 200, overflow: "hidden", zIndex: 200,
              }}>
                <div style={{ padding: "12px 14px", borderBottom: "1px solid #F3F4F6" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1714", fontFamily: "'DM Sans', sans-serif" }}>{displayName}</div>
                  <div style={{ fontSize: 11, color: "#A8A29E", marginTop: 2 }}>{user?.email || ""}</div>
                </div>

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
                    fontSize: 13, fontWeight: 600, color: "#3D3935",
                    textAlign: "left", transition: "background 0.1s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#FAF7F2" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}
                >
                  <span style={{ fontSize: 15 }}>⚙️</span>
                  Settings
                </button>

                <div style={{ height: 1, background: "#F3F4F6", margin: "2px 0" }} />

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

      {navPath !== "student" && navPath !== "institution" && (
        <PathNav
          path={navPath}
          activeItem={activeNavItem}
          onNavigate={handleBottomNavTap}
        />
      )}

      <div style={{ height: "calc(100vh - 56px)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {currentPage === "studentHome"      && <StudentHome      user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        {currentPage === "professionalHome" && <ProfessionalHome user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} onNavigatePricing={() => { setCurrentPage("pricing"); setActiveNavItem("") }} />}
        {currentPage === "executiveHome"    && <ExecutiveHome    user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        {["orgHome","orgIntel","orgTasks","orgPeople","orgSettings","orgCommunity","orgGroups","orgCohorts","orgEvents","orgOpportunities","orgOutcomes"].includes(currentPage) && (
          <InstitutionOS user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />
        )}

        {currentPage === "orbit" && (
          <Orbit user={user} userData={userData} setUserData={setUserData}
            activeTab={activeTab} setActiveTab={setActiveTab}
            onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }}
            onNavigatePricing={() => { setCurrentPage("pricing"); setActiveNavItem("") }} />
        )}

        {currentPage === "aura" && (
          <Aura user={user} activeTab={activeTab} setActiveTab={setActiveTab}
            onNavigate={setCurrentPage} onNavigatePricing={() => setCurrentPage("pricing")}
            userData={userData} setUserData={setUserData} />
        )}
        {currentPage === "nexus"     && <Nexus user={user} userData={userData} setUserData={setUserData} />}
        {currentPage === "arena"     && <Arena user={user} userData={userData} setUserData={setUserData} onBack={() => { const home = HOME_PAGE[navPath] || "studentHome"; setCurrentPage(home); setActiveNavItem("home") }} onNavigatePricing={() => setCurrentPage("pricing")} />}
        {currentPage === "pulse"     && <Pulse user={user} userData={userData} />}
        {currentPage === "authority" && <AuthorityProfile user={user} userData={{ ...userData, uid: user?.id }} setUserData={setUserData} onNavigate={setCurrentPage} />}
        {currentPage === "skillstudio" && <SkillStudio user={user} userData={userData} />}
        {currentPage === "launchpad"   && <Launchpad   user={user} userData={userData} />}
        {currentPage === "pricing"     && <Pricing     user={user} userData={userData} setUserData={setUserData} onBack={() => { const home = HOME_PAGE[navPath] || "studentHome"; setCurrentPage(home); setActiveNavItem("home") }} />}

        {currentPage === "forge"       && <Forge          user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        {currentPage === "challenges"  && <HardwareChallenges user={user} userData={userData} />}

        {currentPage === "timemarket"  && <Launchpad      user={user} userData={userData} />}
        {currentPage === "signalrooms" && <SignalRooms     user={user} userData={userData} />}
        {currentPage === "execnetwork" && <ExecutiveNetwork user={user} userData={userData} />}

        {currentPage === "recruiterHome" && <RecruiterDashboard user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        {currentPage === "pipeline"      && <HiringPipeline     user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
        {currentPage === "jobPostings"   && <JobPostings        user={user} userData={userData} onNavigate={p => { setCurrentPage(p); setActiveNavItem(p) }} />}
      </div>

      {user && navPath !== "institution" && <CopilotWidget user={user} userData={userData} />}

      <Analytics />
      <SpeedInsights />
    </div>
  )
}

export default App
