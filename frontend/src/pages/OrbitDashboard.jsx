/**
 * OrbitDashboard.jsx — Capabilio Professional Intelligence Cockpit (Aura)
 * Full production-ready dashboard with dynamic data from DB.
 */
import { useState, useEffect, useCallback } from "react"
import { supabase } from "../lib/supabase"
import { profileRealtime } from "../lib/realtimeSingletons"
import { profileApi, epfoApi, nexusApi, jobsApi, recruiterApi, interviewApi, forgeApi, orbitApi, intelApi } from "../lib/api"

const T = {
  bg:"#FFFFFF",surface:"#FAFAFA",card:"#FFFFFF",border:"#E8E3DA",
  borderHi:"rgba(124,58,237,0.35)",ink:"#F0F0F8",ink2:"#B0B0C8",ink3:"#7070A0",
  purple:"#7C3AED",purpleL:"#A78BFA",green:"#10B981",greenL:"#34D399",
  amber:"#F59E0B",amberL:"#FCD34D",red:"#EF4444",redL:"#FCA5A5",
  blue:"#3B82F6",blueL:"#93C5FD",gold:"#D4A843",mono:"'DM Mono',monospace",
  display:"'DM Sans',serif",body:"DM Sans,sans-serif",
}

const VISIBILITY_MODES = [
  { id:"private",            label:"Private",           icon:"🔒", desc:"Not visible to recruiters" },
  { id:"connections_only",   label:"Connections Only",  icon:"🤝", desc:"Visible to connections" },
  { id:"matched_recruiters", label:"Matched Recruiters",icon:"🎯", desc:"Visible to matching recruiters" },
  { id:"notice_period",      label:"Notice Period",     icon:"📅", desc:"Visible during notice period" },
  { id:"open",               label:"Open to Market",   icon:"🚀", desc:"Fully visible to recruiters" },
  { id:"return_to_work",     label:"Return to Work",   icon:"↩️", desc:"Actively returning to work" },
  { id:"layoff_recovery",    label:"Layoff Recovery",  icon:"🛡️", desc:"Seeking new opportunities" },
]

function computeSignals(p) {
  const skills=p?.skill_graph||[],exps=p?.experiences||[],vault=p?.vault_files||[]
  const epfo=p?.epfo_verified||false,certs=(p?.certifications||[]).length
  const ready=p?.job_readiness||0,weak=(p?.weak_areas||[]).length
  const elo=p?.elo_rating||800,score=p?.aura_score||0,bd=p?.aura_score_breakdown||{}
  const roleElo=Math.min(1800,Math.max(400,800+skills.length*12+exps.length*40+(bd.experienceDepth||0)*8))
  const mktElo=Math.min(1600,Math.max(400,600+(epfo?200:0)+vault.length*30+score*4+certs*50))
  const proofElo=Math.min(1400,Math.max(200,300+(epfo?350:0)+vault.length*40+certs*80+(bd.projectQuality||0)*12))
  const mobElo=Math.min(1500,Math.max(200,400+ready*8-weak*20+(elo>1000?200:0)+(mktElo>800?150:0)))
  return { roleElo,mktElo,proofElo,mobElo }
}

function layoffRisk(p) {
  let r=0
  if(!p?.epfo_verified)r+=25;if((p?.job_readiness||0)<50)r+=20
  if((p?.vault_files||[]).length<2)r+=15;if((p?.elo_rating||800)<900)r+=20
  return Math.min(90,r)
}

function compBand(elo,domain="") {
  const base=domain.toLowerCase().includes("data")?14:domain.toLowerCase().includes("ml")?18:domain.toLowerCase().includes("devops")?16:12
  const mult=elo>=1400?2.4:elo>=1200?1.9:elo>=1000?1.5:1.1
  const lo=Math.round(base*mult),hi=Math.round(lo*1.35)
  return {lo,hi,display:`₹${lo}–${hi} LPA`}
}

function Pill({children,color=T.purple,bg}){return<span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",background:bg||color+"22",color,fontSize:11,fontWeight:700,borderRadius:99,letterSpacing:0.3,fontFamily:T.mono}}>{children}</span>}

function Card({children,style={},glow}){return<div style={{background:T.card,border:`1px solid ${glow?T.borderHi:T.border}`,borderRadius:16,padding:"20px 22px",boxShadow:glow?`0 0 0 1px ${T.purple}22,0 8px 32px rgba(0,0,0,0.4)`:undefined,...style}}>{children}</div>}

function SectionTitle({icon,children,color=T.purpleL}){return<div style={{fontSize:10,fontWeight:800,letterSpacing:2.5,color,textTransform:"uppercase",marginBottom:14,display:"flex",alignItems:"center",gap:6,fontFamily:T.mono}}>{icon&&<span>{icon}</span>}{children}</div>}

function EloBar({label,value,max=1800,color}){
  const pct=Math.round((value/max)*100)
  return(<div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:11,color:T.ink3}}>{label}</span><span style={{fontSize:12,color,fontWeight:700,fontFamily:T.mono}}>{value}</span></div><div style={{height:4,borderRadius:4,background:T.border,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:4,transition:"width .8s ease"}}/></div></div>)
}

function StatCard({label,value,color=T.purpleL}){return<div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px",flex:1,minWidth:0}}><div style={{fontSize:10,color:T.ink3,fontFamily:T.mono,letterSpacing:1,marginBottom:6}}>{label}</div><div style={{fontSize:22,fontWeight:700,color,fontFamily:T.mono,lineHeight:1}}>{value}</div></div>}

export default function OrbitDashboard({user,userData,setUserData,onNavigate}){
  const [profile,setProfile]=useState(null)
  const [loading,setLoading]=useState(true)
  const [notifications,setNotifications]=useState([])
  const [applications,setApplications]=useState([])
  const [messages,setMessages]=useState([])
  const [schedules,setSchedules]=useState([])
  const [forgeItems,setForgeItems]=useState([])
  const [interviews,setInterviews]=useState([])
  const [subscription,setSubscription]=useState(null)
  const [showEpfo,setShowEpfo]=useState(false)
  const [epfoUan,setEpfoUan]=useState("")
  const [epfoLoading,setEpfoLoading]=useState(false)
  const [visMenu,setVisMenu]=useState(false)
  const uid=user?.id

  const loadData=useCallback(async()=>{
    if(!uid)return;setLoading(true)
    try{
      const [pR,nR,aR,mR,sR,fR,iR,subR]=await Promise.allSettled([
        profileApi.get(uid),nexusApi.notifications(),jobsApi.applications(),
        recruiterApi.messages("inbox"),recruiterApi.schedules(),forgeApi.list(),
        interviewApi.history(),orbitApi.status(),
      ])
      if(pR.status==="fulfilled")setProfile(pR.value)
      if(nR.status==="fulfilled")setNotifications(nR.value||[])
      if(aR.status==="fulfilled")setApplications(aR.value||[])
      if(mR.status==="fulfilled")setMessages(mR.value||[])
      if(sR.status==="fulfilled")setSchedules(sR.value||[])
      if(fR.status==="fulfilled")setForgeItems(fR.value||[])
      if(iR.status==="fulfilled")setInterviews(iR.value||[])
      if(subR.status==="fulfilled")setSubscription(subR.value)
    }catch(e){console.error("[orbit]",e)}finally{setLoading(false)}
  },[uid])

  useEffect(()=>{loadData()},[loadData])

  useEffect(()=>{
    if(!uid)return
    const unsub = profileRealtime.subscribe(uid, (row) => {
      setProfile(p=>({...p,...row}))
      if(setUserData)setUserData(d=>({...d,...row}))
    })
    return()=>unsub()
  },[uid])

  const p=profile||userData||{}
  // Master ELO: prefer userData.eloRating (synced by auth hook) over raw profile field
  const masterElo = userData?.eloRating || p.elo_rating || p.eloRating || 1000
  const sig=computeSignals({...p, elo_rating: masterElo})
  const risk=layoffRisk(p)
  const comp=compBand(masterElo, p.keyword||p.current_role_title||"")
  const verState=p.verification_state||"unverified"
  const visMode=p.visibility_mode||"private"
  const visMeta=VISIBILITY_MODES.find(v=>v.id===visMode)||VISIBILITY_MODES[0]
  const unread=notifications.filter(n=>!n.is_read).length
  const pendingApps=applications.filter(a=>["applied","shortlisted","interview"].includes(a.status))
  const upcoming=schedules.filter(s=>new Date(s.scheduled_at)>new Date()&&s.status==="scheduled")
  const lastIv=interviews[0]
  const doneForge=forgeItems.filter(f=>f.status==="completed").length
  const currentPlan=subscription?.plan||p.subscription_plan||"free"
  const isPro=["pro","elite"].includes(currentPlan)
  const isElite=currentPlan==="elite"

  const VCOL={unverified:{c:T.red,l:"Unverified"},employment_verified:{c:T.amber,l:"Employment Verified"},partially_verified:{c:T.amber,l:"Partially Verified"},fully_trusted:{c:T.green,l:"Fully Trusted"}}
  const vm=VCOL[verState]||VCOL.unverified

  async function handleEpfo(){
    if(!epfoUan.trim())return;setEpfoLoading(true)
    try{await epfoApi.submit(epfoUan.trim());setShowEpfo(false);setEpfoUan("");setTimeout(loadData,2000)}
    catch(e){alert(e.message)}finally{setEpfoLoading(false)}
  }
  async function handleVis(mode){
    try{await profileApi.setVisibility(mode);setProfile(prev=>({...prev,visibility_mode:mode}));setVisMenu(false)}
    catch(e){alert(e.message)}
  }

  const NAME=p.name||p.display_name||user?.user_metadata?.full_name||"Professional"
  const ROLE=p.current_role_title||p.headline||p.keyword||"—"
  const CO=p.current_company||"—"

  const nextAction=!p.epfo_verified
    ?{title:"Verify Employment via EPFO",desc:"Adds trust badges and boosts Market ELO by +200 points.",cta:"Verify Now",action:()=>setShowEpfo(true),urgent:true}
    :(!p.name||!p.profile_photo_url)
    ?{title:"Complete Your Profile",desc:"Missing name or photo reduces recruiter visibility by 60%.",cta:"Edit Profile",action:()=>onNavigate("aura"),urgent:true}
    :!isPro
    ?{title:"Upgrade to Capabilio Pro",desc:"Unlock compensation intel, AI interviews, full Forge and reports.",cta:"See Plans",action:()=>onNavigate("pricing")}
    :(doneForge<3)
    ?{title:"Complete 3 Forge Missions",desc:"Forge proof improves profile trust and role match scores.",cta:"Open Forge",action:()=>onNavigate("forge")}
    :{title:"Apply to Matched Jobs",desc:`${pendingApps.length} active applications. Keep momentum going.`,cta:"Open Launchpad",action:()=>onNavigate("launchpad")}

  if(loading)return(
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:T.body}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:40,height:40,border:`3px solid ${T.purple}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
        <div style={{color:T.ink3,fontSize:13}}>Loading intelligence cockpit…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return(
    <div style={{background:T.bg,minHeight:"100vh",fontFamily:T.body,paddingBottom:100}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"24px 24px 20px"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:68,height:68,borderRadius:"50%",border:`2px solid ${T.purple}44`,overflow:"hidden",background:T.card,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {p.profile_photo_url?<img src={p.profile_photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontFamily:T.display,fontSize:24,fontWeight:800,color:T.purpleL}}>{NAME[0]||"?"}</span>}
              </div>
              <div title={vm.l} style={{position:"absolute",bottom:0,right:0,width:20,height:20,borderRadius:"50%",background:vm.c,border:`2px solid ${T.surface}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#FFFFFF"}}>✓</div>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <h1 style={{fontSize:20,fontWeight:800,color:T.ink,margin:0,fontFamily:T.display}}>{NAME}</h1>
                <Pill color={vm.c} bg={vm.c+"22"}>{vm.l}</Pill>
                {isElite&&<Pill color={T.gold}>⭐ Elite</Pill>}
                {isPro&&!isElite&&<Pill color={T.purpleL}>Capabilio Pro</Pill>}
              </div>
              <div style={{fontSize:14,color:T.ink2,marginBottom:6}}>{ROLE}{CO!=="—"?` · ${CO}`:""}</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <Pill color={T.amber}>ELO {masterElo.toLocaleString()}</Pill>
                <Pill color={T.blue}>Aura {p.aura_score||0}/100</Pill>
                <Pill color={T.green}>{p.profile_completeness||0}% Complete</Pill>
                <div style={{position:"relative"}}>
                  <button onClick={()=>setVisMenu(v=>!v)} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 10px",background:T.card,border:`1px solid ${T.border}`,borderRadius:99,color:T.ink2,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:T.mono}}>
                    {visMeta.icon} {visMeta.label} ▾
                  </button>
                  {visMenu&&(
                    <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:8,zIndex:100,minWidth:220,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
                      {VISIBILITY_MODES.map(vm2=>(
                        <button key={vm2.id} onClick={()=>handleVis(vm2.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:visMode===vm2.id?T.purple+"22":"transparent",border:"none",borderRadius:8,color:visMode===vm2.id?T.purpleL:T.ink2,cursor:"pointer",fontSize:12,textAlign:"left"}}>
                          <span>{vm2.icon}</span>
                          <div><div style={{fontWeight:600}}>{vm2.label}</div><div style={{fontSize:10,opacity:.7}}>{vm2.desc}</div></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{v:pendingApps.length,l:"Applications",c:T.blue},{v:unread,l:"Notifications",c:T.amber},{v:upcoming.length,l:"Upcoming Calls",c:T.green}].map(s=>(
                <div key={s.l} style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:12,padding:"10px 14px",textAlign:"center",minWidth:70}}>
                  <div style={{fontSize:18,fontWeight:700,color:s.c,fontFamily:T.mono}}>{s.v}</div>
                  <div style={{fontSize:10,color:T.ink3}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px",display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,animation:"fadeUp .5s ease both"}}>

        {/* Recommended Action */}
        <Card glow style={{gridColumn:"1/-1",background:`linear-gradient(135deg,${T.purple}18,${T.card})`,borderColor:T.purple+"44"}}>
          <SectionTitle icon="⚡" color={T.purpleL}>RECOMMENDED NEXT ACTION</SectionTitle>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:T.ink,marginBottom:4}}>{nextAction.title}</div>
              <div style={{fontSize:13,color:T.ink2}}>{nextAction.desc}</div>
            </div>
            {nextAction.action&&<button onClick={nextAction.action} style={{padding:"10px 20px",background:T.purple,border:"none",borderRadius:10,color:"#FFFFFF",fontWeight:700,cursor:"pointer",fontSize:13,flexShrink:0}}>{nextAction.cta} →</button>}
          </div>
        </Card>

        {/* ELO Signals */}
        <Card>
          <SectionTitle icon="📊" color={T.purpleL}>ELO SIGNALS</SectionTitle>
          <EloBar label="Role ELO"     value={sig.roleElo}  max={1800} color={T.purpleL}/>
          <EloBar label="Market ELO"   value={sig.mktElo}   max={1600} color={T.amber}/>
          <EloBar label="Proof ELO"    value={sig.proofElo} max={1400} color={T.green}/>
          <EloBar label="Mobility ELO" value={sig.mobElo}   max={1500} color={T.blue}/>
          <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${T.border}`,display:"flex",gap:8}}>
            <StatCard label="OVERALL ELO" value={masterElo.toLocaleString()} color={T.purpleL}/>
            <StatCard label="AURA SCORE"  value={`${p.aura_score||0}/100`} color={T.amber}/>
          </div>
        </Card>

        {/* Market Readiness */}
        <Card>
          <SectionTitle icon="🎯" color={T.amber}>MARKET READINESS</SectionTitle>
          <div style={{textAlign:"center",padding:"12px 0"}}>
            <div style={{fontSize:48,fontWeight:800,color:T.amber,fontFamily:T.mono}}>{p.job_readiness||0}<span style={{fontSize:20,color:T.ink3}}>%</span></div>
            <div style={{fontSize:12,color:T.ink3,marginTop:4}}>Interview Readiness</div>
          </div>
          {[{l:"Profile Gap",v:`${Math.max(0,100-(p.profile_completeness||0))}% gap`,c:T.red},{l:"Comp Fit",v:comp.display,c:T.green},{l:"Last AI Interview",v:lastIv?.overall_score!=null?`${lastIv.overall_score}/100`:"None yet",c:lastIv?.overall_score>=70?T.green:T.ink3}].map(r=>(
            <div key={r.l} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,color:T.ink2}}>{r.l}</span>
              <span style={{fontSize:12,color:r.c,fontFamily:T.mono}}>{r.v}</span>
            </div>
          ))}
          {isPro&&<button onClick={()=>onNavigate("aura")} style={{width:"100%",marginTop:12,padding:"9px",background:`${T.amber}22`,border:`1px solid ${T.amber}44`,borderRadius:8,color:T.amber,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>VIEW FULL INTEL →</button>}
        </Card>

        {/* Career Risk */}
        <Card>
          <SectionTitle icon="🛡️" color={T.red}>CAREER RISK & RESILIENCE</SectionTitle>
          <div style={{display:"flex",gap:12,marginBottom:16}}>
            <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:36,fontWeight:800,color:risk>50?T.red:risk>25?T.amber:T.green,fontFamily:T.mono}}>{risk}<span style={{fontSize:14}}>%</span></div><div style={{fontSize:10,color:T.ink3}}>Layoff Risk</div></div>
            <div style={{flex:1,textAlign:"center"}}><div style={{fontSize:36,fontWeight:800,color:T.green,fontFamily:T.mono}}>{100-risk}<span style={{fontSize:14}}>%</span></div><div style={{fontSize:10,color:T.ink3}}>Resilience</div></div>
          </div>
          {!p.epfo_verified&&<div style={{fontSize:12,color:T.amber,marginBottom:4}}>⚠️ Not EPFO-verified (+25% risk)</div>}
          {(p.job_readiness||0)<50&&<div style={{fontSize:12,color:T.amber,marginBottom:4}}>⚠️ Readiness below 50% (+20% risk)</div>}
          {isPro&&<button onClick={()=>intelApi.generateReport("role_risk").then(r=>alert("Report queued: "+r.report?.title)).catch(e=>alert(e.message))} style={{width:"100%",marginTop:12,padding:"9px",background:`${T.red}22`,border:`1px solid ${T.red}44`,borderRadius:8,color:T.red,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>GENERATE RISK REPORT →</button>}
        </Card>

        {/* Verification */}
        <Card>
          <SectionTitle icon="✅" color={T.green}>VERIFICATION STATUS</SectionTitle>
          {[{l:"Email",done:true},{l:"EPFO Employment",done:p.epfo_verified},{l:"Certifications",done:(p.certifications||[]).length>0},{l:"Profile Photo",done:!!p.profile_photo_url}].map(item=>(
            <div key={item.l} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
              <div style={{width:18,height:18,borderRadius:"50%",background:item.done?T.green+"22":T.border,border:`1px solid ${item.done?T.green:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:item.done?T.green:T.ink4,flexShrink:0}}>{item.done?"✓":"○"}</div>
              <span style={{fontSize:12,color:item.done?T.ink2:T.ink4,flex:1}}>{item.l}</span>
              {!item.done&&item.l.includes("EPFO")&&<button onClick={()=>setShowEpfo(true)} style={{fontSize:10,color:T.amber,background:"transparent",border:`1px solid ${T.amber}44`,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontFamily:T.mono}}>VERIFY</button>}
            </div>
          ))}
          <div style={{padding:"10px 12px",background:`${vm.c}11`,border:`1px solid ${vm.c}33`,borderRadius:8,marginTop:8}}>
            <div style={{fontSize:11,color:vm.c,fontWeight:700}}>{vm.l}</div>
            <div style={{fontSize:11,color:T.ink3,marginTop:2}}>{verState==="unverified"?"Verify EPFO to upgrade your trust level.":"Great! Your profile carries employer trust."}</div>
          </div>
        </Card>

        {/* Comp Intel */}
        <Card>
          <SectionTitle icon="💰" color={T.gold}>COMPENSATION INTELLIGENCE</SectionTitle>
          {isPro?(
            <>
              <div style={{textAlign:"center",padding:"10px 0 14px"}}>
                <div style={{fontSize:11,color:T.ink3,marginBottom:4}}>Estimated market band</div>
                <div style={{fontSize:28,fontWeight:800,color:T.gold,fontFamily:T.mono}}>{comp.display}</div>
                <div style={{fontSize:11,color:T.ink3,marginTop:2}}>Role · Domain · ELO signals</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <div style={{flex:1,padding:10,background:`${T.gold}11`,border:`1px solid ${T.gold}22`,borderRadius:8,textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:T.gold,fontFamily:T.mono}}>₹{comp.lo}L</div><div style={{fontSize:10,color:T.ink3}}>Floor</div></div>
                <div style={{flex:1,padding:10,background:`${T.gold}22`,border:`1px solid ${T.gold}44`,borderRadius:8,textAlign:"center"}}><div style={{fontSize:16,fontWeight:700,color:T.gold,fontFamily:T.mono}}>₹{comp.hi}L</div><div style={{fontSize:10,color:T.ink3}}>Ceiling</div></div>
              </div>
              <button onClick={()=>intelApi.generateReport("compensation").then(()=>alert("Comp report queued!")).catch(e=>alert(e.message))} style={{width:"100%",marginTop:12,padding:"9px",background:`${T.gold}22`,border:`1px solid ${T.gold}44`,borderRadius:8,color:T.gold,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>GENERATE COMP REPORT →</button>
            </>
          ):(
            <div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:32,marginBottom:8}}>🔒</div><div style={{fontSize:13,color:T.ink2,marginBottom:4}}>Requires Capabilio Pro</div><button onClick={()=>onNavigate("pricing")} style={{padding:"8px 16px",background:T.purple,border:"none",borderRadius:8,color:"#FFFFFF",fontWeight:700,fontSize:12,cursor:"pointer"}}>Upgrade</button></div>
          )}
        </Card>

        {/* Applications */}
        <Card>
          <SectionTitle icon="📋" color={T.blue}>ACTIVE APPLICATIONS</SectionTitle>
          {pendingApps.length===0?(
            <div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:13,color:T.ink3,marginBottom:8}}>No active applications</div><button onClick={()=>onNavigate("launchpad")} style={{padding:"8px 16px",background:`${T.blue}22`,border:`1px solid ${T.blue}44`,borderRadius:8,color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>Browse Jobs</button></div>
          ):pendingApps.slice(0,4).map(app=>(
            <div key={app.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"8px 10px",background:T.surface,borderRadius:8,border:`1px solid ${T.border}`}}>
              <div style={{width:32,height:32,borderRadius:8,background:T.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{app.jobs?.company_logo?<img src={app.jobs.company_logo} alt="" style={{width:28,height:28,objectFit:"contain",borderRadius:4}}/>:"🏢"}</div>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:T.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{app.jobs?.title||"Unknown Role"}</div><div style={{fontSize:11,color:T.ink3}}>{app.jobs?.company||"—"}</div></div>
              <Pill color={app.status==="interview"?T.green:app.status==="shortlisted"?T.amber:T.blue}>{app.status}</Pill>
            </div>
          ))}
          {pendingApps.length>0&&<button onClick={()=>onNavigate("launchpad")} style={{width:"100%",marginTop:4,padding:"8px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,color:T.ink3,fontSize:12,cursor:"pointer"}}>View all {pendingApps.length}</button>}
        </Card>

        {/* Messages */}
        <Card>
          <SectionTitle icon="💬" color={T.purpleL}>RECRUITER MESSAGES</SectionTitle>
          {messages.length===0?<div style={{textAlign:"center",padding:"20px 0",color:T.ink3,fontSize:13}}>No messages yet.<br/>Keep profile visible.</div>:messages.slice(0,3).map(msg=>(
            <div key={msg.id} style={{padding:"10px 12px",background:!msg.is_read?T.purple+"11":T.surface,border:`1px solid ${!msg.is_read?T.purple+"33":T.border}`,borderRadius:8,marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{fontSize:12,fontWeight:600,color:T.ink}}>{msg.from_user?.name||"Recruiter"}</span>
                <span style={{fontSize:10,color:T.ink3}}>{new Date(msg.created_at).toLocaleDateString("en-IN")}</span>
              </div>
              <div style={{fontSize:12,color:T.ink2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{msg.subject||msg.body}</div>
            </div>
          ))}
          {messages.length>0&&<button onClick={()=>onNavigate("nexus")} style={{width:"100%",marginTop:4,padding:"8px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:8,color:T.ink3,fontSize:12,cursor:"pointer"}}>View all messages</button>}
        </Card>

        {/* Upcoming */}
        <Card>
          <SectionTitle icon="📅" color={T.green}>UPCOMING CALLS</SectionTitle>
          {upcoming.length===0?<div style={{textAlign:"center",padding:"20px 0",color:T.ink3,fontSize:13}}>No scheduled calls.</div>:upcoming.slice(0,3).map(s=>(
            <div key={s.id} style={{padding:"10px 12px",background:`${T.green}11`,border:`1px solid ${T.green}33`,borderRadius:8,marginBottom:8}}>
              <div style={{fontSize:12,fontWeight:600,color:T.ink,marginBottom:2}}>{s.title||`${s.interview_type} Interview`}</div>
              <div style={{fontSize:11,color:T.green,fontFamily:T.mono}}>{new Date(s.scheduled_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</div>
              {s.meeting_link&&<a href={s.meeting_link} target="_blank" rel="noreferrer" style={{fontSize:11,color:T.blue,marginTop:4,display:"inline-block"}}>Join →</a>}
            </div>
          ))}
        </Card>

        {/* Forge */}
        <Card>
          <SectionTitle icon="🔬" color={T.amber}>FORGE PROGRESS</SectionTitle>
          <div style={{display:"flex",gap:12,marginBottom:16}}>
            {[{v:doneForge,l:"Done",c:T.amber},{v:forgeItems.length-doneForge,l:"Left",c:T.ink2},{v:forgeItems.length?Math.round(doneForge/forgeItems.length*100):0,l:"%",c:T.green}].map(s=>(
              <div key={s.l} style={{flex:1,textAlign:"center"}}><div style={{fontSize:28,fontWeight:800,color:s.c,fontFamily:T.mono}}>{s.v}</div><div style={{fontSize:10,color:T.ink3}}>{s.l}</div></div>
            ))}
          </div>
          {forgeItems.filter(f=>["in_progress","proof_submitted"].includes(f.status)).slice(0,2).map(item=>(
            <div key={item.id} style={{padding:"8px 10px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,marginBottom:6}}>
              <div style={{fontSize:12,color:T.ink,fontWeight:600,marginBottom:2}}>{item.title}</div>
              <Pill color={T.amber}>{item.track}</Pill>
            </div>
          ))}
          <button onClick={()=>onNavigate("forge")} style={{width:"100%",marginTop:8,padding:"9px",background:`${T.amber}22`,border:`1px solid ${T.amber}44`,borderRadius:8,color:T.amber,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>OPEN FORGE →</button>
        </Card>

        {/* AI Interview */}
        <Card>
          <SectionTitle icon="🎤" color={T.blue}>AI INTERVIEW</SectionTitle>
          {interviews.length===0?(
            <div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:13,color:T.ink3,marginBottom:12}}>No interviews yet.</div><button onClick={()=>onNavigate("aura")} style={{padding:"8px 16px",background:`${T.blue}22`,border:`1px solid ${T.blue}44`,borderRadius:8,color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer"}}>Start Interview</button></div>
          ):(
            <>
              <div style={{textAlign:"center",padding:"8px 0 12px"}}><div style={{fontSize:36,fontWeight:800,color:lastIv?.overall_score>=75?T.green:lastIv?.overall_score>=50?T.amber:T.red,fontFamily:T.mono}}>{lastIv?.overall_score??"-"}<span style={{fontSize:14,color:T.ink3}}>/100</span></div><div style={{fontSize:11,color:T.ink3,marginTop:2}}>Last score</div></div>
              <button onClick={()=>onNavigate("aura")} style={{width:"100%",padding:"8px",background:`${T.blue}22`,border:`1px solid ${T.blue}44`,borderRadius:8,color:T.blue,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:T.mono}}>NEW INTERVIEW →</button>
            </>
          )}
        </Card>

        {/* Career Intel */}
        <Card>
          <SectionTitle icon="📈" color={T.purpleL}>CAREER INTELLIGENCE</SectionTitle>
          {isPro?(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[{type:"market_gap",label:"Market Gap",icon:"🔍",color:T.blue},{type:"compensation",label:"Comp Intel",icon:"💰",color:T.gold},{type:"role_risk",label:"Role Risk",icon:"🛡️",color:T.red},...(isElite?[{type:"ai_impact",label:"AI Impact",icon:"🤖",color:T.purple},{type:"transition",label:"Transition",icon:"🔀",color:T.green}]:[])].map(rt=>(
                <button key={rt.type} onClick={()=>intelApi.generateReport(rt.type).then(r=>alert(`Queued: ${r.report?.title||"Success"}`)).catch(e=>alert(e.message))} style={{padding:10,background:`${rt.color}11`,border:`1px solid ${rt.color}33`,borderRadius:8,cursor:"pointer",textAlign:"left"}}>
                  <div style={{fontSize:16,marginBottom:4}}>{rt.icon}</div>
                  <div style={{fontSize:11,color:rt.color,fontWeight:700,fontFamily:T.mono}}>{rt.label}</div>
                </button>
              ))}
            </div>
          ):(
            <div style={{textAlign:"center",padding:"20px 0"}}><div style={{fontSize:28,marginBottom:8}}>📊</div><div style={{fontSize:13,color:T.ink2,marginBottom:12}}>Requires Capabilio Pro or Elite.</div><button onClick={()=>onNavigate("pricing")} style={{padding:"8px 16px",background:T.purple,border:"none",borderRadius:8,color:"#FFFFFF",fontWeight:700,fontSize:12,cursor:"pointer"}}>Upgrade to Pro</button></div>
          )}
        </Card>

      </div>

      {/* EPFO Modal */}
      {showEpfo&&(
        <div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:T.card,border:`1px solid ${T.amber}44`,borderRadius:20,padding:32,maxWidth:480,width:"100%"}}>
            <div style={{fontSize:18,fontWeight:800,color:T.ink,marginBottom:4,fontFamily:T.display}}>Verify via EPFO / UAN</div>
            <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Your UAN confirms employment history and adds the Employment Verified badge to your profile.</div>
            <input value={epfoUan} onChange={e=>setEpfoUan(e.target.value)} placeholder="Enter UAN (12 digits)" style={{width:"100%",padding:"12px 14px",background:T.surface,border:`1px solid ${T.border}`,borderRadius:10,color:T.ink,fontSize:15,fontFamily:T.mono,letterSpacing:2,outline:"none",boxSizing:"border-box",marginBottom:20}}/>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowEpfo(false)} style={{flex:1,padding:"11px",background:"transparent",border:`1px solid ${T.border}`,borderRadius:10,color:T.ink2,cursor:"pointer"}}>Cancel</button>
              <button onClick={handleEpfo} disabled={epfoLoading||epfoUan.length<8} style={{flex:2,padding:"11px",background:T.amber,border:"none",borderRadius:10,color:"#000",fontWeight:700,cursor:"pointer",opacity:epfoLoading||epfoUan.length<8?0.6:1}}>{epfoLoading?"Verifying…":"Verify Employment"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
