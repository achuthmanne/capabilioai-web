/**
 * CareerTimeline.jsx — Complete Career Timeline Component
 * Full production component with EPFO verification states, edit/approval, source tags, version history.
 */
import { useState, useEffect } from "react"
import { timelineApi, epfoApi } from "../lib/api"

const T = {
  cream:"#F6F6F1",ink:"#1A1A18",ink2:"#3A3A38",ink3:"#6B6B68",
  indigo:"#3D4EAC",indigo2:"#EEF0FB",green:"#1A7A4A",green2:"#E8F7EF",
  amber:"#B8620A",amber2:"#FDF3E7",red:"#C0392B",red2:"#FDECEA",
  border:"rgba(26,26,24,0.09)",shadow:"0 2px 12px rgba(26,26,24,0.07)",
  purple:"#7C3AED",purple2:"#F4F0FF",
}

const JOB_TYPE_LABELS = { "full-time":"Full-time","part-time":"Part-time","contract":"Contract","freelance":"Freelance","internship":"Internship" }
const WORK_MODE_LABELS = { office:"On-site",hybrid:"Hybrid",remote:"Remote","work-from-home":"Remote" }

const VER_STATES = {
  unverified:          { color:T.red,    bg:T.red2,   label:"Unverified",          icon:"○" },
  employment_verified: { color:T.green,  bg:T.green2, label:"Employment Verified",  icon:"✓" },
  fully_trusted:       { color:T.indigo, bg:T.indigo2,label:"Fully Trusted",        icon:"✓" },
  pending:             { color:T.amber,  bg:T.amber2, label:"Verification Pending", icon:"◌" },
}

function VerBadge({ state }) {
  const v = VER_STATES[state] || VER_STATES.unverified
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",background:v.bg,color:v.color,fontSize:11,fontWeight:700,borderRadius:99,border:`1px solid ${v.color}30`}}>
      {v.icon} {v.label}
    </span>
  )
}

function SourceTag({ tag }) {
  const META = {
    resume:           { label:"Resume",      color:"#5B4FCF",  bg:"#F0EEFF" },
    linkedin:         { label:"LinkedIn",    color:"#0A66C2",  bg:"#E8F3FF" },
    epfo:             { label:"EPFO",        color:"#1A7A4A",  bg:"#E8F7EF" },
    user_edit:        { label:"Self-added",  color:"#6B6B68",  bg:"#F4F4F0" },
    capabilio:        { label:"Capabilio",   color:"#FF5701",  bg:"#FFF1E8" },
  }
  const m = META[tag] || { label:tag, color:"#6B6B68", bg:"#F4F4F0" }
  return <span style={{display:"inline-flex",alignItems:"center",padding:"1px 7px",background:m.bg,color:m.color,fontSize:10,fontWeight:700,borderRadius:99,letterSpacing:0.3}}>{m.label}</span>
}

function TechPill({ tech }) {
  // Try to load devicon icon
  const slug = tech.toLowerCase().replace(/[^a-z0-9]/g, "")
  const iconUrl = `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${slug}/${slug}-original.svg`
  const [imgOk, setImgOk] = useState(true)
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,color:T.ink2}}>
      {imgOk && <img src={iconUrl} alt="" style={{width:14,height:14,objectFit:"contain"}} onError={()=>setImgOk(false)}/>}
      {tech}
    </span>
  )
}

function EntryModal({ entry, onClose, onSave }) {
  const [form, setForm] = useState(entry || {
    company:"",company_logo:"",company_desc:"",role_title:"",job_type:"full-time",
    location:"",work_mode:"hybrid",start_date:"",end_date:"",is_current:false,
    description:"",achievements:[],technologies:[],skills_used:[],jd_summary:"",
  })
  const [techInput, setTechInput] = useState("")
  const [skillInput, setSkillInput] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.company || !form.role_title || !form.start_date) return alert("Company, role title, and start date are required.")
    setSaving(true)
    try {
      let result
      if (entry?.id) {
        result = await timelineApi.update(entry.id, form)
      } else {
        result = await timelineApi.create(form)
      }
      onSave(result.entry || result)
    } catch(e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const inp = (key, placeholder, type="text", extra={}) => (
    <input
      type={type}
      placeholder={placeholder}
      value={form[key]||""}
      onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
      style={{width:"100%",padding:"10px 12px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,fontSize:13,color:T.ink,outline:"none",boxSizing:"border-box",...extra}}
    />
  )

  const textarea = (key, placeholder) => (
    <textarea
      placeholder={placeholder}
      value={form[key]||""}
      onChange={e => setForm(f=>({...f,[key]:e.target.value}))}
      rows={3}
      style={{width:"100%",padding:"10px 12px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,fontSize:13,color:T.ink,outline:"none",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}}
    />
  )

  return (
    <div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(17,24,39,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:20,padding:"28px 32px",maxWidth:600,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{fontSize:18,fontWeight:800,color:T.ink,marginBottom:20,fontFamily:"'DM Sans',serif"}}>{entry?.id?"Edit Experience":"Add Experience"}</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          {inp("company","Company name")}
          {inp("role_title","Job title / Role")}
          {inp("location","Location (city, country)")}
          {inp("company_logo","Company logo URL (optional)")}
          <div>
            <select value={form.job_type||"full-time"} onChange={e=>setForm(f=>({...f,job_type:e.target.value}))}
              style={{width:"100%",padding:"10px 12px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,fontSize:13,color:T.ink,outline:"none"}}>
              {Object.entries(JOB_TYPE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <select value={form.work_mode||"hybrid"} onChange={e=>setForm(f=>({...f,work_mode:e.target.value}))}
              style={{width:"100%",padding:"10px 12px",background:"#fff",border:`1px solid ${T.border}`,borderRadius:10,fontSize:13,color:T.ink,outline:"none"}}>
              {Object.entries(WORK_MODE_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {inp("start_date","Start date","month")}
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {!form.is_current && inp("end_date","End date","month")}
            <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",whiteSpace:"nowrap",fontSize:13,color:T.ink2}}>
              <input type="checkbox" checked={form.is_current||false} onChange={e=>setForm(f=>({...f,is_current:e.target.checked,end_date:e.target.checked?"":f.end_date}))}/>
              Present
            </label>
          </div>
        </div>

        <div style={{marginBottom:12}}>{textarea("description","Role description & responsibilities")}</div>
        <div style={{marginBottom:12}}>{textarea("jd_summary","JD summary (job description summary)")}</div>

        {/* Technologies */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600,color:T.ink3,marginBottom:6}}>Technologies used</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:8}}>
            {(form.technologies||[]).map((t,i)=>(
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",background:T.indigo2,color:T.indigo,borderRadius:99,fontSize:12}}>
                {t}
                <button onClick={()=>setForm(f=>({...f,technologies:f.technologies.filter((_,j)=>j!==i)}))} style={{background:"none",border:"none",cursor:"pointer",color:T.indigo,fontSize:12,padding:0,lineHeight:1}}>×</button>
              </span>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <input value={techInput} onChange={e=>setTechInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&techInput.trim()){setForm(f=>({...f,technologies:[...(f.technologies||[]),techInput.trim()]}));setTechInput("")}}} placeholder="Add technology, press Enter" style={{flex:1,padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:"none"}}/>
          </div>
        </div>

        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",background:"#FAF7F2",border:`1px solid ${T.border}`,borderRadius:10,cursor:"pointer",fontSize:13,color:T.ink3}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{flex:2,padding:"11px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13,opacity:saving?0.6:1}}>
            {saving?"Saving…":entry?.id?"Save Changes":"Add Experience"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CareerTimeline({ user }) {
  const [entries, setEntries]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editEntry, setEditEntry] = useState(null)
  const [expanded, setExpanded]   = useState({})

  async function load() {
    setLoading(true)
    try { const data = await timelineApi.list(); setEntries(data) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleApprove(id) {
    try { const { entry } = await timelineApi.approveChange(id); setEntries(prev => prev.map(e => e.id===id ? entry : e)) }
    catch(e) { alert(e.message) }
  }

  async function handleReject(id) {
    try { await timelineApi.rejectChange(id); setEntries(prev => prev.map(e => e.id===id ? {...e,pending_changes:{}} : e)) }
    catch(e) { alert(e.message) }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this experience entry?")) return
    try { await timelineApi.remove(id); setEntries(prev => prev.filter(e => e.id!==id)) }
    catch(e) { alert(e.message) }
  }

  function handleSaved(entry) {
    setEntries(prev => {
      const exists = prev.find(e => e.id===entry.id)
      return exists ? prev.map(e => e.id===entry.id?entry:e) : [entry, ...prev]
    })
    setShowModal(false)
    setEditEntry(null)
  }

  if (loading) return (
    <div style={{padding:40,textAlign:"center"}}>
      <div style={{width:24,height:24,border:`2px solid ${T.indigo}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{fontFamily:"DM Sans,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:T.ink}}>Career Timeline</div>
          <div style={{fontSize:13,color:T.ink3}}>{entries.length} experience{entries.length!==1?"s":""} on record</div>
        </div>
        <button onClick={()=>{setEditEntry(null);setShowModal(true)}} style={{padding:"9px 18px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Add Experience</button>
      </div>

      {entries.length===0 && (
        <div style={{textAlign:"center",padding:48,background:"#FAFAF8",borderRadius:16,border:`1.5px dashed ${T.border}`}}>
          <div style={{fontSize:32,marginBottom:8}}>📋</div>
          <div style={{fontSize:15,fontWeight:600,color:T.ink,marginBottom:6}}>No experiences added yet</div>
          <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Add your work history or upload a resume to auto-populate your timeline.</div>
          <button onClick={()=>setShowModal(true)} style={{padding:"10px 20px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:"pointer"}}>Add First Experience</button>
        </div>
      )}

      {/* Timeline */}
      <div style={{position:"relative",paddingLeft:28}}>
        {/* Vertical line */}
        <div style={{position:"absolute",left:10,top:0,bottom:0,width:2,background:`linear-gradient(to bottom,${T.indigo}44,${T.border})`}}/>

        {entries.map((entry, idx) => {
          const ver = VER_STATES[entry.verification_state] || VER_STATES.unverified
          const hasPending = entry.pending_changes && Object.keys(entry.pending_changes).length > 0
          const isOpen = expanded[entry.id]

          return (
            <div key={entry.id} style={{position:"relative",marginBottom:24}}>
              {/* Dot */}
              <div style={{position:"absolute",left:-24,top:18,width:12,height:12,borderRadius:"50%",background:ver.color,border:"2px solid #fff",boxShadow:`0 0 0 2px ${ver.color}44`}}/>

              <div style={{background:"#fff",border:`1px solid ${hasPending?"#F59E0B44":T.border}`,borderRadius:16,boxShadow:T.shadow,overflow:"hidden"}}>
                {/* Pending changes banner */}
                {hasPending && (
                  <div style={{background:T.amber2,borderBottom:`1px solid #F59E0B44`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
                    <div style={{fontSize:12,color:T.amber,fontWeight:600}}>⏳ Pending field changes require your approval before going live.</div>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>handleApprove(entry.id)} style={{padding:"5px 12px",background:T.green,border:"none",borderRadius:7,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Approve</button>
                      <button onClick={()=>handleReject(entry.id)} style={{padding:"5px 12px",background:"#fff",border:`1px solid ${T.amber}`,borderRadius:7,color:T.amber,fontSize:12,fontWeight:700,cursor:"pointer"}}>Reject</button>
                    </div>
                  </div>
                )}

                {/* Header */}
                <div style={{padding:"18px 20px",cursor:"pointer"}} onClick={()=>setExpanded(e=>({...e,[entry.id]:!e[entry.id]}))}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                    {/* Company logo */}
                    <div style={{width:46,height:46,borderRadius:10,border:`1px solid ${T.border}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:"#FAF7F2",flexShrink:0}}>
                      {entry.company_logo
                        ? <img src={entry.company_logo} alt="" style={{width:38,height:38,objectFit:"contain"}} onError={e=>{e.target.style.display="none";e.target.nextSibling.style.display="flex"}}/>
                        : null
                      }
                      <span style={{fontSize:18}}>{entry.company?entry.company[0]:"?"}</span>
                    </div>

                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:3}}>
                        <span style={{fontSize:15,fontWeight:700,color:T.ink}}>{entry.role_title}</span>
                        <VerBadge state={entry.verification_state}/>
                        {entry.is_current && <span style={{display:"inline-flex",alignItems:"center",padding:"1px 7px",background:"#E8F7EF",color:T.green,fontSize:10,fontWeight:700,borderRadius:99}}>Current</span>}
                      </div>
                      <div style={{fontSize:13,color:T.ink2,marginBottom:4}}>{entry.company}{entry.location?` · ${entry.location}`:""}</div>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                        <span style={{fontSize:12,color:T.ink3}}>
                          {entry.start_date} — {entry.is_current?"Present":(entry.end_date||"—")}
                        </span>
                        {entry.job_type && <span style={{fontSize:11,color:T.ink3,background:"#F4F4F0",padding:"1px 7px",borderRadius:99}}>{JOB_TYPE_LABELS[entry.job_type]||entry.job_type}</span>}
                        {entry.work_mode && <span style={{fontSize:11,color:T.ink3,background:"#F4F4F0",padding:"1px 7px",borderRadius:99}}>{WORK_MODE_LABELS[entry.work_mode]||entry.work_mode}</span>}
                        {(entry.source_tags||[]).map(t=><SourceTag key={t} tag={t}/>)}
                      </div>
                    </div>

                    <div style={{display:"flex",gap:8,flexShrink:0}}>
                      <button onClick={e=>{e.stopPropagation();setEditEntry(entry);setShowModal(true)}} style={{padding:"5px 12px",background:"#F4F4F0",border:"none",borderRadius:7,color:T.ink2,fontSize:12,cursor:"pointer"}}>Edit</button>
                      <button onClick={e=>{e.stopPropagation();handleDelete(entry.id)}} style={{padding:"5px 12px",background:T.red2,border:"none",borderRadius:7,color:T.red,fontSize:12,cursor:"pointer"}}>Delete</button>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div style={{padding:"0 20px 20px",borderTop:`1px solid ${T.border}`}}>
                    {entry.description && (
                      <div style={{marginTop:14,marginBottom:14}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.ink3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>ROLE DESCRIPTION</div>
                        <div style={{fontSize:13,color:T.ink2,lineHeight:1.7}}>{entry.description}</div>
                      </div>
                    )}

                    {(entry.achievements||[]).length>0 && (
                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.ink3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>KEY ACHIEVEMENTS</div>
                        <ul style={{margin:0,paddingLeft:20}}>
                          {entry.achievements.map((a,i)=><li key={i} style={{fontSize:13,color:T.ink2,lineHeight:1.7,marginBottom:4}}>{a}</li>)}
                        </ul>
                      </div>
                    )}

                    {(entry.technologies||[]).length>0 && (
                      <div style={{marginBottom:14}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.ink3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>TECHNOLOGIES</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                          {entry.technologies.map((t,i)=><TechPill key={i} tech={t}/>)}
                        </div>
                      </div>
                    )}

                    {(entry.projects||[]).length>0 && (
                      <div>
                        <div style={{fontSize:11,fontWeight:700,color:T.ink3,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>PROJECTS AT THIS COMPANY</div>
                        {entry.projects.map((p,i)=>(
                          <div key={i} style={{padding:"10px 14px",background:"#FAF7F2",borderRadius:10,border:`1px solid ${T.border}`,marginBottom:6}}>
                            <div style={{fontSize:13,fontWeight:600,color:T.ink}}>{p.title||p.name||"Project"}</div>
                            {p.desc&&<div style={{fontSize:12,color:T.ink3,marginTop:2}}>{p.desc}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    {entry.jd_summary && (
                      <div style={{padding:"10px 14px",background:T.indigo2,borderRadius:10,marginTop:10}}>
                        <div style={{fontSize:11,fontWeight:700,color:T.indigo,marginBottom:4}}>JD SUMMARY</div>
                        <div style={{fontSize:12,color:T.ink2,lineHeight:1.6}}>{entry.jd_summary}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {(showModal || editEntry) && (
        <EntryModal
          entry={editEntry}
          onClose={()=>{setShowModal(false);setEditEntry(null)}}
          onSave={handleSaved}
        />
      )}
    </div>
  )
}
