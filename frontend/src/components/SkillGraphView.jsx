/**
 * SkillGraphView.jsx — Complete Skill Graph with icons, verification states, ELO values, proof sources.
 */
import { useState, useEffect } from "react"
import { skillsApi } from "../lib/api"

const T = {
  ink:"#1A1A18",ink2:"#3A3A38",ink3:"#6B6B68",
  indigo:"#3D4EAC",indigo2:"#EEF0FB",
  green:"#1A7A4A",green2:"#E8F7EF",
  amber:"#B8620A",amber2:"#FDF3E7",
  red:"#C0392B",red2:"#FDECEA",
  border:"rgba(26,26,24,0.09)",
  shadow:"0 2px 12px rgba(26,26,24,0.07)",
}

const VER_STATES = {
  verified:         { color:T.green,  bg:T.green2,  label:"Verified",       icon:"✓" },
  proof_submitted:  { color:T.indigo, bg:T.indigo2, label:"Proof Submitted", icon:"◎" },
  user_added:       { color:T.ink3,   bg:"#F4F4F0",  label:"Self-added",     icon:"+" },
  inferred:         { color:T.amber,  bg:T.amber2,  label:"Inferred",        icon:"~" },
  historical:       { color:"#9A9A97",bg:"#F4F4F4",  label:"Historical",     icon:"○" },
}

function SkillCard({ skill, onProof, onRemove, onToggleTarget }) {
  const [showProof, setShowProof] = useState(false)
  const [proofType, setProofType] = useState("github")
  const [proofUrl, setProofUrl]   = useState("")
  const [proofNotes, setProofNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [imgErr, setImgErr] = useState(false)
  const ver = VER_STATES[skill.verification_state] || VER_STATES.inferred

  async function submitProof() {
    if (!proofUrl.trim()) return
    setSubmitting(true)
    try {
      await skillsApi.submitProof(skill.id, { proof_type: proofType, proof_url: proofUrl, notes: proofNotes })
      setShowProof(false)
      onProof(skill.id)
    } catch(e) { alert(e.message) }
    finally { setSubmitting(false) }
  }

  const confidencePct = skill.confidence_score || 50
  const barColor = skill.color || T.indigo

  return (
    <div style={{background:"#fff",border:`1px solid ${skill.is_target?"#7C3AED44":T.border}`,borderRadius:14,overflow:"hidden",boxShadow:T.shadow,transition:"all .15s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(26,26,24,0.12)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow=T.shadow}>
      <div style={{padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          {/* Icon */}
          <div style={{width:36,height:36,borderRadius:8,background:`${barColor}15`,border:`1px solid ${barColor}25`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {skill.icon_url && !imgErr
              ? <img src={skill.icon_url} alt="" style={{width:24,height:24,objectFit:"contain"}} onError={()=>setImgErr(true)}/>
              : <span style={{fontSize:14,color:barColor}}>{skill.skill_name.slice(0,2)}</span>}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:13,fontWeight:700,color:T.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{skill.skill_name}</div>
            <div style={{display:"flex",gap:5,marginTop:2,flexWrap:"wrap"}}>
              <span style={{fontSize:10,background:ver.bg,color:ver.color,padding:"1px 6px",borderRadius:99,fontWeight:600}}>{ver.icon} {ver.label}</span>
              {skill.is_target && <span style={{fontSize:10,background:"#F4F0FF",color:"#7C3AED",padding:"1px 6px",borderRadius:99,fontWeight:600}}>Target</span>}
              {!skill.is_current && <span style={{fontSize:10,background:"#F4F4F0",color:T.ink3,padding:"1px 6px",borderRadius:99}}>Historical</span>}
            </div>
          </div>
          <div style={{fontSize:14,fontWeight:700,color:barColor,fontFamily:"'DM Mono',monospace",flexShrink:0}}>{skill.elo_value||500}</div>
        </div>

        {/* Confidence bar */}
        <div style={{marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
            <span style={{fontSize:10,color:T.ink3}}>Confidence</span>
            <span style={{fontSize:10,color:T.ink3,fontFamily:"'DM Mono',monospace"}}>{confidencePct}%</span>
          </div>
          <div style={{height:3,borderRadius:3,background:"#F0F0EC",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${confidencePct}%`,background:barColor,borderRadius:3,transition:"width .5s ease"}}/>
          </div>
        </div>

        {/* Meta */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,color:T.ink3}}>
            {skill.years_used?`${skill.years_used}y experience`:""}{skill.last_proof_date?` · Last proof: ${skill.last_proof_date}`:""}
          </div>
          <div style={{display:"flex",gap:5}}>
            <button onClick={()=>setShowProof(v=>!v)} title="Add proof" style={{padding:"3px 8px",background:T.indigo2,border:"none",borderRadius:6,color:T.indigo,fontSize:11,cursor:"pointer",fontWeight:600}}>+ Proof</button>
            <button onClick={()=>onToggleTarget(skill.id, !skill.is_target)} title={skill.is_target?"Remove from targets":"Set as target"} style={{padding:"3px 6px",background:"#F4F0FF",border:"none",borderRadius:6,color:"#7C3AED",fontSize:11,cursor:"pointer"}}>🎯</button>
            <button onClick={()=>onRemove(skill.id)} style={{padding:"3px 6px",background:T.red2,border:"none",borderRadius:6,color:T.red,fontSize:11,cursor:"pointer"}}>✕</button>
          </div>
        </div>
      </div>

      {/* Proof submission panel */}
      {showProof && (
        <div style={{borderTop:`1px solid ${T.border}`,padding:"14px 16px",background:"#FAFAF8"}}>
          <div style={{fontSize:12,fontWeight:700,color:T.ink,marginBottom:10}}>Add proof for {skill.skill_name}</div>
          <select value={proofType} onChange={e=>setProofType(e.target.value)} style={{width:"100%",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,marginBottom:8,outline:"none"}}>
            <option value="github">GitHub Repository</option>
            <option value="project">Live Project / URL</option>
            <option value="certificate">Certificate</option>
            <option value="article">Article / Post</option>
            <option value="ai_interview">AI Interview Result</option>
            <option value="other">Other</option>
          </select>
          <input value={proofUrl} onChange={e=>setProofUrl(e.target.value)} placeholder="URL or proof link"
            style={{width:"100%",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,marginBottom:8,outline:"none",boxSizing:"border-box"}}/>
          <textarea value={proofNotes} onChange={e=>setProofNotes(e.target.value)} placeholder="Brief description (optional)" rows={2}
            style={{width:"100%",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,outline:"none",resize:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:8}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowProof(false)} style={{flex:1,padding:"7px",background:"#FAF7F2",border:`1px solid ${T.border}`,borderRadius:8,cursor:"pointer",fontSize:12}}>Cancel</button>
            <button onClick={submitProof} disabled={submitting||!proofUrl.trim()} style={{flex:2,padding:"7px",background:T.indigo,border:"none",borderRadius:8,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:12,opacity:submitting||!proofUrl.trim()?0.6:1}}>
              {submitting?"Submitting…":"Submit Proof"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SkillGraphView({ user }) {
  const [skills, setSkills]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [gaps, setGaps]           = useState(null)
  const [showAdd, setShowAdd]     = useState(false)
  const [newSkill, setNewSkill]   = useState("")
  const [filter, setFilter]       = useState("all")
  const [search, setSearch]       = useState("")
  const [targetRole, setTargetRole] = useState("")
  const [gapLoading, setGapLoading] = useState(false)

  async function load() {
    setLoading(true)
    try { setSkills(await skillsApi.list()) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!newSkill.trim()) return
    try {
      const { skill } = await skillsApi.add({ skill_name: newSkill.trim(), verification_state:"user_added" })
      setSkills(s=>[...s,skill])
      setNewSkill("")
      setShowAdd(false)
    } catch(e) { alert(e.message) }
  }

  async function handleRemove(id) {
    if (!confirm("Remove this skill?")) return
    try { await skillsApi.remove(id); setSkills(s=>s.filter(sk=>sk.id!==id)) }
    catch(e) { alert(e.message) }
  }

  async function handleToggleTarget(id, isTarget) {
    try {
      await skillsApi.update(id, { is_target: isTarget })
      setSkills(s=>s.map(sk=>sk.id===id?{...sk,is_target:isTarget}:sk))
    } catch(e) { alert(e.message) }
  }

  async function loadGaps() {
    setGapLoading(true)
    try { setGaps(await skillsApi.getGaps(targetRole||undefined)) }
    catch(e) { alert(e.message) }
    finally { setGapLoading(false) }
  }

  const filtered = skills.filter(s => {
    if (filter==="verified" && !["verified","proof_submitted"].includes(s.verification_state)) return false
    if (filter==="target" && !s.is_target) return false
    if (filter==="current" && !s.is_current) return false
    if (search && !s.skill_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Group by category
  const categories = {}
  filtered.forEach(s => {
    const cat = s.category || "technical"
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(s)
  })

  return (
    <div style={{fontFamily:"DM Sans,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:T.ink}}>Skill Graph</div>
          <div style={{fontSize:13,color:T.ink3}}>{skills.length} skills mapped · {skills.filter(s=>["verified","proof_submitted"].includes(s.verification_state)).length} verified</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>skillsApi.enrichIcons().then(()=>load())} style={{padding:"8px 14px",background:"#F4F0FF",border:`1px solid #7C3AED44`,borderRadius:10,color:"#7C3AED",fontSize:12,fontWeight:600,cursor:"pointer"}}>✨ Add Icons</button>
          <button onClick={()=>setShowAdd(true)} style={{padding:"9px 18px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Add Skill</button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search skills…"
          style={{flex:1,minWidth:160,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:"none"}}/>
        {["all","verified","current","target"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 14px",background:filter===f?T.indigo:"#FAF7F2",border:`1px solid ${filter===f?T.indigo:T.border}`,borderRadius:8,color:filter===f?"#fff":T.ink3,fontSize:12,fontWeight:filter===f?700:400,cursor:"pointer",textTransform:"capitalize"}}>
            {f==="all"?"All Skills":f==="verified"?"Verified":f==="current"?"Current":f==="target"?"Target Skills":""}
          </button>
        ))}
      </div>

      {/* Gap analysis */}
      <div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 18px",marginBottom:20,boxShadow:T.shadow}}>
        <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:10}}>Skill Gap Analysis</div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          <input value={targetRole} onChange={e=>setTargetRole(e.target.value)} placeholder="Target role (e.g. Senior Backend Engineer)"
            style={{flex:1,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:"none"}}/>
          <button onClick={loadGaps} disabled={gapLoading} style={{padding:"8px 16px",background:T.indigo,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:gapLoading?0.6:1}}>
            {gapLoading?<span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>:"Analyse →"}
          </button>
        </div>
        {gaps && (
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.green,marginBottom:6}}>✓ STRONG MATCH</div>
              {(gaps.gaps?.strong_match||[]).slice(0,5).map((s,i)=><div key={i} style={{fontSize:12,color:T.ink2,marginBottom:3}}>• {s}</div>)}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.red,marginBottom:6}}>✕ MISSING (Critical)</div>
              {(gaps.gaps?.missing_critical||[]).slice(0,5).map((s,i)=><div key={i} style={{fontSize:12,color:T.ink2,marginBottom:3}}>• {s}</div>)}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:T.amber,marginBottom:6}}>~ NICE TO HAVE</div>
              {(gaps.gaps?.missing_nice_to_have||[]).slice(0,5).map((s,i)=><div key={i} style={{fontSize:12,color:T.ink2,marginBottom:3}}>• {s}</div>)}
            </div>
            {gaps.gaps?.top_recommendation && (
              <div style={{gridColumn:"1/-1",padding:"10px 14px",background:T.indigo2,borderRadius:10,fontSize:12,color:T.indigo}}>
                💡 {gaps.gaps.top_recommendation}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add skill modal */}
      {showAdd && (
        <div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(17,24,39,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#fff",borderRadius:16,padding:"24px 28px",maxWidth:400,width:"100%"}}>
            <div style={{fontSize:16,fontWeight:800,color:T.ink,marginBottom:14}}>Add Skill</div>
            <input value={newSkill} onChange={e=>setNewSkill(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdd()}
              placeholder="e.g. React, Docker, System Design"
              style={{width:"100%",padding:"10px 12px",border:`1px solid ${T.border}`,borderRadius:10,fontSize:14,outline:"none",boxSizing:"border-box",marginBottom:14}}
              autoFocus/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowAdd(false)} style={{flex:1,padding:"10px",background:"#FAF7F2",border:`1px solid ${T.border}`,borderRadius:10,cursor:"pointer",fontSize:13}}>Cancel</button>
              <button onClick={handleAdd} disabled={!newSkill.trim()} style={{flex:2,padding:"10px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13,opacity:!newSkill.trim()?0.6:1}}>Add Skill</button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <div style={{padding:40,textAlign:"center"}}><div style={{width:24,height:24,border:`2px solid ${T.indigo}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/></div>}

      {/* Empty */}
      {!loading && skills.length===0 && (
        <div style={{textAlign:"center",padding:48,background:"#FAFAF8",borderRadius:16,border:`1.5px dashed ${T.border}`}}>
          <div style={{fontSize:32,marginBottom:8}}>🧠</div>
          <div style={{fontSize:15,fontWeight:600,color:T.ink,marginBottom:6}}>No skills mapped yet</div>
          <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Add your skills manually or upload a resume to auto-extract them.</div>
          <button onClick={()=>setShowAdd(true)} style={{padding:"10px 20px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:"pointer"}}>Add First Skill</button>
        </div>
      )}

      {/* Skills grid by category */}
      {!loading && Object.entries(categories).map(([cat, catSkills]) => (
        <div key={cat} style={{marginBottom:24}}>
          <div style={{fontSize:11,fontWeight:800,color:T.ink3,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>{cat.replace(/_/g," ")} ({catSkills.length})</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
            {catSkills.sort((a,b)=>(b.elo_value||0)-(a.elo_value||0)).map(skill=>(
              <SkillCard key={skill.id} skill={skill}
                onProof={()=>load()}
                onRemove={handleRemove}
                onToggleTarget={handleToggleTarget}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
