/**
 * Pulse.jsx — LinkedIn-style professional news feed
 * 3-column layout: Profile sidebar | Feed | Trending/Suggestions sidebar
 */
import { useState, useEffect, useCallback, useRef } from "react"
import { pulseApi, nexusApi } from "../lib/api"
import { getRoleConfig } from "../config/roleConfig"

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      "#FAF7F2",
  surface: "#FFFFFF",
  ink:     "#1A1714",
  ink2:    "#475569",
  ink3:    "#A8A29E",
  ink4:    "#6B6560",
  indigo:  "#6366F1",
  indigo2: "rgba(99,102,241,0.12)",
  green:   "#10B981",
  green2:  "rgba(16,185,129,0.12)",
  amber:   "#F59E0B",
  border:  "rgba(0,0,0,0.05)",
  shadow:  "0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.3)",
  r:       8,
  mono:    "'DM Mono', monospace",
  serif:   "'DM Sans', sans-serif",
  sans:    "'DM Sans', -apple-system, sans-serif",
}

const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
@keyframes spin { to { transform: rotate(360deg) } }
@keyframes fadeUp { from { opacity:0; transform:translateY(6px) } to { opacity:1; transform:translateY(0) } }
@keyframes shimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
.pcard { transition: box-shadow .15s; }
.pcard:hover { box-shadow: 0 0 0 1px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.1) !important; }
.pbtn { transition: background .12s, color .12s; cursor: pointer; }
.pbtn:hover { background: rgba(0,0,0,0.06) !important; }
.plink { color: ${T.indigo}; cursor: pointer; font-weight: 600; }
.plink:hover { text-decoration: underline; }
`

// ─── Static data ──────────────────────────────────────────────────────────────
const TECH_NEWS = [
  { cat:"AI",     title:"OpenAI releases o3 with advanced reasoning benchmarks",     source:"TechCrunch", time:"2h ago",  color:T.indigo },
  { cat:"Hiring", title:"India tech hiring up 18% YoY — backend & ML roles lead",   source:"Economic Times", time:"4h ago",  color:T.green  },
  { cat:"AI",     title:"Google DeepMind AlphaFold 3 predicts drug interactions",    source:"Nature",     time:"6h ago",  color:T.indigo },
  { cat:"Dev",    title:"TypeScript 5.5 ships with inferred type predicates",        source:"Dev.to",     time:"8h ago",  color:T.amber  },
  { cat:"Hiring", title:"Bengaluru startups see 3× spike in senior IC roles",       source:"Entrackr",   time:"10h ago", color:T.green  },
  { cat:"AI",     title:"Anthropic raises $4B — Claude 3.5 beats GPT-4 enterprise", source:"Reuters",    time:"1d ago",  color:T.indigo },
  { cat:"Dev",    title:"Node.js 22 LTS released with experimental WebSocket API",  source:"InfoQ",      time:"1d ago",  color:T.amber  },
  { cat:"AI",     title:"Meta releases Llama 3.2 with vision capabilities",         source:"VentureBeat",time:"2d ago",  color:T.indigo },
]

const TRENDING = [
  { tag:"#OpenAI",        posts:"14,832 posts" },
  { tag:"#SystemDesign",  posts:"8,241 posts"  },
  { tag:"#ReactJS",       posts:"6,104 posts"  },
  { tag:"#CareerSwitch",  posts:"5,390 posts"  },
  { tag:"#AIJobs",        posts:"4,722 posts"  },
]

const SUGGESTIONS = [
  { name:"Priya Sharma",     headline:"Senior SDE @ Google",           initials:"PS", elo:1640, color:"#4285F4" },
  { name:"Rahul Menon",      headline:"Staff Engineer @ Flipkart",      initials:"RM", elo:1520, color:"#FF5701" },
  { name:"Anita Desai",      headline:"Principal PM @ PhonePe",         initials:"AD", elo:1480, color:"#6D28D9" },
]

const POST_TYPES = [
  { id:"text",        icon:"📝", label:"Post"        },
  { id:"celebration", icon:"🎉", label:"Celebrate"   },
  { id:"event",       icon:"📅", label:"Event"       },
  { id:"poll",        icon:"📊", label:"Poll"        },
]

const REACTIONS = [
  { id:"acknowledge", label:"👏 Acknowledge", color:"#B24020" },
  { id:"signal",      label:"⚡ Signal",      color:T.indigo  },
  { id:"celebrate",   label:"🎉 Celebrate",   color:"#E7A33E" },
  { id:"insightful",  label:"💡 Insightful",  color:T.green   },
]

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Spin({ size=20, color=T.indigo }) {
  return <div style={{ width:size, height:size, border:`2px solid ${color}33`, borderTopColor:color, borderRadius:"50%", animation:"spin .8s linear infinite", flexShrink:0 }}/>
}

function Avatar({ name, url, size=40, color="#0A66C2" }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:color, overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", border:`1.5px solid ${T.border}` }}>
      {url
        ? <img src={url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
        : <span style={{ fontFamily:T.serif, fontSize:size*.38, fontWeight:700, color:"#fff", lineHeight:1 }}>{name?.[0]?.toUpperCase() || "?"}</span>
      }
    </div>
  )
}

function Card({ children, style={}, className="" }) {
  return (
    <div className={`pcard ${className}`} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:T.r, overflow:"hidden", ...style }}>
      {children}
    </div>
  )
}

function OfflinePill() {
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"6px 12px", background:"#FFF8E1", border:"1px solid #FFE082", borderRadius:99, fontSize:11, color:"#B45309", fontWeight:600, fontFamily:T.mono, marginBottom:12 }}>
      🔌 Backend offline — start server to load live posts
    </div>
  )
}

// ─── Time helper ──────────────────────────────────────────────────────────────
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s/60)}m`
  if (s < 86400) return `${Math.floor(s/3600)}h`
  return `${Math.floor(s/86400)}d`
}

// ─── Left sidebar ─────────────────────────────────────────────────────────────
function ProfileSidebar({ user, userData }) {
  const name    = userData?.name || userData?.displayName || user?.user_metadata?.full_name || "You"
  const elo     = userData?.eloRating || 1000
  const path    = userData?.path || "professional"
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()

  return (
    <Card>
      {/* Cover gradient */}
      <div style={{ height:56, background:`linear-gradient(135deg, #0A66C2 0%, #6D28D9 100%)` }}/>
      {/* Avatar + identity */}
      <div style={{ padding:"0 16px 16px" }}>
        <div style={{ marginTop:-28, marginBottom:8 }}>
          <div style={{ width:56, height:56, borderRadius:"50%", background:"#0A66C2", border:`3px solid ${T.surface}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontFamily:T.serif, fontSize:22, fontWeight:700, color:"#fff" }}>{initials}</span>
          </div>
        </div>
        <div style={{ fontFamily:T.serif, fontSize:15, fontWeight:800, color:T.ink, marginBottom:2 }}>{name}</div>
        <div style={{ fontSize:12, color:T.ink2, lineHeight:1.4, marginBottom:10 }}>{userData?.headline || (path === "professional" ? "Software Professional" : `${path.charAt(0).toUpperCase()}${path.slice(1)} · Capabilio`)}</div>

        {/* ELO badge */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderTop:`1px solid ${T.border}`, marginBottom:4 }}>
          <span style={{ fontSize:12, color:T.ink3 }}>Your ELO rating</span>
          <span style={{ fontFamily:T.mono, fontSize:12, fontWeight:700, color:T.indigo }}>{elo.toLocaleString()}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 0", borderTop:`1px solid ${T.border}` }}>
          <span style={{ fontSize:12, color:T.ink3 }}>Recruiter visibility</span>
          <span style={{ fontSize:12, fontWeight:600, color:T.green }}>Active</span>
        </div>
      </div>

      {/* Quick links */}
      <div style={{ borderTop:`1px solid ${T.border}`, padding:"8px 0" }}>
        {[
          { icon:"⚒", label:"Forge — complete a mission" },
          { icon:"◎", label:"Orbit — check your ELO"   },
          { icon:"⊞", label:"Launchpad — browse jobs"  },
        ].map((l,i) => (
          <div key={i} className="pbtn" style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px", cursor:"pointer" }}>
            <span style={{ fontSize:14 }}>{l.icon}</span>
            <span style={{ fontSize:13, color:T.ink2, fontWeight:500 }}>{l.label}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// ─── Right sidebar ────────────────────────────────────────────────────────────
function RightSidebar({ user, domain = "Tech", role = "Professional" }) {
  const [newsExpanded, setNewsExpanded] = useState(false)
  const [liveNews,     setLiveNews]     = useState(null)   // null = not yet loaded
  const [newsLoading,  setNewsLoading]  = useState(true)

  // Fetch live news once per domain (server caches 2hr)
  useEffect(() => {
    setNewsLoading(true)
    pulseApi.marketInsights(domain, role)
      .then(data => { setLiveNews(data); setNewsLoading(false) })
      .catch(() => { setLiveNews(null); setNewsLoading(false) })
  }, [domain, role])

  // Map live news items → display shape; fall back to static TECH_NEWS
  const CAT_COLORS = { Hiring: T.green, AI: T.indigo, Dev: T.amber, News: T.indigo, Release: T.amber }
  const newsItems = liveNews?.news?.length
    ? liveNews.news.map(n => ({
        cat:    n.headline?.toLowerCase().includes("hiring") ? "Hiring" : "News",
        title:  n.headline,
        source: "Live",
        time:   n.date || "today",
        color:  CAT_COLORS["News"],
      }))
    : TECH_NEWS

  const visibleNews = newsExpanded ? newsItems : newsItems.slice(0, 4)

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Trending topics */}
      <Card>
        <div style={{ padding:"12px 16px 4px" }}>
          <div style={{ fontFamily:T.serif, fontSize:14, fontWeight:800, color:T.ink, marginBottom:12 }}>Trending in tech</div>
          {TRENDING.map((t,i) => (
            <div key={i} className="pbtn" style={{ padding:"6px 0", cursor:"pointer", borderBottom: i<TRENDING.length-1?`1px solid ${T.border}`:"none" }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.ink }}>{t.tag}</div>
              <div style={{ fontSize:11, color:T.ink3, marginTop:1 }}>{t.posts}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tech & AI News — live via Gemini Search, static fallback */}
      <Card>
        <div style={{ padding:"12px 16px 0", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontFamily:T.serif, fontSize:14, fontWeight:800, color:T.ink, marginBottom:2 }}>Tech & AI News</div>
            <div style={{ fontSize:11, color:T.ink3, marginBottom:12 }}>
              {newsLoading ? "Loading live news…" : liveNews ? "Live · Updated every 2h" : "Curated for professionals"}
            </div>
          </div>
          {liveNews && <span style={{ fontSize:9, fontWeight:800, color:T.green, letterSpacing:"0.06em", background:T.green+"18", padding:"2px 7px", borderRadius:99 }}>LIVE</span>}
        </div>
        {newsLoading
          ? [0,1,2,3].map(i => (
              <div key={i} style={{ padding:"10px 16px", borderTop: i>0?`1px solid ${T.border}`:"none" }}>
                <div style={{ height:10, background:"#E8E3DA", borderRadius:4, marginBottom:5, width:"85%" }}/>
                <div style={{ height:9, background:"#F3F4F6", borderRadius:4, width:"50%" }}/>
              </div>
            ))
          : visibleNews.map((n,i) => (
              <div key={i} className="pbtn" style={{ padding:"8px 16px", cursor:"pointer", borderTop: i>0?`1px solid ${T.border}`:"none", display:"flex", gap:10 }}>
                <span style={{ display:"inline-block", padding:"2px 6px", background:(n.color||T.indigo)+"15", color:n.color||T.indigo, borderRadius:99, fontSize:9, fontWeight:800, fontFamily:T.mono, letterSpacing:"0.06em", flexShrink:0, height:"fit-content", marginTop:2 }}>{n.cat}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:T.ink, lineHeight:1.4, marginBottom:2 }}>{n.title}</div>
                  <div style={{ fontSize:11, color:T.ink3 }}>{n.source} · {n.time}</div>
                </div>
              </div>
            ))
        }
        {!newsLoading && newsItems.length > 4 && (
          <button onClick={() => setNewsExpanded(e=>!e)} style={{ width:"100%", padding:"10px 16px", background:"transparent", border:"none", borderTop:`1px solid ${T.border}`, fontSize:12, color:T.indigo, fontWeight:600, cursor:"pointer", textAlign:"left" }}>
            {newsExpanded ? "Show less ↑" : `Show ${newsItems.length - 4} more ↓`}
          </button>
        )}
      </Card>

      {/* People you may know */}
      <Card>
        <div style={{ padding:"12px 16px 4px" }}>
          <div style={{ fontFamily:T.serif, fontSize:14, fontWeight:800, color:T.ink, marginBottom:12 }}>People you may know</div>
          {SUGGESTIONS.map((s,i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"8px 0", borderTop: i>0?`1px solid ${T.border}`:"none" }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:s.color, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <span style={{ fontFamily:T.serif, fontSize:14, fontWeight:700, color:"#fff" }}>{s.initials}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:1 }}>{s.name}</div>
                <div style={{ fontSize:11, color:T.ink2, marginBottom:4 }}>{s.headline}</div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontFamily:T.mono, fontSize:10, fontWeight:700, color:T.indigo }}>ELO {s.elo}</span>
                  <button style={{ padding:"4px 12px", background:"transparent", border:`1.5px solid ${T.indigo}`, borderRadius:99, fontSize:11, fontWeight:700, color:T.indigo, cursor:"pointer" }}>+ Connect</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

// ─── Post Composer ────────────────────────────────────────────────────────────
function Composer({ user, userData, onPosted }) {
  const [open,      setOpen]      = useState(false)
  const [content,   setContent]   = useState("")
  const [postType,  setPostType]  = useState("text")
  const [techTags,  setTechTags]  = useState([])
  const [tagInput,  setTagInput]  = useState("")
  const [posting,   setPosting]   = useState(false)
  const [mediaFiles,setMediaFiles]= useState([])
  const [error,     setError]     = useState("")
  const fileRef = useRef()

  const name     = userData?.name || user?.user_metadata?.full_name || "You"
  const initials = name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()

  function handleFiles(files) {
    const accepted = Array.from(files).slice(0, 4 - mediaFiles.length).map(f => ({
      file:f, preview:URL.createObjectURL(f),
      type:f.type.startsWith("video")?"video":f.type.startsWith("image")?"image":"doc",
      name:f.name,
    }))
    setMediaFiles(prev=>[...prev,...accepted])
  }
  function removeMedia(i) {
    setMediaFiles(prev=>{ URL.revokeObjectURL(prev[i].preview); return prev.filter((_,j)=>j!==i) })
  }

  async function submit() {
    if (!content.trim()) return
    setPosting(true); setError("")
    try {
      const { post } = await pulseApi.createPost({ content, post_type:postType, tech_tags:techTags })
      onPosted(post)
      setContent(""); setTechTags([]); setTagInput(""); setMediaFiles([]); setOpen(false)
    } catch(e) {
      setError(e.message?.includes("fetch") ? "Backend offline — start the server to post." : e.message)
    } finally { setPosting(false) }
  }

  return (
    <Card style={{ marginBottom:8 }}>
      {/* Collapsed row */}
      <div style={{ padding:"12px 16px", display:"flex", gap:10, alignItems:"center" }}>
        <div style={{ width:40, height:40, borderRadius:"50%", background:T.indigo, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <span style={{ fontFamily:T.serif, fontSize:14, fontWeight:700, color:"#fff" }}>{initials}</span>
        </div>
        <button onClick={()=>setOpen(true)} style={{ flex:1, padding:"10px 16px", background:"transparent", border:`1.5px solid ${T.border}`, borderRadius:24, fontSize:14, color:T.ink3, textAlign:"left", cursor:"pointer", fontFamily:T.sans }}>
          Share an insight, update, or achievement…
        </button>
      </div>

      {/* Quick action buttons */}
      <div style={{ padding:"0 16px 10px", display:"flex", gap:4, borderTop:`1px solid ${T.border}` }}>
        {[
          {icon:"📷",label:"Photo",accept:"image/*"},
          {icon:"🎬",label:"Video",accept:"video/*"},
          {icon:"📄",label:"Document",accept:".pdf,.doc,.docx"},
          {icon:"🎉",label:"Celebrate",},
        ].map((b,i)=>(
          <button key={i} onClick={()=>{if(b.accept){fileRef.current.accept=b.accept;fileRef.current.click()}else{setPostType("celebration");setOpen(true)}}}
            className="pbtn" style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px", background:"transparent", border:"none", borderRadius:T.r, color:T.ink2, fontSize:12, fontWeight:600, cursor:"pointer" }}>
            {b.icon} {b.label}
          </button>
        ))}
        <input ref={fileRef} type="file" multiple style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)}/>
      </div>

      {/* Expanded composer */}
      {open && (
        <div style={{ borderTop:`1px solid ${T.border}`, animation:"fadeUp .15s ease" }}>
          {/* Post type pills */}
          <div style={{ padding:"12px 16px 8px", display:"flex", gap:6, flexWrap:"wrap" }}>
            {POST_TYPES.map(pt=>(
              <button key={pt.id} onClick={()=>setPostType(pt.id)}
                style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 12px", background:postType===pt.id?T.indigo2:"transparent", border:`1.5px solid ${postType===pt.id?T.indigo:T.border}`, borderRadius:99, color:postType===pt.id?T.indigo:T.ink2, fontSize:12, fontWeight:600, cursor:"pointer" }}>
                {pt.icon} {pt.label}
              </button>
            ))}
          </div>

          {/* Text area */}
          <div style={{ padding:"0 16px 10px" }}>
            <textarea value={content} onChange={e=>setContent(e.target.value)}
              placeholder="What do you want to talk about?" rows={5} autoFocus
              style={{ width:"100%", padding:"10px 0", border:"none", borderBottom:`1px solid ${T.border}`, fontSize:15, fontFamily:T.sans, color:T.ink, outline:"none", resize:"none", lineHeight:1.7, boxSizing:"border-box", background:"transparent" }}/>
          </div>

          {/* Media previews */}
          {mediaFiles.length > 0 && (
            <div style={{ padding:"0 16px 10px", display:"flex", gap:8, flexWrap:"wrap" }}>
              {mediaFiles.map((m,i)=>(
                <div key={i} style={{ position:"relative", borderRadius:T.r, overflow:"hidden", border:`1px solid ${T.border}` }}>
                  {m.type==="video"
                    ?<video src={m.preview} style={{ width:90,height:70,objectFit:"cover" }}/>
                    :m.type==="image"
                      ?<img src={m.preview} alt="" style={{ width:90,height:70,objectFit:"cover" }}/>
                      :<div style={{ width:90,height:70,background:T.indigo2,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>📄</div>
                  }
                  <button onClick={()=>removeMedia(i)} style={{ position:"absolute",top:3,right:3,width:18,height:18,borderRadius:"50%",background:"rgba(0,0,0,0.6)",border:"none",color:"#fff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          <div style={{ padding:"0 16px 8px", display:"flex", flexWrap:"wrap", gap:5, alignItems:"center" }}>
            {techTags.map((t,i)=>(
              <span key={i} style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"2px 9px",background:T.indigo2,color:T.indigo,borderRadius:99,fontSize:11,fontWeight:600,fontFamily:T.mono }}>
                #{t}<button onClick={()=>setTechTags(ts=>ts.filter((_,j)=>j!==i))} style={{ background:"none",border:"none",cursor:"pointer",color:T.indigo,padding:0,lineHeight:1 }}>×</button>
              </span>
            ))}
            <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&tagInput.trim()){setTechTags(t=>[...t,tagInput.trim()]);setTagInput("")}}}
              placeholder="#add-tag" style={{ border:"none",outline:"none",fontSize:12,color:T.ink3,background:"transparent",width:90,fontFamily:T.sans }}/>
          </div>

          {/* Error */}
          {error && <div style={{ margin:"0 16px 8px", padding:"8px 12px", background:"#FFF8E1", border:"1px solid #FFE082", borderRadius:T.r, fontSize:12, color:T.amber, fontWeight:500 }}>{error}</div>}

          {/* Footer */}
          <div style={{ padding:"10px 16px", borderTop:`1px solid ${T.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", gap:4 }}>
              <button onClick={()=>{fileRef.current.accept="image/*";fileRef.current.click()}} className="pbtn" style={{ width:34,height:34,borderRadius:"50%",border:"none",background:"transparent",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>📷</button>
              <button onClick={()=>{fileRef.current.accept="video/*";fileRef.current.click()}} className="pbtn" style={{ width:34,height:34,borderRadius:"50%",border:"none",background:"transparent",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}>🎬</button>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>{setOpen(false);setMediaFiles([])}} style={{ padding:"7px 16px",background:"transparent",border:`1.5px solid ${T.border}`,borderRadius:99,fontSize:13,fontWeight:600,color:T.ink2,cursor:"pointer" }}>Cancel</button>
              <button onClick={submit} disabled={posting||!content.trim()}
                style={{ padding:"7px 20px",background:posting||!content.trim()?"#ccc":T.indigo,border:"none",borderRadius:99,color:"#fff",fontSize:13,fontWeight:700,cursor:posting||!content.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:6 }}>
                {posting && <Spin size={12} color="#fff"/>}
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Post Card ────────────────────────────────────────────────────────────────
function PostCard({ post, user, onInteract }) {
  const [showComments, setShowComments] = useState(false)
  const [comments,     setComments]     = useState([])
  const [commentText,  setCommentText]  = useState("")
  const [posting,      setPosting]      = useState(false)
  const [interactions, setInteractions] = useState(new Set(post.user_interactions||[]))
  const [showReactions,setShowReactions]= useState(false)
  const [expanded,     setExpanded]     = useState(false)

  const a     = post.author || {}
  const iLong = (post.content||"").length > 280

  async function toggleReaction(id) {
    try {
      const { active } = await pulseApi.interact(post.id, id)
      setInteractions(s => { const n=new Set(s); active?n.add(id):n.delete(id); return n })
      onInteract(post.id, id, active)
    } catch(e) { console.error(e) }
  }

  async function loadComments() {
    if (showComments) { setShowComments(false); return }
    const data = await pulseApi.comments(post.id).catch(()=>[])
    setComments(data||[])
    setShowComments(true)
  }

  async function submitComment() {
    if (!commentText.trim()) return
    setPosting(true)
    try {
      const { comment } = await pulseApi.addComment(post.id, commentText.trim())
      setComments(c=>[...c,comment])
      setCommentText("")
    } catch(e) { console.error(e) }
    finally { setPosting(false) }
  }

  const totalReactions = (post.acknowledge_count||0)+(post.signal_count||0)+(post.celebrate_count||0)

  return (
    <Card style={{ marginBottom:8, animation:"fadeUp .2s ease" }}>
      {/* Header */}
      <div style={{ padding:"12px 16px 0" }}>
        <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:10 }}>
          <Avatar name={a.name||"?"} url={a.profile_photo_url} size={48} color={a.color||"#0A66C2"}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontFamily:T.serif, fontSize:14, fontWeight:700, color:T.ink }}>{a.name||"Professional"}</span>
              {a.verification_state==="fully_trusted"&&(
                <span style={{ fontSize:10, background:T.green2, color:T.green, padding:"1px 7px", borderRadius:99, fontWeight:700, fontFamily:T.mono }}>✓ TRUSTED</span>
              )}
            </div>
            <div style={{ fontSize:12, color:T.ink2, marginTop:1 }}>{a.headline||""}{a.current_company?` · ${a.current_company}`:""}</div>
            <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:1 }}>
              <span style={{ fontSize:11, color:T.ink3 }}>{timeAgo(post.created_at)}</span>
              <span style={{ fontSize:11, color:T.ink3 }}>·</span>
              <span style={{ fontSize:11 }}>🌐</span>
            </div>
          </div>
          <button style={{ width:28, height:28, borderRadius:"50%", border:"none", background:"transparent", color:T.ink2, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>⋯</button>
        </div>

        {/* Content */}
        <div style={{ fontSize:14, color:T.ink, lineHeight:1.75, marginBottom:10, whiteSpace:"pre-wrap" }}>
          {iLong&&!expanded ? (post.content||"").slice(0,280)+"…" : post.content}
          {iLong&&(
            <button onClick={()=>setExpanded(e=>!e)} style={{ border:"none", background:"none", color:T.ink2, fontSize:14, fontWeight:600, cursor:"pointer", padding:"0 4px" }}>
              {expanded?" …less":" …more"}
            </button>
          )}
        </div>

        {/* Tags */}
        {(post.tech_tags||[]).length>0&&(
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
            {post.tech_tags.map((t,i)=>(
              <span key={i} className="plink" style={{ fontSize:13, fontWeight:600, color:T.indigo }}>#{t}</span>
            ))}
          </div>
        )}

        {/* Media */}
        {(post.media_urls||[]).length>0&&(
          <div style={{ display:"grid", gridTemplateColumns:post.media_urls.length===1?"1fr":"1fr 1fr", gap:3, marginBottom:10, borderRadius:T.r, overflow:"hidden" }}>
            {post.media_urls.map((url,i)=>(
              url.match(/\.(mp4|webm|mov)$/i)
                ?<video key={i} src={url} controls style={{ width:"100%", maxHeight:300, objectFit:"cover" }}/>
                :<img key={i} src={url} alt="" style={{ width:"100%", objectFit:"cover", maxHeight:300 }}/>
            ))}
          </div>
        )}
      </div>

      {/* Reaction summary */}
      {totalReactions>0&&(
        <div style={{ padding:"4px 16px 8px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", gap:3, alignItems:"center" }}>
            <span style={{ fontSize:13 }}>👏⚡🎉</span>
            <span style={{ fontSize:12, color:T.ink3 }}>{totalReactions.toLocaleString()}</span>
          </div>
          <span style={{ fontSize:12, color:T.ink3 }}>{post.comment_count||0} comments · {post.repost_count||0} reposts</span>
        </div>
      )}

      {/* Action bar */}
      <div style={{ padding:"4px 8px", borderTop:`1px solid ${T.border}`, display:"flex" }}>
        {/* Reaction button with hover popup */}
        <div style={{ position:"relative", flex:1 }}
          onMouseEnter={()=>setShowReactions(true)}
          onMouseLeave={()=>setShowReactions(false)}>
          {showReactions&&(
            <div style={{ position:"absolute", bottom:"100%", left:0, background:T.surface, border:`1px solid ${T.border}`, borderRadius:24, padding:"4px 8px", display:"flex", gap:4, zIndex:100, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", marginBottom:4 }}>
              {REACTIONS.map(r=>(
                <button key={r.id} onClick={()=>toggleReaction(r.id)}
                  style={{ padding:"5px 10px", border:`1.5px solid ${interactions.has(r.id)?r.color:T.border}`, borderRadius:99, background:interactions.has(r.id)?r.color+"18":"transparent", fontSize:12, fontWeight:600, color:interactions.has(r.id)?r.color:T.ink2, cursor:"pointer", whiteSpace:"nowrap" }}>
                  {r.label}
                </button>
              ))}
            </div>
          )}
          <button className="pbtn"
            style={{ width:"100%", padding:"9px 4px", background:"transparent", border:"none", borderRadius:T.r, color: interactions.size>0?T.indigo:T.ink2, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
            {interactions.size>0?"👏":"👏"} React
          </button>
        </div>

        <button className="pbtn" onClick={loadComments}
          style={{ flex:1, padding:"9px 4px", background:"transparent", border:"none", borderRadius:T.r, color:T.ink2, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          💬 Comment
        </button>
        <button className="pbtn"
          style={{ flex:1, padding:"9px 4px", background:"transparent", border:"none", borderRadius:T.r, color:T.ink2, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          🔄 Repost
        </button>
        <button className="pbtn"
          style={{ flex:1, padding:"9px 4px", background:"transparent", border:"none", borderRadius:T.r, color:T.ink2, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
          📤 Send
        </button>
      </div>

      {/* Comments */}
      {showComments&&(
        <div style={{ padding:"12px 16px 16px", borderTop:`1px solid ${T.border}`, background:"#FAFAFA" }}>
          {comments.map((c,i)=>(
            <div key={i} style={{ display:"flex", gap:10, marginBottom:12 }}>
              <Avatar name={c.author?.name||"?"} url={c.author?.profile_photo_url} size={32}/>
              <div style={{ flex:1, background:T.surface, borderRadius:T.r, padding:"8px 12px", border:`1px solid ${T.border}` }}>
                <div style={{ fontSize:13, fontWeight:700, color:T.ink, marginBottom:2 }}>{c.author?.name||"Anonymous"}</div>
                <div style={{ fontSize:13, color:T.ink2, lineHeight:1.5 }}>{c.content}</div>
              </div>
            </div>
          ))}
          <div style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <Avatar name={user?.user_metadata?.full_name||"?"} size={32}/>
            <div style={{ flex:1, background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:24, display:"flex", alignItems:"center", gap:8, padding:"6px 12px" }}>
              <input value={commentText} onChange={e=>setCommentText(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&submitComment()}
                placeholder="Add a comment…"
                style={{ flex:1, border:"none", outline:"none", fontSize:13, fontFamily:T.sans, background:"transparent", color:T.ink }}/>
              <button onClick={submitComment} disabled={posting||!commentText.trim()}
                style={{ padding:"4px 12px", background:T.indigo, border:"none", borderRadius:99, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", opacity:posting||!commentText.trim()?0.5:1 }}>
                {posting ? <Spin size={12} color="#fff"/> : "Post"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ─── Feed skeleton ────────────────────────────────────────────────────────────
function SkeletonPost() {
  const shimmer = { background:"linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%)", backgroundSize:"400px 100%", animation:"shimmer 1.2s infinite" }
  return (
    <Card style={{ padding:"16px", marginBottom:8 }}>
      <div style={{ display:"flex", gap:10, marginBottom:12 }}>
        <div style={{ width:48,height:48,borderRadius:"50%",...shimmer }}/>
        <div style={{ flex:1 }}>
          <div style={{ height:14,borderRadius:4,marginBottom:8,width:"40%",...shimmer }}/>
          <div style={{ height:11,borderRadius:4,width:"60%",...shimmer }}/>
        </div>
      </div>
      <div style={{ height:13,borderRadius:4,marginBottom:7,...shimmer }}/>
      <div style={{ height:13,borderRadius:4,marginBottom:7,width:"88%",...shimmer }}/>
      <div style={{ height:13,borderRadius:4,width:"72%",...shimmer }}/>
    </Card>
  )
}

// ─── Empty feed ───────────────────────────────────────────────────────────────
function EmptyFeed({ offline }) {
  return (
    <Card style={{ padding:"48px 24px", textAlign:"center" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>{offline?"🔌":"📡"}</div>
      <div style={{ fontFamily:T.serif, fontSize:18, fontWeight:700, color:T.ink, marginBottom:8 }}>
        {offline ? "Backend server offline" : "No posts yet"}
      </div>
      <div style={{ fontSize:13, color:T.ink2, lineHeight:1.7, maxWidth:340, margin:"0 auto" }}>
        {offline
          ? <>Run <code style={{ fontFamily:T.mono, background:"#f4f4f0", padding:"1px 6px", borderRadius:4 }}>npm run dev:server</code> from the project root to load live posts.</>
          : "Be the first to share an insight, achievement, or career update with the community."
        }
      </div>
    </Card>
  )
}

// ─── Search bar ───────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }) {
  return (
    <div style={{ position:"relative", marginBottom:8 }}>
      <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:15, pointerEvents:"none" }}>🔍</span>
      <input
        value={value}
        onChange={e=>onChange(e.target.value)}
        placeholder="Search posts by topic, skill, or keyword…"
        style={{ width:"100%", padding:"10px 14px 10px 38px", background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:24, fontSize:13, fontFamily:T.sans, color:T.ink, outline:"none", boxSizing:"border-box", transition:"border-color .15s" }}
        onFocus={e=>e.target.style.borderColor=T.indigo}
        onBlur={e=>e.target.style.borderColor=T.border}
      />
      {value && (
        <button onClick={()=>onChange("")} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:T.ink3, fontSize:16, lineHeight:1 }}>×</button>
      )}
    </div>
  )
}

// ─── Main Pulse page ──────────────────────────────────────────────────────────
// ─── Student Pulse — tech-first, role-aware community feed ──────────────────

const ROLE_NEWS = {
  "Data Analyst":      [
    { cat:"Market",  title:"Data Analyst roles in India grew 42% YoY — SQL & Python lead demand", source:"LinkedIn Insights", time:"2h ago", color:"#0A66C2" },
    { cat:"Tool",    title:"DuckDB 1.0 released — runs analytical queries 10× faster than SQLite", source:"DuckDB Blog", time:"5h ago", color:"#E67E22" },
    { cat:"Hiring",  title:"TCS, Infosys, and Wipro open 3,200+ data analyst roles for freshers", source:"Naukri", time:"8h ago", color:"#27AE60" },
    { cat:"Learn",   title:"Google's free Data Analytics Certificate now accepted by 150+ Indian firms", source:"Coursera", time:"1d ago", color:"#9B59B6" },
    { cat:"Tool",    title:"Power BI Feb update: Copilot now auto-generates DAX formulas", source:"Microsoft Blog", time:"1d ago", color:"#0078D4" },
    { cat:"Career",  title:"Average fresher DA salary in Bangalore hits ₹5.8 LPA in 2026", source:"AmbitionBox", time:"2d ago", color:"#E74C3C" },
  ],
  "Full-Stack": [
    { cat:"Release", title:"Next.js 15.3 ships with Turbopack stable and new server actions", source:"Vercel Blog", time:"1h ago", color:"#000" },
    { cat:"Tool",    title:"Bun 1.2 now 30% faster than Node.js for HTTP servers in benchmarks", source:"Bun.sh", time:"4h ago", color:"#E67E22" },
    { cat:"Hiring",  title:"Startup ecosystem adding 8,000+ full-stack roles across Bengaluru, Hyderabad", source:"The Ken", time:"7h ago", color:"#27AE60" },
    { cat:"Learn",   title:"React Query v6 announced — removes boilerplate by 40%", source:"TkDodo Blog", time:"12h ago", color:"#61DAFB" },
    { cat:"Career",  title:"Full-stack median CTC for freshers: ₹6.2 LPA in product companies", source:"Levels.fyi India", time:"1d ago", color:"#9B59B6" },
  ],
  "default": [
    { cat:"AI",      title:"OpenAI releases o3 with advanced reasoning benchmarks", source:"TechCrunch", time:"2h ago", color:"#0A66C2" },
    { cat:"Hiring",  title:"India tech hiring up 18% YoY — backend & ML roles lead", source:"Economic Times", time:"4h ago", color:"#27AE60" },
    { cat:"Release", title:"TypeScript 5.5 ships with inferred type predicates", source:"Dev.to", time:"8h ago", color:"#E67E22" },
    { cat:"AI",      title:"Google DeepMind AlphaFold 3 predicts drug interactions", source:"Nature", time:"12h ago", color:"#0A66C2" },
    { cat:"Hiring",  title:"Bengaluru startups see 3× spike in senior IC roles", source:"Entrackr", time:"1d ago", color:"#27AE60" },
    { cat:"Release", title:"Node.js 22 LTS released with experimental WebSocket API", source:"InfoQ", time:"1d ago", color:"#68A063" },
  ],
}

const GITHUB_REPOS = {
  "Data Analyst": [
    { name:"practical-sql", author:"anthonydebarros", stars:"8.4k", lang:"SQL", desc:"Practical SQL book — real-world queries for data analysts", color:"#E97820" },
    { name:"pandas-exercises", author:"guipsamora", stars:"12.1k", lang:"Python", desc:"100 exercises to master Pandas for data analysis", color:"#3572A5" },
    { name:"awesome-datascience", author:"academic", stars:"23k", lang:"Jupyter", desc:"Curated learning resources, tools, and datasets for data science", color:"#DA5B0B" },
    { name:"mode-analytics/sql-tutorial", author:"mode", stars:"5.2k", lang:"SQL", desc:"Interactive SQL tutorial used by 500k+ learners", color:"#E97820" },
  ],
  "Full-Stack": [
    { name:"roadmap.sh", author:"kamranahmedse", stars:"290k", lang:"TypeScript", desc:"Interactive developer roadmaps — full-stack learning path", color:"#3178C6" },
    { name:"realworld", author:"gothinkster", stars:"78k", lang:"Multiple", desc:"Fullstack exemplary apps — same spec, 30+ frameworks", color:"#F1E05A" },
    { name:"system-design-primer", author:"donnemartin", stars:"270k", lang:"Python", desc:"System design concepts for tech interviews", color:"#3572A5" },
    { name:"javascript-algorithms", author:"trekhleb", stars:"184k", lang:"JavaScript", desc:"Algorithms and data structures in JavaScript with explanations", color:"#F7DF1E" },
  ],
  "default": [
    { name:"build-your-own-x", author:"codecrafters", stars:"310k", lang:"Multiple", desc:"Learn by rebuilding your favourite technologies from scratch", color:"#555" },
    { name:"free-programming-books", author:"EbookFoundation", stars:"340k", lang:"Multiple", desc:"Free learning resources for every programming language", color:"#27AE60" },
    { name:"public-apis", author:"public-apis", stars:"305k", lang:"Python", desc:"Collective list of free APIs for building projects", color:"#E74C3C" },
    { name:"project-based-learning", author:"practical-tutorials", stars:"210k", lang:"Multiple", desc:"Curated list of tutorials to build real-world projects", color:"#9B59B6" },
  ],
}

const COMMUNITIES = [
  { name:"r/learnprogramming", members:"3.8M", icon:"🟠", desc:"Ask anything — beginners always welcome. Daily help threads.", badge:"Most Active", badgeColor:"#FF4500" },
  { name:"r/cscareerquestions", members:"876k", icon:"🟠", desc:"Campus placements, resume reviews, interview experiences in India.", badge:"Interviews", badgeColor:"#FF6D00" },
  { name:"Dev.to Community", members:"1.2M", icon:"⬛", desc:"Write articles, share projects, get feedback from working devs.", badge:"Beginner Friendly", badgeColor:"#3D3D3D" },
  { name:"Hashnode", members:"600k", icon:"🟦", desc:"Technical blogging platform — great for building your public profile.", badge:"Portfolio Boost", badgeColor:"#2962FF" },
  { name:"GitHub Discussions", members:"100M+", icon:"⚫", desc:"Project-level discussions — contribute to open source.", badge:"Open Source", badgeColor:"#1B1F23" },
  { name:"Discord: Reactiflux", members:"220k", icon:"💙", desc:"Real-time help from React / JS experts. Active 24/7.", badge:"Live Chat", badgeColor:"#5865F2" },
]

const TRENDING_TOPICS = [
  { tag:"#SQL", posts:"18,240", hot:true  },
  { tag:"#Python", posts:"14,832", hot:true  },
  { tag:"#CampusPlacement", posts:"9,100", hot:true  },
  { tag:"#SystemDesign", posts:"8,241", hot:false },
  { tag:"#ReactJS", posts:"6,104", hot:false },
  { tag:"#DataScience", posts:"5,890", hot:false },
  { tag:"#OpenSource", posts:"4,722", hot:false },
  { tag:"#100DaysOfCode", posts:"4,200", hot:false },
]

function StudentPulse({ user, userData }) {
  const roleConf    = getRoleConfig(userData)
  const domain      = roleConf.label || userData?.keyword || "Tech"
  const elo         = userData?.eloRating || userData?.elo_rating || 400
  const displayName = userData?.displayName || userData?.display_name || userData?.name || "Student"
  const initials    = displayName[0]?.toUpperCase() || "S"

  // ── Feed state ──────────────────────────────────────────────────────────────
  const [posts,       setPosts]       = useState([])
  const [builders,    setBuilders]    = useState([])
  const [mentors,     setMentors]     = useState([])
  const [feedLoading, setFeedLoading] = useState(true)
  const [feedTab,     setFeedTab]     = useState("community")
  const [sortTab,     setSortTab]     = useState("foryou")
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(false)
  const [error,       setError]       = useState("")

  // ── Composer state ──────────────────────────────────────────────────────────
  const [composerOpen, setComposerOpen] = useState(false)
  const [postText,     setPostText]     = useState("")
  const [postType,     setPostType]     = useState("insight")
  const [postTags,     setPostTags]     = useState("")
  const [posting,      setPosting]      = useState(false)

  // ── Per-post interaction state ──────────────────────────────────────────────
  // reactions[postId] = { acknowledge: bool, signal: bool, save: bool }
  const [reactions, setReactions] = useState({})
  // commentPanels[postId] = { open, comments, text, loading, submitting }
  const [commentPanels, setCommentPanels] = useState({})

  // ── Domain selector ─────────────────────────────────────────────────────────
  const [showDomainPicker, setShowDomainPicker] = useState(false)

  // ── My Network state (followers / following) ───────────────────────────────
  const [myFollowing,      setMyFollowing]      = useState([])
  const [myFollowers,      setMyFollowers]      = useState([])
  const [networkLoading,   setNetworkLoading]   = useState(false)
  const [networkSubTab,    setNetworkSubTab]    = useState("following")  // following | followers
  const [suggestedUsers,   setSuggestedUsers]   = useState([])

  // ── Sparks (connections) state ────────────────────────────────────────────
  const [sparksTab,        setSparksTab]        = useState("discover")  // discover | inbox | sent
  const [userSearch,       setUserSearch]       = useState("")
  const [searchResults,    setSearchResults]    = useState([])
  const [searchLoading,    setSearchLoading]    = useState(false)
  const [pendingSparks,    setPendingSparks]    = useState([])
  const [sentSparks,       setSentSparks]       = useState([])
  const [sparksLoading,    setSparksLoading]    = useState(false)
  const [sparkActions,     setSparkActions]     = useState({})  // uid → "sending"|"sent"|"following"|"followed"
  const [sparkMsg,         setSparkMsg]         = useState("")

  // ── Load feed ────────────────────────────────────────────────────────────────
  const loadFeed = useCallback(async (pg = 1, append = false) => {
    setFeedLoading(true)
    setError("")
    try {
      let result = { posts: [], total: 0 }

      if (feedTab === "community") {
        const sortParam = sortTab === "discussed" ? "discussed"
                        : sortTab === "signal"    ? "signal"
                        : "created_at"
        result = await pulseApi.feed({ page: pg, limit: 15, sort: sortParam })
      } else if (feedTab === "capsules") {
        result = await pulseApi.saved(pg)
      }

      const newPosts = result.posts || []
      setPosts(p => append ? [...p, ...newPosts] : newPosts)
      setHasMore((pg * 15) < (result.total || 0))

      // Seed reaction state from server-returned user_interactions
      const rState = {}
      newPosts.forEach(post => {
        rState[post.id] = {
          acknowledge: (post.user_interactions || []).includes("acknowledge"),
          signal:      (post.user_interactions || []).includes("signal"),
          save:        (post.user_interactions || []).includes("save"),
        }
      })
      setReactions(r => append ? { ...r, ...rState } : rState)
    } catch (e) {
      setError(e.message || "Failed to load feed")
    } finally {
      setFeedLoading(false)
    }
  }, [feedTab, sortTab])

  // Reload when tab or sort changes
  useEffect(() => {
    setPage(1)
    loadFeed(1, false)
  }, [feedTab, sortTab, loadFeed])

  // ── Market insights state (replaces static DOMAIN_STATS) ────────────────────
  const [marketInsights, setMarketInsights] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(true)

  // Load sidebar data + market insights when domain changes
  useEffect(() => {
    pulseApi.builders(domain, elo, 6).then(setBuilders).catch(() => setBuilders([]))
    pulseApi.mentors(domain, 4).then(setMentors).catch(() => setMentors([]))
    // Load network counts for sidebar stats
    nexusApi.connections().then(data => {
      const all = Array.isArray(data) ? data : (data?.connections || [])
      const accepted = all.filter(c => c.status === "accepted")
      setMyFollowing(accepted.filter(c => c.requester_id === user?.id)
        .map(c => ({ ...c.addressee, connId: c.id })))
      setMyFollowers(accepted.filter(c => c.addressee_id === user?.id)
        .map(c => ({ ...c.requester, connId: c.id })))
    }).catch(() => {})
    // Market insights — server-cached 2hr, falls back to static data if unavailable
    setInsightsLoading(true)
    pulseApi.marketInsights(domain.toLowerCase(), userData?.job_role || userData?.target_role || domain)
      .then(data => { setMarketInsights(data); setInsightsLoading(false) })
      .catch(() => { setMarketInsights(null); setInsightsLoading(false) })
  }, [domain, elo]) // eslint-disable-line

  // ── Network: load followers/following & suggested users ─────────────────────
  const loadMyNetwork = async () => {
    setNetworkLoading(true)
    try {
      const data = await nexusApi.connections()
      const all = Array.isArray(data) ? data : (data?.connections || [])
      const accepted = all.filter(c => c.status === "accepted")
      setMyFollowing(accepted.filter(c => c.requester_id === user?.id)
        .map(c => ({ ...c.addressee, connId: c.id })))
      setMyFollowers(accepted.filter(c => c.addressee_id === user?.id)
        .map(c => ({ ...c.requester, connId: c.id })))
      // Suggested: load top users excluding already connected
      const connectedIds = new Set(all.map(c =>
        c.requester_id === user?.id ? c.addressee_id : c.requester_id))
      const sug = await nexusApi.search({ limit: 8 }).catch(() => ({ profiles: [] }))
      const sugList = (sug?.profiles || []).filter(p => p.id !== user?.id && !connectedIds.has(p.id))
      setSuggestedUsers(sugList.slice(0, 6))
    } catch {}
    setNetworkLoading(false)
  }

  // ── Sparks: load pending/sent when tab is active ─────────────────────────────
  const loadSparks = async () => {
    setSparksLoading(true)
    try {
      const data = await nexusApi.connections()
      const all = Array.isArray(data) ? data : (data?.connections || [])
      setPendingSparks(all.filter(c => c.status === "pending" && c.addressee_id === user?.id))
      setSentSparks(all.filter(c => c.status === "pending" && c.requester_id === user?.id))
    } catch {}
    setSparksLoading(false)
  }

  useEffect(() => {
    if (feedTab === "following") { loadSparks(); loadMyNetwork() }
  }, [feedTab]) // eslint-disable-line

  // ── Load suggested users on mount ────────────────────────────────────────────
  useEffect(() => {
    nexusApi.search({ limit: 6 })
      .then(d => setSuggestedUsers((d?.profiles || []).filter(p => p.id !== user?.id).slice(0, 6)))
      .catch(() => {})
  }, []) // eslint-disable-line

  // ── User search (debounced 400ms) ────────────────────────────────────────────
  const searchDebounceRef = useRef(null)
  const searchUsers = (q) => {
    setUserSearch(q)
    if (!q.trim() || q.trim().length < 2) { setSearchResults([]); setSearchLoading(false); return }
    setSearchLoading(true)
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const data = await nexusApi.search({ q: q.trim(), limit: 12 })
        // backend returns { profiles: [...], total: N }
        const users = Array.isArray(data) ? data : (data?.profiles || data?.users || [])
        setSearchResults(users)
      } catch { setSearchResults([]) }
      setSearchLoading(false)
    }, 400)
  }

  const sendSpark = async (uid, name) => {
    setSparkActions(a => ({ ...a, [uid]: "sending" }))
    try {
      await nexusApi.connect(uid, sparkMsg || `Hi ${name}, let's connect on Capabilio!`)
      setSparkActions(a => ({ ...a, [uid]: "sent" }))
    } catch (err) {
      // 409 = already sent — treat as success
      if (err?.message?.includes("409") || err?.message?.toLowerCase().includes("already")) {
        setSparkActions(a => ({ ...a, [uid]: "sent" }))
      } else {
        setSparkActions(a => ({ ...a, [uid]: null }))
      }
    }
  }

  const handleSpark = async (spark, accept) => {
    try {
      await nexusApi.respond(spark.id, accept ? "accepted" : "rejected")
      setPendingSparks(ps => ps.filter(s => s.id !== spark.id))
    } catch {}
  }

  const handleFollow = async (uid) => {
    setSparkActions(a => ({ ...a, [uid]: "following" }))
    try {
      await nexusApi.follow(uid)
      setSparkActions(a => ({ ...a, [uid]: "followed" }))
    } catch (err) {
      // 409/duplicate = already following — treat as success
      if (err?.message?.includes("409") || err?.message?.toLowerCase().includes("already") || err?.message?.toLowerCase().includes("duplicate")) {
        setSparkActions(a => ({ ...a, [uid]: "followed" }))
      } else {
        setSparkActions(a => ({ ...a, [uid]: null }))
      }
    }
  }

  // ── Post creation ────────────────────────────────────────────────────────────
  const submitPost = async () => {
    if (!postText.trim() || posting) return
    setPosting(true)
    setError("")
    try {
      const tags = postTags.split(/[\s,]+/).filter(t => t.trim()).map(t =>
        t.startsWith("#") ? t.toLowerCase() : "#" + t.toLowerCase()
      ).filter(Boolean)

      const result = await pulseApi.createPost({
        post_type:  postType,
        content:    postText.trim(),
        tech_tags:  tags,
        role_tags:  [domain.toLowerCase()],
        visibility: "public",
      })
      if (result.post) {
        setPosts(p => [result.post, ...p])
        setReactions(r => ({ ...r, [result.post.id]: { acknowledge: false, signal: false, save: false } }))
        setPostText("")
        setPostTags("")
        setComposerOpen(false)
      }
    } catch (e) {
      setError("Could not post: " + e.message)
    } finally {
      setPosting(false)
    }
  }

  // ── Reactions (optimistic) ───────────────────────────────────────────────────
  const handleReact = async (postId, action) => {
    const was = reactions[postId]?.[action] || false
    const countKey = { acknowledge: "acknowledge_count", signal: "signal_count", save: "save_count" }[action]

    // Optimistic update
    setReactions(r => ({ ...r, [postId]: { ...(r[postId] || {}), [action]: !was } }))
    if (countKey) {
      setPosts(ps => ps.map(p => p.id !== postId ? p
        : { ...p, [countKey]: Math.max(0, (p[countKey] || 0) + (!was ? 1 : -1)) }
      ))
    }
    try {
      await pulseApi.interact(postId, action)
    } catch {
      // Revert
      setReactions(r => ({ ...r, [postId]: { ...(r[postId] || {}), [action]: was } }))
      if (countKey) {
        setPosts(ps => ps.map(p => p.id !== postId ? p
          : { ...p, [countKey]: Math.max(0, (p[countKey] || 0) + (was ? 1 : -1)) }
        ))
      }
    }
  }

  // ── Comments ─────────────────────────────────────────────────────────────────
  const toggleComments = async (postId) => {
    const panel = commentPanels[postId]
    if (panel?.open) {
      setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], open: false } }))
      return
    }
    setCommentPanels(cp => ({ ...cp, [postId]: { open: true, comments: [], text: "", loading: true, submitting: false } }))
    try {
      const data = await pulseApi.comments(postId)
      setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], comments: data || [], loading: false } }))
    } catch {
      setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], loading: false } }))
    }
  }

  const updateCommentText = (postId, text) =>
    setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], text } }))

  const submitComment = async (postId) => {
    const panel = commentPanels[postId]
    if (!panel?.text?.trim() || panel.submitting) return
    setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], submitting: true } }))
    try {
      const result = await pulseApi.addComment(postId, panel.text.trim())
      if (result.comment) {
        setCommentPanels(cp => ({
          ...cp,
          [postId]: { ...cp[postId], comments: [...(cp[postId]?.comments || []), result.comment], text: "", submitting: false }
        }))
        setPosts(ps => ps.map(p => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p))
      }
    } catch {
      setCommentPanels(cp => ({ ...cp, [postId]: { ...cp[postId], submitting: false } }))
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const authorName = (post) => post.author?.display_name || post.author?.name || post.author?.username || userData?.displayName || "Member"
  const authorInitials = (post) => (authorName(post)[0] || "M").toUpperCase()
  const authorElo = (post) => post.author?.elo_rating || 400

  // ── Delete post ──────────────────────────────────────────────────────────────
  const [deletingPost, setDeletingPost] = useState(null)
  const deletePost = async (postId) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return
    setDeletingPost(postId)
    try {
      await pulseApi.deletePost(postId)
      setPosts(ps => ps.filter(p => p.id !== postId))
    } catch {}
    setDeletingPost(null)
  }
  const timeAgo = (iso) => {
    if (!iso) return ""
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  const POST_TYPE_CFG = {
    insight:  { label: "INSIGHT",  color: "#7C3AED", bg: "#F4F0FF" },
    win:      { label: "WIN",      color: "#059669", bg: "#ECFDF5" },
    question: { label: "QUESTION", color: "#0891B2", bg: "#EFF6FF" },
    code:     { label: "CODE",     color: "#D97706", bg: "#FFF7ED" },
    text:     { label: "POST",     color: "#6B6560", bg: "#F3F4F6" },
  }

  // ── Static fallbacks (used until live data loads, or if API unavailable) ──────
  const STATIC_DOMAIN_STATS = {
    "Data Analyst":     { hiring:"+35%", salary:"₹7L",  openRoles:"3,840", trending:"dbt, Snowflake" },
    "Full-Stack":       { hiring:"+28%", salary:"₹9L",  openRoles:"7,200", trending:"Next.js 15, Bun" },
    "Frontend":         { hiring:"+22%", salary:"₹8L",  openRoles:"5,400", trending:"React 19, Tailwind" },
    "Backend":          { hiring:"+31%", salary:"₹9.5L",openRoles:"6,100", trending:"Go, gRPC" },
    "DevOps":           { hiring:"+40%", salary:"₹12L", openRoles:"2,900", trending:"K8s 1.30, Cilium" },
    "Machine Learning": { hiring:"+52%", salary:"₹14L", openRoles:"4,200", trending:"LLM APIs, RAG" },
  }
  const staticStats  = STATIC_DOMAIN_STATS[domain] || { hiring:"+18%", salary:"₹9L", openRoles:"7,840", trending:"AI, TypeScript" }

  // Live stats from Gemini Search — fall back to static if not yet loaded
  const liveHiring   = marketInsights?.hiring_companies?.[0]?.salary_lpa ? `${marketInsights.hiring_companies[0].salary_lpa}` : null
  const liveTrending = marketInsights?.trending_techs?.slice(0,2).map(t => t.name).join(", ") || null
  const stats = {
    hiring:    marketInsights?.market_outlook === "Growing" ? "+Live" : staticStats.hiring,
    salary:    liveHiring   || staticStats.salary,
    openRoles: staticStats.openRoles,
    trending:  liveTrending || staticStats.trending,
  }

  const STATIC_TRENDING_TAGS = {
    "Data Analyst":     ["#SQL","#Python","#Pandas","#dbt","#Snowflake","#Tableau"],
    "Full-Stack":       ["#ReactJS","#NodeJS","#SystemDesign","#TypeScript","#NextJS"],
    "Machine Learning": ["#Python","#LLMs","#RAG","#LangChain","#PyTorch","#MLOps"],
    "default":          ["#SystemDesign","#OpenSource","#100DaysOfCode","#LeetCode","#AI"],
  }
  // Use live rising skills as tags if available, else static
  const trendingTags = marketInsights?.skills?.rising?.length
    ? marketInsights.skills.rising.slice(0, 6).map(s => s.startsWith("#") ? s : `#${s}`)
    : (STATIC_TRENDING_TAGS[domain] || STATIC_TRENDING_TAGS["default"])

  const AVATAR_COLORS = ["#FF5701","#6D28D9","#0891B2","#059669","#D97706","#7C3AED","#DC2626","#0369A1"]
  const colorForId = (id) => AVATAR_COLORS[(id?.charCodeAt(0) || 0) % AVATAR_COLORS.length]

  const P = {
    bg:"#F3F4F6", surface:"#FFFFFF", ink:"#1A1714", ink2:"#3D3935", ink3:"#6B6560", ink4:"#A8A29E",
    accent:"#FF5701", accent2:"#FFF1E8", border:"rgba(0,0,0,0.08)",
    shadow:"0 1px 3px rgba(0,0,0,0.06),0 0 0 1px rgba(0,0,0,0.04)", r:12,
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ background:P.bg, flex:1, minHeight:0, overflowY:"auto", fontFamily:"'DM Sans',-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .pc{transition:box-shadow 0.15s;} .pc:hover{box-shadow:0 4px 16px rgba(0,0,0,0.10)!important;}
        .pb{transition:background 0.12s,color 0.12s,border-color 0.12s;cursor:pointer;}
        .pb:hover{background:rgba(0,0,0,0.05)!important;}
        .pt{transition:all 0.15s;cursor:pointer;border:none;background:transparent;font-family:inherit;}
        .story:hover{transform:scale(1.06);} .story{transition:transform 0.15s;cursor:pointer;}
        .reacted{filter:brightness(0.9);}
      `}</style>

      {/* Domain picker modal */}
      {showDomainPicker && (
        <div onClick={()=>setShowDomainPicker(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#FFFFFF",borderRadius:16,padding:24,width:340,boxShadow:"0 20px 60px rgba(0,0,0,0.2)"}}>
            <div style={{fontSize:14,fontWeight:700,color:P.ink,marginBottom:16}}>Switch Domain Filter</div>
            {Object.keys(STATIC_DOMAIN_STATS).map(d=>(
              <button key={d} onClick={()=>setShowDomainPicker(false)}
                style={{display:"block",width:"100%",padding:"10px 14px",marginBottom:6,borderRadius:8,border:`1.5px solid ${domain===d?P.accent+"40":P.border}`,background:domain===d?P.accent2:"#fff",color:domain===d?P.accent:P.ink2,fontSize:13,fontWeight:domain===d?700:500,textAlign:"left",cursor:"pointer"}}>
                {d} {domain===d&&"✓"}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{maxWidth:1100,margin:"0 auto",padding:"20px 16px 60px"}}>

        {/* ── Header ── */}
        <div style={{marginBottom:16,animation:"fadeUp 0.3s ease both"}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.14em",color:P.ink4,textTransform:"uppercase",marginBottom:4}}>PULSE</div>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
            <div>
              <h1 style={{fontSize:24,fontWeight:800,color:P.ink,margin:"0 0 4px",lineHeight:1.2}}>Your Intelligence Feed</h1>
              <p style={{fontSize:13,color:P.ink3,margin:0}}>Stay ahead in <span style={{color:P.accent,fontWeight:700}}>{domain}</span> — posts, mentors, and community</p>
            </div>
            <div style={{display:"flex",gap:8,flexShrink:0,flexWrap:"wrap"}}>
              <button className="pb" onClick={()=>setShowDomainPicker(true)}
                style={{padding:"6px 14px",background:P.accent2,border:`1.5px solid ${P.accent}30`,borderRadius:99,fontSize:12,fontWeight:700,color:P.accent}}>
                ⚡ {domain} domain
              </button>
              <button className="pb" onClick={()=>{ setFeedTab("community"); setComposerOpen(true) }}
                style={{padding:"6px 16px",background:P.accent,border:"none",borderRadius:99,fontSize:12,fontWeight:700,color:"#fff"}}>
                + Share a Signal
              </button>
            </div>
          </div>
        </div>

        {/* ── Domain stats bar ── */}
        <div style={{background:"linear-gradient(135deg,#1a1a2e,#16213e)",borderRadius:P.r,padding:"10px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:6,overflowX:"auto",animation:"fadeUp 0.35s ease both"}}>
          <span style={{fontSize:10,fontWeight:800,color:"rgba(255,255,255,0.5)",letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap",marginRight:8}}>LIVE DOMAIN PULSE</span>
          <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginRight:8,whiteSpace:"nowrap"}}>Real-time signals for <span style={{color:P.accent,fontWeight:700}}>{domain}</span></span>
          <div style={{flex:1}}/>
          {[{label:"HIRING VELOCITY",value:stats.hiring,color:"#34D399"},{label:"ACTIVE PROJECTS",value:stats.projects,color:"#60A5FA"},{label:"AVG SALARY",value:stats.salary,color:"#FBBF24"},{label:"OPEN ROLES",value:stats.openRoles,color:"#F472B6"}].map((s,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"2px 16px",borderLeft:"1px solid rgba(0,0,0,0.05)",flexShrink:0}}>
              <span style={{fontSize:15,fontWeight:800,color:s.color,fontFamily:"'DM Mono',monospace"}}>{s.value}</span>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.4)",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginTop:1}}>{s.label}</span>
            </div>
          ))}
        </div>

        {error&&<div style={{background:"#FEF2F2",border:"1px solid rgba(220,38,38,0.2)",borderRadius:10,padding:"10px 16px",marginBottom:14,fontSize:13,color:"#DC2626"}}>{error}</div>}

        <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:18,alignItems:"start"}}>

          {/* ── Left feed column ── */}
          <div>
            {/* Stories row */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:"14px 16px",marginBottom:14,boxShadow:P.shadow}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:P.ink4,textTransform:"uppercase",marginBottom:12}}>STORIES · 24H</div>
              <div style={{display:"flex",gap:14,overflowX:"auto",paddingBottom:4}}>
                {/* Your story */}
                <div className="story" onClick={()=>setComposerOpen(true)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,flexShrink:0}}>
                  <div style={{width:52,height:52,borderRadius:"50%",padding:2,background:`linear-gradient(135deg,${P.accent},#f97316)`}}>
                    <div style={{width:"100%",height:"100%",borderRadius:"50%",border:"2px solid #fff",background:P.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff"}}>+</div>
                  </div>
                  <span style={{fontSize:10,fontWeight:500,color:P.ink3}}>Your Story</span>
                </div>
                {/* Builder stories */}
                {builders.slice(0,5).map((b,i)=>{
                  const bName = b.display_name || b.name || "User"
                  const bColor = colorForId(b.id)
                  return (
                    <div key={b.id||i} className="story" style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,flexShrink:0}}>
                      <div style={{width:52,height:52,borderRadius:"50%",padding:2,background:`linear-gradient(135deg,${bColor},${bColor}88)`}}>
                        <div style={{width:"100%",height:"100%",borderRadius:"50%",border:"2px solid #fff",background:bColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,color:"#fff"}}>{bName[0]?.toUpperCase()}</div>
                      </div>
                      <span style={{fontSize:10,fontWeight:500,color:P.ink3,maxWidth:54,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bName.split(" ")[0]}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Feed tabs + content card */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,overflow:"hidden",boxShadow:P.shadow}}>

              {/* Tab bar */}
              <div style={{display:"flex",borderBottom:`1px solid ${P.border}`}}>
                {[{id:"community",label:"🌐 Community"},{id:"following",label:"✦ Sparks"},{id:"network",label:"👥 Network"},{id:"mentors",label:"🎓 Mentors"},{id:"capsules",label:"⚡ Capsules"}].map(t=>(
                  <button key={t.id} className="pt" onClick={()=>setFeedTab(t.id)}
                    style={{flex:1,padding:"12px 6px",fontSize:12,fontWeight:feedTab===t.id?700:500,color:feedTab===t.id?P.accent:P.ink3,borderBottom:feedTab===t.id?`2px solid ${P.accent}`:"2px solid transparent",whiteSpace:"nowrap"}}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Composer (shown when composerOpen OR inline) */}
              {feedTab !== "mentors" && feedTab !== "following" && feedTab !== "network" && (
                <div style={{padding:"14px 16px",borderBottom:`1px solid ${P.border}`}}>
                  {composerOpen ? (
                    <div>
                      {/* Post type selector */}
                      <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
                        {Object.entries(POST_TYPE_CFG).filter(([k])=>k!=="text").map(([k,v])=>(
                          <button key={k} className="pb" onClick={()=>setPostType(k)}
                            style={{padding:"3px 12px",borderRadius:99,border:`1.5px solid ${postType===k?v.color+"60":P.border}`,background:postType===k?v.bg:"transparent",color:postType===k?v.color:P.ink4,fontSize:11,fontWeight:700}}>
                            {v.label}
                          </button>
                        ))}
                      </div>
                      <textarea value={postText} onChange={e=>setPostText(e.target.value)}
                        placeholder={`Share an insight, code snippet, or win in ${domain}...`}
                        style={{width:"100%",minHeight:90,padding:"10px 12px",border:`1.5px solid rgba(255,87,1,0.3)`,borderRadius:10,fontSize:13,color:P.ink,resize:"vertical",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                      <input value={postTags} onChange={e=>setPostTags(e.target.value)}
                        placeholder="Add tags: #python #sql #interview"
                        style={{width:"100%",padding:"8px 12px",border:`1px solid ${P.border}`,borderRadius:8,fontSize:12,color:P.ink,fontFamily:"inherit",outline:"none",marginTop:8,boxSizing:"border-box"}}/>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
                        <span style={{fontSize:11,color:P.ink4}}>{postText.length}/500</span>
                        <div style={{display:"flex",gap:8}}>
                          <button className="pb" onClick={()=>{setComposerOpen(false);setPostText("");setPostTags("")}}
                            style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${P.border}`,color:P.ink3,fontSize:12,fontWeight:600}}>Cancel</button>
                          <button className="pb" onClick={submitPost} disabled={!postText.trim()||posting}
                            style={{padding:"7px 16px",borderRadius:8,border:"none",background:postText.trim()&&!posting?P.accent:"rgba(0,0,0,0.1)",color:postText.trim()&&!posting?"#fff":P.ink4,fontSize:12,fontWeight:700,opacity:posting?0.7:1}}>
                            {posting?"Posting...":"Post"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <div style={{width:32,height:32,borderRadius:"50%",background:P.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{initials}</div>
                      <div onClick={()=>setComposerOpen(true)} style={{flex:1,padding:"9px 14px",border:`1px solid ${P.border}`,borderRadius:20,fontSize:13,color:P.ink4,cursor:"text",background:"rgba(0,0,0,0.02)"}}>
                        Share an insight, code snippet, or win in {domain}...
                      </div>
                      {[{l:"Code",e:"💻",t:"code"},{l:"Win",e:"🏆",t:"win"},{l:"Ask",e:"❓",t:"question"}].map(b=>(
                        <button key={b.l} className="pb" onClick={()=>{setComposerOpen(true);setPostType(b.t)}}
                          style={{padding:"7px 11px",border:`1px solid ${P.border}`,borderRadius:8,background:"#FFFFFF",fontSize:12,fontWeight:600,color:P.ink2}}>
                          {b.e} {b.l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sort bar — not shown on Mentors/Sparks/Network tab */}
              {feedTab !== "mentors" && feedTab !== "following" && feedTab !== "network" && (
                <div style={{padding:"8px 16px",display:"flex",alignItems:"center",gap:6,borderBottom:`1px solid ${P.border}`,overflowX:"auto"}}>
                  <span style={{fontSize:11,fontWeight:600,color:P.ink4,marginRight:4,flexShrink:0}}>SORT</span>
                  {[{id:"foryou",label:"For You"},{id:"latest",label:"Latest"},{id:"discussed",label:"Most Discussed"},{id:"signal",label:"High Signal"}].map(s=>(
                    <button key={s.id} className="pb" onClick={()=>setSortTab(s.id)}
                      style={{padding:"4px 12px",borderRadius:99,border:`1px solid ${sortTab===s.id?P.accent+"40":P.border}`,background:sortTab===s.id?P.accent2:"transparent",color:sortTab===s.id?P.accent:P.ink3,fontSize:11,fontWeight:sortTab===s.id?700:500,flexShrink:0}}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Sparks tab (was "Following") ── */}
              {feedTab === "following" && (
                <div style={{padding:16}}>
                  {/* Sub-tab bar */}
                  <div style={{display:"flex",gap:6,marginBottom:16,background:"#F9F7F4",borderRadius:10,padding:4}}>
                    {[{id:"discover",label:"🔍 Discover"},{id:"inbox",label:`✦ Inbox${pendingSparks.length>0?" ("+pendingSparks.length+")":""}`},{id:"sent",label:"📤 Sent"}].map(st=>(
                      <button key={st.id} onClick={()=>setSparksTab(st.id)}
                        style={{flex:1,padding:"7px 6px",borderRadius:8,border:"none",cursor:"pointer",
                          background:sparksTab===st.id?"#fff":"transparent",
                          color:sparksTab===st.id?P.accent:P.ink3,
                          fontSize:11,fontWeight:sparksTab===st.id?700:500,
                          boxShadow:sparksTab===st.id?"0 1px 4px rgba(0,0,0,0.08)":"none",
                          transition:"all 0.15s"}}>
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {/* ── Discover: search + follow ── */}
                  {sparksTab === "discover" && (
                    <div>
                      <div style={{position:"relative",marginBottom:14}}>
                        <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:14,color:P.ink4}}>🔍</span>
                        <input value={userSearch} onChange={e=>searchUsers(e.target.value)}
                          placeholder="Search people by name, domain, college…"
                          style={{width:"100%",padding:"10px 12px 10px 36px",border:`1.5px solid ${P.border}`,borderRadius:10,fontSize:13,fontFamily:"inherit",outline:"none",background:"#FAFAF9",boxSizing:"border-box"}}
                          onFocus={e=>e.target.style.borderColor=P.accent}
                          onBlur={e=>e.target.style.borderColor=P.border}/>
                      </div>
                      {searchLoading && <div style={{textAlign:"center",padding:"20px 0",color:P.ink4,fontSize:13}}>Searching…</div>}
                      {!searchLoading && userSearch && searchResults.length === 0 && (
                        <div style={{textAlign:"center",padding:"24px 0",color:P.ink4}}>
                          <div style={{fontSize:28,marginBottom:6}}>🔭</div>
                          <div style={{fontSize:13,fontWeight:600,color:P.ink3}}>No users found for "{userSearch}"</div>
                        </div>
                      )}
                      {!searchLoading && searchResults.length > 0 && (
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {searchResults.map((u,i) => {
                            const uName = u.display_name || u.name || u.username || "User"
                            const uColor = colorForId(u.id || u.user_id || String(i))
                            const action = sparkActions[u.id]
                            return (
                              <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                <div style={{width:40,height:40,borderRadius:"50%",background:uColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{uName[0]?.toUpperCase()}</div>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:13,fontWeight:700,color:P.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uName}</div>
                                  <div style={{fontSize:11,color:P.ink4,marginTop:1}}>{u.keyword||u.domain||"Capabilio member"}{u.college?` · ${u.college}`:""}</div>
                                  {u.elo_rating&&<div style={{fontSize:10,fontFamily:"monospace",color:P.accent,fontWeight:700,marginTop:2}}>ELO {u.elo_rating}</div>}
                                </div>
                                <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                                  <button onClick={()=>action==="sent"||action==="sending"?null:sendSpark(u.id, uName)}
                                    style={{padding:"5px 12px",background:action==="sent"?"#F0FDF4":action==="sending"?"#FAF7F2":P.accent,border:`1.5px solid ${action==="sent"?"#BBF7D0":action==="sending"?P.border:P.accent}`,borderRadius:8,color:action==="sent"?"#15803D":action==="sending"?P.ink4:"#fff",fontSize:11,fontWeight:700,cursor:action?"default":"pointer",whiteSpace:"nowrap"}}>
                                    {action==="sending"?"Sparking…":action==="sent"?"✓ Sparked":"✦ Spark"}
                                  </button>
                                  <button onClick={()=>action==="followed"||action==="following"?null:handleFollow(u.id)}
                                    style={{padding:"5px 12px",background:action==="followed"?"#EEF2FF":"transparent",border:`1.5px solid ${action==="followed"?"#818CF8":P.accent}`,borderRadius:8,color:action==="followed"?"#6366F1":P.accent,fontSize:11,fontWeight:700,cursor:action==="followed"||action==="following"?"default":"pointer",whiteSpace:"nowrap"}}>
                                    {action==="following"?"Following…":action==="followed"?"✓ Following":"+ Follow"}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {!userSearch && (
                        <div>
                          <div style={{fontSize:11,fontWeight:700,color:P.ink4,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>People You May Know</div>
                          {suggestedUsers.length === 0 ? (
                            <div style={{textAlign:"center",padding:"24px 0",color:P.ink4}}>
                              <div style={{fontSize:28,marginBottom:6}}>✦</div>
                              <div style={{fontSize:13,color:P.ink3}}>Search to find people on Capabilio</div>
                            </div>
                          ) : (
                            <div style={{display:"flex",flexDirection:"column",gap:10}}>
                              {suggestedUsers.map((u,i) => {
                                const uName = u.display_name || u.name || u.username || "User"
                                const uColor = colorForId(u.id || String(i))
                                const action = sparkActions[u.id]
                                return (
                                  <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                    <div style={{width:40,height:40,borderRadius:"50%",background:uColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{uName[0]?.toUpperCase()}</div>
                                    <div style={{flex:1,minWidth:0}}>
                                      <div style={{fontSize:13,fontWeight:700,color:P.ink,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{uName}</div>
                                      <div style={{fontSize:11,color:P.ink4,marginTop:1}}>{u.keyword||u.current_role_title||"Capabilio member"}</div>
                                      <div style={{fontSize:10,fontFamily:"monospace",color:P.accent,fontWeight:700,marginTop:1}}>ELO {u.elo_rating||400}</div>
                                    </div>
                                    <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                                      <button onClick={()=>action==="sent"||action==="sending"?null:sendSpark(u.id, uName)}
                                        style={{padding:"5px 12px",background:action==="sent"?"#F0FDF4":action==="sending"?"#FAF7F2":P.accent,border:`1.5px solid ${action==="sent"?"#BBF7D0":action==="sending"?P.border:P.accent}`,borderRadius:8,color:action==="sent"?"#15803D":action==="sending"?P.ink4:"#fff",fontSize:11,fontWeight:700,cursor:action?"default":"pointer",whiteSpace:"nowrap"}}>
                                        {action==="sending"?"Sparking…":action==="sent"?"✓ Sparked":"✦ Spark"}
                                      </button>
                                      <button onClick={()=>action==="followed"||action==="following"?null:handleFollow(u.id)}
                                        style={{padding:"5px 12px",background:action==="followed"?"#EEF2FF":"transparent",border:`1.5px solid ${action==="followed"?"#818CF8":P.accent}`,borderRadius:8,color:action==="followed"?"#6366F1":P.accent,fontSize:11,fontWeight:700,cursor:action==="followed"||action==="following"?"default":"pointer",whiteSpace:"nowrap"}}>
                                        {action==="following"?"Following…":action==="followed"?"✓ Following":"+ Follow"}
                                      </button>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Inbox: pending incoming Sparks ── */}
                  {sparksTab === "inbox" && (
                    <div>
                      {sparksLoading ? (
                        <div style={{textAlign:"center",padding:"32px 0",color:P.ink4,fontSize:13}}>Loading Sparks…</div>
                      ) : pendingSparks.length === 0 ? (
                        <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                          <div style={{fontSize:36,marginBottom:8}}>✦</div>
                          <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>No pending Sparks</div>
                          <div style={{fontSize:12,marginTop:4,color:P.ink4}}>When someone Sparks you, it shows up here</div>
                        </div>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {pendingSparks.map((spark,i) => {
                            const sName = spark.requester?.display_name || spark.requester?.name || "Someone"
                            const sColor = colorForId(spark.requester_id || String(i))
                            return (
                              <div key={spark.id} style={{padding:"14px 16px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                                  <div style={{width:40,height:40,borderRadius:"50%",background:sColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{sName[0]?.toUpperCase()}</div>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:13,fontWeight:700,color:P.ink}}>{sName}</div>
                                    <div style={{fontSize:11,color:P.ink4}}>{spark.requester?.keyword||"Capabilio member"}</div>
                                  </div>
                                  <div style={{fontSize:10,color:P.ink4}}>{spark.created_at ? new Date(spark.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : ""}</div>
                                </div>
                                {spark.message&&<div style={{fontSize:12,color:P.ink3,marginBottom:10,padding:"8px 10px",background:"#F9F7F4",borderRadius:8,fontStyle:"italic"}}>"{spark.message}"</div>}
                                <div style={{display:"flex",gap:8}}>
                                  <button onClick={()=>handleSpark(spark,true)}
                                    style={{flex:1,padding:"8px",background:P.accent,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                                    ✓ Accept Spark
                                  </button>
                                  <button onClick={()=>handleSpark(spark,false)}
                                    style={{flex:1,padding:"8px",background:"transparent",border:`1.5px solid ${P.border}`,borderRadius:8,color:P.ink3,fontSize:12,fontWeight:600,cursor:"pointer"}}>
                                    Decline
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Sent Sparks ── */}
                  {sparksTab === "sent" && (
                    <div>
                      {sparksLoading ? (
                        <div style={{textAlign:"center",padding:"32px 0",color:P.ink4,fontSize:13}}>Loading…</div>
                      ) : sentSparks.length === 0 ? (
                        <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                          <div style={{fontSize:36,marginBottom:8}}>📤</div>
                          <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>No sent Sparks yet</div>
                          <div style={{fontSize:12,marginTop:4,color:P.ink4}}>Go to Discover and Spark someone to connect</div>
                        </div>
                      ) : (
                        <div style={{display:"flex",flexDirection:"column",gap:10}}>
                          {sentSparks.map((spark,i) => {
                            const aName = spark.addressee?.display_name || spark.addressee?.name || "Someone"
                            const aColor = colorForId(spark.addressee_id || String(i))
                            return (
                              <div key={spark.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                <div style={{width:40,height:40,borderRadius:"50%",background:aColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{aName[0]?.toUpperCase()}</div>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:13,fontWeight:700,color:P.ink}}>{aName}</div>
                                  <div style={{fontSize:11,color:P.ink4}}>{spark.addressee?.keyword||"Capabilio member"}</div>
                                </div>
                                <span style={{fontSize:11,fontWeight:600,color:"#F59E0B",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:99,padding:"3px 10px"}}>Pending</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Network tab (followers / following) ── */}
              {feedTab === "network" && (
                <div style={{padding:16}}>
                  {/* Sub-tabs */}
                  <div style={{display:"flex",gap:6,marginBottom:16,background:"#F9F7F4",borderRadius:10,padding:4}}>
                    {[
                      {id:"following", label:`Following${myFollowing.length>0?" ("+myFollowing.length+")":""}`},
                      {id:"followers", label:`Followers${myFollowers.length>0?" ("+myFollowers.length+")":""}` },
                    ].map(st=>(
                      <button key={st.id} onClick={()=>setNetworkSubTab(st.id)}
                        style={{flex:1,padding:"7px 6px",borderRadius:8,border:"none",cursor:"pointer",
                          background:networkSubTab===st.id?"#fff":"transparent",
                          color:networkSubTab===st.id?P.accent:P.ink3,
                          fontSize:11,fontWeight:networkSubTab===st.id?700:500,
                          boxShadow:networkSubTab===st.id?"0 1px 4px rgba(0,0,0,0.08)":"none",
                          transition:"all 0.15s"}}>
                        {st.label}
                      </button>
                    ))}
                  </div>

                  {networkLoading ? (
                    <div style={{textAlign:"center",padding:"32px 0",color:P.ink4,fontSize:13}}>Loading network…</div>
                  ) : (
                    <div>
                      {/* Following list */}
                      {networkSubTab === "following" && (
                        myFollowing.length === 0 ? (
                          <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                            <div style={{fontSize:36,marginBottom:8}}>👥</div>
                            <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>Not following anyone yet</div>
                            <div style={{fontSize:12,marginTop:4}}>Go to ✦ Sparks → Discover to connect</div>
                          </div>
                        ) : (
                          <div style={{display:"flex",flexDirection:"column",gap:10}}>
                            {myFollowing.map((u,i) => {
                              const uName = u.display_name || u.name || u.username || "User"
                              const uColor = colorForId(u.id || String(i))
                              return (
                                <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                  <div style={{width:42,height:42,borderRadius:"50%",background:uColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{uName[0]?.toUpperCase()}</div>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:13,fontWeight:700,color:P.ink}}>{uName}</div>
                                    <div style={{fontSize:11,color:P.ink4,marginTop:1}}>{u.keyword||u.current_role_title||"Capabilio member"}</div>
                                    <div style={{fontSize:10,fontFamily:"monospace",color:P.accent,fontWeight:700,marginTop:1}}>ELO {u.elo_rating||400}</div>
                                  </div>
                                  <button onClick={()=>nexusApi.unfollow(u.id).then(loadMyNetwork).catch(()=>{})}
                                    style={{padding:"5px 12px",background:"transparent",border:`1.5px solid ${P.border}`,borderRadius:8,color:P.ink3,fontSize:11,fontWeight:600,cursor:"pointer"}}>
                                    Unfollow
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      )}

                      {/* Followers list */}
                      {networkSubTab === "followers" && (
                        myFollowers.length === 0 ? (
                          <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                            <div style={{fontSize:36,marginBottom:8}}>👥</div>
                            <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>No followers yet</div>
                            <div style={{fontSize:12,marginTop:4}}>Share your work on Community to grow your network</div>
                          </div>
                        ) : (
                          <div style={{display:"flex",flexDirection:"column",gap:10}}>
                            {myFollowers.map((u,i) => {
                              const uName = u.display_name || u.name || u.username || "User"
                              const uColor = colorForId(u.id || String(i))
                              const action = sparkActions[u.id]
                              return (
                                <div key={u.id||i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:10,boxShadow:P.shadow}}>
                                  <div style={{width:42,height:42,borderRadius:"50%",background:uColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff",flexShrink:0}}>{uName[0]?.toUpperCase()}</div>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:13,fontWeight:700,color:P.ink}}>{uName}</div>
                                    <div style={{fontSize:11,color:P.ink4,marginTop:1}}>{u.keyword||u.current_role_title||"Capabilio member"}</div>
                                    <div style={{fontSize:10,fontFamily:"monospace",color:P.accent,fontWeight:700,marginTop:1}}>ELO {u.elo_rating||400}</div>
                                  </div>
                                  <button onClick={()=>action==="sent"||action==="sending"?null:sendSpark(u.id, uName)}
                                    style={{padding:"5px 12px",background:action==="sent"?"#F0FDF4":P.accent,border:`1.5px solid ${action==="sent"?"#BBF7D0":P.accent}`,borderRadius:8,color:action==="sent"?"#15803D":"#fff",fontSize:11,fontWeight:700,cursor:action==="sent"?"default":"pointer",whiteSpace:"nowrap"}}>
                                    {action==="sending"?"…":action==="sent"?"✓ Sparked":"✦ Spark back"}
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Mentors tab ── */}
              {feedTab === "mentors" && (
                <div style={{padding:16}}>
                  {!Array.isArray(mentors) || mentors.length === 0 ? (
                    <div style={{textAlign:"center",padding:"40px 0",color:P.ink4}}>
                      <div style={{fontSize:32,marginBottom:8}}>🎓</div>
                      <div style={{fontSize:14,fontWeight:600,color:P.ink3}}>No mentors in your domain yet</div>
                      <div style={{fontSize:12,marginTop:4}}>Check back soon as verified mentors join Capabilio</div>
                    </div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:12}}>
                      {(Array.isArray(mentors) ? mentors : []).map((m,i)=>{
                        const mName = m.display_name || m.profile?.display_name || m.profile?.name || "Mentor"
                        const mColor = colorForId(m.user_id)
                        return (
                          <div key={m.id||i} className="pc" style={{background:"#FFFFFF",border:`1px solid ${P.border}`,borderRadius:P.r,padding:16,boxShadow:P.shadow}}>
                            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                              <div style={{width:46,height:46,borderRadius:"50%",background:mColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:800,color:"#fff",flexShrink:0}}>{mName[0]?.toUpperCase()}</div>
                              <div style={{flex:1}}>
                                <div style={{fontSize:14,fontWeight:700,color:P.ink}}>{mName}</div>
                                <div style={{fontSize:11,color:P.ink3}}>{m.headline||"Verified Mentor"}</div>
                              </div>
                              {m.rating&&<div style={{fontSize:12,fontWeight:700,color:"#F59E0B"}}>⭐ {m.rating}</div>}
                            </div>
                            {m.specialties&&<div style={{fontSize:12,color:P.ink2,marginBottom:10,lineHeight:1.5}}>{m.specialties}</div>}
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                              {m.hourly_rate&&<span style={{fontSize:12,fontWeight:700,color:P.ink}}>₹{m.hourly_rate}/session</span>}
                              <button className="pb" style={{padding:"7px 18px",background:P.accent,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700}}>Book Session</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── Post feed (community / capsules) ── */}
              {feedTab !== "mentors" && feedTab !== "following" && feedTab !== "network" && (
                <>
                  {feedLoading && (
                    <div style={{padding:40,textAlign:"center"}}>
                      <div style={{width:24,height:24,border:`3px solid ${P.accent}33`,borderTopColor:P.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
                    </div>
                  )}

                  {!feedLoading && posts.length === 0 && (
                    <div style={{textAlign:"center",padding:"50px 0",color:P.ink4}}>
                      <div style={{fontSize:40,marginBottom:10}}>{feedTab==="following"?"🔔":feedTab==="capsules"?"⚡":"🌐"}</div>
                      <div style={{fontSize:14,fontWeight:600,color:P.ink3,marginBottom:6}}>
                        {feedTab==="following" ? "No posts from people you follow yet"
                         : feedTab==="capsules" ? "No saved posts yet — save posts to find them here"
                         : "No posts yet — be the first to share!"}
                      </div>
                      {feedTab==="community"&&<button className="pb" onClick={()=>setComposerOpen(true)} style={{padding:"8px 20px",background:P.accent,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700}}>Share the first signal</button>}
                    </div>
                  )}

                  {!feedLoading && posts.map((post, i)=>{
                    const pt = POST_TYPE_CFG[post.post_type] || POST_TYPE_CFG.text
                    const reacted = reactions[post.id] || {}
                    const panel = commentPanels[post.id]
                    const tags = [...(post.tech_tags||[]), ...(post.role_tags||[])].filter(Boolean)

                    return (
                      <div key={post.id} style={{borderBottom:i<posts.length-1?`1px solid ${P.border}`:"none"}}>
                        <div style={{padding:16}}>
                          {/* Post header */}
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{width:38,height:38,borderRadius:"50%",background:colorForId(post.author_id),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff",flexShrink:0}}>{authorInitials(post)}</div>
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                  <span style={{fontSize:13,fontWeight:700,color:P.ink}}>{authorName(post)}</span>
                                  {post.author?.verification_state==="verified"&&<span style={{fontSize:10,fontWeight:800,color:"#0891B2",background:"#EFF6FF",padding:"1px 7px",borderRadius:99}}>+ VERIFIED</span>}
                                  <span style={{fontSize:11,fontWeight:700,color:P.accent,background:P.accent2,padding:"1px 8px",borderRadius:99,fontFamily:"'DM Mono',monospace"}}>🔥{authorElo(post)}</span>
                                </div>
                                <div style={{fontSize:11,color:P.ink4}}>{post.author?.keyword||""} · {timeAgo(post.created_at)}</div>
                              </div>
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                              <span style={{padding:"2px 9px",background:pt.bg,borderRadius:99,fontSize:10,fontWeight:800,color:pt.color,letterSpacing:"0.06em"}}>{pt.label}</span>
                              {post.author_id === user?.id && (
                                <button
                                  onClick={() => deletePost(post.id)}
                                  disabled={deletingPost === post.id}
                                  title="Delete post"
                                  style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:P.ink4,padding:"2px 4px",borderRadius:6,lineHeight:1,opacity:deletingPost===post.id?0.4:1}}
                                >
                                  {deletingPost === post.id ? "…" : "🗑"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Content */}
                          <p style={{fontSize:13,color:P.ink2,lineHeight:1.65,margin:"0 0 10px",whiteSpace:"pre-wrap"}}>{post.content}</p>

                          {/* Tags */}
                          {tags.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                            {tags.slice(0,6).map((t,j)=><span key={j} style={{fontSize:11,color:"#0891B2",fontWeight:600,cursor:"pointer"}}>{t.startsWith("#")?t:"#"+t}</span>)}
                          </div>}

                          {/* Action bar */}
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <button className="pb" onClick={()=>handleReact(post.id,"acknowledge")}
                              style={{padding:"5px 12px",border:`1.5px solid ${reacted.acknowledge?"#7C3AED40":P.border}`,borderRadius:8,fontSize:12,color:reacted.acknowledge?"#7C3AED":P.ink3,fontWeight:500,background:reacted.acknowledge?"#F4F0FF":"transparent"}}>
                              👏 {post.acknowledge_count||0}
                            </button>
                            <button className="pb" onClick={()=>toggleComments(post.id)}
                              style={{padding:"5px 12px",border:`1.5px solid ${panel?.open?"#0891B240":P.border}`,borderRadius:8,fontSize:12,color:panel?.open?"#0891B2":P.ink3,fontWeight:500,background:panel?.open?"#EFF6FF":"transparent"}}>
                              💬 {post.comment_count||0}
                            </button>
                            <button className="pb" onClick={()=>handleReact(post.id,"signal")}
                              style={{padding:"5px 12px",border:`1.5px solid ${reacted.signal?"#059669"+"40":P.border}`,borderRadius:8,fontSize:12,color:reacted.signal?"#059669":P.ink3,fontWeight:500,background:reacted.signal?"#ECFDF5":"transparent"}}>
                              ↗ Signal {post.signal_count>0?post.signal_count:""}
                            </button>
                            <button className="pb" onClick={()=>handleReact(post.id,"save")}
                              style={{padding:"5px 12px",border:`1.5px solid ${reacted.save?"#D97706"+"40":P.border}`,borderRadius:8,fontSize:12,color:reacted.save?"#D97706":P.ink3,fontWeight:500,background:reacted.save?"#FFF7ED":"transparent",marginLeft:"auto"}}>
                              {reacted.save?"🔖 Saved":"🔖 Save"}
                            </button>
                          </div>
                        </div>

                        {/* Comment panel */}
                        {panel?.open && (
                          <div style={{borderTop:`1px solid ${P.border}`,background:"rgba(0,0,0,0.015)",padding:"12px 16px"}}>
                            {panel.loading&&<div style={{padding:"10px 0",textAlign:"center"}}><div style={{width:18,height:18,border:`2px solid ${P.accent}33`,borderTopColor:P.accent,borderRadius:"50%",animation:"spin 0.8s linear infinite",margin:"0 auto"}}/></div>}
                            {!panel.loading&&panel.comments?.length===0&&<div style={{fontSize:12,color:P.ink4,marginBottom:10}}>No comments yet. Be first!</div>}
                            {(panel.comments||[]).map((c,ci)=>{
                              const cName = c.author?.display_name||c.author?.name||"User"
                              return (
                                <div key={c.id||ci} style={{display:"flex",gap:8,marginBottom:10}}>
                                  <div style={{width:28,height:28,borderRadius:"50%",background:colorForId(c.author_id||ci.toString()),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>{cName[0]?.toUpperCase()}</div>
                                  <div style={{flex:1,background:"#FFFFFF",borderRadius:8,padding:"8px 10px",border:`1px solid ${P.border}`}}>
                                    <div style={{fontSize:11,fontWeight:700,color:P.ink,marginBottom:2}}>{cName}</div>
                                    <div style={{fontSize:12,color:P.ink2,lineHeight:1.5}}>{c.content}</div>
                                  </div>
                                </div>
                              )
                            })}
                            {/* Add comment */}
                            <div style={{display:"flex",gap:8,marginTop:8}}>
                              <div style={{width:28,height:28,borderRadius:"50%",background:P.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:"#fff",flexShrink:0}}>{initials}</div>
                              <input value={panel.text||""} onChange={e=>updateCommentText(post.id,e.target.value)}
                                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();submitComment(post.id)}}}
                                placeholder="Add a comment... (Enter to send)"
                                style={{flex:1,padding:"7px 12px",border:`1px solid ${P.border}`,borderRadius:8,fontSize:12,fontFamily:"inherit",outline:"none",color:P.ink}}/>
                              <button className="pb" onClick={()=>submitComment(post.id)} disabled={!panel.text?.trim()||panel.submitting}
                                style={{padding:"7px 14px",background:panel.text?.trim()&&!panel.submitting?P.accent:"rgba(0,0,0,0.08)",border:"none",borderRadius:8,color:panel.text?.trim()&&!panel.submitting?"#fff":P.ink4,fontSize:12,fontWeight:700,opacity:panel.submitting?0.7:1}}>
                                {panel.submitting?"...":"Send"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Load more */}
                  {hasMore&&!feedLoading&&(
                    <div style={{padding:"14px",textAlign:"center"}}>
                      <button className="pb" onClick={()=>{const np=page+1;setPage(np);loadFeed(np,true)}}
                        style={{padding:"9px 28px",background:"#FFFFFF",border:`1.5px solid ${P.border}`,borderRadius:99,fontSize:13,fontWeight:600,color:P.ink2}}>
                        Load more posts
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div style={{display:"flex",flexDirection:"column",gap:14,position:"sticky",top:76}}>

            {/* Domain Pulse — live data via Gemini Search */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:16,boxShadow:P.shadow}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{fontSize:10,fontWeight:800,color:P.ink4,letterSpacing:"0.1em",textTransform:"uppercase"}}>DOMAIN PULSE · {domain.toUpperCase()}</div>
                    {marketInsights && <span style={{fontSize:8,fontWeight:800,color:"#34D399",letterSpacing:"0.06em",background:"#34D39918",padding:"1px 5px",borderRadius:99}}>LIVE</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background: marketInsights?.market_outlook==="Growing"?"#34D399":marketInsights?.market_outlook==="Declining"?"#F87171":"#FCD34D"}}/>
                    <span style={{fontSize:13,fontWeight:700,color:P.ink}}>
                      {insightsLoading ? "Loading…" : (marketInsights?.market_outlook || "Steady")}
                    </span>
                  </div>
                </div>
                <button className="pb" onClick={()=>setShowDomainPicker(true)} style={{fontSize:18,color:P.ink4,background:"transparent",border:"none",padding:4}}>⚙</button>
              </div>

              {/* Stats grid */}
              {insightsLoading
                ? <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    {[0,1,2,3].map(i=>(
                      <div key={i} style={{padding:"8px 10px",background:"rgba(0,0,0,0.02)",borderRadius:8}}>
                        <div style={{height:8,background:"#E8E3DA",borderRadius:3,marginBottom:5,width:"60%"}}/>
                        <div style={{height:10,background:"#F3F4F6",borderRadius:3}}/>
                      </div>
                    ))}
                  </div>
                : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                    {[{l:"HIRING",v:stats.hiring,c:"#34D399"},{l:"OPEN ROLES",v:stats.openRoles,c:P.ink2},{l:"AVG SALARY",v:stats.salary,c:P.ink2},{l:"TRENDING",v:stats.trending,c:P.accent}].map((s,i)=>(
                      <div key={i} style={{padding:"8px 10px",background:"rgba(0,0,0,0.02)",borderRadius:8}}>
                        <div style={{fontSize:9,color:P.ink4,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>{s.l}</div>
                        <div style={{fontSize:11,fontWeight:800,color:s.c,fontFamily:"'DM Mono',monospace",overflow:"hidden",wordBreak:"break-word",lineHeight:1.3}}>{s.v}</div>
                      </div>
                    ))}
                  </div>
              }

              {/* Outlook reason from Gemini */}
              {marketInsights?.outlook_reason && (
                <div style={{fontSize:11,color:P.ink3,lineHeight:1.5,marginBottom:10,padding:"6px 8px",background:"rgba(0,0,0,0.02)",borderRadius:6}}>
                  {marketInsights.outlook_reason}
                </div>
              )}

              <div style={{fontSize:10,fontWeight:700,color:P.ink4,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}}>
                {marketInsights ? "RISING SKILLS" : "TRENDING THIS WEEK"}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {trendingTags.map((t,i)=>(
                  <button key={i} className="pb" onClick={()=>setSortTab("signal")}
                    style={{padding:"3px 9px",background:P.accent2,borderRadius:99,border:"none",fontSize:11,fontWeight:600,color:P.accent,cursor:"pointer"}}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* ELO-Matched Builders */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:16,boxShadow:P.shadow}}>
              <div style={{fontSize:10,fontWeight:800,color:P.ink4,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:12}}>ELO-MATCHED BUILDERS</div>
              {builders.length===0 ? (
                <div style={{fontSize:12,color:P.ink4,textAlign:"center",padding:"12px 0"}}>Loading builders...</div>
              ) : builders.map((b,i)=>{
                const bName = b.display_name||b.name||"User"
                const bColor = colorForId(b.id)
                return (
                  <div key={b.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<builders.length-1?`1px solid ${P.border}`:"none"}}>
                    <div style={{width:34,height:34,borderRadius:"50%",background:bColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff",flexShrink:0}}>{bName[0]?.toUpperCase()}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:P.ink2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bName}</div>
                      <div style={{fontSize:10,color:P.ink4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.keyword||b.path||""}</div>
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:P.accent,fontFamily:"'DM Mono',monospace",flexShrink:0}}>🔥{b.elo_rating||400}</span>
                  </div>
                )
              })}
            </div>

            {/* Mentors & Coaches preview */}
            {mentors.length>0&&(
              <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:16,boxShadow:P.shadow}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
                  <div style={{fontSize:10,fontWeight:800,color:P.ink4,letterSpacing:"0.1em",textTransform:"uppercase"}}>MENTORS & COACHES</div>
                  <div style={{width:7,height:7,borderRadius:"50%",background:"#34D399"}}/>
                </div>
                {mentors.slice(0,3).map((m,i)=>{
                  const mName = m.display_name||m.profile?.display_name||m.profile?.name||"Mentor"
                  return (
                    <div key={m.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<Math.min(mentors.length,3)-1?`1px solid ${P.border}`:"none"}}>
                      <div style={{position:"relative"}}>
                        <div style={{width:34,height:34,borderRadius:"50%",background:colorForId(m.user_id||i.toString()),display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:"#fff"}}>{mName[0]?.toUpperCase()}</div>
                        <div style={{position:"absolute",bottom:0,right:0,width:9,height:9,borderRadius:"50%",background:"#34D399",border:"1.5px solid #fff"}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:700,color:P.ink}}>{mName}</div>
                        <div style={{fontSize:10,color:P.ink4}}>{m.headline||"Verified Mentor"}</div>
                      </div>
                      <button className="pb" onClick={()=>setFeedTab("mentors")} style={{padding:"4px 10px",border:`1px solid ${P.border}`,borderRadius:8,fontSize:10,fontWeight:600,color:P.ink2}}>View</button>
                    </div>
                  )
                })}
                <button className="pb" onClick={()=>setFeedTab("mentors")} style={{width:"100%",marginTop:10,padding:"8px",background:P.accent2,border:`1px solid ${P.accent}20`,borderRadius:8,fontSize:12,fontWeight:600,color:P.accent}}>
                  See all mentors →
                </button>
              </div>
            )}

            {/* Network stats */}
            <div style={{background:P.surface,border:`1px solid ${P.border}`,borderRadius:P.r,padding:"12px 16px",boxShadow:P.shadow}}>
              <div style={{display:"flex",justifyContent:"space-around",marginBottom:10}}>
                <button onClick={()=>{setFeedTab("network");setNetworkSubTab("following")}} style={{background:"none",border:"none",cursor:"pointer",textAlign:"center",padding:"4px 8px",borderRadius:8}}>
                  <div style={{fontSize:16,fontWeight:800,color:P.accent,fontFamily:"'DM Mono',monospace"}}>{myFollowing.length}</div>
                  <div style={{fontSize:10,color:P.ink4,fontWeight:600,marginTop:1}}>Following</div>
                </button>
                <div style={{width:1,background:P.border}}/>
                <button onClick={()=>{setFeedTab("network");setNetworkSubTab("followers")}} style={{background:"none",border:"none",cursor:"pointer",textAlign:"center",padding:"4px 8px",borderRadius:8}}>
                  <div style={{fontSize:16,fontWeight:800,color:P.ink,fontFamily:"'DM Mono',monospace"}}>{myFollowers.length}</div>
                  <div style={{fontSize:10,color:P.ink4,fontWeight:600,marginTop:1}}>Followers</div>
                </button>
                <div style={{width:1,background:P.border}}/>
                <div style={{textAlign:"center",padding:"4px 8px"}}>
                  <div style={{fontSize:16,fontWeight:800,color:P.ink,fontFamily:"'DM Mono',monospace"}}>{pendingSparks.length}</div>
                  <div style={{fontSize:10,color:P.ink4,fontWeight:600,marginTop:1}}>Sparks</div>
                </div>
              </div>
            </div>

            {/* User standing card */}
            <div style={{background:`linear-gradient(135deg,${P.accent},#f97316)`,borderRadius:P.r,padding:"14px 16px"}}>
              <div style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",color:"rgba(255,255,255,0.7)",textTransform:"uppercase",marginBottom:6}}>YOUR STANDING</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                {[{l:"ELO",v:elo},{l:"TASKS",v:userData?.arena_completed||0},{l:"STREAK",v:`${userData?.arena_streak||0}d`}].map((s,i)=>(
                  <div key={i} style={{textAlign:"center"}}>
                    <div style={{fontSize:18,fontWeight:800,color:"#fff",fontFamily:"'DM Mono',monospace"}}>{s.v}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,0.7)",fontWeight:700,letterSpacing:"0.08em"}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}


export default function Pulse({ user, userData }) {
  // Route to student-specific page for non-professional paths
  if (userData?.path !== "professional" && userData?.path !== "authority" && userData?.path !== "institution") {
    return <StudentPulse user={user} userData={userData} />
  }

  const [posts,      setPosts]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [offline,    setOffline]    = useState(false)
  const [page,       setPage]       = useState(1)
  const [hasMore,    setHasMore]    = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  const load = useCallback(async (pg=1, append=false) => {
    setLoading(true); setOffline(false)
    try {
      const params = { page:pg, limit:15 }
      if (searchQuery.trim()) params.q = searchQuery.trim()
      const { posts:newPosts, total } = await pulseApi.feed(params)
      setPosts(p => append ? [...p,...(newPosts||[])] : (newPosts||[]))
      setHasMore((pg*15)<(total||0))
    } catch(e) {
      if (e.message?.includes("fetch")||e.message?.includes("network")||e.message?.includes("500")) setOffline(true)
      console.error(e)
    } finally { setLoading(false) }
  }, [searchQuery])

  useEffect(() => { setPage(1); load(1) }, [searchQuery])

  function handleInteract(postId, action, active) {
    const cf = {acknowledge:"acknowledge_count",signal:"signal_count",repost:"repost_count",save:"save_count"}[action]
    if (cf) setPosts(p=>p.map(post=>post.id===postId?{...post,[cf]:(post[cf]||0)+(active?1:-1)}:post))
  }

  return (
    <div style={{ background:T.bg, flex:1, minHeight:0, overflowY:"auto", fontFamily:T.sans, paddingBottom:40 }}>
      <style>{G}</style>

      <div style={{ maxWidth:1128, margin:"0 auto", padding:"20px 16px" }}>
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)", gap:20, alignItems:"start" }}>

          {/* ── Left sidebar ── */}
          <div style={{ position:"sticky", top:72 }}>
            <ProfileSidebar user={user} userData={userData}/>
          </div>

          {/* ── Center feed ── */}
          <div>
            {offline && <OfflinePill />}

            {/* Composer */}
            <Composer user={user} userData={userData} onPosted={post=>setPosts(p=>[post,...p])}/>

            {/* Search bar */}
            <SearchBar value={searchQuery} onChange={v=>{setSearchQuery(v);setPage(1)}}/>

            {/* Feed */}
            {loading && page===1
              ? <>{Array(3).fill(0).map((_,i)=><SkeletonPost key={i}/>)}</>
              : posts.length===0
                ? <EmptyFeed offline={offline}/>
                : posts.map(post=><PostCard key={post.id} post={post} user={user} onInteract={handleInteract}/>)
            }

            {/* Load more */}
            {hasMore&&!loading&&(
              <div style={{ textAlign:"center", paddingTop:8 }}>
                <button onClick={()=>{const np=page+1;setPage(np);load(np,true)}}
                  style={{ padding:"10px 28px", background:T.surface, border:`1.5px solid ${T.border}`, borderRadius:99, fontSize:13, fontWeight:600, color:T.ink2, cursor:"pointer" }}>
                  Load more
                </button>
              </div>
            )}

            {/* Loading more spinner */}
            {loading&&page>1&&<div style={{ padding:20,textAlign:"center" }}><Spin size={24}/></div>}
          </div>

          {/* ── Right sidebar ── */}
          <div style={{ position:"sticky", top:72 }}>
            <RightSidebar user={user} domain={getRoleConfig(userData).label} role={getRoleConfig(userData).label}/>
          </div>

        </div>
      </div>
    </div>
  )
}
