/**
 * VaultManager.jsx — Secure Document Vault Component
 * Upload, preview, download, tag, filter vault documents.
 */
import { useState, useEffect, useRef } from "react"
import { vaultApi } from "../lib/api"

const T = {
  cream:"#F6F6F1",ink:"#1A1A18",ink2:"#3A3A38",ink3:"#6B6B68",
  indigo:"#3D4EAC",indigo2:"#EEF0FB",green:"#1A7A4A",green2:"#E8F7EF",
  amber:"#B8620A",amber2:"#FDF3E7",red:"#C0392B",red2:"#FDECEA",
  border:"rgba(26,26,24,0.09)",shadow:"0 2px 12px rgba(26,26,24,0.07)",
}

const DOC_TYPES = [
  { id:"resume",         label:"Resume",           icon:"📄", accept:".pdf,.doc,.docx" },
  { id:"offer_letter",   label:"Offer Letter",     icon:"✉️", accept:".pdf,.doc,.docx,.jpg,.png" },
  { id:"experience_letter",label:"Experience Letter",icon:"🏆",accept:".pdf,.doc,.docx,.jpg,.png" },
  { id:"certification",  label:"Certification",    icon:"🎓", accept:".pdf,.jpg,.png" },
  { id:"payslip",        label:"Pay Slip",         icon:"💰", accept:".pdf,.jpg,.png" },
  { id:"contract",       label:"Contract",         icon:"📝", accept:".pdf,.doc,.docx" },
  { id:"invoice",        label:"Invoice",          icon:"🧾", accept:".pdf,.jpg,.png" },
  { id:"other",          label:"Other",            icon:"📁", accept:"*" },
]

const DOC_TYPE_META = Object.fromEntries(DOC_TYPES.map(d=>[d.id,d]))

function formatBytes(b) {
  if (!b) return "—"
  if (b<1024) return `${b}B`
  if (b<1024*1024) return `${(b/1024).toFixed(1)}KB`
  return `${(b/1024/1024).toFixed(1)}MB`
}

function DocCard({ doc, onDelete, onDownload }) {
  const meta = DOC_TYPE_META[doc.doc_type] || DOC_TYPE_META.other
  const isImg = doc.mime_type?.startsWith("image/")
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      const { url } = await onDownload(doc.id)
      const a = document.createElement("a")
      a.href = url; a.download = doc.file_name; a.click()
    } catch(e) { alert(e.message) }
    finally { setDownloading(false) }
  }

  return (
    <div style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:14,padding:"16px 18px",boxShadow:T.shadow}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
        <div style={{width:44,height:44,borderRadius:10,background:T.indigo2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
          {meta.icon}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:600,color:T.ink,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:2}}>{doc.file_name}</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:6}}>
            <span style={{fontSize:11,background:T.indigo2,color:T.indigo,padding:"1px 7px",borderRadius:99,fontWeight:600}}>{meta.label}</span>
            <span style={{fontSize:11,color:T.ink3}}>{formatBytes(doc.file_size)}</span>
            <span style={{fontSize:11,color:T.ink3}}>{new Date(doc.created_at).toLocaleDateString("en-IN")}</span>
            {doc.is_private && <span style={{fontSize:11,background:T.amber2,color:T.amber,padding:"1px 7px",borderRadius:99}}>🔒 Private</span>}
          </div>
          {(doc.tags||[]).length>0 && (
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {doc.tags.map((t,i)=><span key={i} style={{fontSize:10,background:"#F4F4F0",color:T.ink3,padding:"1px 6px",borderRadius:99}}>{t}</span>)}
            </div>
          )}
        </div>
        <div style={{display:"flex",gap:6,flexShrink:0}}>
          <button onClick={handleDownload} disabled={downloading} style={{padding:"6px 12px",background:T.indigo2,border:"none",borderRadius:8,color:T.indigo,fontSize:12,fontWeight:600,cursor:"pointer"}}>
            {downloading?"…":"⬇ Download"}
          </button>
          <button onClick={()=>onDelete(doc.id)} style={{padding:"6px 10px",background:T.red2,border:"none",borderRadius:8,color:T.red,fontSize:12,cursor:"pointer"}}>🗑</button>
        </div>
      </div>
    </div>
  )
}

function UploadModal({ onClose, onUploaded }) {
  const [file, setFile]         = useState(null)
  const [docType, setDocType]   = useState("resume")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags]         = useState([])
  const [isPrivate, setIsPrivate] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const fileRef = useRef()

  async function handleUpload() {
    if (!file) return
    setUploading(true); setProgress(30)
    try {
      setProgress(60)
      const { document: doc } = await vaultApi.upload(file, docType, tags, isPrivate)
      setProgress(100)
      setTimeout(() => onUploaded(doc), 300)
    } catch(e) { alert(e.message); setUploading(false); setProgress(0) }
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:999,background:"rgba(17,24,39,0.6)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#fff",borderRadius:20,padding:"28px 32px",maxWidth:500,width:"100%"}}>
        <div style={{fontSize:18,fontWeight:800,color:T.ink,marginBottom:20,fontFamily:"'DM Sans',serif"}}>Upload to Vault</div>

        {/* File drop area */}
        <div
          onClick={()=>fileRef.current?.click()}
          onDragOver={e=>{e.preventDefault();e.currentTarget.style.borderColor=T.indigo}}
          onDragLeave={e=>{e.currentTarget.style.borderColor=T.border}}
          onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)setFile(f);e.currentTarget.style.borderColor=T.border}}
          style={{border:`2px dashed ${file?T.green:T.border}`,borderRadius:12,padding:"28px 16px",textAlign:"center",cursor:"pointer",marginBottom:16,background:file?T.green2:"#FAFAF8",transition:"all .15s"}}>
          <div style={{fontSize:28,marginBottom:8}}>{file?'✅':'📁'}</div>
          {file
            ? <div style={{fontSize:14,color:T.green,fontWeight:600}}>{file.name}<br/><span style={{fontSize:12,color:T.ink3}}>{formatBytes(file.size)}</span></div>
            : <div style={{fontSize:13,color:T.ink3}}>Click to browse or drag & drop<br/><span style={{fontSize:11}}>PDF, DOC, DOCX, JPG, PNG — max 20MB</span></div>}
          <input ref={fileRef} type="file" style={{display:"none"}} onChange={e=>setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"/>
        </div>

        {/* Doc type */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600,color:T.ink3,marginBottom:6}}>Document type</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {DOC_TYPES.map(dt=>(
              <button key={dt.id} onClick={()=>setDocType(dt.id)} style={{padding:"8px 4px",background:docType===dt.id?T.indigo2:"#FAF7F2",border:`1px solid ${docType===dt.id?T.indigo:T.border}`,borderRadius:8,cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:16}}>{dt.icon}</div>
                <div style={{fontSize:10,color:docType===dt.id?T.indigo:T.ink3,marginTop:2}}>{dt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600,color:T.ink3,marginBottom:6}}>Tags (optional)</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
            {tags.map((t,i)=>(
              <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 8px",background:T.indigo2,color:T.indigo,borderRadius:99,fontSize:11}}>
                {t}<button onClick={()=>setTags(ts=>ts.filter((_,j)=>j!==i))} style={{background:"none",border:"none",cursor:"pointer",color:T.indigo,padding:0}}>×</button>
              </span>
            ))}
          </div>
          <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&tagInput.trim()){setTags(t=>[...t,tagInput.trim()]);setTagInput("")}}}
            placeholder="Add tag, press Enter"
            style={{width:"100%",padding:"8px 12px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box"}}/>
        </div>

        {/* Private */}
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:16}}>
          <input type="checkbox" checked={isPrivate} onChange={e=>setIsPrivate(e.target.checked)}/>
          <span style={{fontSize:13,color:T.ink2}}>🔒 Mark as private (only accessible by you)</span>
        </label>

        {/* Progress */}
        {uploading && (
          <div style={{marginBottom:12}}>
            <div style={{height:4,borderRadius:4,background:"#E8E3DA",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progress}%`,background:T.indigo,transition:"width .3s ease"}}/>
            </div>
          </div>
        )}

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"11px",background:"#FAF7F2",border:`1px solid ${T.border}`,borderRadius:10,cursor:"pointer",fontSize:13,color:T.ink3}}>Cancel</button>
          <button onClick={handleUpload} disabled={!file||uploading} style={{flex:2,padding:"11px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:"pointer",fontSize:13,opacity:!file||uploading?0.6:1}}>
            {uploading?"Uploading…":"Upload to Vault"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VaultManager({ user }) {
  const [docs, setDocs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [filter, setFilter]       = useState("all")
  const [search, setSearch]       = useState("")

  async function load() {
    setLoading(true)
    try { setDocs(await vaultApi.list()) }
    catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id) {
    if (!confirm("Delete this document? This cannot be undone.")) return
    try { await vaultApi.remove(id); setDocs(d=>d.filter(x=>x.id!==id)) }
    catch(e) { alert(e.message) }
  }

  function handleUploaded(doc) {
    setDocs(d=>[doc,...d])
    setShowUpload(false)
  }

  const filtered = docs.filter(d => {
    if (filter!=="all" && d.doc_type!==filter) return false
    if (search && !d.file_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const stats = {
    total:   docs.length,
    resume:  docs.filter(d=>d.doc_type==="resume").length,
    offer:   docs.filter(d=>d.doc_type==="offer_letter").length,
    cert:    docs.filter(d=>d.doc_type==="certification").length,
    private: docs.filter(d=>d.is_private).length,
  }

  if (loading) return <div style={{padding:40,textAlign:"center"}}><div style={{width:24,height:24,border:`2px solid ${T.indigo}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .7s linear infinite",display:"inline-block"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>

  return (
    <div style={{fontFamily:"DM Sans,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:T.ink}}>Vault</div>
          <div style={{fontSize:13,color:T.ink3}}>{docs.length} document{docs.length!==1?"s":""} stored securely</div>
        </div>
        <button onClick={()=>setShowUpload(true)} style={{padding:"9px 18px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>+ Upload Document</button>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
        {[{l:"Total",v:stats.total},{l:"Resumes",v:stats.resume},{l:"Offers",v:stats.offer},{l:"Certs",v:stats.cert},{l:"Private",v:stats.private}].map(s=>(
          <div key={s.l} style={{background:"#fff",border:`1px solid ${T.border}`,borderRadius:12,padding:"12px",textAlign:"center",boxShadow:T.shadow}}>
            <div style={{fontSize:20,fontWeight:800,color:T.indigo}}>{s.v}</div>
            <div style={{fontSize:11,color:T.ink3}}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Filter + Search */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search documents…"
          style={{flex:1,minWidth:200,padding:"9px 14px",border:`1px solid ${T.border}`,borderRadius:10,fontSize:13,outline:"none"}}/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {["all",...DOC_TYPES.map(d=>d.id)].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 12px",background:filter===f?T.indigo:"#FAF7F2",border:`1px solid ${filter===f?T.indigo:T.border}`,borderRadius:8,color:filter===f?"#fff":T.ink3,fontSize:12,fontWeight:filter===f?700:400,cursor:"pointer"}}>
              {f==="all"?"All":DOC_TYPE_META[f]?.label||f}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length===0 && (
        <div style={{textAlign:"center",padding:48,background:"#FAFAF8",borderRadius:16,border:`1.5px dashed ${T.border}`}}>
          <div style={{fontSize:32,marginBottom:8}}>🗄️</div>
          <div style={{fontSize:15,fontWeight:600,color:T.ink,marginBottom:6}}>{search||filter!=="all"?"No matching documents":"Your vault is empty"}</div>
          <div style={{fontSize:13,color:T.ink3,marginBottom:20}}>Upload resumes, offer letters, certifications, and other career documents.</div>
          <button onClick={()=>setShowUpload(true)} style={{padding:"10px 20px",background:T.indigo,border:"none",borderRadius:10,color:"#fff",fontWeight:700,cursor:"pointer"}}>Upload First Document</button>
        </div>
      )}

      {/* Document grid */}
      <div style={{display:"grid",gap:12}}>
        {filtered.map(doc=>(
          <DocCard key={doc.id} doc={doc} onDelete={handleDelete} onDownload={(id)=>vaultApi.getUrl(id)}/>
        ))}
      </div>

      {showUpload && <UploadModal onClose={()=>setShowUpload(false)} onUploaded={handleUploaded}/>}
    </div>
  )
}
