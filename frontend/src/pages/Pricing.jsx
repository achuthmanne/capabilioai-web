// Pricing.jsx — Capabilio Subscription Plans
// Free · Pro (₹299/mo) · Elite (₹599/mo)

import { userDoc } from "../lib/db";
import { useState } from "react"
import { PLANS, getPlan, getPlansByPath } from "../config/plans"
import { useRazorpay } from "../hooks/useRazorpay"

const SERVER = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

const T = {
  cream:"#F6F6F1", cream2:"#EFEFE9", cream3:"#E8E8E1",
  ink:"#1A1A18",   ink2:"#3A3A38",  ink3:"#6B6B68",  ink4:"#9A9A97",
  indigo:"#3D4EAC",indigo2:"#5B6FD4",indigo3:"#EEF0FB",
  green:"#1A7A4A", green2:"#E8F7EF",
  amber:"#B8620A", amber2:"#FDF3E7",
  red:"#C0392B",   red2:"#FDECEA",
  border:"rgba(26,26,24,0.09)",
  shadow:"0 2px 12px rgba(26,26,24,0.07), 0 1px 3px rgba(26,26,24,0.05)",
  shadow2:"0 8px 24px rgba(0,0,0,0.08)), 0 2px 8px rgba(26,26,24,0.06)",
}

const CHECK = "✓"
const CROSS = "✕"

// planOrder is now derived at render time from userData.path — see component

// Feature rows — shown across all plan columns
const FEATURES = [
  { label:"Arena tasks",          key:"arenaTasks",         fmt:(v,p)=>`${v} / ${p.arenaFrequency}` },
  { label:"Starter Interview Pack",key:"interviewSessions",  fmt:(v)=>v===0?"Not included":`${v} sessions/month` },
  { label:"Market Analysis Reports",key:"marketReports",     fmt:(v,p)=>v===0?`₹${p.reportPrice}/report`:`${v} included/month + ₹${p.reportPrice}/extra` },
  { label:"Portfolio generation",  key:"portfolio",          static:true },
  { label:"Full Arena access",     key:"fullArena",          fmt:(v,p)=>p.id==="free"?"Basic (1/15 days)":"Full access" },
  { label:"Personal branding video",key:"brandVideo",        fmt:(v,p)=>p.id==="elite"?"Included":"Not included" },
  { label:"Locked premium previews",key:"lockedPreviews",    fmt:(v,p)=>p.id==="free"?"Visible (locked)":"—" },
]

function FeatureValue({ plan, feature }) {
  if (feature.static) return <span style={{color:T.green,fontWeight:700}}>{CHECK}</span>

  const val = feature.fmt
    ? feature.fmt(plan[feature.key], plan)
    : plan[feature.key]

  const isGood = val !== "Not included" && val !== false
  return (
    <span style={{fontSize:13,color:isGood?T.ink2:T.ink4,fontWeight:isGood?500:400}}>
      {val===false||val==="Not included"
        ? <span style={{color:T.ink4}}>{CROSS}</span>
        : val===true
          ? <span style={{color:T.green,fontWeight:700}}>{CHECK}</span>
          : String(val)}
    </span>
  )
}

export default function Pricing({ user, userData, setUserData, onBack }) {
  const currentPlan = getPlan(userData)
  const userPath    = userData?.path || "student"
  // Resolve path-specific plan order — professional gets orbit_pro/orbit_elite, etc.
  const pathPlans   = getPlansByPath(userPath)
  const planOrder   = pathPlans.map(p => p.id)

  const [upgrading, setUpgrading] = useState(null)
  const [upgraded, setUpgraded]   = useState(null)
  const [error, setError]         = useState("")
  const { openCheckout }          = useRazorpay()

  const handleUpgrade = async (planId) => {
    if (planId === "free") return
    setUpgrading(planId); setError("")
    try {
      // Step 1: create Razorpay order on our backend
      const uid = user?.id || user?.uid
      const orderRes = await fetch(`${SERVER}/api/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, uid }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok || !order.order_id) throw new Error(order.error || "Order creation failed")

      // Step 2: open Razorpay modal — verification + Firestore update happen inside the hook
      openCheckout({
        planId,
        amount:   order.amount,
        orderId:  order.order_id,
        currency: order.currency,
        userEmail: user?.email || "",
        userName:  userData?.name || user?.displayName || "",
        onSuccess: (data) => {
          // Hook already verified signature server-side; update local state
          if (setUserData) setUserData(prev => ({
            ...prev,
            subscription: data.planId || planId,
            subscriptionCycleStart: new Date().toISOString(),
          }))
          setUpgraded(planId)
          setUpgrading(null)
        },
        onError: (msg) => {
          // "Payment cancelled." is silent — user dismissed intentionally
          if (msg !== "Payment cancelled.") setError(msg)
          setUpgrading(null)
        },
      })
    } catch(e) {
      setError(e.message || "Upgrade failed. Please try again.")
      setUpgrading(null)
    }
  }

  const plan = (id) => PLANS[id] || {}
  // Free-plan ids per path
  const FREE_IDS = new Set(["free", "authority", "startup"])

  return (
    <div style={{flex:1,minHeight:0,overflowY:"auto",background:`linear-gradient(180deg,${T.cream},${T.cream2})`,fontFamily:"'DM Sans',sans-serif",color:T.ink,paddingBottom:80}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box}
        .plan-card{transition:transform .2s,box-shadow .2s}
        .plan-card:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(26,26,24,0.12)!important}
      `}</style>

      {/* Back bar */}
      <div style={{borderBottom:`1px solid ${T.border}`,background:`${T.cream}dd`,backdropFilter:"blur(14px)",padding:"14px 24px",display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100}}>
        <button onClick={onBack} style={{padding:"7px 16px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:9,color:T.ink3,fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
          ← Back
        </button>
        <div>
          <span style={{fontWeight:800,fontSize:16,color:T.ink}}>Capabilio Plans</span>
          <span style={{fontSize:12,color:T.ink3,marginLeft:10}}>Choose the plan that fits your growth</span>
        </div>
        <div style={{marginLeft:"auto",padding:"5px 14px",borderRadius:99,background:currentPlan.colorBg,border:`1px solid ${currentPlan.color}40`,fontSize:12,fontWeight:700,color:currentPlan.color}}>
          Current: {currentPlan.label}
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"40px 24px"}}>

        {/* Hero */}
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:12,fontWeight:700,color:T.indigo,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>Pricing</div>
          <h1 style={{fontSize:36,fontWeight:900,color:T.ink,margin:"0 0 12px 0",letterSpacing:-0.5}}>Invest in your career, not your job hunt</h1>
          <p style={{fontSize:15,color:T.ink3,maxWidth:520,margin:"0 auto",lineHeight:1.7}}>ELO-ranked skill proof. Real interview practice. Market intelligence. Pick the pace that fits you.</p>
        </div>

        {error&&<div style={{background:T.red2,border:`1px solid rgba(192,57,43,0.2)`,borderRadius:12,padding:"12px 18px",marginBottom:24,color:T.red,fontSize:13,textAlign:"center"}}>{error}</div>}

        {/* Plan cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:20,marginBottom:48}}>
          {planOrder.map(pid => {
            const p         = plan(pid)
            const isFree    = FREE_IDS.has(pid)
            const isCurrent = currentPlan.id === pid
            const isHighlight = p.highlight
            const isUpgraded  = upgraded === pid
            const btnColor    = p.color || T.indigo

            return (
              <div key={pid} className="plan-card"
                style={{borderRadius:20,border:`2px solid ${isCurrent?p.color:isHighlight?p.color:T.border}`,background:isHighlight?`linear-gradient(160deg,${T.cream},${p.colorBg||T.cream2})`:"#fff",padding:"28px 26px",boxShadow:isCurrent?`0 0 0 3px ${p.color}20, ${T.shadow2}`:T.shadow,position:"relative",overflow:"hidden"}}>

                {/* Plan badge */}
                {p.badge&&(
                  <div style={{position:"absolute",top:16,right:16,background:p.color,color:"#fff",fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:99,letterSpacing:0.5,textTransform:"uppercase"}}>{p.badge}</div>
                )}
                {isCurrent&&(
                  <div style={{position:"absolute",top:16,right:p.badge?110:16,background:p.color,color:"#fff",fontSize:10,fontWeight:800,padding:"4px 10px",borderRadius:99,letterSpacing:0.5,textTransform:"uppercase"}}>Your Plan</div>
                )}

                {/* Plan identity */}
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:12,fontWeight:700,color:p.color,letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>{p.label}</div>
                  <div style={{display:"flex",alignItems:"flex-end",gap:4,marginBottom:6}}>
                    {p.price===0
                      ? <span style={{fontSize:36,fontWeight:900,color:T.ink}}>Free</span>
                      : <>
                          <span style={{fontSize:14,fontWeight:700,color:T.ink3,alignSelf:"flex-start",marginTop:10}}>₹</span>
                          <span style={{fontSize:40,fontWeight:900,color:T.ink,letterSpacing:-1}}>{p.price.toLocaleString()}</span>
                          <span style={{fontSize:13,color:T.ink3,marginBottom:8}}>/month</span>
                          {p.yearlyPrice&&<span style={{fontSize:11,color:T.green,marginBottom:8,fontWeight:700}}>· ₹{p.yearlyPrice}/yr ({p.yearlySaving})</span>}
                        </>}
                  </div>
                  {/* Description from features[0] fallback */}
                  <div style={{fontSize:13,color:T.ink3,lineHeight:1.6}}>
                    {p.description || (isFree
                      ? "Get started. Build your profile and access the basics."
                      : p.features?.[0] || `Upgrade to ${p.label} for full access.`)}
                  </div>
                </div>

                {/* Feature list */}
                <div style={{marginBottom:24,display:"grid",gap:10}}>
                  {(p.features||[]).map((f,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <span style={{color:T.green,fontWeight:800,flexShrink:0,marginTop:1}}>✓</span>
                      <span style={{fontSize:13,color:T.ink2,lineHeight:1.5}}>{f}</span>
                    </div>
                  ))}
                  {(p.notIncluded||[]).map((f,i)=>(
                    <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",opacity:0.5}}>
                      <span style={{color:T.ink4,fontWeight:800,flexShrink:0,marginTop:1}}>✕</span>
                      <span style={{fontSize:13,color:T.ink4,lineHeight:1.5}}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {isFree
                  ? (
                    <div style={{padding:"12px",borderRadius:12,background:T.cream2,border:`1px solid ${T.border}`,textAlign:"center",fontSize:13,color:T.ink4,fontWeight:600}}>
                      {isCurrent?"You're on the Free plan":"Downgrade to Free"}
                    </div>
                  ) : isUpgraded ? (
                    <div style={{padding:"12px",borderRadius:12,background:T.green2,border:`1px solid rgba(26,122,74,0.2)`,textAlign:"center",fontSize:13,color:T.green,fontWeight:700}}>
                      ✓ Upgraded to {p.label}!
                    </div>
                  ) : (
                    <button
                      onClick={()=>handleUpgrade(pid)}
                      disabled={upgrading===pid||isCurrent}
                      style={{width:"100%",padding:"13px",background:isCurrent?T.cream2:btnColor,border:"none",borderRadius:12,color:isCurrent?T.ink4:"#fff",fontSize:14,fontWeight:700,cursor:isCurrent||upgrading===pid?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:upgrading&&upgrading!==pid?0.5:1,transition:"all .15s"}}>
                      {upgrading===pid
                        ? <><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>Processing...</>
                        : isCurrent
                          ? "Current Plan"
                          : p.ctaLabel || `Upgrade to ${p.label} →`}
                    </button>
                  )
                }
              </div>
            )
          })}
        </div>

        {/* Comparison table — shown for student path only */}
        {userPath !== "professional" && (
        <div style={{background:"#FFFFFF",borderRadius:20,border:`1px solid ${T.border}`,overflow:"hidden",boxShadow:T.shadow}}>
          <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,background:T.cream2}}>
            <div style={{fontSize:16,fontWeight:800,color:T.ink}}>Full comparison</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${T.border}`}}>
                  <th style={{padding:"14px 20px",textAlign:"left",fontWeight:700,color:T.ink3,fontSize:12,textTransform:"uppercase",letterSpacing:1,width:"35%"}}>Feature</th>
                  {planOrder.map(pid=>(
                    <th key={pid} style={{padding:"14px 16px",textAlign:"center",fontWeight:700,color:plan(pid).color,fontSize:12,textTransform:"uppercase",letterSpacing:1,background:currentPlan.id===pid?`${plan(pid).color}08`:"transparent"}}>
                      {plan(pid).label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f,i)=>(
                  <tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:i%2===0?"transparent":T.cream2+"80"}}>
                    <td style={{padding:"12px 20px",color:T.ink2,fontWeight:600}}>{f.label}</td>
                    {planOrder.map(pid=>(
                      <td key={pid} style={{padding:"12px 16px",textAlign:"center",background:currentPlan.id===pid?`${plan(pid).color}06`:"transparent"}}>
                        <FeatureValue plan={plan(pid)} feature={f}/>
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Report pricing row */}
                <tr style={{borderBottom:`1px solid ${T.border}`}}>
                  <td style={{padding:"12px 20px",color:T.ink2,fontWeight:600}}>Extra report price</td>
                  {planOrder.map(pid=>(
                    <td key={pid} style={{padding:"12px 16px",textAlign:"center",fontSize:13,color:T.ink2,background:currentPlan.id===pid?`${plan(pid).color}06`:"transparent"}}>
                      ₹{plan(pid).reportPrice}/report
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Fine print */}
        <div style={{textAlign:"center",marginTop:32,color:T.ink4,fontSize:12,lineHeight:1.8}}>
          <p>Monthly plans billed on the same date each month. Unused included reports do not roll over.</p>
          <p>Prices in INR. Powered by Razorpay. Cancel anytime from your account settings.</p>
        </div>

      </div>
    </div>
  )
}
