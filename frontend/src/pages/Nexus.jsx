/**
 * Nexus.jsx — Verified professional network with role-aware actions.
 */
import { useState, useEffect, useCallback } from "react"
import { nexusApi, recruiterApi } from "../lib/api"

const T = {
  cream:"#F6F6F1",ink:"#1A1A18",ink2:"#3A3A38",ink3:"#6B6B68",
  indigo:"#3D4EAC",indigo2:"#EEF0FB",green:"#1A7A4A",green2:"#E8F7EF",
  amber:"#B8620A",amber2:"#FDF3E7",purple:"#7C3AED",purple2:"#F4F0FF",
  border:"rgba(26,26,24,0.09)",shadow:"0 2px 12px rgba(26,26,24,0.07)",
}

function ProfileCard({ profile, currentUser, onConnect, onFollow }) {
  const [status, setStatus] = useState(profile.connection_status||"none")
  const [following, setFollowing] = useState(profile.is_following||false)
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgText, setMsgText] = useState("")
  const [sending, setSending] = useState(false)

  const isOwn = currentUser?.id === profile.id
  const VER_LABEL = { fully_trusted:"Trusted",employment_verified:"Verified",unverified:"" }

  async function handleConnect() {
    if (isOwn||status!=="none") return
    try { await nexusApi.connect(profile.id); setStatus("pending") }
    catch(e) { if (!e.message.includes("409")) alert(e.message) }
  }

  async function handleFollow() {
    try {
      if (following) { await nexusApi.unfollow(profile.id); setFollowing(false) }
      else { await nexusApi.follow(profile.id); setFollowing(true) }
    } catch(e) { alert(e.message) }
  }

  async function sendMessage() {
    if (!msgText.trim()) return
    setSending(true)
    try {
      await recruiterApi.sendMessage({ to_user_id:profile.id, body:msgText.trim() })
      setMsgText(""); setMsgOpen(false)
      alert("Message sent!")
    } catch(e) { alert(e.message) }
    finally { setSending(false) }
  }

  const techTags = (profile.skill_graph||[]).slice(0,4).map(s=>typeof s==="string"?s:s.name||"")

  return (
    <div style={{background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:16,overflow:"hidden",boxShadow:T.shadow,transition:"box-shadow .15s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 6px 24px rgba(26,26,24,0.12)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow=T.shadow}>
      {/* Cover + Avatar */}
      <div style={{height:56,background:`linear-gradient(135deg,${T.indigo}22,${T.purple}22)`,position:"relative"}}>
        <div style={{position:"absolute",bottom:-20,left:16,width:48,height:48,borderRadius:"50%",border:"3px solid #fff",overflow:"hidden",background:"#FAF7F2",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {profile.profile_photo_url?<img src={profile.profile_photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:20,fontWeight:800,color:T.indigo}}>{profile.name?.[0]||"?"}</span>}
        </div>
        {profile.is_mentor&&<div style={{position:"absolute",bottom:8,right:12,fontSize:10,background:T.amber2,color:T.amber,padding:"2px 8px",borderRadius:99,fontWeight:700}}>MENTOR</div>}
      </div>
      <div style={{padding:"28px 16px 16px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:1}}>{profile.name||"Professional"}</div>
            {VER_LABEL[profile.verification_state]&&<span style={{fontSize:10,background:T.green2,color:T.green,padding:"1px 6px",borderRadius:99,fontWeight:700}}>✓ {VER_LABEL[profile.verification_state]}</span>}
          </div>
        </div>
        <div style={{fontSize:12,color:T.ink2,marginBottom:4,lineHeight:1.4}}>{profile.headline||profile.current_role_title||""}{profile.current_company?` · ${profile.current_company}`:""}</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
          {techTags.filter(Boolean).map((t,i)=><span key={i} style={{fontSize:10,background:T.indigo2,color:T.indigo,padding:"1px 6px",borderRadius:99}}>{t}</span>)}
        </div>
        {!isOwn&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {status==="none"&&<button onClick={handleConnect} style={{flex:1,padding:"7px",background:T.indigo,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Connect</button>}
            {status==="pending"&&<button disabled style={{flex:1,padding:"7px",background:"#FAF7F2",border:`1px solid ${T.border}`,borderRadius:8,color:T.ink3,fontSize:12}}>Pending</button>}
            {status==="accepted"&&<button onClick={()=>setMsgOpen(v=>!v)} style={{flex:1,padding:"7px",background:T.indigo2,border:`1px solid ${T.indigo}33`,borderRadius:8,color:T.indigo,fontSize:12,fontWeight:700,cursor:"pointer"}}>Message</button>}
            <button onClick={handleFollow} style={{padding:"7px 10px",background:following?T.indigo2:"#FAF7F2",border:`1px solid ${following?T.indigo:T.border}`,borderRadius:8,color:following?T.indigo:T.ink3,fontSize:12,cursor:"pointer"}}>{following?"Following":"Follow"}</button>
          </div>
        )}
        {msgOpen&&(
          <div style={{marginTop:8}}>
            <textarea value={msgText} onChange={e=>setMsgText(e.target.value)} placeholder={`Message ${profile.name||""}…`} rows={2}
              style={{width:"100%",padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:12,resize:"none",fontFamily:"inherit",outline:"none",boxSizing:"border-box",marginBottom:6}}/>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setMsgOpen(false)} style={{flex:1,padding:"6px",background:"#FAF7F2",border:`1px solid ${T.border}`,borderRadius:7,fontSize:12,cursor:"pointer"}}>Cancel</button>
              <button onClick={sendMessage} disabled={sending||!msgText.trim()} style={{flex:2,padding:"6px",background:T.indigo,border:"none",borderRadius:7,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",opacity:sending||!msgText.trim()?0.6:1}}>{sending?"Sending…":"Send"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Nexus({ user, userData, setUserData }) {
  const [tab, setTab]           = useState("discover")
  const [profiles, setProfiles] = useState([])
  const [connections, setConns] = useState([])
  const [notifications, setNotifs] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)

  // 2026-08-09: real candidate-side messaging. Previously a candidate could
  // only see the last 3 recruiter_messages read-only (dead OrbitDashboard.jsx
  // widget) with no reply path anywhere in the product -- messages only ever
  // flowed recruiter -> candidate. This reuses the SAME already-working
  // recruiterApi.messages/sendMessage this file's own ProfileCard already
  // uses for peer-to-peer messaging (recruiter_messages is a generic
  // from_user_id/to_user_id log, not recruiter-specific despite the table
  // name) -- no new backend route needed, just a real UI for it. Threads are
  // grouped client-side by "the other party" since the table has no thread id.
  const [msgThreads, setMsgThreads] = useState([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [activeThreadId, setActiveThreadId] = useState(null)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit:16 }
      if (search.trim()) params.q = search.trim()
      const { profiles:ps, total:t } = await nexusApi.search(params)
      setProfiles(ps||[]); setTotal(t||0)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [search, page])

  useEffect(() => { if(tab==="discover") loadProfiles() }, [tab, loadProfiles])

  useEffect(() => {
    if (tab==="connections") nexusApi.connections().then(d=>setConns(d||[])).catch(()=>{})
    if (tab==="notifications") nexusApi.notifications().then(d=>{ setNotifs(d||[]); nexusApi.markRead() }).catch(()=>{})
  }, [tab])

  const loadMessages = useCallback(async () => {
    setMsgLoading(true)
    try {
      const [inbox, sent] = await Promise.all([
        recruiterApi.messages("inbox"),
        recruiterApi.messages("sent"),
      ])
      const all = [
        ...(inbox||[]).map(m=>({...m, direction:"incoming", counterpartId:m.from_user_id, counterpartName:m.sender_company_name||m.from_user?.name||"A recruiter"})),
        ...(sent||[]).map(m=>({...m, direction:"outgoing", counterpartId:m.to_user_id, counterpartName:m.to_user?.name||"Recipient"})),
      ]
      const byId = new Map()
      for (const m of all) {
        const key = m.counterpartId
        if (!key) continue
        if (!byId.has(key)) byId.set(key, { id:key, name:m.counterpartName, messages:[] })
        // Prefer a real name over the generic fallback once we see one, in
        // either direction (an outgoing row won't have sender_company_name,
        // an incoming one might).
        const thread = byId.get(key)
        if (m.counterpartName && (thread.name==="A recruiter"||thread.name==="Recipient")) thread.name = m.counterpartName
        thread.messages.push(m)
      }
      const threads = [...byId.values()].map(t=>({
        ...t,
        messages: t.messages.sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),
      })).sort((a,b)=>{
        const at = a.messages.at(-1)?.created_at || 0
        const bt = b.messages.at(-1)?.created_at || 0
        return new Date(bt)-new Date(at)
      })
      setMsgThreads(threads)
    } catch(e) { console.error("Failed to load messages:", e) }
    finally { setMsgLoading(false) }
  }, [])

  useEffect(() => { if (tab==="messages") loadMessages() }, [tab, loadMessages])

  async function sendReply() {
    if (!replyText.trim() || !activeThreadId || sendingReply) return
    setSendingReply(true)
    try {
      await recruiterApi.sendMessage({ to_user_id: activeThreadId, body: replyText.trim() })
      setReplyText("")
      await loadMessages()
    } catch(e) { alert(e.message) }
    finally { setSendingReply(false) }
  }

  async function handleRespond(connId, status) {
    try {
      await nexusApi.respond(connId, status)
      setConns(c=>c.map(cn=>cn.id===connId?{...cn,status}:cn))
    } catch(e) { alert(e.message) }
  }

  const pending = connections.filter(c=>c.addressee_id===user?.id&&c.status==="pending")
  const accepted = connections.filter(c=>c.status==="accepted")
  const unread = notifications.filter(n=>!n.is_read).length

  const NOTIF_ICONS = { connection_request:"🤝",connection_accepted:"✅",recruiter_message:"💬",post_acknowledge:"👏",post_signal:"⚡",interview_scheduled:"📅",offer_received:"🎁",booking_request:"📚" }

  return (
    <div style={{background:T.cream,flex:1,minHeight:0,overflowY:"auto",fontFamily:"DM Sans,sans-serif",paddingBottom:100}}>
      <div style={{background:"#FFFFFF",borderBottom:`1px solid ${T.border}`,padding:"16px 24px",position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:1100,margin:"0 auto",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          {[{id:"discover",l:"Discover"},{id:"connections",l:`Connections (${accepted.length})`},{id:"messages",l:`Messages${msgThreads.length>0?` (${msgThreads.length})`:""}`},{id:"notifications",l:`Notifications${unread>0?` (${unread})`:""}`,urgent:unread>0}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 16px",background:tab===t.id?T.indigo:"#FAF7F2",border:`1px solid ${tab===t.id?T.indigo:t.urgent?T.amber:T.border}`,borderRadius:10,color:tab===t.id?"#fff":t.urgent?T.amber:T.ink3,fontSize:13,fontWeight:tab===t.id||t.urgent?700:400,cursor:"pointer"}}>
              {t.l}
            </button>
          ))}
          {tab==="discover"&&(
            <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search by name, role, company…"
              style={{flex:1,minWidth:200,padding:"9px 14px",border:`1px solid ${T.border}`,borderRadius:10,fontSize:13,outline:"none"}}/>
          )}
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"24px 16px"}}>
        {/* Discover */}
        {tab==="discover"&&(
          loading?<div style={{padding:60,textAlign:"center"}}><div style={{width:28,height:28,border:`3px solid ${T.indigo}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>:
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:14}}>
              {profiles.map(p=><ProfileCard key={p.id} profile={p} currentUser={user} onConnect={()=>{}} onFollow={()=>{}}/>)}
            </div>
            {profiles.length===0&&<div style={{textAlign:"center",padding:48,color:T.ink3,fontSize:13}}>No professionals found.</div>}
          </>
        )}

        {/* Connections */}
        {tab==="connections"&&(
          <div>
            {pending.length>0&&(
              <div style={{marginBottom:24}}>
                <div style={{fontSize:13,fontWeight:700,color:T.amber,marginBottom:12}}>⏳ Pending Requests ({pending.length})</div>
                {pending.map(c=>{
                  const other = c.requester_id===user?.id?c.addressee:c.requester
                  return(
                    <div key={c.id} style={{background:"#FFFFFF",border:`1px solid ${T.amber}33`,borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",gap:12,alignItems:"center"}}>
                      <div style={{width:40,height:40,borderRadius:"50%",overflow:"hidden",background:"#FAF7F2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {other?.profile_photo_url?<img src={other.profile_photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontWeight:700,color:T.ink3}}>{other?.name?.[0]||"?"}</span>}
                      </div>
                      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.ink}}>{other?.name||"Unknown"}</div><div style={{fontSize:12,color:T.ink3}}>{other?.headline||""}</div></div>
                      {c.addressee_id===user?.id&&(
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>handleRespond(c.id,"accepted")} style={{padding:"6px 12px",background:T.green,border:"none",borderRadius:8,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>Accept</button>
                          <button onClick={()=>handleRespond(c.id,"rejected")} style={{padding:"6px 12px",background:"#FAF7F2",border:`1px solid ${T.border}`,borderRadius:8,color:T.ink3,fontSize:12,cursor:"pointer"}}>Decline</button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:12}}>Connected ({accepted.length})</div>
            {accepted.length===0?<div style={{textAlign:"center",padding:48,color:T.ink3,fontSize:13}}>No connections yet. Discover professionals and connect.</div>:
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
              {accepted.map(c=>{
                const other = c.requester_id===user?.id?c.addressee:c.requester
                return(
                  <div key={c.id} style={{background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:12,padding:"14px 16px",boxShadow:T.shadow}}>
                    <div style={{width:36,height:36,borderRadius:"50%",overflow:"hidden",background:"#FAF7F2",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}>
                      {other?.profile_photo_url?<img src={other.profile_photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontWeight:700,color:T.ink3}}>{other?.name?.[0]||"?"}</span>}
                    </div>
                    <div style={{fontSize:12,fontWeight:600,color:T.ink}}>{other?.name||"Unknown"}</div>
                    <div style={{fontSize:11,color:T.ink3}}>{other?.headline||other?.current_role_title||""}</div>
                  </div>
                )
              })}
            </div>}
          </div>
        )}

        {/* Messages */}
        {tab==="messages"&&(
          msgLoading?<div style={{padding:60,textAlign:"center"}}><div style={{width:28,height:28,border:`3px solid ${T.indigo}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",display:"inline-block"}}/></div>:
          msgThreads.length===0?<div style={{textAlign:"center",padding:48,color:T.ink3,fontSize:13}}>No messages yet. Recruiters who message you, or connections you message, will show up here.</div>:
          <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div style={{flex:"1 1 260px",minWidth:220,maxWidth:320,background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:12,overflow:"hidden"}}>
              {msgThreads.map(t=>{
                const last = t.messages.at(-1)
                return (
                  <button key={t.id} onClick={()=>setActiveThreadId(t.id)}
                    style={{display:"block",width:"100%",textAlign:"left",padding:"12px 14px",background:activeThreadId===t.id?T.indigo2:"transparent",border:"none",borderBottom:`1px solid ${T.border}`,cursor:"pointer"}}>
                    <div style={{fontSize:13,fontWeight:700,color:T.ink,marginBottom:2}}>{t.name}</div>
                    <div style={{fontSize:11.5,color:T.ink3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{last?.direction==="outgoing"?"You: ":""}{last?.body}</div>
                  </button>
                )
              })}
            </div>
            <div style={{flex:"2 1 360px",minWidth:280,background:"#FFFFFF",border:`1px solid ${T.border}`,borderRadius:12,padding:16,minHeight:320,display:"flex",flexDirection:"column"}}>
              {!activeThreadId?(
                <div style={{margin:"auto",color:T.ink3,fontSize:13}}>Select a conversation to view messages.</div>
              ):(() => {
                const thread = msgThreads.find(t=>t.id===activeThreadId)
                if (!thread) return <div style={{margin:"auto",color:T.ink3,fontSize:13}}>This conversation is no longer available.</div>
                return (
                  <>
                    <div style={{fontSize:14,fontWeight:700,color:T.ink,marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${T.border}`}}>{thread.name}</div>
                    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:12,maxHeight:360}}>
                      {thread.messages.map(m=>(
                        <div key={m.id} style={{alignSelf:m.direction==="outgoing"?"flex-end":"flex-start",maxWidth:"80%",background:m.direction==="outgoing"?T.indigo:"#FAF7F2",color:m.direction==="outgoing"?"#fff":T.ink,borderRadius:12,padding:"8px 12px"}}>
                          {m.subject&&<div style={{fontSize:11,fontWeight:700,marginBottom:2,opacity:0.85}}>{m.subject}</div>}
                          <div style={{fontSize:13,lineHeight:1.5}}>{m.body}</div>
                          <div style={{fontSize:10,opacity:0.7,marginTop:4}}>{new Date(m.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <textarea value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Write a reply…" rows={2}
                        style={{flex:1,padding:"8px 10px",border:`1px solid ${T.border}`,borderRadius:8,fontSize:13,resize:"none",fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                      <button onClick={sendReply} disabled={sendingReply||!replyText.trim()} style={{padding:"0 16px",background:T.indigo,border:"none",borderRadius:8,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer",opacity:sendingReply||!replyText.trim()?0.6:1}}>{sendingReply?"Sending…":"Send"}</button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        )}

        {/* Notifications */}
        {tab==="notifications"&&(
          <div>
            {notifications.length===0?<div style={{textAlign:"center",padding:48,color:T.ink3,fontSize:13}}>No notifications yet.</div>:
            notifications.map(n=>(
              <div key={n.id} style={{background:n.is_read?"#fff":"#FFFAF5",border:`1px solid ${n.is_read?T.border:T.amber+"44"}`,borderRadius:12,padding:"14px 16px",marginBottom:8,display:"flex",gap:12,alignItems:"flex-start"}}>
                <div style={{width:36,height:36,borderRadius:"50%",overflow:"hidden",background:"#FAF7F2",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>
                  {n.actor?.profile_photo_url?<img src={n.actor.profile_photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:(NOTIF_ICONS[n.type]||"🔔")}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:T.ink,marginBottom:2}}>{n.title}</div>
                  <div style={{fontSize:12,color:T.ink2,marginBottom:3}}>{n.body}</div>
                  <div style={{fontSize:11,color:T.ink3}}>{new Date(n.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</div>
                </div>
                {!n.is_read&&<div style={{width:8,height:8,borderRadius:"50%",background:T.amber,flexShrink:0,marginTop:4}}/>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
