/**
 * Forge.jsx — 4-mode career action engine
 * Proof · Switch · Comp · Return
 * ELO earned through real actions, not self-reporting.
 */
import { useState, useCallback } from "react"
import { userDoc } from "../lib/db"

// ─── Design System ────────────────────────────────────────────────────────────
const DS = {
  bg:"#FFFFFF",
  surface:"#FFFFFF",
  surface2:"rgba(0,0,0,0.03)",
  ink:"#0F172A",
  ink2:"#475569",
  ink3:"#94A3B8",
  ink4:"#64748B",
  border:"rgba(0,0,0,0.05)",
  border2:"rgba(0,0,0,0.08)",
  primary:"#6366F1",
  pBg:"rgba(99,102,241,0.12)",
  pBd:"rgba(99,102,241,0.28)",
  green:"#10B981",
  gBg:"rgba(16,185,129,0.12)",
  gBd:"rgba(16,185,129,0.28)",
  amber:"#F59E0B",
  aBg:"rgba(245,158,11,0.12)",
  aBd:"rgba(245,158,11,0.28)",
  blue:"#3B82F6",
  blBg:"rgba(59,130,246,0.12)",
  blBd:"rgba(59,130,246,0.28)",
  purple:"#8B5CF6",
  purBg:"rgba(139,92,246,0.12)",
  purBd:"rgba(139,92,246,0.28)",
  red:"#F43F5E",
  rBg:"rgba(244,63,94,0.12)",
  rBd:"rgba(244,63,94,0.28)",
  teal:"#06B6D4",
  tBg:"rgba(6,182,212,0.12)",
  tBd:"rgba(6,182,212,0.28)",
  display:"'Inter', sans-serif",
  mono:"'JetBrains Mono', monospace",
  body:"'Inter', system-ui, sans-serif",
  sh:"0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.3)",
  sh2:"0 8px 24px rgba(0,0,0,0.08)), 0 4px 12px rgba(0,0,0,0.4)",
  r:12, r2:16, r3:20,
}
const G=`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.fbtn{transition:all .15s;cursor:pointer;} .fbtn:hover{opacity:.88;transform:translateY(-1px);}
`

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Spin({color=DS.primary,size=14}){return<div style={{width:size,height:size,border:`2px solid ${color}33`,borderTopColor:color,borderRadius:"50%",animation:"spin .8s linear infinite",flexShrink:0}}/>}
function Tag({children,color=DS.ink3,bg=DS.surface2,bd=DS.border}){return<span style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 9px",background:bg,color,border:`1px solid ${bd}`,borderRadius:99,fontSize:11,fontWeight:600,fontFamily:DS.mono,whiteSpace:"nowrap"}}>{children}</span>}
function SL({children,color=DS.ink4}){return<div style={{fontSize:10,fontWeight:700,letterSpacing:2.2,color,textTransform:"uppercase",fontFamily:DS.mono,marginBottom:8}}>{children}</div>}
function Card({children,style={}}){return<div style={{background:DS.surface,border:`1px solid ${DS.border}`,borderRadius:DS.r2,boxShadow:DS.sh,padding:"20px 22px",...style}}>{children}</div>}
function Btn({children,onClick,variant="primary",size="md",disabled=false,loading=false,full=false,style={}}){
  const V={primary:{bg:DS.primary,color:"#0F172A",bd:"none"},ghost:{bg:"transparent",color:DS.ink2,bd:`1px solid ${DS.border2}`},success:{bg:DS.gBg,color:DS.green,bd:`1px solid ${DS.gBd}`},amber:{bg:DS.aBg,color:DS.amber,bd:`1px solid ${DS.aBd}`},purple:{bg:DS.purBg,color:DS.purple,bd:`1px solid ${DS.purBd}`},subtle:{bg:DS.surface2,color:DS.ink3,bd:`1px solid ${DS.border}`}}
  const S={sm:"7px 13px",md:"10px 18px",lg:"12px 22px"}
  const v=V[variant]||V.primary
  return<button className="fbtn" onClick={onClick} disabled={disabled||loading} style={{width:full?"100%":undefined,padding:S[size],background:v.bg,color:v.color,border:v.bd,borderRadius:DS.r,fontSize:size==="sm"?11:13,fontWeight:700,fontFamily:DS.body,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,outline:"none",opacity:disabled?.5:1,...style}}>{loading&&<Spin color={v.color} size={11}/>}{children}</button>
}
function Bar({value,max=100,color=DS.primary,h=6}){const p=Math.min((value/max)*100,100);return<div style={{width:"100%",height:h,background:`${color}18`,borderRadius:99}}><div style={{height:"100%",width:`${p}%`,background:color,borderRadius:99,transition:"width .6s ease"}}/></div>}
function Modal({show,onClose,title,children,width=520}){
  if(!show)return null
  return<div style={{position:"fixed",inset:0,zIndex:9000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{position:"absolute",inset:0,background:"rgba(15,15,14,.5)",backdropFilter:"blur(6px)"}} onClick={onClose}/>
    <div style={{position:"relative",width:"100%",maxWidth:width,background:DS.surface,borderRadius:DS.r3,boxShadow:DS.sh2,animation:"fadeUp .2s ease",maxHeight:"88vh",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"16px 22px",borderBottom:`1px solid ${DS.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}><span style={{fontFamily:DS.display,fontSize:16,fontWeight:800,color:DS.ink}}>{title}</span><button onClick={onClose} style={{width:28,height:28,borderRadius:7,border:`1px solid ${DS.border}`,background:DS.surface2,color:DS.ink3,fontSize:17,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",outline:"none"}}>×</button></div>
      <div style={{padding:"20px",overflowY:"auto"}}>{children}</div>
    </div>
  </div>
}

// ─── Task Item ────────────────────────────────────────────────────────────────
function TaskItem({task,ud,onToggle,onAction,saving}){
  const[exp,setExp]=useState(false)
  const computedDone=task.verify?task.verify(ud):null
  const isDone=task.type==="AUTO"?computedDone:(task.type==="SELF"?task.done:false)
  const isAutoVerified=task.type==="AUTO"&&computedDone
  const typeConfig={
    AUTO:{label:"Auto-verified",color:DS.green,bg:DS.gBg,bd:DS.gBd},
    ACTION:{label:"Action required",color:DS.amber,bg:DS.aBg,bd:DS.aBd},
    SELF:{label:"Self-reported",color:DS.ink4,bg:DS.surface2,bd:DS.border},
  }
  const tc=typeConfig[task.type]||typeConfig.SELF
  return<div style={{border:`1px solid ${isDone?DS.gBd:task.type==="ACTION"?DS.aBd:DS.border}`,borderRadius:DS.r,marginBottom:8,background:isDone?DS.gBg:DS.surface,overflow:"hidden",transition:"all .2s"}}>
    <div style={{display:"flex",alignItems:"center",gap:11,padding:"11px 14px"}}>
      {task.type==="AUTO"
        ?<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${isAutoVerified?DS.green:DS.border2}`,background:isAutoVerified?DS.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#0F172A",fontSize:12,fontWeight:700}}>{isAutoVerified?"✓":""}</div>
        :task.type==="SELF"
          ?<button onClick={()=>onToggle&&onToggle(task.id)} disabled={saving} style={{width:22,height:22,borderRadius:6,border:`2px solid ${isDone?DS.green:DS.border2}`,background:isDone?DS.green:"transparent",color:"#0F172A",fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,outline:"none",transition:"all .15s"}}>{isDone?"✓":""}</button>
          :<div style={{width:22,height:22,borderRadius:6,border:`2px solid ${DS.aBd}`,background:DS.aBg,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:12,color:DS.amber,fontWeight:700}}>!</div>
      }
      <div style={{flex:1,minWidth:0}}>
        <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:2}}>
          <span style={{fontSize:13,fontWeight:isDone?600:500,color:isDone?DS.green:DS.ink,textDecoration:isDone&&task.type==="SELF"?"line-through":"none"}}>{task.title}</span>
          <span style={{padding:"1px 7px",background:tc.bg,color:tc.color,border:`1px solid ${tc.bd}`,borderRadius:99,fontSize:9,fontWeight:700,fontFamily:DS.mono}}>{tc.label}</span>
        </div>
        <div style={{fontSize:11,color:DS.ink4}}>{task.subtitle}</div>
      </div>
      {task.eloImpact&&<div style={{textAlign:"right",flexShrink:0}}>
        <Tag color={isDone?DS.green:DS.ink4} bg={isDone?DS.gBg:DS.surface2} bd={isDone?DS.gBd:DS.border}>{isDone?"Earned ✓":task.eloImpact}</Tag>
        {!isDone&&<div style={{fontSize:9,color:DS.ink4,marginTop:2,textAlign:"right"}}>potential</div>}
      </div>}
      {task.detail&&<button onClick={()=>setExp(e=>!e)} style={{width:22,height:22,borderRadius:5,border:`1px solid ${DS.border}`,background:DS.surface2,color:DS.ink3,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",outline:"none",flexShrink:0}}>{exp?"▲":"▼"}</button>}
    </div>
    {task.type==="ACTION"&&!isDone&&<div style={{padding:"0 14px 11px",display:"flex",gap:9,alignItems:"center"}}>
      <Btn size="sm" variant="amber" onClick={()=>onAction&&onAction(task.actionTarget)}>{task.actionLabel||"Complete Action →"}</Btn>
      <span style={{fontSize:11,color:DS.ink4}}>This task verifies automatically once the action is complete.</span>
    </div>}
    {exp&&task.detail&&<div style={{padding:"9px 14px 12px",borderTop:`1px solid ${DS.border}`,background:DS.surface2,fontSize:12,color:DS.ink3,lineHeight:1.65}}>{task.detail}</div>}
  </div>
}

function ModeHeader({mode,done,total,verified,color,icon,subtitle}){
  const pct=Math.round((done/Math.max(total,1))*100)
  const vPct=Math.round((verified/Math.max(total,1))*100)
  return<div style={{padding:"18px 22px",background:`linear-gradient(135deg,${color}08,${DS.surface})`,border:`1.5px solid ${color}22`,borderRadius:DS.r2,marginBottom:18}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div style={{display:"flex",alignItems:"center",gap:11}}><span style={{fontSize:26}}>{icon}</span><div><div style={{fontFamily:DS.display,fontSize:18,fontWeight:800,color:DS.ink}}>{mode}</div><div style={{fontSize:12,color:DS.ink3,marginTop:1}}>{subtitle}</div></div></div>
      <div style={{textAlign:"right"}}>
        <div style={{fontFamily:DS.mono,fontSize:22,fontWeight:700,color}}>{done}/{total}</div>
        <div style={{fontSize:9,fontWeight:700,color:DS.ink4,fontFamily:DS.mono,textTransform:"uppercase",letterSpacing:1}}>tasks done</div>
        {verified>0&&<div style={{fontSize:10,color:DS.green,fontWeight:600,marginTop:1}}>{verified} auto-verified</div>}
      </div>
    </div>
    <Bar value={pct} color={color} h={6}/>
    <div style={{display:"flex",gap:12,marginTop:6}}>
      <span style={{fontSize:11,color:DS.ink4}}>{pct}% progress</span>
      <span style={{fontSize:11,color:DS.green}}>● {vPct}% system-verified</span>
      <span style={{fontSize:11,color:DS.ink4}}>{total-done} remaining</span>
    </div>
  </div>
}

function TransparencyBanner(){
  const[show,setShow]=useState(true)
  if(!show)return null
  return<div style={{marginBottom:16,padding:"11px 14px",background:DS.blBg,border:`1px solid ${DS.blBd}`,borderRadius:DS.r,display:"flex",gap:10,alignItems:"flex-start"}}>
    <span style={{fontSize:15,flexShrink:0}}>🔒</span>
    <div style={{flex:1}}>
      <div style={{fontSize:12,fontWeight:700,color:DS.blue,marginBottom:3}}>How career score gains work in Forge</div>
      <div style={{fontSize:12,color:DS.ink2,lineHeight:1.65}}><strong>Auto-verified tasks</strong> update when you complete the real action — scores improve from real data, not self-reporting. <strong>Action-required tasks</strong> link to the actual workflow. <strong>Self-reported tasks</strong> record intent but carry no score weight alone.</div>
    </div>
    <button onClick={()=>setShow(false)} style={{fontSize:14,color:DS.ink4,background:"none",border:"none",cursor:"pointer",flexShrink:0,outline:"none"}}>×</button>
  </div>
}

// ─── PROOF FORGE ──────────────────────────────────────────────────────────────
function ProofForge({ud,onSave,onNav}){
  const[saving,setSaving]=useState(false)
  const[newSkill,setNewSkill]=useState("")
  const[adding,setAdding]=useState(false)
  const[summaryEdit,setSummaryEdit]=useState(false)
  const[summaryText,setSummaryText]=useState(ud?.profileSummary||"")
  const[savingSum,setSavingSum]=useState(false)
  const skills=(ud?.skills||[]).map(s=>typeof s==="string"?s:s?.name||"").filter(Boolean)

  const tasks=[
    {id:"p1",type:"AUTO",title:"Write your professional summary",subtitle:"A 3–5 sentence narrative covering role, domain, and impact",eloImpact:"Proof Strength ↑",verify:u=>!!(u?.profileSummary),detail:"Your summary is the first signal recruiters read. Include current role, domain expertise, one quantified outcome, and target direction."},
    {id:"p2",type:"AUTO",title:"Document 5+ verified skills",subtitle:"Skills added to your profile",eloImpact:"Proof Strength ↑↑",verify:u=>(u?.skills||[]).length>=5,detail:"Add skills using the input below. Skills are auto-verified by your employer history and project evidence when available."},
    {id:"p3",type:"AUTO",title:"Document your top 3 project outcomes",subtitle:"Projects with measurable results — from your Timeline",eloImpact:"Proof Strength ↑",verify:u=>(u?.resumeProjects||[]).length>=3,detail:"Each project must have a measurable result (%, ₹ value, scale, uptime, users impacted)."},
    {id:"p4",type:"AUTO",title:"Upload a proof document to Vault",subtitle:"Resume, offer letter, or project report",eloImpact:"Proof Strength ↑",verify:u=>(u?.vaultFiles||[]).length>0,detail:"Even one document significantly increases recruiter trust."},
    {id:"p5",type:"ACTION",title:"Verify employment via EPFO/UAN",subtitle:"Highest single-action ROI on the platform",eloImpact:"Proof Strength ↑↑↑",actionTarget:"vault",actionLabel:"Go to Vault → Verify →",verify:u=>!!(u?.uanVerified),detail:"UAN verification links your work history to official EPFO records. Strongest proof signal — cannot be self-reported."},
    {id:"p6",type:"AUTO",title:"List at least 2 certifications",subtitle:"Certifications added via Timeline",eloImpact:"+30 Proof ELO",verify:u=>(u?.certifications||[]).length>=2,detail:"Include provider, year, and credential ID. AWS, Google, Microsoft certs carry highest signal."},
  ].map(t=>({...t,done:t.verify?t.verify(ud):false}))

  const done=tasks.filter(t=>t.done).length
  const verified=tasks.filter(t=>t.type==="AUTO"&&t.done).length

  const addSkill=async()=>{
    if(!newSkill.trim()||adding)return
    setAdding(true)
    await onSave({skills:[...skills,newSkill.trim()]})
    setNewSkill("");setAdding(false)
  }
  const removeSkill=async s=>await onSave({skills:skills.filter(x=>x!==s)})
  const saveSummary=async()=>{
    if(!summaryText.trim())return
    setSavingSum(true);await onSave({profileSummary:summaryText.trim()});setSavingSum(false);setSummaryEdit(false)
  }

  return<div>
    <TransparencyBanner/>
    <ModeHeader mode="Proof Forge" done={done} total={tasks.length} verified={verified} color={DS.purple} icon="🔐" subtitle="Build verifiable evidence for every claim on your profile"/>
    <Card style={{marginBottom:14}}>
      <SL color={DS.purple}>Live Proof Status</SL>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        {[{l:"Skills",v:skills.length,target:5,c:DS.primary},{l:"Projects",v:(ud?.resumeProjects||[]).length,target:3,c:DS.purple},{l:"Verified Employers",v:(ud?.experiences||[]).filter(e=>e.verificationStatus==="verified").length,target:1,c:DS.green}].map((s,i)=><div key={i} style={{padding:"12px",background:s.v>=s.target?DS.gBg:DS.surface2,border:`1px solid ${s.v>=s.target?DS.gBd:DS.border}`,borderRadius:DS.r,textAlign:"center"}}>
          <div style={{fontFamily:DS.mono,fontSize:20,fontWeight:700,color:s.v>=s.target?DS.green:s.c}}>{s.v}</div>
          <div style={{fontSize:11,fontWeight:600,color:DS.ink}}>{s.l}</div>
          <div style={{fontSize:10,color:DS.ink4}}>target: {s.target}+</div>
          {s.v>=s.target&&<div style={{fontSize:10,color:DS.green,fontWeight:700,marginTop:2}}>✓ Auto-verified</div>}
        </div>)}
      </div>
      <div style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
          <div style={{fontSize:12,fontWeight:600,color:DS.ink3}}>Professional Summary {ud?.profileSummary&&<span style={{color:DS.green,fontSize:11}}>✓ Saved</span>}</div>
          <button onClick={()=>setSummaryEdit(e=>!e)} style={{fontSize:11,fontWeight:700,color:DS.primary,background:"none",border:"none",cursor:"pointer",outline:"none"}}>{summaryEdit?"Cancel":"Edit"}</button>
        </div>
        {!summaryEdit&&ud?.profileSummary
          ?<div style={{padding:"9px 12px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:DS.r,fontSize:12,color:DS.ink2,lineHeight:1.65}}>{ud.profileSummary}</div>
          :summaryEdit
            ?<div>
              <textarea value={summaryText} onChange={e=>setSummaryText(e.target.value)} rows={4} placeholder="I am a [role] with [X years] experience in [domain]…" style={{width:"100%",padding:"9px 12px",background:DS.surface2,border:`1.5px solid ${DS.border}`,borderRadius:DS.r,fontSize:13,fontFamily:DS.body,color:DS.ink,outline:"none",resize:"vertical",lineHeight:1.6,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=DS.primary} onBlur={e=>e.target.style.borderColor=DS.border}/>
              <div style={{display:"flex",gap:8,marginTop:8}}><Btn onClick={()=>setSummaryEdit(false)} variant="ghost" size="sm">Cancel</Btn><Btn onClick={saveSummary} loading={savingSum} size="sm">Save Summary →</Btn></div>
            </div>
            :<div style={{padding:"9px 12px",background:DS.aBg,border:`1px solid ${DS.aBd}`,borderRadius:DS.r,fontSize:12,color:DS.amber}}>No summary yet. Click Edit to write one.</div>
        }
      </div>
      <div>
        <div style={{fontSize:12,fontWeight:600,color:DS.ink3,marginBottom:7}}>Add skills</div>
        <div style={{display:"flex",gap:9}}>
          <input value={newSkill} onChange={e=>setNewSkill(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSkill()} placeholder="e.g. TypeScript, System Design, React…" style={{flex:1,padding:"9px 12px",background:DS.surface2,border:`1.5px solid ${DS.border}`,borderRadius:DS.r,fontSize:13,fontFamily:DS.body,color:DS.ink,outline:"none",transition:"border .15s"}} onFocus={e=>e.target.style.borderColor=DS.primary} onBlur={e=>e.target.style.borderColor=DS.border}/>
          <Btn onClick={addSkill} loading={adding} variant="subtle">+ Add</Btn>
        </div>
        {skills.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10}}>
          {skills.map((s,i)=><span key={i} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",background:DS.purBg,color:DS.purple,border:`1px solid ${DS.purBd}`,borderRadius:99,fontSize:11,fontWeight:600,fontFamily:DS.mono}}>
            {s}<button onClick={()=>removeSkill(s)} style={{fontSize:12,color:DS.purple,background:"none",border:"none",cursor:"pointer",outline:"none",lineHeight:1,padding:"0 0 0 2px"}}>×</button>
          </span>)}
        </div>}
      </div>
    </Card>
    <SL>Proof Forge Tasks</SL>
    {tasks.map(t=><TaskItem key={t.id} task={t} ud={ud} onToggle={null} onAction={onNav} saving={saving}/>)}
  </div>
}

// ─── SWITCH FORGE ─────────────────────────────────────────────────────────────
function SwitchForge({ud,onSave,onNav}){
  const[saving,setSaving]=useState(false)
  const[targetRole,setTargetRole]=useState(ud?.targetRole||"")
  const[saving2,setSaving2]=useState(false)

  const tasks=[
    {id:"s1",type:"AUTO",title:"Define and save your target role",subtitle:"Auto-verified from your Career Settings",eloImpact:"Career Mobility ↑",verify:u=>!!(u?.targetRole),detail:"Set your target role. This anchors market gap analysis, Market ELO, and comp benchmarking."},
    {id:"s2",type:"AUTO",title:"Reach 80%+ profile health",subtitle:"Computed from employment, skills, summary, and Vault",eloImpact:"Career Mobility ↑↑",verify:u=>{const c=[(u?.experiences||[]).length>0,(u?.skills||[]).length>=5,!!(u?.profileSummary),(u?.vaultFiles||[]).length>0];return c.filter(Boolean).length>=3},detail:"Profile health: employment history, 5+ skills, profile summary, and at least one Vault document."},
    {id:"s3",type:"SELF",title:"Identify 3 adjacent transition roles",subtitle:"Self-reported research task",eloImpact:"Career Mobility ↑",done:!!(ud?.switchForgeTasks?.find(t=>t.id==="s3")?.done),detail:"Adjacent roles are positions where 70%+ of your skills transfer directly. Usually 10–25% comp uplifts with shorter ramp times."},
    {id:"s4",type:"SELF",title:"Write your top 3 value statements",subtitle:"Proof-backed claims you can defend in any interview",eloImpact:"Career Mobility ↑",done:!!(ud?.switchForgeTasks?.find(t=>t.id==="s4")?.done),detail:"A value statement: 'I [did X] using [skill Y], resulting in [measurable outcome Z], which impacted [business metric].'"},
    {id:"s5",type:"SELF",title:"Research 5 target companies",subtitle:"Validate tech stack, culture, hiring signals",eloImpact:"Career Mobility ↑",done:!!(ud?.switchForgeTasks?.find(t=>t.id==="s5")?.done),detail:"Research each company's tech stack, recent news, Glassdoor sentiment, and decision-makers."},
    {id:"s6",type:"ACTION",title:"Activate recruiter visibility on Launchpad",subtitle:"Requires navigating to Launchpad",eloImpact:"Career Mobility ↑↑",actionTarget:"launchpad",actionLabel:"Go to Launchpad →",verify:u=>!!(u?.recruiterVisible),detail:"Activating recruiter visibility puts your verified profile in front of employers matching your target role."},
  ].map(t=>({...t,done:t.verify?t.verify(ud):!!(ud?.switchForgeTasks?.find(st=>st.id===t.id)?.done)}))

  const done=tasks.filter(t=>t.done).length
  const verified=tasks.filter(t=>(t.type==="AUTO"||t.type==="ACTION")&&t.done).length

  const toggleSelf=async id=>{
    setSaving(true)
    const prev=ud?.switchForgeTasks||[]
    const exists=prev.find(t=>t.id===id)
    const updated=exists?prev.map(t=>t.id===id?{...t,done:!t.done}:t):[...prev,{id,done:true}]
    await onSave({switchForgeTasks:updated});setSaving(false)
  }
  const saveTarget=async()=>{if(!targetRole.trim())return;setSaving2(true);await onSave({targetRole:targetRole.trim()});setSaving2(false)}

  return<div>
    <TransparencyBanner/>
    <ModeHeader mode="Switch Forge" done={done} total={tasks.length} verified={verified} color={DS.blue} icon="🔀" subtitle="Structured, evidence-backed career transition system"/>
    <Card style={{marginBottom:14}}>
      <SL color={DS.blue}>Target Role <span style={{color:DS.green,fontSize:9}}>{ud?.targetRole?"AUTO-VERIFIED ✓":""}</span></SL>
      <div style={{display:"flex",gap:9}}>
        <input value={targetRole} onChange={e=>setTargetRole(e.target.value)} onKeyDown={e=>e.key==="Enter"&&saveTarget()} placeholder="e.g. Senior Product Manager · B2B SaaS" style={{flex:1,padding:"9px 12px",background:DS.surface2,border:`1.5px solid ${ud?.targetRole?DS.gBd:DS.border}`,borderRadius:DS.r,fontSize:13,fontFamily:DS.body,color:DS.ink,outline:"none",transition:"border .15s"}} onFocus={e=>e.target.style.borderColor=DS.blue} onBlur={e=>e.target.style.borderColor=ud?.targetRole?DS.gBd:DS.border}/>
        <Btn onClick={saveTarget} loading={saving2} variant="subtle">Save</Btn>
      </div>
      {ud?.targetRole&&<div style={{marginTop:9,padding:"7px 11px",background:DS.blBg,border:`1px solid ${DS.blBd}`,borderRadius:DS.r,fontSize:11,color:DS.blue}}>✓ Target saved: <strong>{ud.targetRole}</strong> · Market ELO and gap analysis calibrated.</div>}
    </Card>
    <SL>Switch Forge Tasks</SL>
    {tasks.map(t=><TaskItem key={t.id} task={t} ud={ud} onToggle={t.type==="SELF"?toggleSelf:null} onAction={onNav} saving={saving}/>)}
  </div>
}

// ─── COMP FORGE ───────────────────────────────────────────────────────────────
function CompForge({ud,onSave}){
  const[saving,setSaving]=useState(false)
  const[ctc,setCtc]=useState(ud?.currentCTC||"")
  const[savingCtc,setSavingCtc]=useState(false)
  const yoe=ud?.experiences?.length?1.5+ud.experiences.length*1.5:0
  const base=800000+yoe*150000
  const f=n=>n>=100000?`₹${(n/100000).toFixed(0)}L`:`₹${n.toLocaleString("en-IN")}`

  const tasks=[
    {id:"c1",type:"AUTO",title:"Enter your current CTC",subtitle:"Auto-verified once saved",eloImpact:"Unlocks insights",verify:u=>!!(u?.currentCTC),detail:"Your CTC powers underpayment detection. Only visible to you."},
    {id:"c2",type:"SELF",title:"Research market comp from 3 sources",subtitle:"Glassdoor, LinkedIn Salary, AmbitionBox",eloImpact:"Market Standing ↑",done:!!(ud?.compForgeTasks?.find(t=>t.id==="c2")?.done),detail:"Note P25, P50, P75 bands for your role and location."},
    {id:"c3",type:"SELF",title:"Write your negotiation anchor statement",subtitle:"Practiced statement linking experience, proof, and market band",eloImpact:"Career Mobility ↑",done:!!(ud?.compForgeTasks?.find(t=>t.id==="c3")?.done),detail:"'Based on my [X yrs] in [domain], verified [outcomes], and market benchmarks showing a midpoint of [₹X], I'm targeting [₹Y].'"},
    {id:"c4",type:"SELF",title:"Identify 3 highest-leverage proof points",subtitle:"Quantified outcomes that justify above-midpoint pay",eloImpact:"+15 Comp leverage",done:!!(ud?.compForgeTasks?.find(t=>t.id==="c4")?.done),detail:"'Reduced infra costs by ₹40L/yr', 'Scaled DAU from 50K to 400K', 'Led team of 8 engineers'."},
    {id:"c5",type:"SELF",title:"Map raise vs switch scenarios",subtitle:"Calculate the financial case for each path",eloImpact:"+30 Financial clarity",done:!!(ud?.compForgeTasks?.find(t=>t.id==="c5")?.done),detail:"Switch gain est: avg +28%. Raise probability after strong proof: 10–20% if in role >12 months."},
  ].map(t=>({...t,done:t.verify?t.verify(ud):!!(ud?.compForgeTasks?.find(st=>st.id===t.id)?.done)}))

  const done=tasks.filter(t=>t.done).length
  const verified=tasks.filter(t=>t.type==="AUTO"&&t.done).length

  const toggleSelf=async id=>{
    setSaving(true)
    const prev=ud?.compForgeTasks||[]
    const exists=prev.find(t=>t.id===id)
    const updated=exists?prev.map(t=>t.id===id?{...t,done:!t.done}:t):[...prev,{id,done:true}]
    await onSave({compForgeTasks:updated});setSaving(false)
  }
  const saveCtc=async()=>{if(!ctc)return;setSavingCtc(true);await onSave({currentCTC:ctc});setSavingCtc(false)}

  return<div>
    <TransparencyBanner/>
    <ModeHeader mode="Comp Forge" done={done} total={tasks.length} verified={verified} color={DS.primary} icon="💰" subtitle="Build evidence, strategy, and confidence to negotiate better pay"/>
    <Card style={{marginBottom:14}}>
      <SL color={DS.primary}>Compensation Snapshot {ud?.currentCTC&&<span style={{color:DS.green,fontSize:9}}>CTC SAVED ✓</span>}</SL>
      <div style={{display:"flex",gap:9,marginBottom:12,alignItems:"flex-end"}}>
        <div style={{flex:1}}>
          <div style={{fontSize:11,fontWeight:600,color:DS.ink3,marginBottom:5}}>Your Current CTC (₹L p.a.) <span style={{fontWeight:400,color:DS.ink4}}>— only visible to you</span></div>
          <input value={ctc} onChange={e=>setCtc(e.target.value)} type="number" placeholder="e.g. 18" style={{width:"100%",padding:"9px 12px",background:DS.surface2,border:`1.5px solid ${ud?.currentCTC?DS.gBd:DS.border}`,borderRadius:DS.r,fontSize:13,fontFamily:DS.body,color:DS.ink,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=DS.primary} onBlur={e=>e.target.style.borderColor=ud?.currentCTC?DS.gBd:DS.border}/>
        </div>
        <Btn onClick={saveCtc} loading={savingCtc} variant="subtle">Save</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {[{l:"Market Low",v:f(Math.round(base*.82)),hi:false},{l:"Midpoint",v:f(Math.round((base*.82+base*1.38)/2)),hi:true},{l:"Market High",v:f(Math.round(base*1.38)),hi:false}].map((b,i)=><div key={i} style={{padding:"11px",background:b.hi?DS.pBg:DS.surface2,border:`1px solid ${b.hi?DS.pBd:DS.border}`,borderRadius:DS.r,textAlign:"center"}}><div style={{fontSize:9,fontWeight:700,color:DS.ink4,fontFamily:DS.mono,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{b.l}</div><div style={{fontFamily:DS.mono,fontSize:14,fontWeight:700,color:b.hi?DS.primary:DS.ink3}}>{b.v}</div></div>)}
      </div>
      {ud?.currentCTC&&<div style={{marginTop:10,padding:"9px 12px",background:parseFloat(ud.currentCTC)*100000<Math.round((base*.82+base*1.38)/2)-200000?DS.rBg:DS.gBg,border:`1px solid ${parseFloat(ud.currentCTC)*100000<Math.round((base*.82+base*1.38)/2)-200000?DS.rBd:DS.gBd}`,borderRadius:DS.r,fontSize:12,fontWeight:600,color:parseFloat(ud.currentCTC)*100000<Math.round((base*.82+base*1.38)/2)-200000?DS.red:DS.green}}>
        {parseFloat(ud.currentCTC)*100000<Math.round((base*.82+base*1.38)/2)-200000?"⚠️ Likely underpaid — strong case for raise or switch.":"✓ Within or above market band."}
      </div>}
    </Card>
    <SL>Comp Forge Tasks</SL>
    {tasks.map(t=><TaskItem key={t.id} task={t} ud={ud} onToggle={t.type==="SELF"?toggleSelf:null} onAction={null} saving={saving}/>)}
  </div>
}

// ─── RETURN FORGE ─────────────────────────────────────────────────────────────
function ReturnForge({ud,onSave,onNav}){
  const[saving,setSaving]=useState(false)
  const[breakType,setBreakType]=useState(ud?.breakType||"")
  const[narrativeText,setNarrativeText]=useState(ud?.returnNarrative||"")
  const[savingNarr,setSavingNarr]=useState(false)
  const[editNarr,setEditNarr]=useState(false)

  const tasks=[
    {id:"r1",type:"AUTO",title:"Define your return narrative",subtitle:"Auto-verified once saved below",eloImpact:"Career Mobility ↑",verify:u=>!!(u?.returnNarrative),detail:"'[I took time off] for [honest reason]. During this time, I [maintained/improved X skill]. I'm returning with [specific direction].'"},
    {id:"r2",type:"ACTION",title:"Repair and update your career timeline",subtitle:"Add gap entries in Timeline to close unexplained voids",eloImpact:"+25 Proof ELO",actionTarget:"timeline",actionLabel:"Go to Timeline →",verify:u=>(u?.experiences||[]).some(e=>e.breakNote||e.isCurrent),detail:"For gaps, add a timeline entry explaining what you were doing. Honesty signals self-awareness."},
    {id:"r3",type:"AUTO",title:"Rebuild your skill graph (6+ skills)",subtitle:"Auto-verified from your actual skill list",eloImpact:"Market Standing ↑↑",verify:u=>(u?.skills||[]).length>=6,detail:"Mark skills as Current, Rusty, or Stale. Add 1–2 new skills that emerged since your break."},
    {id:"r4",type:"SELF",title:"Identify 2 return-ready adjacent roles",subtitle:"Roles designed for re-entry",eloImpact:"Career Mobility ↑",done:!!(ud?.returnForgeTasks?.find(t=>t.id==="r4")?.done),detail:"Search 'returnship programs', 'back to work', 'career returners'. Tata, Infosys, Goldman Sachs, Google have formal India returnship programs."},
    {id:"r5",type:"AUTO",title:"Generate one proof artifact from break period",subtitle:"Project, article, or cert from during your break",eloImpact:"Proof Strength ↑",verify:u=>(u?.resumeProjects||[]).some(p=>p.duringBreak)||!!(u?.breakArtifact),detail:"Even one proof artifact dramatically changes recruiter perception. Add via Timeline → Projects."},
    {id:"r6",type:"ACTION",title:"Activate Return-Ready Sprint on Launchpad",subtitle:"Filters for employers open to career returners",eloImpact:"Unlocks Sprint",actionTarget:"launchpad",actionLabel:"Go to Launchpad →",verify:u=>!!(u?.returnSprintActive),detail:"Return-Ready Sprint filters for returnship programs and employers with re-entry policies."},
  ].map(t=>({...t,done:t.verify?t.verify(ud):!!(ud?.returnForgeTasks?.find(st=>st.id===t.id)?.done)}))

  const done=tasks.filter(t=>t.done).length
  const verified=tasks.filter(t=>(t.type==="AUTO"||t.type==="ACTION")&&t.done).length

  const toggleSelf=async id=>{
    setSaving(true)
    const prev=ud?.returnForgeTasks||[]
    const exists=prev.find(t=>t.id===id)
    const updated=exists?prev.map(t=>t.id===id?{...t,done:!t.done}:t):[...prev,{id,done:true}]
    await onSave({returnForgeTasks:updated});setSaving(false)
  }
  const saveNarrative=async()=>{if(!narrativeText.trim())return;setSavingNarr(true);await onSave({returnNarrative:narrativeText.trim()});setSavingNarr(false);setEditNarr(false)}
  const saveBreak=v=>{setBreakType(v);onSave({breakType:v})}

  return<div>
    <TransparencyBanner/>
    <ModeHeader mode="Return Forge" done={done} total={tasks.length} verified={verified} color={DS.amber} icon="🌱" subtitle="Structured re-entry after layoffs or career breaks"/>
    <Card style={{marginBottom:14}}>
      <SL color={DS.amber}>Return Context</SL>
      <div style={{marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:600,color:DS.ink3,marginBottom:6}}>Type of career break</div>
        <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
          {["Layoff / Redundancy","Career break (personal)","Parental leave","Health / medical","Relocation","Freelancing","Sabbatical"].map(b=><button key={b} onClick={()=>saveBreak(b)} style={{padding:"5px 12px",background:breakType===b?DS.aBg:DS.surface2,border:`1px solid ${breakType===b?DS.aBd:DS.border}`,borderRadius:99,fontSize:11,fontWeight:breakType===b?700:500,color:breakType===b?DS.amber:DS.ink3,cursor:"pointer",outline:"none",transition:"all .15s"}}>{b}</button>)}
        </div>
      </div>
      <div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
          <div style={{fontSize:12,fontWeight:600,color:DS.ink3}}>Return Narrative {ud?.returnNarrative&&<span style={{color:DS.green,fontSize:11}}>✓ Saved (Auto-verified)</span>}</div>
          <button onClick={()=>setEditNarr(e=>!e)} style={{fontSize:11,fontWeight:700,color:DS.primary,background:"none",border:"none",cursor:"pointer",outline:"none"}}>{editNarr?"Cancel":"Edit"}</button>
        </div>
        {!editNarr&&ud?.returnNarrative
          ?<div style={{padding:"9px 12px",background:DS.gBg,border:`1px solid ${DS.gBd}`,borderRadius:DS.r,fontSize:12,color:DS.ink2,lineHeight:1.65}}>{ud.returnNarrative}</div>
          :editNarr
            ?<div>
              <textarea value={narrativeText} onChange={e=>setNarrativeText(e.target.value)} rows={4} placeholder="I took time off for [reason]. During this time, I [what you did]. I'm now returning with [specific direction]." style={{width:"100%",padding:"9px 12px",background:DS.surface2,border:`1.5px solid ${DS.border}`,borderRadius:DS.r,fontSize:13,fontFamily:DS.body,color:DS.ink,outline:"none",resize:"vertical",lineHeight:1.6,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=DS.amber} onBlur={e=>e.target.style.borderColor=DS.border}/>
              <div style={{display:"flex",gap:8,marginTop:8}}><Btn onClick={()=>setEditNarr(false)} variant="ghost" size="sm">Cancel</Btn><Btn onClick={saveNarrative} loading={savingNarr} size="sm" variant="amber">Save Narrative →</Btn></div>
            </div>
            :<div style={{padding:"9px 12px",background:DS.aBg,border:`1px solid ${DS.aBd}`,borderRadius:DS.r,fontSize:12,color:DS.amber}}>No narrative saved. Click Edit to write one.</div>
        }
      </div>
    </Card>
    <SL>Return Forge Tasks</SL>
    {tasks.map(t=><TaskItem key={t.id} task={t} ud={ud} onToggle={t.type==="SELF"?toggleSelf:null} onAction={onNav} saving={saving}/>)}
  </div>
}

// ─── TRUST FORGE ──────────────────────────────────────────────────────────────
function TrustForge({ud,onSave,onNav}){
  const[saving,setSaving]=useState(false)
  const tasks=[
    {id:"t1",type:"AUTO",title:"Complete EPFO/UAN employment verification",subtitle:"Highest-trust signal available in India",eloImpact:"Proof Strength ↑↑↑",verify:u=>!!(u?.uanVerified),detail:"UAN verification links your work history to official government EPFO records. No other action delivers this level of trust signal to recruiters and hiring managers."},
    {id:"t2",type:"AUTO",title:"Upload a resume or offer letter to Vault",subtitle:"Core proof document that anchors all other claims",eloImpact:"Proof Strength ↑↑",verify:u=>(u?.vaultFiles||[]).length>0,detail:"A resume or offer letter in Vault is the baseline trust anchor. Recruiters with access to your Vault see this document."},
    {id:"t3",type:"AUTO",title:"Add LinkedIn profile URL",subtitle:"Cross-platform identity confirmation",eloImpact:"Market Standing ↑",verify:u=>!!(u?.linkedinUrl),detail:"A linked LinkedIn profile confirms your professional identity across platforms and signals consistency."},
    {id:"t4",type:"AUTO",title:"Document 2+ certifications with provider and year",subtitle:"Third-party credentialing",eloImpact:"Proof Strength ↑",verify:u=>(u?.certifications||[]).length>=2,detail:"Certifications from AWS, Google, Microsoft, or domain-specific bodies carry the highest signal weight."},
    {id:"t5",type:"AUTO",title:"Add measurable outcomes to at least 2 experiences",subtitle:"Quantified impact — %, ₹, scale, or time saved",eloImpact:"Proof Strength ↑",verify:u=>(u?.experiences||[]).filter(e=>e.outcomes?.trim()).length>=2,detail:"'Reduced latency by 40%', 'Led team of 8', 'Shipped to 200K users'. Outcomes without numbers are weak. Outcomes with numbers are proof."},
    {id:"t6",type:"SELF",title:"Get at least one professional recommendation written",subtitle:"LinkedIn recommendation or reference letter",eloImpact:"Trust layer complete",done:!!(ud?.trustForgeTasks?.find(t=>t.id==="t6")?.done),detail:"A written recommendation from a manager or senior colleague is one of the strongest offline trust signals. Store it in Vault."},
  ].map(t=>({...t,done:t.verify?t.verify(ud):!!(ud?.trustForgeTasks?.find(st=>st.id===t.id)?.done)}))

  const done=tasks.filter(t=>t.done).length
  const verified=tasks.filter(t=>(t.type==="AUTO")&&t.done).length

  const toggleSelf=async id=>{
    setSaving(true)
    const prev=ud?.trustForgeTasks||[]
    const exists=prev.find(t=>t.id===id)
    const updated=exists?prev.map(t=>t.id===id?{...t,done:!t.done}:t):[...prev,{id,done:true}]
    await onSave({trustForgeTasks:updated});setSaving(false)
  }

  return<div>
    <TransparencyBanner/>
    <ModeHeader mode="Trust Forge" done={done} total={tasks.length} verified={verified} color={DS.green} icon="🛡" subtitle="Build the verified trust layer that makes recruiters confident in your profile"/>
    <Card style={{marginBottom:14,padding:"13px 16px"}}>
      <SL color={DS.green}>Why Trust Forge Matters</SL>
      <div style={{fontSize:12,color:DS.ink2,lineHeight:1.7}}>Unverified profiles are filtered out by 73% of Indian recruiters in the first pass. Trust Forge systematically builds every layer of verification — government, platform, documentary, and social — so your profile survives every filter.</div>
    </Card>
    <SL>Trust Forge Tasks</SL>
    {tasks.map(t=><TaskItem key={t.id} task={t} ud={ud} onToggle={t.type==="SELF"?toggleSelf:null} onAction={onNav} saving={saving}/>)}
  </div>
}

// ─── PROMOTION FORGE ──────────────────────────────────────────────────────────
function PromotionForge({ud,onSave,onNav}){
  const[saving,setSaving]=useState(false)
  const[proofText,setProofText]=useState(ud?.promotionProof||"")
  const[savingProof,setSavingProof]=useState(false)

  const tasks=[
    {id:"pm1",type:"AUTO",title:"Document quantified impact in current role",subtitle:"At least 2 outcomes with measurable results",eloImpact:"Role Fit Score ↑↑",verify:u=>(u?.experiences||[]).filter(e=>e.outcomes?.trim()).length>=2,detail:"Before any promotion conversation, you need documented outcomes. 'Delivered X' is not a outcome. '₹40L ARR, grew from 0' is."},
    {id:"pm2",type:"AUTO",title:"Write a leadership evidence statement",subtitle:"Team impact — size, mentorship, cross-functional leadership",eloImpact:"Role Fit Score ↑",verify:u=>!!(u?.promotionLeadership),detail:"Promotions require evidence that you're already operating at the next level. Document any team lead, mentorship, or cross-functional project ownership."},
    {id:"pm3",type:"SELF",title:"Map current role to next-level job description",subtitle:"Find 3 gaps between your current work and the promotion target",eloImpact:"Clarity ↑",done:!!(ud?.promotionForgeTasks?.find(t=>t.id==="pm3")?.done),detail:"Pull the JD for the role one level up. Identify 3 responsibilities you're not yet doing. Plan how to own each in the next 90 days."},
    {id:"pm4",type:"SELF",title:"Schedule a documented scope conversation with manager",subtitle:"Ask to own a specific scope at the next level",eloImpact:"Promotion velocity ↑",done:!!(ud?.promotionForgeTasks?.find(t=>t.id==="pm4")?.done),detail:"'I want to be considered for [role]. What would I need to demonstrate over the next 6 months?' — documented conversations create accountability."},
    {id:"pm5",type:"SELF",title:"Build a 90-day impact sprint plan",subtitle:"Concrete deliverables, owners, and success metrics for each",eloImpact:"Evidence ↑",done:!!(ud?.promotionForgeTasks?.find(t=>t.id==="pm5")?.done),detail:"A 90-day sprint plan owned by you (not assigned by a manager) signals next-level ownership thinking. Write it, share it, track it."},
    {id:"pm6",type:"SELF",title:"Document peer validation",subtitle:"Testimonials, shared project outcomes, or peer feedback",eloImpact:"Trust layer ↑",done:!!(ud?.promotionForgeTasks?.find(t=>t.id==="pm6")?.done),detail:"360 feedback or written peer recognition in a shared project doc is evidence. Screenshots of appreciation in Slack or Teams also count."},
  ].map(t=>({...t,done:t.verify?t.verify(ud):!!(ud?.promotionForgeTasks?.find(st=>st.id===t.id)?.done)}))

  const done=tasks.filter(t=>t.done).length
  const verified=tasks.filter(t=>t.type==="AUTO"&&t.done).length

  const toggleSelf=async id=>{
    setSaving(true)
    const prev=ud?.promotionForgeTasks||[]
    const exists=prev.find(t=>t.id===id)
    const updated=exists?prev.map(t=>t.id===id?{...t,done:!t.done}:t):[...prev,{id,done:true}]
    await onSave({promotionForgeTasks:updated});setSaving(false)
  }
  const saveProof=async()=>{if(!proofText.trim())return;setSavingProof(true);await onSave({promotionProof:proofText.trim()});setSavingProof(false)}

  return<div>
    <TransparencyBanner/>
    <ModeHeader mode="Promotion Forge" done={done} total={tasks.length} verified={verified} color={DS.amber} icon="🚀" subtitle="Build the evidence and strategy to get promoted at your current employer"/>
    <Card style={{marginBottom:14}}>
      <SL color={DS.amber}>Leadership Evidence Statement {ud?.promotionLeadership&&<span style={{color:DS.green,fontSize:9}}>SAVED ✓</span>}</SL>
      <div style={{fontSize:12,color:DS.ink3,marginBottom:8}}>Write a statement covering any team you've led, mentored, or influenced — even informally.</div>
      <textarea value={proofText} onChange={e=>setProofText(e.target.value)} rows={3} placeholder="e.g. Led a team of 4 engineers on the checkout redesign. Mentored 2 junior devs. Ran weekly syncs with design and product." style={{width:"100%",padding:"9px 12px",background:DS.surface2,border:`1.5px solid ${DS.border}`,borderRadius:DS.r,fontSize:13,fontFamily:"'Inter', system-ui, sans-serif",color:DS.ink,outline:"none",resize:"vertical",lineHeight:1.6,boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=DS.amber} onBlur={e=>e.target.style.borderColor=DS.border}/>
      <div style={{display:"flex",gap:8,marginTop:8}}><Btn onClick={saveProof} loading={savingProof} size="sm" variant="amber">Save Statement →</Btn></div>
    </Card>
    <SL>Promotion Forge Tasks</SL>
    {tasks.map(t=><TaskItem key={t.id} task={t} ud={ud} onToggle={t.type==="SELF"?toggleSelf:null} onAction={onNav} saving={saving}/>)}
  </div>
}

// ─── INTERVIEW FORGE ──────────────────────────────────────────────────────────
function InterviewForge({ud,onSave,onNav}){
  const[saving,setSaving]=useState(false)
  const[prep,setPrep]=useState({company:"",role:"",round:""})
  const[savingPrep,setSavingPrep]=useState(false)

  const tasks=[
    {id:"i1",type:"SELF",title:"Write 5 STAR stories from your experience",subtitle:"Situation · Task · Action · Result — one per major project",eloImpact:"Interview readiness ↑↑",done:!!(ud?.interviewForgeTasks?.find(t=>t.id==="i1")?.done),detail:"Each STAR story should be < 2 minutes spoken. Lead with the result: 'I reduced costs by ₹40L by redesigning…' Results first, context second."},
    {id:"i2",type:"SELF",title:"Research the company's tech stack and recent news",subtitle:"Glassdoor, LinkedIn, company blog, product announcements",eloImpact:"Fit score ↑",done:!!(ud?.interviewForgeTasks?.find(t=>t.id==="i2")?.done),detail:"At minimum: tech stack used, one recent product announcement, and one genuine question about direction or team structure."},
    {id:"i3",type:"SELF",title:"Prepare your compensation anchor",subtitle:"Know your number, the market midpoint, and your floor",eloImpact:"Negotiation leverage ↑",done:!!(ud?.interviewForgeTasks?.find(t=>t.id==="i3")?.done),detail:"Open at Market Midpoint + 15%. Hold firm at Midpoint + 5%. Never go first on comp — ask what their band is."},
    {id:"i4",type:"SELF",title:"Prepare for 3 likely technical screening questions",subtitle:"Role-specific — algorithms, system design, or domain expertise",eloImpact:"Technical confidence ↑",done:!!(ud?.interviewForgeTasks?.find(t=>t.id==="i4")?.done),detail:"For tech roles: Big-O, system design fundamentals, one domain deep-dive. For product: metrics question, prioritisation framework, one customer problem."},
    {id:"i5",type:"SELF",title:"Write out your 'why us' statement",subtitle:"Specific, honest, and connected to their direction",eloImpact:"Culture fit ↑",done:!!(ud?.interviewForgeTasks?.find(t=>t.id==="i5")?.done),detail:"'I've been tracking your [product] for 6 months. Your bet on [specific direction] aligns with where I see [domain] going, and I want to help build that.' Generic answers lose."},
    {id:"i6",type:"AUTO",title:"Complete AI Practice interview via Launchpad",subtitle:"Simulate a real interview round with AI feedback",eloImpact:"Career Mobility ↑↑",verify:u=>!!(u?.lastAiInterview),actionTarget:"launchpad",actionLabel:"Go to Launchpad →",detail:"AI practice interviews give scored feedback on clarity, structure, and technical accuracy. Available on Elite plan."},
  ].map(t=>({...t,done:t.verify?t.verify(ud):!!(ud?.interviewForgeTasks?.find(st=>st.id===t.id)?.done)}))

  const done=tasks.filter(t=>t.done).length
  const verified=tasks.filter(t=>(t.type==="AUTO")&&t.done).length

  const toggleSelf=async id=>{
    setSaving(true)
    const prev=ud?.interviewForgeTasks||[]
    const exists=prev.find(t=>t.id===id)
    const updated=exists?prev.map(t=>t.id===id?{...t,done:!t.done}:t):[...prev,{id,done:true}]
    await onSave({interviewForgeTasks:updated});setSaving(false)
  }
  const savePrep=async()=>{if(!prep.company)return;setSavingPrep(true);await onSave({currentInterviewPrep:prep});setSavingPrep(false)}

  return<div>
    <TransparencyBanner/>
    <ModeHeader mode="Interview Forge" done={done} total={tasks.length} verified={verified} color={DS.teal} icon="🎤" subtitle="Structured interview prep — from research to STAR stories to comp negotiation"/>
    <Card style={{marginBottom:14}}>
      <SL color={DS.teal}>Current Interview Context</SL>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:9,marginBottom:9}}>
        <div><div style={{fontSize:11,fontWeight:600,color:DS.ink3,marginBottom:4}}>Target Company</div><input value={prep.company} onChange={e=>setPrep(p=>({...p,company:e.target.value}))} placeholder="e.g. Flipkart" style={{width:"100%",padding:"8px 11px",background:DS.surface2,border:`1.5px solid ${DS.border}`,borderRadius:DS.r,fontSize:12,fontFamily:"'Inter', system-ui, sans-serif",color:DS.ink,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=DS.teal} onBlur={e=>e.target.style.borderColor=DS.border}/></div>
        <div><div style={{fontSize:11,fontWeight:600,color:DS.ink3,marginBottom:4}}>Role</div><input value={prep.role} onChange={e=>setPrep(p=>({...p,role:e.target.value}))} placeholder="e.g. Senior PM" style={{width:"100%",padding:"8px 11px",background:DS.surface2,border:`1.5px solid ${DS.border}`,borderRadius:DS.r,fontSize:12,fontFamily:"'Inter', system-ui, sans-serif",color:DS.ink,outline:"none",boxSizing:"border-box"}} onFocus={e=>e.target.style.borderColor=DS.teal} onBlur={e=>e.target.style.borderColor=DS.border}/></div>
        <div style={{display:"flex",alignItems:"flex-end"}}><Btn onClick={savePrep} loading={savingPrep} size="sm" style={{background:DS.tBg,color:DS.teal,border:`1px solid ${DS.tBd}`}}>Save</Btn></div>
      </div>
      {ud?.currentInterviewPrep?.company&&<div style={{padding:"7px 11px",background:DS.tBg,border:`1px solid ${DS.tBd}`,borderRadius:DS.r,fontSize:11,color:DS.teal}}>✓ Prepping for <strong>{ud.currentInterviewPrep.role}</strong> at <strong>{ud.currentInterviewPrep.company}</strong></div>}
    </Card>
    <SL>Interview Forge Tasks</SL>
    {tasks.map(t=><TaskItem key={t.id} task={t} ud={ud} onToggle={t.type==="SELF"?toggleSelf:null} onAction={onNav} saving={saving}/>)}
  </div>
}

// ─── Mode Selector ────────────────────────────────────────────────────────────
const MODES=[
  {id:"proof",label:"Proof Forge",icon:"🔐",desc:"Build verifiable evidence for every claim",color:DS.purple,cBg:DS.purBg,cBd:DS.purBd,eloImpact:"Proof Strength ↑↑↑"},
  {id:"switch",label:"Switch Forge",icon:"🔀",desc:"Structured, evidence-backed transition prep",color:DS.blue,cBg:DS.blBg,cBd:DS.blBd,eloImpact:"Career Mobility ↑↑"},
  {id:"comp",label:"Comp Forge",icon:"💰",desc:"Negotiate and position for better pay",color:DS.primary,cBg:DS.pBg,cBd:DS.pBd,eloImpact:"Up to ₹3L+ comp uplift"},
  {id:"return",label:"Return Forge",icon:"🌱",desc:"Structured re-entry after layoff or break",color:DS.amber,cBg:DS.aBg,cBd:DS.aBd,eloImpact:"Career Mobility ↑↑"},
  {id:"trust",label:"Trust Forge",icon:"🛡",desc:"Build government & platform verified trust layer",color:DS.green,cBg:DS.gBg,cBd:DS.gBd,eloImpact:"Proof Strength ↑↑↑"},
  {id:"promotion",label:"Promotion Forge",icon:"🚀",desc:"Evidence-backed strategy to get promoted",color:DS.amber,cBg:DS.aBg,cBd:DS.aBd,eloImpact:"Role Fit Score ↑↑"},
  {id:"interview",label:"Interview Forge",icon:"🎤",desc:"STAR stories, comp anchors, and AI practice",color:DS.teal,cBg:DS.tBg,cBd:DS.tBd,eloImpact:"Career Mobility ↑↑"},
]

export default function Forge({user,userData,onNavigate}){
  const[mode,setMode]=useState(null)
  const[saving,setSaving]=useState(false)

  // Supabase update — replaces Firebase updateDoc
  const uid = user?.id || user?.uid
  const onSave=useCallback(async updates=>{
    if(!uid)return
    setSaving(true)
    try{ await userDoc.update(uid, updates) }catch(e){ console.error(e) }
    setSaving(false)
  },[uid])

  const handleNav=target=>{
    if(["vault","timeline","launchpad","nexus","aura"].includes(target)){onNavigate&&onNavigate(target)}
    else setMode(target)
  }

  return<div style={{background:DS.bg,flex:1,minHeight:0,overflowY:"auto",fontFamily:DS.body}}>
    <style>{G}</style>
    <div style={{maxWidth:900,margin:"0 auto",padding:"24px"}}>
      <div style={{marginBottom:20}}>
        {mode&&<button onClick={()=>setMode(null)} style={{padding:"4px 12px",background:DS.surface2,border:`1px solid ${DS.border}`,borderRadius:DS.r,fontSize:12,fontWeight:600,color:DS.ink3,cursor:"pointer",outline:"none",marginBottom:12}}>← All Modes</button>}
        <div style={{fontFamily:DS.display,fontSize:22,fontWeight:800,color:DS.ink,letterSpacing:"-.5px"}}>{mode?MODES.find(m=>m.id===mode)?.label:"Forge"}</div>
        <div style={{fontSize:13,color:DS.ink3,marginTop:2}}>{mode?MODES.find(m=>m.id===mode)?.desc:"Career action engine · ELO earned through real actions, not self-reporting"}</div>
      </div>

      {!mode&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14,marginBottom:20}}>
          {MODES.map(m=><div key={m.id} onClick={()=>setMode(m.id)} style={{padding:"20px 22px",background:DS.surface,border:`1.5px solid ${m.cBd}`,borderRadius:DS.r2,cursor:"pointer",transition:"all .18s",boxShadow:DS.sh}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=DS.sh2}} onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow=DS.sh}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}><div style={{fontSize:28}}>{m.icon}</div><Tag color={m.color} bg={m.cBg} bd={m.cBd}>{m.eloImpact}</Tag></div>
            <div style={{fontFamily:DS.display,fontSize:16,fontWeight:800,color:DS.ink,marginBottom:4}}>{m.label}</div>
            <div style={{fontSize:12,color:DS.ink3,lineHeight:1.55,marginBottom:12}}>{m.desc}</div>
            <div style={{fontSize:12,fontWeight:700,color:m.color}}>Enter {m.label} →</div>
          </div>)}
        </div>
        <Card>
          <SL>How Forge Works</SL>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
            {[{icon:"🔒",title:"Auto-verified",desc:"Computed from your real profile data. Career scores update automatically when you complete the actual action.",color:DS.green},{icon:"⚡",title:"Action-required",desc:"Links to the real workflow. Verified automatically once the action is completed in the target section.",color:DS.amber},{icon:"📋",title:"Self-reported",desc:"Records your intent. No score weight on its own — gains come when backed by evidence in your profile.",color:DS.ink4}].map((x,i)=><div key={i} style={{padding:"12px",background:DS.surface2,border:`1px solid ${DS.border}`,borderRadius:DS.r}}><div style={{fontSize:18,marginBottom:5}}>{x.icon}</div><div style={{fontSize:12,fontWeight:700,color:x.color,marginBottom:3}}>{x.title}</div><div style={{fontSize:11,color:DS.ink3,lineHeight:1.5}}>{x.desc}</div></div>)}
          </div>
          <div style={{padding:"10px 13px",background:DS.blBg,border:`1px solid ${DS.blBd}`,borderRadius:DS.r,fontSize:12,color:DS.blue}}>Career scores are computed from your actual profile data — never from task toggles. Forge tasks guide you to real actions, not score shortcuts.</div>
        </Card>
      </>}

      {mode==="proof"&&<ProofForge ud={userData} onSave={onSave} onNav={handleNav}/>}
      {mode==="switch"&&<SwitchForge ud={userData} onSave={onSave} onNav={handleNav}/>}
      {mode==="comp"&&<CompForge ud={userData} onSave={onSave}/>}
      {mode==="return"&&<ReturnForge ud={userData} onSave={onSave} onNav={handleNav}/>}
      {mode==="trust"&&<TrustForge ud={userData} onSave={onSave} onNav={handleNav}/>}
      {mode==="promotion"&&<PromotionForge ud={userData} onSave={onSave} onNav={handleNav}/>}
      {mode==="interview"&&<InterviewForge ud={userData} onSave={onSave} onNav={handleNav}/>}
    </div>
  </div>
}
