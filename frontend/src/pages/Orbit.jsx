/**
 * Orbit.jsx — Professional Career Intelligence OS
 * Tab: Orbit (ELO dashboard)
 * Career Timeline and Vault are in Profile → Career & Vault / Vault tabs
 * Supabase-native: uses userDoc.update() from lib/db
 */
import { useState, useCallback, useRef, useEffect } from "react"
import { userDoc } from "../lib/db"
import { vaultApi, weeklyCheckApi, skillsApi } from "../lib/api"
import { getRoleConfig } from "../config/roleConfig"

const API = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

// ─── Design System ────────────────────────────────────────────────────────────
const DS = {
  bg:"#FFFFFF", surface:"#FFFFFF", surface2:"rgba(0,0,0,0.03)",
  ink:"#1A1714", ink2:"#475569", ink3:"#A8A29E", ink4:"#6B6560",
  border:"rgba(0,0,0,0.05)", border2:"rgba(0,0,0,0.08)",
  primary:"#6366F1", pBg:"rgba(99,102,241,0.12)", pBd:"rgba(99,102,241,0.28)",
  green:"#10B981", gBg:"rgba(16,185,129,0.12)", gBd:"rgba(16,185,129,0.28)",
  amber:"#F59E0B", aBg:"rgba(245,158,11,0.12)", aBd:"rgba(245,158,11,0.28)",
  blue:"#3B82F6", blBg:"rgba(59,130,246,0.12)", blBd:"rgba(59,130,246,0.28)",
  purple:"#8B5CF6", purBg:"rgba(139,92,246,0.12)", purBd:"rgba(139,92,246,0.28)",
  red:"#F43F5E", rBg:"rgba(244,63,94,0.12)", rBd:"rgba(244,63,94,0.28)",
  teal:"#06B6D4", tBg:"rgba(6,182,212,0.12)", tBd:"rgba(6,182,212,0.28)",
  display:"'DM Sans', sans-serif", mono:"'DM Mono', monospace", body:"'DM Sans', system-ui, sans-serif",
  sh:"0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.3)",
  sh2:"0 8px 24px rgba(0,0,0,0.08)), 0 4px 12px rgba(0,0,0,0.4)",
  sh3:"0 20px 60px rgba(0,0,0,0.7), 0 8px 24px rgba(0,0,0,0.5)",
  r:12, r2:16, r3:20,
}
const G=`
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes slideUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.ocard{transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s;} .ocard:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(0,0,0,.5)!important;}
.obtn{transition:all .15s;cursor:pointer;} .obtn:hover{opacity:.88;transform:translateY(-1px);}
.olink{transition:color .15s;cursor:pointer;}
::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.07);border-radius:3px}
`

// ─── Weekly Career Check banner ───────────────────────────────────────────────
// This is the actual, reachable entry point for the Weekly Refresh Engine —
// Orbit is the real professional-path landing tab (PathNav.jsx's "professional"
// array), so this banner lives here rather than the unreachable ProfessionalHome.jsx
// page. Never say "assessment" in this copy — product naming rule.
function WeeklyCheckBanner({onNav}){
  const[state,setState]=useState("loading") // loading|none|due|in_progress|done|error
  useEffect(()=>{
    let cancelled=false
    weeklyCheckApi.current()
      .then(res=>{
        if(cancelled)return
        if(!res.available){setState("none");return}
        if(res.pulse.status==="completed")setState("done")
        else if(res.pulse.status==="in_progress")setState("in_progress")
        else setState("due")
      })
      .catch(()=>!cancelled&&setState("error"))
    return()=>{cancelled=true}
  },[])
  if(state==="loading"||state==="error")return null
  const copy={
    none:{title:"Set up your Weekly Career Check",desc:"Add a few skills below and this comes alive — a 5-minute check-in that keeps your skill scores current.",cta:"Add skills",tab:"vault",color:DS.ink4},
    due:{title:"This week's Career Check is ready",desc:"5 quick scenario questions based on your skills. About a minute.",cta:"Start check-in →",tab:"weeklycheck",color:DS.primary},
    in_progress:{title:"Pick up where you left off",desc:"A couple questions left in this week's Career Check.",cta:"Continue →",tab:"weeklycheck",color:DS.amber},
    done:{title:"This week's Career Check is done",desc:"Skill confidence signals are current. Next check-in opens next week.",cta:"View skills →",tab:"vault",color:DS.green},
  }[state]
  return<div className="ocard" style={{marginBottom:18,padding:"15px 20px",background:DS.surface,border:`1.5px solid ${copy.color}33`,borderRadius:DS.r2,boxShadow:DS.sh,display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap"}}>
    <div>
      <div style={{fontSize:10,fontWeight:700,color:copy.color,letterSpacing:2.2,fontFamily:DS.mono,textTransform:"uppercase"}}>Weekly Career Check</div>
      <div style={{fontFamily:DS.display,fontSize:15,fontWeight:800,color:DS.ink,marginTop:3}}>{copy.title}</div>
      <div style={{fontSize:12,color:DS.ink3,marginTop:2}}>{copy.desc}</div>
    </div>
    <Btn onClick={()=>onNav(copy.tab)} style={state==="due"||state==="in_progress"?{background:copy.color,color:"#fff",border:"none"}:{}}>{copy.cta}</Btn>
  </div>
}

// ─── Career Score Engine ──────────────────────────────────────────────────────
function parseYear(s){if(!s)return null;const m=String(s).match(/\b(20\d{2}|19\d{2})\b/);return m?parseInt(m[1]):null}
function inferYoe(ud){
  const exps=ud?.experiences||[]
  if(!exps.length)return 0
  let t=0
  exps.forEach(e=>{const s=parseYear(e.startDate),en=e.isCurrent?new Date().getFullYear():parseYear(e.endDate);if(s&&en)t+=Math.max(0,en-s)})
  return Math.min(t||exps.length*1.5,25)
}
function computeSignals(ud){
  const yoe=inferYoe(ud),skills=(ud?.skills||[]),exps=(ud?.experiences||[])
  const verified=exps.filter(e=>e.verificationStatus==="verified").length
  const hasVault=(ud?.vaultFiles||[]).length>0,hasCerts=(ud?.certifications||[]).length>0
  const hasProj=(ud?.resumeProjects||[]).length>0,hasUAN=!!(ud?.uanNumber||ud?.uanVerified)
  const hasSummary=!!(ud?.profileSummary),hasTarget=!!(ud?.targetRole)
  const sen=yoe>=15?490:yoe>=10?420:yoe>=7?340:yoe>=4?240:yoe>=2?130:yoe>=1?60:0
  const roleElo=Math.round(800+Math.min(yoe*30,450)+Math.min(skills.length*12,240)*.3+sen*.5+(verified>0?80:0)+(hasVault?40:0)+(hasProj?30:0)-(hasSummary?0:30))
  const mktMul=skills.length>=12?1.10:skills.length>=8?1.03:skills.length>=5?.97:.82
  const marketElo=Math.round(roleElo*mktMul*(yoe<2?.88:yoe>12?1.05:1.0))
  const proofElo=Math.round(400+(verified/Math.max(exps.length,1))*300+(hasVault?80:0)+(hasUAN?120:0)+(hasCerts?60:0)+(hasProj?40:0)-(exps.length===0?200:0))
  const mobElo=Math.round(600+Math.min(yoe*18,360)+(skills.length>=8?80:0)+(verified>0?100:-50)+(hasTarget?60:-30)+(hasSummary?40:-20)+(hasVault?40:0))
  const sg=n=>n>0?`+${n}`:`${n}`
  return{
    role:{score:roleElo,trend:sg(Math.round((skills.length-5)*3+verified*12)),confidence:verified>1?"High":verified===1?"Medium":"Low"},
    market:{score:marketElo,trend:sg(Math.round((skills.length-7)*5)),confidence:skills.length>8?"High":"Medium"},
    proof:{score:proofElo,trend:sg(hasUAN?45:-20),confidence:hasUAN&&verified>0?"High":"Low"},
    mobility:{score:mobElo,trend:sg(hasTarget?30:-15),confidence:hasTarget&&verified>0?"High":"Medium"},
    meta:{yoe,skills:skills.length,verified,hasVault,hasCerts,hasProj,hasUAN,hasSummary,hasTarget,expsCount:exps.length}
  }
}
function scoreLabel(s){if(s>=1800)return{label:"Elite",color:DS.purple};if(s>=1500)return{label:"Expert",color:DS.blue};if(s>=1200)return{label:"Strong",color:DS.green};if(s>=1000)return{label:"Growing",color:DS.amber};if(s>=800)return{label:"Early",color:DS.ink3};return{label:"Building",color:DS.ink4}}
// Keep backward compat alias
const eloLabel = scoreLabel

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Spin({color=DS.primary,size=14}){return<div style={{width:size,height:size,border:`2px solid ${color}33`,borderTopColor:color,borderRadius:"50%",animation:"spin .8s linear infinite",flexShrink:0}}/>}
function Tag({children,color=DS.ink3,bg=DS.surface2,border=DS.border}){return<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 9px",background:bg,color,border:`1px solid ${border}`,borderRadius:99,fontSize:11,fontWeight:600,fontFamily:DS.mono,whiteSpace:"nowrap"}}>{children}</span>}
function SL({children,color=DS.ink4}){return<div style={{fontSize:10,fontWeight:700,letterSpacing:2.2,color,textTransform:"uppercase",fontFamily:DS.mono,marginBottom:8}}>{children}</div>}
function Card({children,style={},className=""}){return<div className={`ocard ${className}`} style={{background:DS.surface,border:`1px solid ${DS.border}`,borderRadius:DS.r2,boxShadow:DS.sh,padding:"20px 22px",...style}}>{children}</div>}
function Btn({children,onClick,variant="primary",size="md",disabled=false,loading=false,full=false,style={}}){
  const V={primary:{bg:DS.primary,color:"#1A1714",bd:"none"},ghost:{bg:"transparent",color:DS.ink2,bd:`1px solid ${DS.border2}`},danger:{bg:DS.rBg,color:DS.red,bd:`1px solid ${DS.rBd}`},success:{bg:DS.gBg,color:DS.green,bd:`1px solid ${DS.gBd}`},amber:{bg:DS.aBg,color:DS.amber,bd:`1px solid ${DS.aBd}`},subtle:{bg:DS.surface2,color:DS.ink3,bd:`1px solid ${DS.border}`}}
  const S={sm:"7px 13px",md:"10px 18px",lg:"13px 24px"}
  const v=V[variant]||V.primary
  return<button className="obtn" onClick={onClick} disabled={disabled||loading} style={{width:full?"100%":undefined,padding:S[size],background:v.bg,color:v.color,border:v.bd,borderRadius:DS.r,fontSize:size==="sm"?11:13,fontWeight:700,fontFamily:DS.body,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,outline:"none",opacity:disabled?.5:1,...style}}>{loading&&<Spin color={v.color} size={12}/>}{children}</button>
}
function Ring({score,max=2000,size=64,color=DS.primary,label}){
  const p=Math.min(score/max,1),r=(size-8)/2,c=2*Math.PI*r,d=c*p
  return<div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color+"22"} strokeWidth={6}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeDasharray={`${d} ${c}`} strokeLinecap="round"/>
    </svg>
    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontFamily:DS.mono,fontSize:size>60?13:11,fontWeight:700,color,lineHeight:1}}>{score}</span>
      {label&&<span style={{fontSize:9,color:DS.ink4,fontWeight:600,marginTop:2}}>{label}</span>}
    </div>
  </div>
}
function Trend({trend}){const up=String(trend).startsWith("+"),dn=String(trend).startsWith("-");return<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",background:up?DS.gBg:dn?DS.rBg:DS.surface2,color:up?DS.green:dn?DS.red:DS.ink4,border:`1px solid ${up?DS.gBd:dn?DS.rBd:DS.border}`,borderRadius:99,fontSize:11,fontWeight:700,fontFamily:DS.mono}}>{up?"↑":dn?"↓":"→"} {trend}</span>}
function Bar({value,max=100,color=DS.primary,h=5,style={}}){const p=Math.min((value/max)*100,100);return<div style={{width:"100%",height:h,background:`${color}18`,borderRadius:99,...style}}><div style={{height:"100%",width:`${p}%`,background:color,borderRadius:99,transition:"width .6s ease"}}/></div>}
function Modal({show,onClose,title,children,width=580}){
  if(!show)return null
  return<div style={{position:"fixed",inset:0,zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{position:"absolute",inset:0,background:"rgba(15,15,14,.5)",backdropFilter:"blur(6px)"}} onClick={onClose}/>
    <div style={{position:"relative",width:"100%",maxWidth:width,background:DS.surface,borderRadius:DS.r3,boxShadow:DS.sh3,overflow:"hidden",animation:"slideUp .25s ease",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"18px 24px",borderBottom:`1px solid ${DS.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{fontFamily:DS.display,fontSize:17,fontWeight:800,color:DS.ink}}>{title}</div>
        <button onClick={onClose} style={{width:30,height:30,borderRadius:8,border:`1px solid ${DS.border}`,background:DS.surface2,color:DS.ink3,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",outline:"none"}}>×</button>
      </div>
      <div style={{padding:"22px",overflowY:"auto"}}>{children}</div>
    </div>
  </div>
}
function Empty({icon,title,body,action}){return<div style={{textAlign:"center",padding:"40px 24px"}}><div style={{fontSize:36,marginBottom:12}}>{icon}</div><div style={{fontFamily:DS.display,fontSize:16,fontWeight:800,color:DS.ink,marginBottom:8}}>{title}</div><div style={{fontSize:13,color:DS.ink3,lineHeight:1.6,maxWidth:320,margin:"0 auto 20px"}}>{body}</div>{action}</div>}
function Inp({label,value,onChange,placeholder,type="text",mono=false}){
  return<div><div style={{fontSize:12,fontWeight:600,color:DS.ink3,marginBottom:5}}>{label}</div>
  <input value={value} onChange={e=>onChange(e.target.value)} type={type} placeholder={placeholder} style={{width:"100%",padding:"10px 12px",background:DS.surface2,border:`1.5px solid ${DS.border}`,borderRadius:DS.r,fontSize:13,fontFamily:mono?DS.mono:DS.body,color:DS.ink,outline:"none",boxSizing:"border-box",transition:"border-color .15s"}} onFocus={e=>e.target.style.borderColor=DS.primary} onBlur={e=>e.target.style.borderColor=DS.border}/></div>
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
// "Overview" (id:"orbit") tab removed — that dashboard now lives embedded in
// Home (ProfessionalHome.jsx imports OrbitDash directly). This page is now
// reached via the "Career" nav item: identity, timeline, employment,
// compensation, reputation.
const TABS=[
  {id:"timeline",     label:"Timeline",     icon:"📋"},
  {id:"vault",        label:"Verification", icon:"🔐"},
  {id:"comp",         label:"Compensation", icon:"💰"},
  {id:"readiness",    label:"Readiness",    icon:"🎯"},
]
function TabBar({active,setActive,sig}){
  const avg=sig?Math.round((sig.role.score+sig.market.score+sig.proof.score+sig.mobility.score)/4):null
  return<div style={{background:DS.surface,borderBottom:`1px solid ${DS.border}`,position:"sticky",top:0,zIndex:200}}>
    <div style={{maxWidth:1200,margin:"0 auto",padding:"0 24px",display:"flex",alignItems:"center",gap:2}}>
      {TABS.map(t=>{const on=active===t.id;return<button key={t.id} onClick={()=>setActive(t.id)} style={{padding:"13px 18px",border:"none",background:"transparent",color:on?DS.primary:DS.ink3,fontSize:13,fontWeight:on?700:500,cursor:"pointer",borderBottom:`2px solid ${on?DS.primary:"transparent"}`,display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",transition:"all .15s",fontFamily:DS.body,flexShrink:0,outline:"none"}}>
        <span style={{fontSize:13}}>{t.icon}</span>{t.label}
        {t.id==="orbit"&&avg&&<span style={{padding:"1px 7px",background:DS.pBg,color:DS.primary,border:`1px solid ${DS.pBd}`,borderRadius:99,fontSize:10,fontWeight:700,fontFamily:DS.mono}}>{avg}</span>}
      </button>})}
    </div>
  </div>
}

// ─── Plan utilities ───────────────────────────────────────────────────────────
function usePlan(ud) {
  const sub = ud?.subscription || "free"
  const isFree  = sub === "free"
  const isElite = sub === "orbit_elite"
  const isPro   = sub === "orbit_pro" || isElite
  return {
    sub, isFree, isPro, isElite,
    label:   isElite ? "Capabilio Elite" : isPro ? "Capabilio Pro" : "Free",
    color:   isElite ? DS.amber : isPro ? DS.purple : DS.ink3,
    colorBg: isElite ? DS.aBg   : isPro ? DS.purBg  : DS.surface2,
    comp:        isPro,    // Compensation Intelligence
    gap:         isPro,    // Market Gap Analysis
    nexus:       isPro,    // Nexus verified network
    unlimitedForge: isPro, // Unlimited Forge (free = 1/wk)
    interview:   isElite,  // AI Interview 5 sessions/mo
    mentorHub:   isElite,  // Mentor Hub listing
    transitions: isElite,  // Transition Tracks
    returnSprint:isElite,  // Return-Ready Sprint
    unlimitedReports: isElite,
    priorityLaunchpad: isElite,
    reportsAllowed:    isFree ? 0 : isElite ? 999 : 3,
    interviewsAllowed: isElite ? 5 : 0,
  }
}

// ─── Plan Banner ──────────────────────────────────────────────────────────────
function PlanBanner({ plan, onUpgrade }) {
  if (plan.isElite) return (
    <div style={{marginBottom:18,padding:"12px 18px",background:`linear-gradient(135deg,${DS.aBg},${DS.surface})`,border:`1.5px solid ${DS.aBd}`,borderRadius:DS.r2,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:18}}>⭐</span>
      <div style={{flex:1}}><span style={{fontFamily:DS.mono,fontSize:11,fontWeight:800,color:DS.amber,letterSpacing:1}}>CAPABILIO ELITE</span><span style={{fontSize:12,color:DS.ink3,marginLeft:8}}>All features unlocked · Priority Launchpad · AI Interviews · Mentor Hub</span></div>
      <Tag color={DS.amber} bg={DS.aBg} border={DS.aBd}>Active</Tag>
    </div>
  )
  const upgradeTo = plan.isFree ? "Capabilio Pro" : "Capabilio Elite"
  const price     = plan.isFree ? "₹499/mo" : "₹999/mo"
  const hint      = plan.isFree
    ? "Compensation Intelligence, Gap Analysis, unlimited Forge"
    : "AI Interviews, Mentor Hub, Transition Tracks, Return Sprint"
  return (
    <div style={{marginBottom:18,padding:"14px 18px",background:`linear-gradient(135deg,${DS.purBg},${DS.surface})`,border:`1.5px solid ${DS.purBd}`,borderRadius:DS.r2,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:plan.colorBg,border:`1.5px solid ${plan.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{plan.isFree?"🆓":"⚡"}</div>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:2}}>
            <span style={{fontFamily:DS.mono,fontSize:11,fontWeight:800,color:plan.color,textTransform:"uppercase",letterSpacing:1}}>{plan.label}</span>
            <span style={{fontSize:11,color:DS.ink4}}>current plan</span>
          </div>
          <div style={{fontSize:12,color:DS.ink2}}>Unlock <strong>{hint}</strong> — {price}</div>
        </div>
      </div>
      <Btn onClick={onUpgrade} style={{background:DS.purple,color:"#1A1714",border:"none",flexShrink:0,boxShadow:`0 4px 14px ${DS.purple}30`}}>Upgrade to {upgradeTo} →</Btn>
    </div>
  )
}

// ─── Locked Card overlay ──────────────────────────────────────────────────────
function LockedCard({ children, title, desc, requiredPlan="orbit_pro", onUpgrade }) {
  const rLabel = requiredPlan === "orbit_elite" ? "Capabilio Elite" : "Capabilio Pro"
  const rPrice = requiredPlan === "orbit_elite" ? "₹999/mo"        : "₹499/mo"
  return (
    <div style={{position:"relative",borderRadius:DS.r2,overflow:"hidden"}}>
      <div style={{filter:"blur(4px)",pointerEvents:"none",userSelect:"none",opacity:0.45}}>{children}</div>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:`linear-gradient(135deg,${DS.surface}ee,${DS.purBg}cc)`,backdropFilter:"blur(2px)"}}>
        <div style={{textAlign:"center",padding:"24px 20px",maxWidth:260}}>
          <div style={{width:44,height:44,borderRadius:12,background:DS.purBg,border:`1.5px solid ${DS.purBd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,margin:"0 auto 10px"}}>🔒</div>
          <div style={{fontFamily:DS.display,fontSize:14,fontWeight:800,color:DS.ink,marginBottom:5}}>{title}</div>
          <div style={{fontSize:11,color:DS.ink3,marginBottom:12,lineHeight:1.55}}>{desc}</div>
          <div style={{fontFamily:DS.mono,fontSize:10,fontWeight:700,color:DS.purple,marginBottom:12,textTransform:"uppercase",letterSpacing:1}}>{rLabel} · {rPrice}</div>
          <Btn onClick={onUpgrade} size="sm" style={{background:DS.purple,color:"#1A1714",border:"none",boxShadow:`0 4px 14px ${DS.purple}30`}}>Upgrade to {rLabel} →</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Score Card ───────────────────────────────────────────────────────────────
function EloCard({name,icon,score,trend,confidence,color,cBg,cBd,desc,drivers=[],drags=[],action,actionLabel,onAction}){
  const[open,setOpen]=useState(false)
  const{label}=scoreLabel(score)
  const nextLevel=score<800?"Early":score<1000?"Growing":score<1200?"Strong":score<1500?"Expert":"Elite"
  const toNext=score<800?800-score:score<1000?1000-score:score<1200?1200-score:score<1500?1500-score:score<1800?1800-score:0
  return<Card style={{borderTop:`3px solid ${color}`}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
      <div>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}><span style={{fontSize:15}}>{icon}</span><span style={{fontSize:12,fontWeight:700,color:DS.ink3}}>{name}</span></div>
        <div style={{fontFamily:DS.mono,fontSize:27,fontWeight:700,color,lineHeight:1}}>{score}</div>
        <div style={{display:"flex",alignItems:"center",gap:7,marginTop:5}}><Trend trend={trend}/><Tag color={color} bg={cBg} border={cBd}>{label}</Tag></div>
      </div>
      <Ring score={score} color={color} size={58}/>
    </div>
    <Bar value={score} max={2000} color={color} h={4} style={{marginBottom:9}}/>
    <div style={{fontSize:11,color:DS.ink3,marginBottom:8}}><span style={{fontWeight:600,color:DS.ink4}}>Confidence: </span><span style={{color:confidence==="High"?DS.green:confidence==="Medium"?DS.amber:DS.red,fontWeight:700}}>{confidence}</span><span style={{color:DS.ink4}}> · {desc}</span></div>
    {toNext>0&&<div style={{marginBottom:9,padding:"6px 10px",background:cBg,border:`1px solid ${cBd}`,borderRadius:DS.r,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <span style={{fontSize:11,color:DS.ink3}}>Next level: {nextLevel}</span>
      <span style={{fontFamily:DS.mono,fontSize:11,fontWeight:700,color}}>{Math.round((score/1800)*100)}% there</span>
    </div>}
    {open&&<div style={{animation:"fadeUp .2s ease"}}>
      {drivers.length>0&&<div style={{marginBottom:9}}>
        <div style={{fontSize:10,fontWeight:700,color:DS.green,textTransform:"uppercase",letterSpacing:1.5,fontFamily:DS.mono,marginBottom:5}}>Positive Drivers</div>
        {drivers.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:`1px solid ${DS.border}`}}><span style={{color:DS.green,fontSize:11}}>↑</span><span style={{fontSize:12,color:DS.ink2,flex:1}}>{d}</span></div>)}
      </div>}
      {drags.length>0&&<div style={{marginBottom:9}}>
        <div style={{fontSize:10,fontWeight:700,color:DS.red,textTransform:"uppercase",letterSpacing:1.5,fontFamily:DS.mono,marginBottom:5}}>Drag Factors</div>
        {drags.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"5px 0",borderBottom:`1px solid ${DS.border}`}}><span style={{color:DS.red,fontSize:11}}>↓</span><span style={{fontSize:12,color:DS.ink2,flex:1}}>{d}</span></div>)}
      </div>}
      {action&&<div style={{padding:"9px 12px",background:cBg,border:`1px solid ${cBd}`,borderRadius:DS.r,marginBottom:9}}><div style={{fontSize:11,fontWeight:700,color,marginBottom:2}}>⚡ Top Action</div><div style={{fontSize:12,color:DS.ink2}}>{action}</div></div>}
    </div>}
    <div style={{display:"flex",gap:7,marginTop:9}}>
      <button onClick={()=>setOpen(o=>!o)} style={{flex:1,padding:"7px",background:DS.surface2,border:`1px solid ${DS.border}`,borderRadius:DS.r,fontSize:11,fontWeight:600,color:DS.ink3,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,outline:"none",fontFamily:DS.body}}>{open?"▲ Hide":"▼ Drivers"}</button>
      {onAction&&<Btn onClick={onAction} variant="subtle" size="sm" style={{flex:2,justifyContent:"center"}}>{actionLabel||"Take Action →"}</Btn>}
    </div>
  </Card>
}

// ─── Comp Card ────────────────────────────────────────────────────────────────
function CompCard({ud,sig,locked,onUpgrade}){
  if(locked) return <LockedCard title="Compensation Intelligence" desc="See your market band, underpayment detection, and negotiation scripts." requiredPlan="orbit_pro" onUpgrade={onUpgrade}><div style={{padding:"20px",background:DS.surface,border:`1px solid ${DS.border}`,borderRadius:DS.r2,height:240}}><SL color={DS.teal}>💰 Compensation Intelligence</SL></div></LockedCard>
  const[modal,setModal]=useState(false)
  const yoe=sig.meta.yoe,role=ud?.targetRole||ud?.currentRole||getRoleConfig(ud).label,loc=ud?.location||"Bangalore"
  const base=800000+yoe*150000,lo=Math.round(base*.82),hi=Math.round(base*1.38),mid=Math.round((lo+hi)/2)
  const cur=ud?.currentCTC?parseInt(ud.currentCTC)*100000:null,delta=cur?cur-mid:null
  const switchGain=Math.round(mid*.28),raiseReady=sig.market.score>1100&&sig.proof.score>700
  const f=n=>n>=10000000?`₹${(n/10000000).toFixed(1)}Cr`:n>=100000?`₹${(n/100000).toFixed(0)}L`:`₹${n.toLocaleString("en-IN")}`
  return<>
    <Card style={{borderTop:`3px solid ${DS.teal}`}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
        <div><SL color={DS.teal}>💰 Compensation Intelligence</SL><div style={{fontFamily:DS.display,fontSize:15,fontWeight:800,color:DS.ink}}>{role}</div><div style={{fontSize:12,color:DS.ink3,marginTop:2}}>{loc} · {yoe.toFixed(1)}yr band</div></div>
        <Tag color={DS.teal} bg={DS.tBg} border={DS.tBd}>LIVE</Tag>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:12}}>
        {[{l:"Low",v:f(lo),hi:false},{l:"Midpoint",v:f(mid),hi:true},{l:"High",v:f(hi),hi:false}].map((b,i)=><div key={i} style={{flex:1,padding:"11px",background:b.hi?DS.tBg:DS.surface2,border:`1px solid ${b.hi?DS.tBd:DS.border}`,borderRadius:DS.r,textAlign:"center"}}><div style={{fontSize:9,fontWeight:700,color:DS.ink4,textTransform:"uppercase",letterSpacing:1.2,fontFamily:DS.mono,marginBottom:3}}>{b.l}</div><div style={{fontFamily:DS.mono,fontSize:14,fontWeight:700,color:b.hi?DS.teal:DS.ink3}}>{b.v}</div></div>)}
      </div>
      {delta!==null&&<div style={{padding:"9px 12px",background:delta<-200000?DS.rBg:delta>200000?DS.gBg:DS.aBg,border:`1px solid ${delta<-200000?DS.rBd:delta>200000?DS.gBd:DS.aBd}`,borderRadius:DS.r,marginBottom:11,display:"flex",alignItems:"center",gap:9}}>
        <span style={{fontSize:15}}>{delta<-200000?"⚠️":delta>200000?"✓":"≈"}</span>
        <div><div style={{fontSize:12,fontWeight:700,color:delta<-200000?DS.red:delta>200000?DS.green:DS.amber}}>{delta<-200000?`Likely underpaid by ${f(Math.abs(delta))}`:delta>200000?"Above market band":"Within market range"}</div><div style={{fontSize:11,color:DS.ink3}}>{delta<-200000?"Strong case for raise or switch.":"Market position looks healthy."}</div></div>
      </div>}
      <div style={{display:"flex",gap:8,marginBottom:11}}>
        <div style={{flex:1,padding:"9px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:DS.r}}><div style={{fontSize:9,color:DS.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:1,fontFamily:DS.mono}}>Switch Gain</div><div style={{fontFamily:DS.mono,fontSize:15,fontWeight:700,color:DS.green,marginTop:2}}>+{f(switchGain)}</div></div>
        <div style={{flex:1,padding:"9px",background:raiseReady?DS.gBg:DS.aBg,border:`1px solid ${raiseReady?DS.gBd:DS.aBd}`,borderRadius:DS.r}}><div style={{fontSize:9,color:DS.ink4,fontWeight:700,textTransform:"uppercase",letterSpacing:1,fontFamily:DS.mono}}>Raise Ready</div><div style={{fontFamily:DS.mono,fontSize:15,fontWeight:700,color:raiseReady?DS.green:DS.amber,marginTop:2}}>{raiseReady?"Ready":"Building"}</div></div>
      </div>
      <Btn onClick={()=>setModal(true)} variant="subtle" full>View Full Comp Report →</Btn>
    </Card>
    <Modal show={modal} onClose={()=>setModal(false)} title="Compensation Intelligence Report" width={640}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>
        {[{l:"Market Midpoint",v:f(mid),icon:"🎯",c:DS.teal,n:`${role} · ${loc}`},{l:"Switch Gain Est.",v:`+${f(switchGain)}`,icon:"🚀",c:DS.green,n:"Avg gain on job change"},{l:"Negotiation Leverage",v:sig.proof.score>700?"Strong":"Moderate",icon:"💬",c:DS.blue,n:"Based on Proof ELO"},{l:"Market Demand",v:sig.market.score>1100?"High":"Medium",icon:"📈",c:DS.amber,n:`${sig.meta.skills} skills documented`}].map((s,i)=><div key={i} style={{padding:"13px",background:DS.surface2,border:`1px solid ${DS.border}`,borderRadius:DS.r}}><div style={{fontSize:17,marginBottom:5}}>{s.icon}</div><div style={{fontFamily:DS.mono,fontSize:19,fontWeight:700,color:s.c}}>{s.v}</div><div style={{fontSize:12,fontWeight:600,color:DS.ink}}>{s.l}</div><div style={{fontSize:11,color:DS.ink4,marginTop:1}}>{s.n}</div></div>)}
      </div>
      <div style={{padding:"13px",background:DS.aBg,border:`1px solid ${DS.aBd}`,borderRadius:DS.r,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:DS.amber,marginBottom:4}}>💡 Negotiation Guidance</div>
        <div style={{fontSize:12,color:DS.ink2,lineHeight:1.65}}>Open at {f(Math.round(mid*1.15))} (+15% above midpoint). Hold firm at {f(Math.round(mid*1.05))} as floor. Lead with proof-backed outcomes, not job titles. Your strongest assets: {sig.meta.verified>0?"verified employment, ":""}{sig.meta.skills} documented skills, {yoe.toFixed(1)} yrs experience.</div>
      </div>
      <div style={{padding:"13px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:DS.r}}>
        <div style={{fontSize:12,fontWeight:700,color:DS.green,marginBottom:6}}>⚡ Actions That Increase Comp Power</div>
        {["Complete EPFO/UAN verification (+₹1.2L negotiation leverage)",`Add ${Math.max(0,8-sig.meta.skills)} more documented skills (each adds ~8% comp band)`,"Upload an impact proof document to Vault","Set a specific target role for accurate benchmarking"].map((a,i)=><div key={i} style={{display:"flex",gap:8,padding:"5px 0",borderBottom:`1px solid ${DS.gBd}`,alignItems:"flex-start"}}><span style={{color:DS.green,fontSize:12,flexShrink:0}}>→</span><span style={{fontSize:12,color:DS.ink2}}>{a}</span></div>)}
      </div>
    </Modal>
  </>
}

// ─── Market Gap Card ──────────────────────────────────────────────────────────
function GapCard({ud,sig,locked,onUpgrade,onNav}){
  if(locked) return <LockedCard title="Market Gap Analysis" desc="Identify skill gaps, fit score vs your target role, and a personalised fix plan." requiredPlan="orbit_pro" onUpgrade={onUpgrade}><div style={{padding:"20px",background:DS.surface,border:`1px solid ${DS.border}`,borderRadius:DS.r2,height:240}}><SL color={DS.amber}>🎯 Market Gap Analysis</SL></div></LockedCard>
  const[modal,setModal]=useState(false)
  const role=ud?.targetRole||ud?.currentRole||getRoleConfig(ud).label
  const gaps=[
    {sev:"high",  item:"Employment Verification", impact:"Unverified history reduces trust score 40%.", fix:"Verify via EPFO/UAN in Profile → Vault",     navTarget:"aura"},
    {sev:"high",  item:"Impact Language",          impact:"Profile lacks quantified outcomes (%, ₹, scale).", fix:"Add measurable outcomes in Profile → Career & Vault", navTarget:"aura"},
    {sev:"medium",item:"Cloud Skills (AWS/GCP)",   impact:"Requested in 78% of target role JDs.",   fix:"Add cloud skills in Forge → Proof Forge",    navTarget:"forge"},
    {sev:"medium",item:"System Design Proof",       impact:"Required for Senior+ roles.",             fix:"Add a Systems Design project in Profile → Vault", navTarget:"aura"},
    {sev:"low",   item:"Leadership Evidence",       impact:"No team lead or mentorship proof.",       fix:"Document leadership in Profile → Career & Vault", navTarget:"aura"},
    {sev:"low",   item:"TypeScript / Modern Stack", impact:"Growing demand, low substitution cost.",  fix:"Add to skill graph in Forge",                 navTarget:"forge"},
  ]
  const hi=gaps.filter(g=>g.sev==="high").length
  const fit=Math.round((1-(hi*.18+gaps.filter(g=>g.sev==="medium").length*.08))*100)
  const sevColor=s=>s==="high"?DS.red:s==="medium"?DS.amber:DS.ink4
  const sevBg=s=>s==="high"?DS.rBg:s==="medium"?DS.aBg:DS.surface2
  const sevBd=s=>s==="high"?DS.rBd:s==="medium"?DS.aBd:DS.border
  return<>
    <Card style={{borderTop:`3px solid ${DS.amber}`}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:11}}>
        <div><SL color={DS.amber}>🎯 Market Gap Analysis</SL><div style={{fontFamily:DS.display,fontSize:15,fontWeight:800,color:DS.ink}}>{role}</div></div>
        <div style={{textAlign:"center"}}><div style={{fontFamily:DS.mono,fontSize:22,fontWeight:700,color:fit>70?DS.green:fit>50?DS.amber:DS.red}}>{fit}</div><div style={{fontSize:9,color:DS.ink4,fontWeight:700,fontFamily:DS.mono}}>FIT SCORE</div></div>
      </div>
      {gaps.slice(0,3).map((g,i)=><div key={i} style={{display:"flex",gap:9,padding:"8px 0",borderBottom:`1px solid ${DS.border}`,alignItems:"center"}}>
        <span style={{fontSize:11,color:sevColor(g.sev),flexShrink:0}}>{g.sev==="high"?"●":g.sev==="medium"?"○":"◦"}</span>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:700,color:DS.ink}}>{g.item}</div>
          <div style={{fontSize:11,color:DS.ink3}}>{g.impact}</div>
        </div>
        <button onClick={()=>onNav&&onNav(g.navTarget||"forge")} style={{padding:"3px 10px",background:sevBg(g.sev),border:`1px solid ${sevBd(g.sev)}`,borderRadius:99,fontSize:10,fontWeight:700,color:sevColor(g.sev),cursor:"pointer",flexShrink:0,fontFamily:DS.mono,whiteSpace:"nowrap"}}>Fix →</button>
      </div>)}
      <div style={{display:"flex",gap:8,marginTop:11}}>
        <Btn onClick={()=>setModal(true)} variant="amber" full>Full Gap Report →</Btn>
        <Btn onClick={()=>onNav&&onNav("forge")} variant="subtle" full>Fix in Forge →</Btn>
      </div>
    </Card>
    <Modal show={modal} onClose={()=>setModal(false)} title={`Market Gap Report — ${role}`} width={660}>
      <div style={{padding:"12px 14px",background:DS.aBg,border:`1px solid ${DS.aBd}`,borderRadius:DS.r,marginBottom:18}}><div style={{fontSize:13,fontWeight:700,color:DS.amber,marginBottom:4}}>Why you're {fit>70?"well-positioned":fit>50?"moderately competitive":"behind market"}</div><div style={{fontSize:12,color:DS.ink2,lineHeight:1.7}}>Your profile shows {sig.meta.yoe.toFixed(1)} yrs experience and {sig.meta.skills} documented skills. {hi>0?`${hi} high-severity gaps significantly reduce your match rate.`:"Core profile is well-aligned."} Addressing the top 2 gaps could improve your score by ~{Math.round(hi*18+5)}%.</div></div>
      {gaps.map((g,i)=><div key={i} style={{padding:"11px 13px",background:DS.surface2,border:`1px solid ${DS.border}`,borderRadius:DS.r,marginBottom:8}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}><span style={{padding:"2px 8px",background:sevBg(g.sev),color:sevColor(g.sev),border:`1px solid ${sevBd(g.sev)}`,borderRadius:99,fontSize:10,fontWeight:700,fontFamily:DS.mono}}>{g.sev.toUpperCase()}</span><span style={{fontSize:13,fontWeight:700,color:DS.ink}}>{g.item}</span></div><div style={{fontSize:12,color:DS.ink2,marginBottom:6}}>{g.impact}</div><div style={{fontSize:11,fontWeight:600,color:DS.primary}}>→ Fix: {g.fix}</div></div>)}
    </Modal>
  </>
}

// ─── Recruiter Visibility Card ────────────────────────────────────────────────
function RecruiterCard({ud,sig,onNav}){
  const checks=[
    {l:"Employment verified",  done:sig.meta.verified>0,  tab:"vault",    weight:35},
    {l:"Skills documented (5+)",done:sig.meta.skills>=5,  tab:"forge",    weight:25},
    {l:"Profile summary written",done:sig.meta.hasSummary,tab:"timeline", weight:20},
    {l:"Target role set",      done:sig.meta.hasTarget,   tab:"orbit",    weight:20},
  ]
  const vis=checks.reduce((a,c)=>a+(c.done?c.weight:0),0)
  const sc=vis>=80?DS.green:vis>=50?DS.amber:DS.red
  const lbl=vis>=80?"Actively Visible":vis>=50?"Partially Visible":"Low Visibility"
  const pending=checks.filter(c=>!c.done)
  return<Card style={{borderTop:`3px solid ${DS.blue}`}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}><div><SL color={DS.blue}>👁 Recruiter Visibility</SL><div style={{fontFamily:DS.mono,fontSize:17,fontWeight:700,color:sc}}>{lbl}</div><div style={{fontSize:11,color:DS.ink3,marginTop:1}}>{vis}/100 score</div></div><Ring score={vis} max={100} color={sc} size={54} label="VIS"/></div>
    <Bar value={vis} color={sc} h={4} style={{marginBottom:11}}/>
    {checks.map((c,i)=>(
      <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${DS.border}`}}>
        <span style={{fontSize:13,color:c.done?DS.green:DS.ink4,flexShrink:0}}>{c.done?"✓":"○"}</span>
        <span style={{fontSize:12,color:c.done?DS.ink2:DS.ink4,fontWeight:c.done?500:400,flex:1}}>{c.l}</span>
        <span style={{fontFamily:DS.mono,fontSize:10,fontWeight:700,color:DS.ink4}}>+{c.weight}</span>
        {!c.done&&<button onClick={()=>onNav&&onNav(c.tab)} style={{padding:"2px 9px",background:DS.blBg,border:`1px solid ${DS.blBd}`,borderRadius:99,fontSize:10,fontWeight:700,color:DS.blue,cursor:"pointer",fontFamily:DS.mono}}>Fix →</button>}
      </div>
    ))}
    {pending.length>0&&<Btn onClick={()=>onNav&&onNav(pending[0].tab)} variant="ghost" full style={{marginTop:10}}>Fix Top Issue → {pending[0].l}</Btn>}
    {vis>=80&&<div style={{marginTop:10,padding:"8px 12px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:DS.r,fontSize:11,color:DS.green,fontWeight:600}}>✓ Your profile is actively visible to matching recruiters</div>}
  </Card>
}

// ─── Risk Card ────────────────────────────────────────────────────────────────
function RiskCard({sig,onLayoff}){
  const risk=sig.mobility.score<800?"High":sig.mobility.score<1000?"Medium":"Low"
  const rc=risk==="High"?DS.red:risk==="Medium"?DS.amber:DS.green
  const res=Math.round((sig.mobility.score/2000)*100)
  return<Card style={{borderTop:`3px solid ${rc}`}}>
    <SL color={rc}>🛡 Career Resilience</SL>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}><div><div style={{fontFamily:DS.mono,fontSize:17,fontWeight:700,color:rc}}>Layoff Risk: {risk}</div><div style={{fontSize:11,color:DS.ink3,marginTop:1}}>Career Mobility {sig.mobility.score} · {res}% resilience</div></div><Ring score={res} max={100} color={rc} size={50} label="RES"/></div>
    <Bar value={res} color={rc} h={4} style={{marginBottom:11}}/>
    <div style={{padding:"8px 11px",background:risk==="High"?DS.rBg:risk==="Medium"?DS.aBg:DS.gBg,border:`1px solid ${risk==="High"?DS.rBd:risk==="Medium"?DS.aBd:DS.gBd}`,borderRadius:DS.r,fontSize:11,color:rc,marginBottom:10}}>{risk==="High"?"⚠️ Low mobility. A layoff today means a 4–8 month search.":risk==="Medium"?"⚡ Moderate resilience. Improve proof and skills.":"✓ Well-positioned to transition within 60 days."}</div>
    <Btn onClick={onLayoff} variant="danger" full>Activate Layoff Mode →</Btn>
  </Card>
}

// ─── Profile Health ───────────────────────────────────────────────────────────
function HealthCard({sig,onNav}){
  const checks=[
    {l:"Professional summary",done:sig.meta.hasSummary,  tab:"timeline"},
    {l:"Employment history",  done:sig.meta.expsCount>0, tab:"timeline"},
    {l:"5+ skills documented",done:sig.meta.skills>=5,   tab:"forge"},
    {l:"Employment verified", done:sig.meta.verified>0,  tab:"aura"},
    {l:"Target role set",     done:sig.meta.hasTarget,   tab:"orbit"},
    {l:"Projects / proof",    done:sig.meta.hasProj,     tab:"aura"},
    {l:"Certifications",      done:sig.meta.hasCerts,    tab:"aura"},
    {l:"Vault documents",     done:sig.meta.hasVault,    tab:"aura"},
  ]
  const done=checks.filter(c=>c.done).length,pct=Math.round((done/checks.length)*100)
  const pc=pct>=80?DS.green:pct>=50?DS.amber:DS.red
  const firstPending=checks.find(c=>!c.done)
  return<Card>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
      <SL>◎ Profile Health</SL>
      <Tag color={pc} bg={pct>=80?DS.gBg:pct>=50?DS.aBg:DS.rBg} border={pct>=80?DS.gBd:pct>=50?DS.aBd:DS.rBd}>{done}/{checks.length} · {pct}%</Tag>
    </div>
    <Bar value={pct} color={pc} h={5} style={{marginBottom:12}}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:1,marginBottom:10}}>
      {checks.map((c,i)=>(
        <div key={i} onClick={!c.done?()=>onNav&&onNav(c.tab):undefined}
          style={{display:"flex",alignItems:"center",gap:6,padding:"5px 4px",borderRadius:6,cursor:c.done?"default":"pointer",transition:"background .12s"}}
          onMouseEnter={e=>{if(!c.done)e.currentTarget.style.background=DS.surface2}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent"}}>
          <span style={{fontSize:12,color:c.done?DS.green:DS.ink4,flexShrink:0}}>{c.done?"✓":"○"}</span>
          <span style={{fontSize:11,color:c.done?DS.ink2:DS.ink4,fontWeight:c.done?500:400}}>{c.l}</span>
          {!c.done&&<span style={{fontSize:9,color:DS.primary,marginLeft:"auto"}}>→</span>}
        </div>
      ))}
    </div>
    {firstPending&&<Btn onClick={()=>onNav&&onNav(firstPending.tab)} variant="subtle" full size="sm">Complete: {firstPending.l} →</Btn>}
  </Card>
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({sig,ud,onNav}){
  const acts=[]
  if(!sig.meta.hasUAN)acts.push({icon:"🔐",title:"Verify employment via EPFO/UAN",roi:"Boosts Proof Strength significantly, unlocks recruiter trust badge",tab:"vault",imp:"critical"})
  if(!sig.meta.hasSummary)acts.push({icon:"✍️",title:"Write your professional summary",roi:"Improves Role Fit Score and recruiter visibility 3×",tab:"timeline",imp:"high"})
  if(sig.meta.skills<8)acts.push({icon:"⚡",title:`Document ${8-sig.meta.skills} more verified skills`,roi:"Improves Market Standing per skill, boosts comp band ~8%",tab:"forge",imp:"high"})
  if(!sig.meta.hasTarget)acts.push({icon:"🎯",title:"Set your target role",roi:"Enables accurate market gap analysis and comp benchmarking",tab:"orbit",imp:"medium"})
  acts.push({icon:"💰",title:"Update current CTC for comp benchmarking",roi:"Reveals underpayment gaps, enables negotiation guidance",tab:"orbit",imp:"medium"})
  const top=acts[0]
  return<Card style={{borderTop:`3px solid ${DS.primary}`,background:`linear-gradient(135deg,${DS.pBg} 0%,${DS.surface} 100%)`}}>
    <SL color={DS.primary}>⚡ Highest-ROI Action Right Now</SL>
    <div style={{display:"flex",gap:13,alignItems:"flex-start",marginBottom:13}}><div style={{fontSize:26,flexShrink:0}}>{top.icon}</div><div><div style={{fontFamily:DS.display,fontSize:15,fontWeight:800,color:DS.ink,marginBottom:3}}>{top.title}</div><div style={{fontSize:12,color:DS.ink3,lineHeight:1.6,marginBottom:7}}>{top.roi}</div><Tag color={top.imp==="critical"?DS.red:top.imp==="high"?DS.amber:DS.primary} bg={top.imp==="critical"?DS.rBg:top.imp==="high"?DS.aBg:DS.pBg} border={top.imp==="critical"?DS.rBd:top.imp==="high"?DS.aBd:DS.pBd}>{top.imp.toUpperCase()} IMPACT</Tag></div></div>
    <Btn onClick={()=>onNav(top.tab)} full>Take Action Now →</Btn>
    <div style={{marginTop:11,borderTop:`1px solid ${DS.border}`,paddingTop:9}}>
      <div style={{fontSize:10,color:DS.ink4,fontWeight:700,marginBottom:5}}>OTHER PENDING ACTIONS</div>
      {acts.slice(1,3).map((a,i)=><div key={i} onClick={()=>onNav(a.tab)} className="olink" style={{display:"flex",gap:8,padding:"5px 0",alignItems:"center",color:DS.ink3,fontSize:12,borderBottom:`1px solid ${DS.border}`}}><span>{a.icon}</span><span style={{flex:1}}>{a.title}</span><span style={{color:DS.primary,fontSize:11}}>→</span></div>)}
    </div>
  </Card>
}

// ─── ROI Card ─────────────────────────────────────────────────────────────────
function ROICard({sig}){
  const items=[{a:"Complete employment verification",u:120000,t:"negotiation leverage"},{a:"Add 3 more verified skills",u:80000,t:"comp band improvement"},{a:"Set target role + optimise profile",u:200000,t:"switch gain increase"},{a:"Complete profile to 100%",u:150000,t:"recruiter match improvement"}]
  const total=items.reduce((a,b)=>a+b.u,0)
  const f=n=>n>=100000?`₹${(n/100000).toFixed(0)}L`:`₹${n.toLocaleString("en-IN")}`
  return<Card style={{borderTop:`3px solid ${DS.green}`}}>
    <SL color={DS.green}>₹ Financial Career ROI</SL>
    <div style={{fontFamily:DS.display,fontSize:14,fontWeight:800,color:DS.ink,marginBottom:3}}>Estimated {f(total)} in unlockable annual earnings</div>
    <div style={{fontSize:11,color:DS.ink3,marginBottom:12}}>Based on your current profile gaps and market data</div>
    {items.map((it,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",borderBottom:`1px solid ${DS.border}`}}><div style={{fontFamily:DS.mono,fontSize:12,fontWeight:700,color:DS.green,width:46}}>{f(it.u)}</div><div><div style={{fontSize:12,fontWeight:600,color:DS.ink}}>{it.a}</div><div style={{fontSize:10,color:DS.ink4}}>{it.t}</div></div></div>)}
    <div style={{marginTop:11,padding:"10px 13px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:DS.r,display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:12,fontWeight:700,color:DS.green}}>Total career ROI unlockable</div><div style={{fontFamily:DS.mono,fontSize:17,fontWeight:700,color:DS.green}}>{f(total)}/yr</div></div>
  </Card>
}

// ─── AI Interview Card (ELITE) ───────────────────────────────────────────────
function AIInterviewCard({ud,onNav,locked,onUpgrade}){
  if(locked) return <LockedCard title="AI Interview Sessions" desc="5 AI-powered mock interview sessions per month with real-time feedback and scoring." requiredPlan="orbit_elite" onUpgrade={onUpgrade}><div style={{padding:"20px",background:DS.surface,border:`1px solid ${DS.border}`,borderRadius:DS.r2,height:200}}><SL color={DS.purple}>🎤 AI Interview</SL></div></LockedCard>
  const used=(ud?.interviewTranscripts||[]).filter(t=>{const d=new Date(t.date||0);const c=new Date();return d.getMonth()===c.getMonth()&&d.getFullYear()===c.getFullYear()}).length
  const allowed=5,remaining=Math.max(0,allowed-used)
  const lastScore=(ud?.interviewTranscripts||[]).slice(-1)[0]?.overall_score
  return<Card style={{borderTop:`3px solid ${DS.purple}`,background:`linear-gradient(135deg,${DS.purBg} 0%,${DS.surface} 100%)`}}>
    <SL color={DS.purple}>🎤 AI Interview — Elite</SL>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
      <div>
        <div style={{fontFamily:DS.mono,fontSize:24,fontWeight:700,color:DS.purple,lineHeight:1}}>{remaining}<span style={{fontSize:12,color:DS.ink4}}>/{allowed}</span></div>
        <div style={{fontSize:11,color:DS.ink3,marginTop:3}}>sessions remaining this month</div>
      </div>
      {lastScore!=null&&<div style={{textAlign:"right"}}>
        <div style={{fontFamily:DS.mono,fontSize:20,fontWeight:700,color:lastScore>=70?DS.green:DS.amber}}>{lastScore}/100</div>
        <div style={{fontSize:10,color:DS.ink4}}>last score</div>
      </div>}
    </div>
    <div style={{height:6,background:DS.purBg,borderRadius:99,marginBottom:12,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${(remaining/allowed)*100}%`,background:DS.purple,borderRadius:99,transition:"width .6s"}}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      {["Behavioural","Technical","Case Study","System Design"].map((type,i)=>(
        <button key={i} onClick={()=>onNav("aura")} style={{padding:"8px 10px",background:DS.surface,border:`1px solid ${DS.purBd}`,borderRadius:DS.r,fontSize:11,fontWeight:600,color:DS.purple,cursor:"pointer",textAlign:"left",fontFamily:DS.body}}>
          {type} <span style={{color:DS.ink4,fontWeight:400}}>→</span>
        </button>
      ))}
    </div>
    <Btn onClick={()=>onNav("aura")} style={{background:DS.purple,color:"#1A1714",border:"none",boxShadow:`0 4px 14px ${DS.purple}30`}} full>{remaining>0?"Start Interview Session →":"Sessions exhausted — resets next month"}</Btn>
  </Card>
}

// ─── Mentor Hub Card (ELITE) ─────────────────────────────────────────────────
function MentorHubCard({ud,onNav,locked,onUpgrade}){
  if(locked) return <LockedCard title="Mentor Hub Listing" desc="List yourself on Mentor Hub and earn 15% commission from mentoring sessions." requiredPlan="orbit_elite" onUpgrade={onUpgrade}><div style={{padding:"20px",background:DS.surface,border:`1px solid ${DS.border}`,borderRadius:DS.r2,height:200}}><SL color={DS.amber}>🏆 Mentor Hub</SL></div></LockedCard>
  const listed=!!(ud?.mentorHubListed)
  const earnings=ud?.mentorHubEarnings||0
  const f=n=>n>=100000?`₹${(n/100000).toFixed(1)}L`:`₹${n.toLocaleString("en-IN")}`
  return<Card style={{borderTop:`3px solid ${DS.amber}`,background:`linear-gradient(135deg,${DS.aBg} 0%,${DS.surface} 100%)`}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
      <SL color={DS.amber}>🏆 Mentor Hub — Elite</SL>
      <Tag color={listed?DS.green:DS.amber} bg={listed?DS.gBg:DS.aBg} border={listed?DS.gBd:DS.aBd}>{listed?"Listed":"Not Listed"}</Tag>
    </div>
    {listed?(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          {[{l:"Total Earnings",v:f(earnings),c:DS.green},{l:"Commission Rate",v:"15%",c:DS.amber},{l:"Sessions Done",v:ud?.mentorHubSessions||0,c:DS.blue},{l:"Rating",v:ud?.mentorHubRating?`${ud.mentorHubRating}/5`:"—",c:DS.purple}].map((s,i)=>(
            <div key={i} style={{padding:"10px",background:DS.surface,border:`1px solid ${DS.border}`,borderRadius:DS.r,textAlign:"center"}}>
              <div style={{fontFamily:DS.mono,fontSize:16,fontWeight:700,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:DS.ink4,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
        <Btn onClick={()=>onNav("nexus")} variant="amber" full>Manage Mentor Profile →</Btn>
      </div>
    ):(
      <div>
        <div style={{fontSize:12,color:DS.ink2,lineHeight:1.6,marginBottom:12}}>List yourself as a mentor and earn from 1:1 sessions. Capabilio takes 15% commission. Set your own rate and availability.</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
          {[{v:"₹1,000–5,000",l:"per session"},{v:"15%",l:"commission only"},{v:"You set",l:"availability"}].map((s,i)=>(
            <div key={i} style={{padding:"8px",background:DS.surface,border:`1px solid ${DS.aBd}`,borderRadius:DS.r,textAlign:"center"}}>
              <div style={{fontFamily:DS.mono,fontSize:13,fontWeight:700,color:DS.amber}}>{s.v}</div>
              <div style={{fontSize:9,color:DS.ink4,marginTop:2}}>{s.l}</div>
            </div>
          ))}
        </div>
        <Btn onClick={()=>onNav("nexus")} style={{background:DS.amber,color:"#1A1714",border:"none"}} full>List on Mentor Hub →</Btn>
      </div>
    )}
  </Card>
}

// ─── Transition Tracks Card (ELITE) ──────────────────────────────────────────
function TransitionTracksCard({ud,onNav,locked,onUpgrade}){
  if(locked) return <LockedCard title="Transition Tracks" desc="Structured multi-week career transition programs for role switches, returns, and comp upgrades." requiredPlan="orbit_elite" onUpgrade={onUpgrade}><div style={{padding:"20px",background:DS.surface,border:`1px solid ${DS.border}`,borderRadius:DS.r2,height:200}}><SL color={DS.blue}>🗺 Transition Tracks</SL></div></LockedCard>
  const TRACKS=[
    {id:"switch",    icon:"🔀",label:"Switch Track",    desc:"Role transition in 60 days",         wks:8,  color:DS.blue},
    {id:"return",    icon:"🌱",label:"Return Track",    desc:"Career re-entry with proof",          wks:6,  color:DS.amber},
    {id:"comp",      icon:"💰",label:"Comp Upgrade",    desc:"₹2–5L raise in 90 days",             wks:12, color:DS.green},
    {id:"senior",    icon:"🚀",label:"Senior Track",    desc:"IC → Senior IC promotion path",      wks:16, color:DS.purple},
  ]
  return<Card style={{borderTop:`3px solid ${DS.blue}`}}>
    <SL color={DS.blue}>🗺 Transition Tracks — Elite</SL>
    <div style={{fontSize:12,color:DS.ink3,marginBottom:12}}>Structured multi-week programs with milestones, Forge missions, and mentorship checkpoints.</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      {TRACKS.map((t,i)=>(
        <button key={i} onClick={()=>onNav("forge")}
          style={{padding:"12px",background:t.color+"10",border:`1.5px solid ${t.color}22`,borderRadius:DS.r,cursor:"pointer",textAlign:"left",transition:"all .15s",fontFamily:DS.body}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor=t.color+"55";e.currentTarget.style.background=t.color+"18"}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=t.color+"22";e.currentTarget.style.background=t.color+"10"}}>
          <div style={{fontSize:18,marginBottom:5}}>{t.icon}</div>
          <div style={{fontSize:12,fontWeight:700,color:DS.ink,marginBottom:2}}>{t.label}</div>
          <div style={{fontSize:10,color:DS.ink3,marginBottom:4}}>{t.desc}</div>
          <div style={{fontFamily:DS.mono,fontSize:10,fontWeight:700,color:t.color}}>{t.wks} weeks</div>
        </button>
      ))}
    </div>
    <Btn onClick={()=>onNav("forge")} variant="ghost" full>Explore All Tracks →</Btn>
  </Card>
}

// ─── Layoff Mode ──────────────────────────────────────────────────────────────
function LayoffMode({ud,sig,onClose}){
  const[step,setStep]=useState(0)
  const yoe=sig.meta.yoe,f=n=>n>=100000?`₹${(n/100000).toFixed(0)}L`:`₹${n.toLocaleString("en-IN")}`
  const base=600000+yoe*100000
  const steps=[
    {title:"Emergency Checklist",icon:"⚡",items:[{done:sig.meta.hasVault,l:"Resume in Vault — latest version",a:"Upload to Vault"},{done:sig.meta.verified>0,l:"Employment verification active",a:"Verify via EPFO"},{done:sig.meta.hasSummary,l:"Profile summary current",a:"Update Summary"},{done:sig.meta.hasTarget,l:"Target role clearly defined",a:"Set Target Role"},{done:sig.meta.skills>=8,l:"8+ skills documented",a:"Add in Forge"}]},
    {title:"Fastest-Switch Roles",icon:"🔀",roles:[{r:"Senior Software Engineer",m:92,ctc:`${f(base*1.1)}–${f(base*1.4)}`,why:"Core skills map directly",t:"2–4 weeks"},{r:"Technical Lead",m:78,ctc:`${f(base*1.2)}–${f(base*1.5)}`,why:"Seniority signals align",t:"4–6 weeks"},{r:"Solutions Architect",m:65,ctc:`${f(base*1.3)}–${f(base*1.7)}`,why:"Fill one proof gap first",t:"6–8 weeks"}]},
    {title:"30-Day Recovery Plan",icon:"🗺",plan:[{w:"Week 1",t:"Complete checklist, verify employment, upload resume to Vault"},{w:"Week 2",t:"Apply to 5 matched roles on Launchpad, activate recruiter visibility"},{w:"Week 3",t:"Complete 2 Switch Forge tasks, book a mentor session on Nexus"},{w:"Week 4",t:"Follow up on applications, negotiate using Compensation Intelligence"}]}
  ]
  return<div style={{position:"fixed",inset:0,zIndex:8000,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"60px 16px 16px",background:"rgba(185,28,28,.06)",backdropFilter:"blur(4px)"}}>
    <div style={{width:"100%",maxWidth:680,background:DS.surface,borderRadius:DS.r3,boxShadow:DS.sh3,border:`2px solid ${DS.rBd}`,animation:"slideUp .3s ease",maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 22px",background:DS.rBg,borderBottom:`1px solid ${DS.rBd}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🛑</span><div><div style={{fontFamily:DS.display,fontSize:17,fontWeight:800,color:DS.red}}>Layoff Mode Active</div><div style={{fontSize:11,color:DS.red+"99"}}>Career recovery and mobility console</div></div></div>
        <button onClick={onClose} style={{padding:"6px 13px",background:DS.surface,border:`1px solid ${DS.rBd}`,borderRadius:DS.r,fontSize:12,fontWeight:700,color:DS.red,cursor:"pointer",outline:"none"}}>Exit Mode</button>
      </div>
      <div style={{display:"flex",borderBottom:`1px solid ${DS.border}`,flexShrink:0}}>
        {steps.map((s,i)=><button key={i} onClick={()=>setStep(i)} style={{flex:1,padding:"11px",border:"none",background:"transparent",color:step===i?DS.red:DS.ink3,fontSize:12,fontWeight:step===i?700:500,cursor:"pointer",borderBottom:`2px solid ${step===i?DS.red:"transparent"}`,outline:"none",fontFamily:DS.body,display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><span>{s.icon}</span>{s.title.split(" ")[0]}</button>)}
      </div>
      <div style={{padding:"22px",overflowY:"auto"}}>
        <div style={{fontFamily:DS.display,fontSize:15,fontWeight:800,color:DS.ink,marginBottom:14}}>{steps[step].icon} {steps[step].title}</div>
        {steps[step].items&&steps[step].items.map((it,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 13px",background:it.done?DS.gBg:DS.surface2,border:`1px solid ${it.done?DS.gBd:DS.border}`,borderRadius:DS.r,marginBottom:8}}><span style={{fontSize:15,color:it.done?DS.green:DS.ink4}}>{it.done?"✓":"○"}</span><span style={{flex:1,fontSize:13,fontWeight:it.done?600:400,color:it.done?DS.green:DS.ink}}>{it.l}</span>{!it.done&&<Btn size="sm" variant="ghost">{it.a} →</Btn>}</div>)}
        {steps[step].roles&&steps[step].roles.map((r,i)=><div key={i} style={{padding:"11px 13px",background:DS.surface2,border:`1px solid ${DS.border}`,borderRadius:DS.r,marginBottom:8}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}><div style={{fontSize:13,fontWeight:700,color:DS.ink}}>{r.r}</div><Tag color={DS.green} bg={DS.gBg} border={DS.gBd}>{r.m}% match</Tag></div><div style={{fontSize:12,color:DS.ink3,marginBottom:3}}>Comp: {r.ctc}</div><div style={{display:"flex",gap:12}}><span style={{fontSize:11,color:DS.ink4}}>Why: {r.why}</span><span style={{fontSize:11,color:DS.ink4}}>Timeline: {r.t}</span></div></div>)}
        {steps[step].plan&&<>
          <div style={{padding:"12px 14px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:DS.r,marginBottom:14}}>
            {steps[step].plan.map((p,i)=><div key={i} style={{display:"flex",gap:9,padding:"6px 0",borderBottom:`1px solid ${DS.gBd}`}}><span style={{fontSize:11,fontWeight:700,color:DS.green,width:50,flexShrink:0}}>{p.w}</span><span style={{fontSize:12,color:DS.ink2}}>{p.t}</span></div>)}
          </div>
          <div style={{padding:"10px 13px",background:DS.blBg,border:`1px solid ${DS.blBd}`,borderRadius:DS.r}}><div style={{fontSize:12,fontWeight:700,color:DS.blue,marginBottom:3}}>💬 Remember</div><div style={{fontSize:12,color:DS.ink2,lineHeight:1.65}}>Layoffs are market events, not performance reviews. Your ELO score, verified proof, and documented skills are yours.</div></div>
        </>}
      </div>
    </div>
  </div>
}

// ─── Resume Ingestion Modal ───────────────────────────────────────────────────
function ResumeModal({show,onClose,user,ud,onSave}){
  const[stage,setStage]=useState("upload")
  const[file,setFile]=useState(null)
  const[parsed,setParsed]=useState(null)
  const[err,setErr]=useState("")
  const ref=useRef()

  const handle=async f=>{
    setFile(f);setErr("");setStage("parsing")
    const form=new FormData();form.append("resume",f)
    try{
      const res=await fetch(`${API}/api/professional/parse-resume`,{method:"POST",body:form})
      const text=await res.text()
      // BUG FIX: this used to throw on !res.ok BEFORE reading the body, so the
      // real error message the backend sent (e.g. "GROQ 429: rate limited")
      // was discarded and the user only ever saw a generic "Server error 500"
      // with zero diagnostic detail. Now we always read the body first and
      // surface whatever detail is actually there.
      let d;try{d=JSON.parse(text)}catch{throw new Error(res.ok?"Invalid response from server":`Server error ${res.status}`)}
      if(!res.ok||d.error)throw new Error(d.error||`Server error ${res.status}`)
      setParsed(d)
      // BUG FIX: the backend can return a valid 200 with every field empty
      // (a silent AI-extraction miss, not an actually blank resume) — this
      // used to render the same green "Extraction complete" banner as a real
      // success. d._empty (set server-side) flags that case explicitly.
      if(d._empty) setErr("Couldn't automatically pull details from this file — the text came through but nothing usable was extracted. Please review and add entries manually below.")
      setStage("review")
    }catch(e){
      const fallback={experiences:[],skills:[],projects:[],certifications:[],summary:"",_fallback:true,_error:e.message}
      setParsed(fallback)
      setErr(`Server parsing unavailable (${e.message}). You can still manually review and import.`)
      setStage("review")
    }
  }
  const save=async()=>{
    setStage("saving")
    try{
      const u={}
      if(parsed?.experiences?.length)u.experiences=parsed.experiences
      if(parsed?.skills?.length)u.skills=parsed.skills
      if(parsed?.summary)u.profileSummary=parsed.summary
      if(parsed?.projects?.length)u.resumeProjects=parsed.projects
      if(parsed?.certifications?.length)u.certifications=parsed.certifications
      // BUG FIX: parsed.title (the resume's professional title, e.g. "Senior Data
      // Analyst") was extracted by the backend but silently discarded here — nothing
      // ever wrote it anywhere, so Home/Pulse always showed the generic path label
      // instead of the user's real title. `headline` is a real profiles column
      // already read by Pulse.jsx and ProfessionalHome.jsx — only set it if the
      // resume actually found one, and don't clobber a headline the user already
      // wrote by hand in Profile.
      if(parsed?.title&&!ud?.headline)u.headline=parsed.title
      u.lastResumeUpload=new Date().toISOString()
      // Add resume file to vaultFiles so it appears in Career & Vault simple vault
      if(file){
        const vaultEntry={id:Date.now().toString(),name:file.name,category:"Resume",size:file.size,url:null,uploadedAt:new Date().toISOString(),_source:"resume"}
        const existing=(ud?.vaultFiles||[]).filter(f=>!(f.category==="Resume"&&f.name===file.name))
        u.vaultFiles=[vaultEntry,...existing]
      }
      await onSave(u)
      // BUG FIX: resume skills were only ever written to profiles.skills (a flat
      // JSONB array used by Launchpad job-matching and the Aura chip count) — the
      // real Skill Graph (user_skills table, what the Skills page and its radar
      // actually read) never received them, so "Skills" always looked empty even
      // after a successful resume import. Bulk-upsert is additive/idempotent
      // (upserts on user_id+slug) so re-importing the same resume just refreshes
      // scores rather than duplicating rows. Non-fatal if it fails — the profile
      // save above already succeeded and shouldn't be rolled back for this.
      if(parsed?.skills?.length){
        try{await skillsApi.bulkUpsert(parsed.skills,"resume")}
        catch(e){console.error("[resume] skill graph sync failed:",e.message)}
      }
      setStage("done")
    }catch(e){setErr("Save failed. Retry.");setStage("review")}
  }
  const reset=()=>{setStage("upload");setFile(null);setParsed(null);setErr("")}

  return<Modal show={show} onClose={()=>{reset();onClose()}} title="Import Resume" width={600}>
    {stage==="upload"&&<div>
      <div style={{marginBottom:18}}>
        <div onClick={()=>ref.current?.click()} style={{border:`2px dashed ${DS.primary}`,borderRadius:DS.r2,padding:"34px 22px",textAlign:"center",cursor:"pointer",background:DS.pBg}} onDragOver={e=>{e.preventDefault()}} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handle(f)}}>
          <div style={{fontSize:30,marginBottom:7}}>📄</div><div style={{fontSize:13,fontWeight:700,color:DS.primary}}>Drop PDF or DOCX here, or click to browse</div><div style={{fontSize:11,color:DS.ink4,marginTop:3}}>Extracts employment, skills, projects, and summary automatically</div>
        </div>
        <input ref={ref} type="file" accept=".pdf,.docx" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)handle(f)}}/>
      </div>
      {err&&<div style={{padding:"9px 13px",background:DS.rBg,border:`1px solid ${DS.rBd}`,borderRadius:DS.r,fontSize:12,color:DS.red,marginBottom:11}}>⚠️ {err}</div>}
      <div style={{padding:"9px 13px",background:DS.blBg,border:`1px solid ${DS.blBd}`,borderRadius:DS.r,fontSize:12,color:DS.blue}}>ℹ️ Extracted data creates draft Timeline entries. You review and approve all changes before they are published.</div>
    </div>}
    {stage==="parsing"&&<div style={{textAlign:"center",padding:"40px"}}><Spin size={36}/><div style={{fontFamily:DS.display,fontSize:15,fontWeight:700,color:DS.ink,marginTop:14}}>Parsing resume…</div></div>}
    {stage==="review"&&parsed&&<div>
      {/* BUG FIX: this used to render unconditionally, so a silent all-zeros
          extraction (parsed._empty) looked identical to a real success. */}
      {!err&&<div style={{padding:"9px 13px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:DS.r,fontSize:12,color:DS.green,marginBottom:14}}>✓ Extraction complete. Review before saving.</div>}
      {[{l:"Experience entries",c:parsed.experiences?.length||0,i:"🏢"},{l:"Skills extracted",c:parsed.skills?.length||0,i:"⚡"},{l:"Projects found",c:parsed.projects?.length||0,i:"🔨"},{l:"Certifications",c:parsed.certifications?.length||0,i:"📜"}].map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 13px",background:DS.surface2,border:`1px solid ${DS.border}`,borderRadius:DS.r,marginBottom:7}}><span style={{fontSize:17}}>{s.i}</span><span style={{flex:1,fontSize:13,fontWeight:600,color:DS.ink}}>{s.l}</span><Tag color={s.c>0?DS.green:DS.ink4} bg={s.c>0?DS.gBg:DS.surface2} border={s.c>0?DS.gBd:DS.border}>{s.c} found</Tag></div>)}
      {err&&<div style={{padding:"9px 13px",background:DS.rBg,border:`1px solid ${DS.rBd}`,borderRadius:DS.r,fontSize:12,color:DS.red,marginBottom:11}}>⚠️ {err}</div>}
      <div style={{display:"flex",gap:9,marginTop:14}}><Btn onClick={reset} variant="ghost" style={{flex:1}}>Re-upload</Btn><Btn onClick={save} full style={{flex:2}}>Save as Draft Entries →</Btn></div>
    </div>}
    {stage==="saving"&&<div style={{textAlign:"center",padding:"40px"}}><Spin size={36}/><div style={{fontSize:13,fontWeight:600,color:DS.ink,marginTop:13}}>Saving to profile…</div></div>}
    {stage==="done"&&<div style={{textAlign:"center",padding:"30px"}}><div style={{fontSize:38,marginBottom:11}}>✓</div><div style={{fontFamily:DS.display,fontSize:17,fontWeight:800,color:DS.green}}>Profile updated successfully</div><div style={{fontSize:12,color:DS.ink3,marginTop:7,marginBottom:18}}>Experience and skills saved. View them in your Profile → Career & Vault tab.</div><Btn onClick={()=>{reset();onClose()}} variant="success">Done ✓</Btn></div>}
  </Modal>
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────
function TimelineTab({ud,user,onSave}){
  const[showAdd,setShowAdd]=useState(false)
  const[edit,setEdit]=useState(null)
  const[saving,setSaving]=useState(false)
  const blank={company:"",role:"",startDate:"",endDate:"",isCurrent:false,description:"",outcomes:"",verificationStatus:"unverified"}
  const[form,setForm]=useState(blank)
  // Normalise both legacy (roles[] array) and new flat structure so both render correctly
  const exps=(ud?.experiences||[]).map(e=>{
    if(e.role) return e  // already flat — new format
    const r0=e.roles?.[0]||{}
    return{
      ...e,
      role: r0.title||"",
      startDate: e.startDate||e.startYear||r0.startDate||"",
      endDate: e.endDate||e.endYear||r0.endDate||"",
      isCurrent: !!(e.isCurrent??e.current??r0.current??false),
      description: e.description||(Array.isArray(r0.responsibilities)?r0.responsibilities.join("\n"):r0.responsibilities)||"",
      skills: e.skills||(r0.skills?r0.skills.split(",").map(s=>s.trim()).filter(Boolean):[]),
      location: e.location||"",
    }
  })

  const handleSave=async()=>{
    if(!form.company||!form.role)return
    setSaving(true)
    const ex2=edit?exps.map(e=>e===edit?{...form}:e):[{...form,id:Date.now().toString()},...exps]
    await onSave({experiences:ex2})
    setSaving(false);setShowAdd(false);setEdit(null);setForm(blank)
  }
  const vBadge=s=>{const cfg={verified:{c:DS.green,bg:DS.gBg,bd:DS.gBd,l:"✓ Verified"},pending:{c:DS.amber,bg:DS.aBg,bd:DS.aBd,l:"⏳ Pending"},unverified:{c:DS.ink4,bg:DS.surface2,bd:DS.border,l:"○ Unverified"}};const x=cfg[s]||cfg.unverified;return<Tag color={x.c} bg={x.bg} border={x.bd}>{x.l}</Tag>}

  return<div style={{maxWidth:820,margin:"0 auto",padding:"24px"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
      <div><div style={{fontFamily:DS.display,fontSize:20,fontWeight:800,color:DS.ink}}>Career Timeline</div><div style={{fontSize:13,color:DS.ink3,marginTop:1}}>{exps.length} entries · {exps.filter(e=>e.verificationStatus==="verified").length} verified</div></div>
      <Btn onClick={()=>{setForm(blank);setEdit(null);setShowAdd(true)}}>+ Add Entry</Btn>
    </div>
    {exps.length===0?<Empty icon="🏢" title="No employment history yet" body="Add your work history manually or import via resume ingestion." action={<Btn onClick={()=>setShowAdd(true)}>Add First Entry</Btn>}/>:
    exps.map((e,i)=><div key={i} style={{position:"relative",paddingLeft:30,marginBottom:18}}>
      <div style={{position:"absolute",left:9,top:0,bottom:-18,width:2,background:i<exps.length-1?DS.border2:"transparent"}}/>
      <div style={{position:"absolute",left:3,top:9,width:13,height:13,borderRadius:"50%",background:e.verificationStatus==="verified"?DS.green:DS.border2,border:`2px solid ${DS.surface}`,boxShadow:DS.sh}}/>
      <Card><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:7}}>
        <div>
          <div style={{fontFamily:DS.display,fontSize:14,fontWeight:800,color:DS.ink}}>{e.role}</div>
          <div style={{fontSize:13,color:DS.ink2,fontWeight:600}}>{e.company}{e.location&&<span style={{fontWeight:400,color:DS.ink4}}> · {e.location}</span>}</div>
          <div style={{fontSize:11,color:DS.ink4,marginTop:1}}>{(()=>{const s=e.startDate||"";const end=e.isCurrent?"Present":(e.endDate||"");if(!s&&!end)return null;if(s&&end)return`${s} — ${end}`;return s||end})()}</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>{vBadge(e.verificationStatus)}<button onClick={()=>{setForm({...e});setEdit(e);setShowAdd(true)}} style={{padding:"4px 11px",background:DS.surface2,border:`1px solid ${DS.border}`,borderRadius:DS.r,fontSize:11,fontWeight:600,color:DS.ink3,cursor:"pointer",outline:"none"}}>Edit</button></div>
      </div>
      {e.description&&<div style={{fontSize:12,color:DS.ink3,lineHeight:1.6,marginBottom:8,whiteSpace:"pre-line"}}>{e.description}</div>}
      {Array.isArray(e.skills)&&e.skills.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>{e.skills.slice(0,10).map((s,si)=><span key={si} style={{padding:"2px 9px",background:DS.pBg,border:`1px solid ${DS.pBd||DS.border}`,borderRadius:99,fontSize:10,fontWeight:600,color:DS.primary}}>{s}</span>)}</div>}
      {e.outcomes&&<div style={{padding:"6px 10px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:8,fontSize:11,color:DS.green,fontWeight:500}}>↑ Impact: {e.outcomes}</div>}
      {e.verificationStatus==="unverified"&&<div style={{marginTop:9,padding:"6px 11px",background:DS.aBg,border:`1px solid ${DS.aBd}`,borderRadius:8,fontSize:11,color:DS.amber,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>Verify via EPFO/UAN to boost your Proof Strength</span><button style={{fontSize:11,fontWeight:700,color:DS.amber,background:"none",border:"none",cursor:"pointer",outline:"none"}}>Verify →</button></div>}
      </Card>
    </div>)}
    <Modal show={showAdd} onClose={()=>{setShowAdd(false);setEdit(null);setForm(blank)}} title={edit?"Edit Employment Entry":"Add Employment Entry"}>
      <div style={{display:"flex",flexDirection:"column",gap:11}}>
        <Inp label="Company" value={form.company} onChange={v=>setForm(p=>({...p,company:v}))} placeholder="Company name"/>
        <Inp label="Role / Title" value={form.role} onChange={v=>setForm(p=>({...p,role:v}))} placeholder="Your job title"/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:11}}>
          <Inp label="Start Date" type="month" value={form.startDate} onChange={v=>setForm(p=>({...p,startDate:v}))} placeholder=""/>
          <Inp label="End Date" type="month" value={form.endDate} onChange={v=>setForm(p=>({...p,endDate:v}))} placeholder=""/>
        </div>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox" checked={form.isCurrent} onChange={e=>setForm(p=>({...p,isCurrent:e.target.checked}))}/><span style={{fontSize:13,color:DS.ink2}}>Currently working here</span></label>
        <div><div style={{fontSize:12,fontWeight:600,color:DS.ink3,marginBottom:5}}>Key responsibilities</div><textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={3} placeholder="Brief role description…" style={{width:"100%",padding:"10px 12px",background:DS.surface2,border:`1.5px solid ${DS.border}`,borderRadius:DS.r,fontSize:13,color:DS.ink,outline:"none",resize:"vertical",lineHeight:1.6,boxSizing:"border-box",fontFamily:DS.body}} onFocus={e=>e.target.style.borderColor=DS.primary} onBlur={e=>e.target.style.borderColor=DS.border}/></div>
        <div><div style={{fontSize:12,fontWeight:600,color:DS.ink3,marginBottom:5}}>Measurable outcomes (Impact)</div><textarea value={form.outcomes} onChange={e=>setForm(p=>({...p,outcomes:e.target.value}))} rows={2} placeholder="e.g. Reduced latency by 40%, led a team of 8, shipped to 200K users" style={{width:"100%",padding:"10px 12px",background:DS.surface2,border:`1.5px solid ${DS.border}`,borderRadius:DS.r,fontSize:13,color:DS.ink,outline:"none",resize:"vertical",lineHeight:1.6,boxSizing:"border-box",fontFamily:DS.body}} onFocus={e=>e.target.style.borderColor=DS.primary} onBlur={e=>e.target.style.borderColor=DS.border}/></div>
        <Btn onClick={handleSave} loading={saving} full style={{marginTop:4}}>{edit?"Update Entry":"Add to Timeline"}</Btn>
      </div>
    </Modal>
  </div>
}

// ─── Vault Tab ────────────────────────────────────────────────────────────────
function VaultTab({ud,user,onSave}){
  const[uploading,setUploading]=useState(false)
  const[uanModal,setUanModal]=useState(false)
  const[uan,setUan]=useState(ud?.phone||"")   // phone number for EPFO lookup
  const[verifying,setVerifying]=useState(false)
  const[vResult,setVResult]=useState(null)
  const files=ud?.vaultFiles||[]
  const ref=useRef()
  const uid=user?.id||user?.uid

  const upload=async f=>{
    setUploading(true)
    try{
      // PC-1 fix: use the authed vault API — correct route (/api/pro/vault/upload) +
      // Bearer token. The old raw fetch hit /api/vault/upload (404) with no auth (401).
      // vaultApi.upload throws on non-2xx, so failures now fall to the catch below.
      const d = await vaultApi.upload(f, "document")
      const nf={name:f.name,url:d.url||null,size:f.size,type:f.type,uploadedAt:new Date().toISOString()}
      await onSave({vaultFiles:[...files,nf]})
    }catch(e){
      const nf={name:f.name,url:null,size:f.size,type:f.type,uploadedAt:new Date().toISOString(),uploadError:e.message}
      await onSave({vaultFiles:[...files,nf]})
    }
    setUploading(false)
  }
  const verifyUAN=async()=>{
    const cleaned=uan.replace(/\D/g,"").replace(/^91/,"")
    if(cleaned.length!==10){setVResult({error:"Enter a valid 10-digit EPFO-registered mobile number."});return}
    setVerifying(true);setVResult(null)
    try{
      const session=await import("../lib/supabase").then(m=>m.supabase.auth.getSession())
      const token=session?.data?.session?.access_token||""
      const res=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-uan`,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body:JSON.stringify({phone:cleaned,user_id:uid})
      })
      const d=await res.json()
      if(d.ok){
        const best=(d.uan_details||[]).sort((a,b)=>(b.source_score||0)-(a.source_score||0))[0]
        setVResult({verified:true,name:best?.employee_name,uan:best?.uan,employer:best?.employer_name})
        await onSave({uanNumber:best?.uan||"",uanVerified:true,uanVerifiedAt:new Date().toISOString()})
      }else{
        setVResult({error:d.error||"Verification failed. Check the mobile number and retry."})
      }
    }catch(e){setVResult({error:"Verification service unavailable. Try again."})}
    setVerifying(false)
  }

  return<div style={{maxWidth:820,margin:"0 auto",padding:"24px"}}>
    <div style={{fontFamily:DS.display,fontSize:20,fontWeight:800,color:DS.ink,marginBottom:3}}>Vault</div>
    <div style={{fontSize:13,color:DS.ink3,marginBottom:18}}>Verification center, document store, and profile evidence layer</div>
    <Card style={{marginBottom:14,borderTop:`3px solid ${ud?.uanVerified?DS.green:DS.amber}`}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
        <div><SL color={ud?.uanVerified?DS.green:DS.amber}>🔐 EPFO / UAN Verification</SL><div style={{fontSize:13,fontWeight:700,color:DS.ink}}>{ud?.uanVerified?"Employment Verified ✓":"Unverified — Complete to unlock your Proof Strength"}</div><div style={{fontSize:11,color:DS.ink3,marginTop:1}}>Links your career history to government-verified EPFO records</div></div>
        {ud?.uanVerified?<Tag color={DS.green} bg={DS.gBg} border={DS.gBd}>✓ VERIFIED</Tag>:<Btn onClick={()=>setUanModal(true)} variant="amber">Verify Now</Btn>}
      </div>
      {ud?.uanVerified&&<div style={{padding:"9px 13px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:DS.r,fontSize:12,color:DS.green}}>✓ EPFO records matched to your career timeline. Employers and recruiters see your verified badge.</div>}
    </Card>
    <Card style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
        <div><SL>📁 Document Store</SL><div style={{fontSize:13,fontWeight:600,color:DS.ink}}>{files.length} document{files.length!==1?"s":""} in Vault</div></div>
        <Btn onClick={()=>ref.current?.click()} loading={uploading} variant="ghost">{uploading?"Uploading…":"+ Upload Document"}</Btn>
        <input ref={ref} type="file" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)upload(f)}}/>
      </div>
      {files.length===0?<Empty icon="📄" title="No documents yet" body="Upload resume, offer letters, certificates, or proof documents. All private unless shared." action={<Btn onClick={()=>ref.current?.click()} variant="ghost">Upload First Document</Btn>}/>:
      files.map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:11,padding:"9px 13px",background:DS.surface2,border:`1px solid ${DS.border}`,borderRadius:DS.r,marginBottom:7}}>
        <span style={{fontSize:19}}>{f.name?.endsWith(".pdf")?"📄":f.name?.endsWith(".docx")?"📝":"📎"}</span>
        <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:DS.ink}}>{f.name}</div><div style={{fontSize:11,color:DS.ink4}}>{new Date(f.uploadedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</div></div>
        <Tag color={DS.blue} bg={DS.blBg} border={DS.blBd}>In Vault</Tag>
        {f.url&&<a href={f.url} target="_blank" rel="noreferrer" style={{fontSize:11,fontWeight:700,color:DS.primary,textDecoration:"none"}}>View →</a>}
        {f.uploadError&&<Tag color={DS.amber} bg={DS.aBg} border={DS.aBd}>Upload pending</Tag>}
      </div>)}
    </Card>
    <Card>
      <SL>◈ Verification Coverage</SL>
      {[{l:"EPFO/UAN employment records",done:!!ud?.uanVerified,badge:"CRITICAL",impact:"Proof Strength ↑"},{l:"LinkedIn profile linked",done:!!(ud?.linkedinUrl),badge:"HIGH",impact:"Market Standing ↑"},{l:"Resume in Vault",done:files.some(f=>f.name?.match(/resume|cv/i)),badge:"HIGH",impact:"Enables ingestion"},{l:"Certifications uploaded",done:(ud?.certifications||[]).length>0,badge:"MEDIUM",impact:"Proof Strength ↑"},{l:"Project proof document",done:(ud?.resumeProjects||[]).length>0,badge:"MEDIUM",impact:"Proof Strength ↑"}].map((c,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 0",borderBottom:`1px solid ${DS.border}`}}>
        <span style={{fontSize:13,color:c.done?DS.green:DS.ink4,flexShrink:0}}>{c.done?"✓":"○"}</span>
        <span style={{flex:1,fontSize:12,fontWeight:c.done?600:400,color:c.done?DS.ink2:DS.ink3}}>{c.l}</span>
        {!c.done&&<Tag color={DS.amber} bg={DS.aBg} border={DS.aBd}>{c.badge}</Tag>}
        <Tag color={c.done?DS.green:DS.ink4} bg={c.done?DS.gBg:DS.surface2} border={c.done?DS.gBd:DS.border}>{c.impact}</Tag>
      </div>)}
    </Card>
    <Modal show={uanModal} onClose={()=>setUanModal(false)} title="Verify Employment via EPFO/UAN">
      <div style={{marginBottom:12,padding:"9px 13px",background:DS.blBg,border:`1px solid ${DS.blBd}`,borderRadius:DS.r,fontSize:12,color:DS.blue}}>ℹ️ Enter the mobile number registered with your EPFO / UAN account. Your employment history will be fetched from the government EPFO database via Eko.</div>
      <Inp label="EPFO-Registered Mobile Number" value={uan} onChange={v=>setUan(v.replace(/\D/g,"").slice(0,10))} placeholder="10-digit mobile number" mono/>
      {vResult&&<div style={{marginBottom:12,marginTop:10,padding:"9px 13px",background:vResult.verified?DS.gBg:DS.rBg,border:`1px solid ${vResult.verified?DS.gBd:DS.rBd}`,borderRadius:DS.r,fontSize:12,color:vResult.verified?DS.green:DS.red}}>
        {vResult.verified
          ?<>✓ Employment verified — {vResult.name}{vResult.employer?` at ${vResult.employer}`:""}{vResult.uan?` · UAN ${vResult.uan}`:""}</>
          :vResult.error||"Could not verify. Check the mobile number and retry."}
      </div>}
      <Btn onClick={verifyUAN} loading={verifying} full style={{marginTop:12}}>{verifying?"Contacting EPFO via Eko…":"Fetch EPFO Records →"}</Btn>
    </Modal>
  </div>
}

// ─── Orbit Dashboard ──────────────────────────────────────────────────────────
function OrbitDash({ud,user,onSave,onNav,onPricing}){
  const[showResume,setShowResume]=useState(false)
  const[showLayoff,setShowLayoff]=useState(false)
  const[editing,setEditing]=useState(false)
  const[tRole,setTRole]=useState(ud?.targetRole||"")
  const[ctc,setCtc]=useState(ud?.currentCTC||"")
  const[savingMeta,setSavingMeta]=useState(false)
  const sig=computeSignals(ud)
  const plan=usePlan(ud)
  const hasHistory=sig.meta.expsCount>0||sig.meta.skills>0
  const avg=Math.round((sig.role.score+sig.market.score+sig.proof.score+sig.mobility.score)/4)

  const saveMeta=async()=>{setSavingMeta(true);await onSave({targetRole:tRole,currentCTC:ctc});setSavingMeta(false);setEditing(false)}
  const goUpgrade=()=>onPricing&&onPricing()

  const CARDS=[
    {name:"Role Fit Score",icon:"🎯",key:"role",color:DS.primary,cBg:DS.pBg,cBd:DS.pBd,desc:"How well your profile matches your target role",
      actionLabel:"Improve in Forge →",actionTab:"forge",
      drivers:[`${sig.meta.yoe.toFixed(1)} years experience`,sig.meta.skills>0&&`${sig.meta.skills} skills documented`,sig.meta.verified>0&&`${sig.meta.verified} employer(s) verified`,sig.meta.hasProj&&"Projects documented"].filter(Boolean),
      drags:[!sig.meta.hasSummary&&"No professional summary",sig.meta.verified===0&&"No employment verification",sig.meta.skills<5&&"Fewer than 5 skills"].filter(Boolean),
      action:"Write your professional summary and add 5 verified skills for the fastest Role Fit Score improvement."},
    {name:"Market Standing",icon:"📈",key:"market",color:DS.blue,cBg:DS.blBg,cBd:DS.blBd,desc:"How competitive you are in the current market",
      actionLabel:"View Gap Report →",actionTab:"orbit",
      drivers:[sig.meta.skills>=8&&"Strong skill profile (8+ skills)",sig.meta.yoe>4&&"Senior experience band",sig.meta.hasTarget&&"Target role defined"].filter(Boolean),
      drags:[!sig.meta.hasTarget&&"Target role not set",sig.meta.skills<8&&"Below 8 skills",sig.meta.yoe<2&&"Below market seniority threshold"].filter(Boolean),
      action:"Set your target role and document 10+ skills for maximum Market Standing accuracy."},
    {name:"Proof Strength",icon:"🔐",key:"proof",color:DS.purple,cBg:DS.purBg,cBd:DS.purBd,desc:"Verified evidence that backs your claims",
      actionLabel:"Go to Verification →",actionTab:"vault",
      drivers:[sig.meta.hasUAN&&"EPFO/UAN verified",sig.meta.verified>0&&"Employer verification complete",sig.meta.hasVault&&"Documents in Vault",sig.meta.hasCerts&&"Certifications listed"].filter(Boolean),
      drags:[!sig.meta.hasUAN&&"EPFO/UAN not verified (highest impact)",sig.meta.verified===0&&"No employer verification",!sig.meta.hasVault&&"No documents in Vault"].filter(Boolean),
      action:"Complete EPFO/UAN verification in the Verification tab for the single biggest Proof Strength gain."},
    {name:"Career Mobility",icon:"🔀",key:"mobility",color:DS.green,cBg:DS.gBg,cBd:DS.gBd,desc:"Readiness to switch, negotiate, or recover",
      actionLabel:"Plan Switch →",actionTab:"forge",
      drivers:[sig.meta.verified>0&&"Verified employment history",sig.meta.hasTarget&&"Clear target role set",sig.meta.yoe>3&&"Sufficient seniority for lateral moves"].filter(Boolean),
      drags:[!sig.meta.hasTarget&&"No target role",!sig.meta.hasSummary&&"Missing summary weakens mobility",sig.meta.verified===0&&"Unverified history limits switch leverage"].filter(Boolean),
      action:"Define your target role and complete employment verification to unlock full Career Mobility."},
  ]

  return<div style={{maxWidth:1200,margin:"0 auto",padding:"24px",animation:"fadeUp .3s ease"}}>
    {/* Header */}
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18,flexWrap:"wrap",gap:11}}>
      <div><div style={{fontFamily:DS.display,fontSize:25,fontWeight:800,color:DS.ink,letterSpacing:"-.6px"}}>Orbit Intelligence</div><div style={{fontSize:13,color:DS.ink3,marginTop:2}}>{new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</div></div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        {!hasHistory&&<Btn onClick={()=>setShowResume(true)}>📄 Import Resume</Btn>}
        <Btn onClick={()=>setShowLayoff(true)} variant="danger" size="sm">🛑 Layoff Mode</Btn>
        <Btn onClick={()=>setEditing(e=>!e)} variant="ghost" size="sm">{editing?"Cancel":"⚙ Settings"}</Btn>
        {!plan.isElite&&<Btn onClick={goUpgrade} style={{background:DS.purple,color:"#1A1714",border:"none"}} size="sm">⬆ Upgrade</Btn>}
      </div>
    </div>

    {/* Plan Banner */}
    <PlanBanner plan={plan} onUpgrade={goUpgrade}/>

    {/* Settings */}
    {editing&&<Card style={{marginBottom:18,animation:"fadeUp .2s ease"}}>
      <SL>⚙ Career Settings</SL>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:11,marginBottom:12}}>
        <Inp label="Target Role" value={tRole} onChange={setTRole} placeholder="e.g. Senior Product Manager"/>
        <Inp label="Current CTC (Lakhs p.a.)" value={ctc} onChange={setCtc} placeholder="e.g. 18" type="number"/>
        <div style={{display:"flex",alignItems:"flex-end"}}><Btn onClick={saveMeta} loading={savingMeta} full>Save</Btn></div>
      </div>
      {/* Subscription management */}
      <div style={{paddingTop:12,borderTop:`1px solid ${DS.border}`}}>
        <SL>💳 Subscription</SL>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <Tag color={plan.color} bg={plan.colorBg} border={`${plan.color}33`}>{plan.label}</Tag>
            <span style={{fontSize:12,color:DS.ink3}}>
              {plan.isFree?"1 Forge/week · Basic Orbit":plan.isElite?"All features · AI Interviews · Mentor Hub":"Unlimited Forge · Comp Intel · Gap Analysis"}
            </span>
          </div>
          <div style={{display:"flex",gap:8}}>
            {!plan.isElite&&<Btn onClick={goUpgrade} style={{background:DS.purple,color:"#1A1714",border:"none"}} size="sm">{plan.isFree?"Upgrade to Pro →":"Upgrade to Elite →"}</Btn>}
            {!plan.isFree&&<Btn variant="ghost" size="sm" onClick={goUpgrade}>Manage Plan</Btn>}
          </div>
        </div>
      </div>
    </Card>}

    {/* Resume banner */}
    {!hasHistory&&<div style={{marginBottom:18,padding:"15px 19px",background:`linear-gradient(135deg,${DS.pBg},${DS.surface})`,border:`1.5px solid ${DS.pBd}`,borderRadius:DS.r2,display:"flex",alignItems:"center",justifyContent:"space-between",gap:11,flexWrap:"wrap"}}>
      <div><div style={{fontFamily:DS.display,fontSize:15,fontWeight:800,color:DS.ink}}>Import your resume to activate Orbit</div><div style={{fontSize:12,color:DS.ink3,marginTop:1}}>Upload once. Capabilio populates your Timeline, Skills, and all four career scores automatically.</div></div>
      <Btn onClick={()=>setShowResume(true)}>Import Resume →</Btn>
    </div>}

    {/* Career Health Panel */}
    <Card style={{marginBottom:18,padding:"15px 20px"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:14}}>
        <div>
          <div style={{fontSize:10,fontWeight:700,color:DS.ink4,letterSpacing:2.2,fontFamily:DS.mono,textTransform:"uppercase"}}>Career Health Score</div>
          <div style={{fontFamily:DS.mono,fontSize:30,fontWeight:700,color:DS.primary,lineHeight:1.1}}>{avg}</div>
          <div style={{fontSize:10,color:DS.ink4,marginTop:2,fontFamily:DS.mono}}>
            {avg<800?"Build skills & verify employment to grow":avg<1000?"Add proof & verifications to progress":avg<1200?"Broaden skills & add project evidence":avg<1500?"Add leadership & impact signals":"Elite · market-leading profile"}
          </div>
        </div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
          {[{l:"Role Fit",s:sig.role.score,c:DS.primary,tab:"forge"},{l:"Market",s:sig.market.score,c:DS.blue,tab:"orbit"},{l:"Proof",s:sig.proof.score,c:DS.purple,tab:"vault"},{l:"Mobility",s:sig.mobility.score,c:DS.green,tab:"forge"}].map((x,i)=>(
            <div key={i} style={{textAlign:"center",cursor:"pointer"}} onClick={()=>onNav(x.tab)}>
              <div style={{fontFamily:DS.mono,fontSize:17,fontWeight:700,color:x.c}}>{x.s}</div>
              <div style={{fontSize:9,fontWeight:700,color:DS.ink4,textTransform:"uppercase",letterSpacing:1,fontFamily:DS.mono}}>{x.l}</div>
              <div style={{fontSize:9,color:DS.ink4,marginTop:1}}>→ view</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          <Tag color={DS.ink3}>YOE {sig.meta.yoe.toFixed(1)}</Tag>
          <Tag color={DS.ink3}>{sig.meta.skills} skills</Tag>
          <Tag color={sig.meta.verified>0?DS.green:DS.amber} bg={sig.meta.verified>0?DS.gBg:DS.aBg} border={sig.meta.verified>0?DS.gBd:DS.aBd}>{sig.meta.verified>0?"✓ Verified":"○ Unverified"}</Tag>
          <Tag color={plan.color} bg={plan.colorBg} border={`${plan.color}33`}>{plan.label}</Tag>
        </div>
      </div>
    </Card>

    <WeeklyCheckBanner onNav={onNav}/>

    {/* 4 ELO cards — all users */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
      {CARDS.map((c,i)=>(
        <EloCard key={i} name={c.name} icon={c.icon} score={sig[c.key].score} trend={sig[c.key].trend}
          confidence={sig[c.key].confidence} color={c.color} cBg={c.cBg} cBd={c.cBd} desc={c.desc}
          drivers={c.drivers} drags={c.drags} action={c.action}
          actionLabel={c.actionLabel} onAction={()=>onNav(c.actionTab)}/>
      ))}
    </div>

    {/* Comp + Gap — PRO+ or locked */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
      <CompCard ud={ud} sig={sig} locked={!plan.comp} onUpgrade={goUpgrade}/>
      <GapCard  ud={ud} sig={sig} locked={!plan.gap}  onUpgrade={goUpgrade} onNav={onNav}/>
    </div>

    {/* Recruiter + Risk + Health */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginBottom:18}}>
      <RecruiterCard ud={ud} sig={sig} onNav={onNav}/>
      <RiskCard sig={sig} onLayoff={()=>setShowLayoff(true)}/>
      <HealthCard sig={sig} onNav={onNav}/>
    </div>

    {/* Action + ROI */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:18}}>
      <ActionCard sig={sig} ud={ud} onNav={onNav}/>
      <ROICard sig={sig}/>
    </div>

    {/* ELITE-only row: AI Interview + Mentor Hub + Transition Tracks */}
    <div style={{marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{fontFamily:DS.mono,fontSize:10,fontWeight:800,color:DS.amber,letterSpacing:2,textTransform:"uppercase"}}>⭐ Capabilio Elite Features</div>
        {!plan.isElite&&<Tag color={DS.amber} bg={DS.aBg} border={DS.aBd}>Upgrade to unlock</Tag>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        <AIInterviewCard     ud={ud} onNav={onNav} locked={!plan.interview}   onUpgrade={goUpgrade}/>
        <MentorHubCard       ud={ud} onNav={onNav} locked={!plan.mentorHub}   onUpgrade={goUpgrade}/>
        <TransitionTracksCard ud={ud} onNav={onNav} locked={!plan.transitions} onUpgrade={goUpgrade}/>
      </div>
    </div>

    <ResumeModal show={showResume} onClose={()=>setShowResume(false)} user={user} ud={ud} onSave={onSave}/>
    {showLayoff&&<LayoffMode ud={ud} sig={sig} onClose={()=>setShowLayoff(false)}/>}
  </div>
}

// ─── Compensation Tab ─────────────────────────────────────────────────────────
function CompTab({ud,user,onSave,onNav,onPricing}){
  const sig=computeSignals(ud)
  const plan=usePlan(ud)
  const goUpgrade=()=>onPricing&&onPricing()
  return<div style={{maxWidth:900,margin:"0 auto",padding:"24px",animation:"fadeUp .3s ease"}}>
    <div style={{marginBottom:20}}>
      <div style={{fontFamily:DS.display,fontSize:22,fontWeight:800,color:DS.ink,letterSpacing:"-.5px"}}>Compensation Intelligence</div>
      <div style={{fontSize:13,color:DS.ink3,marginTop:2}}>Market bands, underpayment detection, and negotiation strategy</div>
    </div>
    {plan.comp
      ?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <CompCard ud={ud} sig={sig} locked={false} onUpgrade={goUpgrade}/>
        <GapCard ud={ud} sig={sig} locked={false} onUpgrade={goUpgrade} onNav={onNav}/>
      </div>
      :<div style={{padding:"48px 24px",textAlign:"center",background:DS.surface,border:`1.5px solid ${DS.purBd}`,borderRadius:DS.r2,boxShadow:DS.sh}}>
        <div style={{fontSize:40,marginBottom:14}}>💰</div>
        <div style={{fontFamily:DS.display,fontSize:20,fontWeight:800,color:DS.ink,marginBottom:8}}>Compensation Intelligence</div>
        <div style={{fontSize:13,color:DS.ink3,lineHeight:1.7,maxWidth:420,margin:"0 auto 20px"}}>See your exact market band, underpayment detection, and AI-guided negotiation scripts. Available on <strong>Capabilio Pro</strong> and above.</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:24}}>
          {["Market Low/Mid/High bands for your role","Underpayment detection vs. market","Switch gain estimate","Negotiation anchor scripts"].map((f,i)=><div key={i} style={{padding:"6px 14px",background:DS.purBg,border:`1px solid ${DS.purBd}`,borderRadius:99,fontSize:12,fontWeight:600,color:DS.purple}}>✓ {f}</div>)}
        </div>
        <Btn onClick={goUpgrade} style={{background:DS.purple,color:"#1A1714",border:"none",boxShadow:`0 4px 14px ${DS.purple}30`}}>Upgrade to Capabilio Pro — ₹499/mo →</Btn>
      </div>
    }
    <div style={{marginTop:18,padding:"14px 18px",background:DS.blBg,border:`1px solid ${DS.blBd}`,borderRadius:DS.r,fontSize:12,color:DS.blue}}>
      💡 <strong>India comp tip:</strong> AmbitionBox, Glassdoor IN, and LinkedIn Salary India are the best cross-reference sources for India-specific CTC bands. Always compare CTC vs take-home and factor notice period costs into switch decisions.
    </div>
  </div>
}

// ─── Readiness Tab ────────────────────────────────────────────────────────────
function ReadinessTab({ud,user,onSave,onNav}){
  const sig=computeSignals(ud)
  const checks=[
    {cat:"Profile",items:[
      {l:"Professional summary written",done:sig.meta.hasSummary,action:"forge",hint:"A clear 3–5 sentence narrative is the #1 recruiter read"},
      {l:"Employment history documented",done:sig.meta.expsCount>0,action:"timeline",hint:"At least one complete employment entry needed"},
      {l:"5+ skills documented",done:sig.meta.skills>=5,action:"forge",hint:"Minimum threshold for market matching algorithms"},
      {l:"Target role set",done:sig.meta.hasTarget,action:"orbit",hint:"Anchors all market gap and comp benchmarking"},
    ]},
    {cat:"Verification",items:[
      {l:"Employment verified (EPFO/UAN)",done:sig.meta.hasUAN,action:"vault",hint:"Single highest-impact verification action available"},
      {l:"At least 1 employer verification",done:sig.meta.verified>0,action:"vault",hint:"Verified history dramatically increases recruiter trust"},
      {l:"Document in Vault",done:sig.meta.hasVault,action:"vault",hint:"Resume, offer letter, or any proof document counts"},
    ]},
    {cat:"Proof",items:[
      {l:"Certifications listed",done:sig.meta.hasCerts,action:"aura",hint:"AWS, Google, Microsoft certs carry highest signal weight"},
      {l:"Project outcomes documented",done:sig.meta.hasProj,action:"aura",hint:"Each quantified outcome adds Proof Strength"},
    ]},
  ]
  const totalDone=checks.flatMap(c=>c.items).filter(i=>i.done).length
  const totalAll=checks.flatMap(c=>c.items).length
  const pct=Math.round((totalDone/totalAll)*100)
  const pc=pct>=80?DS.green:pct>=50?DS.amber:DS.red
  const status=pct>=80?"Switch-ready":pct>=60?"Nearly ready":pct>=40?"Building":"Early stage"
  return<div style={{maxWidth:820,margin:"0 auto",padding:"24px",animation:"fadeUp .3s ease"}}>
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:11}}>
      <div>
        <div style={{fontFamily:DS.display,fontSize:22,fontWeight:800,color:DS.ink,letterSpacing:"-.5px"}}>Career Readiness</div>
        <div style={{fontSize:13,color:DS.ink3,marginTop:2}}>How ready you are to switch, negotiate, or be found by recruiters</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div style={{fontFamily:DS.mono,fontSize:28,fontWeight:700,color:pc}}>{pct}%</div>
        <div style={{fontSize:12,fontWeight:700,color:pc}}>{status}</div>
      </div>
    </div>
    <Card style={{marginBottom:18,padding:"14px 18px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{flex:1}}>
          <Bar value={pct} color={pc} h={8}/>
        </div>
        <span style={{fontFamily:DS.mono,fontSize:13,fontWeight:700,color:pc}}>{totalDone}/{totalAll}</span>
      </div>
      <div style={{fontSize:12,color:DS.ink3}}>{pct<50?"Complete the critical items below to become recruiter-visible and switch-ready.":pct<80?"You're on track — verify employment and add proof to reach Elite readiness.":"Your profile is strong and switch-ready. Keep verifications current."}</div>
    </Card>
    {checks.map((cat,ci)=><Card key={ci} style={{marginBottom:14}}>
      <SL color={DS.primary}>{cat.cat}</SL>
      {cat.items.map((item,ii)=><div key={ii} style={{display:"flex",alignItems:"flex-start",gap:11,padding:"9px 0",borderBottom:`1px solid ${DS.border}`}}>
        <span style={{fontSize:14,color:item.done?DS.green:DS.ink4,flexShrink:0,marginTop:1}}>{item.done?"✓":"○"}</span>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:item.done?600:500,color:item.done?DS.ink2:DS.ink}}>{item.l}</div>
          {!item.done&&<div style={{fontSize:11,color:DS.ink4,marginTop:2}}>{item.hint}</div>}
        </div>
        {!item.done&&<button onClick={()=>onNav(item.action)} style={{padding:"4px 12px",background:DS.pBg,border:`1px solid ${DS.pBd}`,borderRadius:99,fontSize:11,fontWeight:700,color:DS.primary,cursor:"pointer",flexShrink:0,fontFamily:DS.mono}}>Fix →</button>}
        {item.done&&<Tag color={DS.green} bg={DS.gBg} border={DS.gBd}>Done ✓</Tag>}
      </div>)}
    </Card>)}
    <div style={{padding:"14px 18px",background:DS.aBg,border:`1px solid ${DS.aBd}`,borderRadius:DS.r,fontSize:12,color:DS.amber}}>
      ⚡ <strong>Switch-ready benchmark:</strong> 80%+ on this readiness check correlates with receiving recruiter outreach within 30 days of activating visibility on Launchpad.
    </div>
  </div>
}

// ─── Root Export ──────────────────────────────────────────────────────────────
export default function Orbit({user,userData,setUserData,activeTab,setActiveTab,onNavigate,onNavigatePricing}){
  const[saving,setSaving]=useState(false)
  const[localTab,setLocalTab]=useState("timeline")

  const uid=user?.id||user?.uid

  // Supabase update — replaces Firebase updateDoc
  const onSave=useCallback(async updates=>{
    if(!uid)return
    setSaving(true)
    try{
      await userDoc.update(uid, updates)
      if(setUserData)setUserData(p=>({...p,...updates}))
    }catch(e){console.error(e)}
    setSaving(false)
  },[uid,setUserData])

  const sig=computeSignals(userData)
  const tab=activeTab||localTab
  const setTab=setActiveTab||setLocalTab

  const handleNav=t=>{
    if(["forge","launchpad","pulse","nexus","aura","weeklycheck","professionalHome"].includes(t))onNavigate(t)
    else setTab(t)
  }
  // Legacy safety net: "orbit"/Overview tab was removed from this page (it now
  // lives embedded in Home) — if anything still requests it, land on Timeline.
  const effectiveTab = tab==="orbit" ? "timeline" : tab

  return<div style={{background:DS.bg,flex:1,minHeight:0,overflowY:"auto",fontFamily:DS.body}}>
    <style>{G}</style>
    <TabBar active={effectiveTab} setActive={setTab} sig={sig}/>
    {effectiveTab==="timeline" &&<TimelineTab     ud={userData} user={user} onSave={onSave}/>}
    {tab==="vault"    &&<VaultTab        ud={userData} user={user} onSave={onSave}/>}
    {tab==="comp"     &&<CompTab         ud={userData} user={user} onSave={onSave} onNav={handleNav} onPricing={onNavigatePricing}/>}
    {tab==="readiness"&&<ReadinessTab    ud={userData} user={user} onSave={onSave} onNav={handleNav}/>}
  </div>
}

// Embedded directly into Home (ProfessionalHome.jsx) — the former Orbit
// "Overview" dashboard. Self-contained (computes its own signals/plan).
export { OrbitDash }
