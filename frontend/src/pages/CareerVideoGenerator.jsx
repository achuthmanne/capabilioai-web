import { useEffect, useRef, useState, useCallback } from "react"

const API = "https://capabilio-server.onrender.com"
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)
const easeOut  = t => 1 - Math.pow(1 - t, 3)
const easeIn   = t => t * t
const easeBounce = t => { const n1=7.5625, d1=2.75; if(t<1/d1)return n1*t*t; if(t<2/d1)return n1*(t-=1.5/d1)*t+0.75; if(t<2.5/d1)return n1*(t-=2.25/d1)*t+0.9375; return n1*(t-=2.625/d1)*t+0.984375 }

const COLORS = {
  bg:"#030712", bg2:"#0a1628", cyan:"#00D2FF", green:"#78FF9E",
  yellow:"#FFD166", purple:"#B47FFF", pink:"#FF6B9D", orange:"#FF8C69",
  text:"#F0FDFF", dim:"#475569",
}

// Skill → accent color mapping for skill snapshot backgrounds
const SKILL_COLORS = {
  Python:"#3B82F6", SQL:"#F59E0B", Statistics:"#8B5CF6", Machine_Learning:"#EC4899",
  React:"#00D2FF", TypeScript:"#3B82F6", JavaScript:"#FFD166", CSS:"#FF6B9D",
  Docker:"#00B4D8", Kubernetes:"#326CE5", DevOps:"#0EA5E9", Linux:"#F97316",
  default:"#00D2FF",
}
const skillColor = s => SKILL_COLORS[s?.replace(/[&\/\s]+/g,"_")] || SKILL_COLORS.default

const SECTIONS = [
  { id:"intro",      duration:7,  label:"3D Intro"   },
  { id:"stats",      duration:6,  label:"Stats"      },
  { id:"skills",     duration:9,  label:"Skills"     },
  { id:"skillsnap",  duration:9,  label:"Skill Story"},
  { id:"elohistory", duration:7,  label:"ELO Growth" },
  { id:"arena",      duration:8,  label:"Arena"      },
  { id:"portfolio",  duration:7,  label:"Portfolio"  },
  { id:"experience", duration:6,  label:"Experience" },
  { id:"outro",      duration:5,  label:"Outro"      },
]
const TOTAL_DURATION = SECTIONS.reduce((a,s) => a + s.duration, 0)

function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
  if(fill){ctx.fillStyle=fill;ctx.fill()}
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}
}

function renderBg(ctx, W, H, particles) {
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0,0,W,H)
  const g1 = ctx.createRadialGradient(W*.2,H*.3,0,W*.2,H*.3,W*.7)
  g1.addColorStop(0,"rgba(0,210,255,0.07)"); g1.addColorStop(1,"transparent")
  ctx.fillStyle=g1; ctx.fillRect(0,0,W,H)
  const g2 = ctx.createRadialGradient(W*.8,H*.7,0,W*.8,H*.7,W*.6)
  g2.addColorStop(0,"rgba(120,255,158,0.04)"); g2.addColorStop(1,"transparent")
  ctx.fillStyle=g2; ctx.fillRect(0,0,W,H)
  particles.forEach(p => {
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
    ctx.fillStyle=p.col+Math.round(p.a*255).toString(16).padStart(2,"0"); ctx.fill()
  })
}

function renderHUD(ctx, W, H, section, t) {
  ctx.fillStyle="rgba(255,255,255,0.03)"; ctx.fillRect(0,H-60,W,60)
  ctx.fillStyle=COLORS.cyan; ctx.fillRect(0,H-61,W,1)
  const totalT = SECTIONS.slice(0,SECTIONS.findIndex(s=>s.id===section.id))
    .reduce((a,s)=>a+s.duration,0) + t*section.duration
  const prog = totalT/TOTAL_DURATION
  ctx.fillStyle="rgba(0,0,0,0.03)"; ctx.fillRect(0,H-63,W,3)
  const pg=ctx.createLinearGradient(0,0,W,0)
  pg.addColorStop(0,COLORS.cyan); pg.addColorStop(0.5,COLORS.green); pg.addColorStop(1,COLORS.purple)
  ctx.fillStyle=pg; ctx.fillRect(0,H-63,W*prog,3)
  ctx.font="bold 13px 'DM Mono',monospace"; ctx.fillStyle="rgba(255,255,255,0.3)"
  ctx.textAlign="right"; ctx.fillText("Powered by Capabilio",W-24,H-20)
  ctx.font="600 11px 'DM Mono',monospace"; ctx.fillStyle=COLORS.cyan+"88"
  ctx.textAlign="left"; ctx.fillText(section.label.toUpperCase(),24,H-20)
}

// ── 3D Avatar sphere with rotating orbital rings ──────────────────────────────
function render3DAvatar(ctx, cx, cy, t, initial, accentColor) {
  // Outer glow halo
  const halo = ctx.createRadialGradient(cx,cy,40,cx,cy,120)
  halo.addColorStop(0,accentColor+"22"); halo.addColorStop(1,"transparent")
  ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(cx,cy,120,0,Math.PI*2); ctx.fill()

  // 3 orbital rings at different tilts — pure 3D illusion via ellipse
  const rings=[
    { rx:88, ry:28, rot:t*1.1,     col:COLORS.cyan,   alpha:0.55 },
    { rx:88, ry:32, rot:t*0.8+1.2, col:COLORS.green,  alpha:0.35 },
    { rx:78, ry:20, rot:t*1.4+2.5, col:COLORS.purple, alpha:0.3  },
  ]
  rings.forEach(r=>{
    ctx.save(); ctx.globalAlpha=r.alpha; ctx.translate(cx,cy)
    ctx.rotate(r.rot)
    const n=12
    for(let i=0;i<n;i++){
      const a=(i/n)*Math.PI*2, px=Math.cos(a)*r.rx, py=Math.sin(a)*r.ry
      const dotA=0.3+0.7*Math.abs(Math.sin(a+t))
      ctx.globalAlpha=r.alpha*dotA
      ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2); ctx.fillStyle=r.col; ctx.fill()
    }
    ctx.restore()
  })

  // Sphere body
  const sph=ctx.createRadialGradient(cx-18,cy-18,4,cx,cy,58)
  sph.addColorStop(0,"#1e3a5f"); sph.addColorStop(0.6,"#0a1628"); sph.addColorStop(1,"#030712")
  ctx.globalAlpha=1
  ctx.beginPath(); ctx.arc(cx,cy,58,0,Math.PI*2)
  ctx.shadowColor=accentColor; ctx.shadowBlur=30; ctx.fillStyle=sph; ctx.fill(); ctx.shadowBlur=0
  // Sphere border
  ctx.beginPath(); ctx.arc(cx,cy,58,0,Math.PI*2)
  ctx.strokeStyle=accentColor+"55"; ctx.lineWidth=1.5; ctx.stroke()
  // Sphere highlight arc
  ctx.beginPath(); ctx.arc(cx-10,cy-18,38,Math.PI*1.1,Math.PI*1.7)
  ctx.strokeStyle="rgba(0,0,0,0.08)"; ctx.lineWidth=5; ctx.stroke()

  // Initial letter
  ctx.font=`900 40px 'Syne',sans-serif`; ctx.fillStyle=accentColor
  ctx.textAlign="center"; ctx.textBaseline="middle"
  ctx.shadowColor=accentColor; ctx.shadowBlur=20
  ctx.fillText((initial||"P").charAt(0).toUpperCase(), cx, cy)
  ctx.shadowBlur=0; ctx.textBaseline="alphabetic"
}

// ── 3D perspective name text ────────────────────────────────────────────────
function render3DText(ctx, text, x, y, size, color, depth=5) {
  ctx.font=`900 ${size}px 'Syne',sans-serif`; ctx.textAlign="center"
  // Shadow layers for depth
  for(let i=depth;i>0;i--){
    ctx.fillStyle=`rgba(0,0,0,${0.18*(1-i/depth)})`
    ctx.fillText(text, x+i*0.9, y+i*0.6)
  }
  ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=22
  ctx.fillText(text, x, y); ctx.shadowBlur=0
}

function renderIntro(ctx,W,H,t,name,role,elo) {
  const avatarX=W*.3, avatarY=H*.46
  const textX=W*.62, textStartY=H*.28

  // ── Phase 1 (0–0.25): avatar sphere drops in ──
  const avatarT=easeOut(clamp(t*4,0,1))
  const avatarOffY=(1-avatarT)*-120
  ctx.globalAlpha=avatarT
  render3DAvatar(ctx, avatarX, avatarY+avatarOffY, t, name, COLORS.cyan)

  // Connecting line from avatar to text
  ctx.globalAlpha=easeOut(clamp((t-.2)*3.5,0,1))*0.25
  ctx.beginPath(); ctx.moveTo(avatarX+62, avatarY+avatarOffY)
  ctx.lineTo(textX-20, textStartY+14)
  ctx.strokeStyle=COLORS.cyan; ctx.lineWidth=1; ctx.setLineDash([4,8]); ctx.stroke(); ctx.setLineDash([])

  // ── Phase 2 (0.15–0.45): VERIFIED badge ──
  const badgeT=easeOut(clamp((t-.15)*4,0,1))
  ctx.globalAlpha=badgeT
  roundRect(ctx, textX-120, textStartY-36, 240, 26, 13, "rgba(120,255,158,0.08)", "rgba(120,255,158,0.25)")
  ctx.font="700 10px 'DM Mono',monospace"; ctx.fillStyle=COLORS.green; ctx.textAlign="center"
  ctx.fillText("● SKILL-TESTED · CAPABILIO VERIFIED", textX, textStartY-19)

  // ── Phase 3 (0.25–0.55): 3D name with depth layers ──
  const nameT=easeOut(clamp((t-.25)*3.5,0,1))
  ctx.globalAlpha=nameT
  const nameY=textStartY+30+(1-nameT)*22
  render3DText(ctx, name.split(" ")[0], textX, nameY, 54, COLORS.text, 6)
  // Last name on second line
  const lastName=name.split(" ").slice(1).join(" ")
  if(lastName){
    const lastT=easeOut(clamp((t-.32)*3.5,0,1))
    ctx.globalAlpha=lastT
    render3DText(ctx, lastName, textX, nameY+52, 54, COLORS.text, 6)
  }

  // ── Phase 4 (0.42–0.65): Role title ──
  const roleT=easeOut(clamp((t-.42)*4,0,1))
  ctx.globalAlpha=roleT
  const roleY=textStartY+(lastName?145:95)
  ctx.font="700 22px 'Syne',sans-serif"; ctx.fillStyle=COLORS.cyan
  ctx.textAlign="center"; ctx.shadowColor=COLORS.cyan; ctx.shadowBlur=12
  ctx.fillText(role, textX, roleY); ctx.shadowBlur=0

  // ── Phase 5 (0.55–0.75): ELO badge ──
  const eloT=easeOut(clamp((t-.55)*4.5,0,1))
  ctx.globalAlpha=eloT
  const eloY=roleY+44
  roundRect(ctx, textX-85, eloY-22, 170, 36, 18, "rgba(120,255,158,0.1)", "rgba(120,255,158,0.3)")
  ctx.font="800 15px 'DM Mono',monospace"; ctx.fillStyle=COLORS.green; ctx.textAlign="center"
  ctx.fillText("⚡ ELO "+elo+" · Skill-Tested", textX, eloY+1)

  // ── Phase 6 (0.7–1.0): floating domain tags ──
  const tags=["Verified Skills","Real Challenges","AI Reviewed","Arena Ranked"]
  tags.forEach((tag,i)=>{
    const tagT=easeOut(clamp((t-.7-i*.05)*4,0,1))
    const tx=textX-130+i*70, ty=eloY+42+Math.sin(t*2+i)*4
    ctx.globalAlpha=tagT*0.7
    roundRect(ctx, tx-30, ty-11, 60, 21, 10, "rgba(0,210,255,0.07)", "rgba(0,210,255,0.2)")
    ctx.font="600 8px 'DM Mono',monospace"; ctx.fillStyle=COLORS.cyan; ctx.textAlign="center"
    ctx.fillText(tag, tx, ty+4)
  })

  ctx.globalAlpha=1; ctx.textAlign="left"
}

function renderStats(ctx,W,H,t,elo,tasks,avg,skillCount) {
  ctx.font="800 30px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="center"
  ctx.shadowColor=COLORS.cyan; ctx.shadowBlur=15; ctx.fillText("Performance Overview",W/2,78); ctx.shadowBlur=0
  const cards=[
    {label:"ELO Rating",value:elo,suffix:"",col:COLORS.green,icon:"⚡"},
    {label:"Tasks Solved",value:tasks,suffix:"",col:COLORS.cyan,icon:"✅"},
    {label:"Average Score",value:avg,suffix:"%",col:COLORS.yellow,icon:"📊"},
    {label:"Skills Assessed",value:skillCount,suffix:"",col:COLORS.purple,icon:"🎯"},
  ]
  cards.forEach((c,i)=>{
    const col=i%2, row=Math.floor(i/2), cw=268,ch=165,gap=24
    const x=W/2-((cw*2+gap)/2)+col*(cw+gap), y=108+row*(ch+18)
    const ct=easeOut(clamp((t-i*.12)*3,0,1)); ctx.globalAlpha=ct
    roundRect(ctx,x,y+( 1-ct)*20,cw,ch,16,c.col+"14",c.col+"32")
    const stripe=ctx.createLinearGradient(x,0,x+cw,0)
    stripe.addColorStop(0,c.col); stripe.addColorStop(1,c.col+"00")
    ctx.fillStyle=stripe; ctx.fillRect(x,y+(1-ct)*20,cw,3)
    ctx.font="28px sans-serif"; ctx.textAlign="center"
    ctx.fillText(c.icon,x+cw/2,y+(1-ct)*20+50)
    ctx.font="900 40px 'DM Mono',monospace"; ctx.fillStyle=c.col
    ctx.shadowColor=c.col; ctx.shadowBlur=16
    ctx.fillText(Math.round(c.value*ct)+c.suffix,x+cw/2,y+(1-ct)*20+102); ctx.shadowBlur=0
    ctx.font="600 11px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.fillText(c.label.toUpperCase(),x+cw/2,y+(1-ct)*20+128)
  })
  ctx.globalAlpha=1; ctx.textAlign="left"
}

function renderSkills(ctx,W,H,t,skills) {
  if(!skills||!skills.length)return
  ctx.font="800 30px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="center"
  ctx.shadowColor=COLORS.purple; ctx.shadowBlur=15; ctx.fillText("Skill Profile",W/2,70); ctx.shadowBlur=0
  const top=skills.slice(0,8), cx=W*.33, cy=H*.52, rad=155, sides=top.length
  for(let ring=1;ring<=4;ring++){
    ctx.beginPath()
    for(let i=0;i<sides;i++){const a=(i/sides)*Math.PI*2-Math.PI/2,r=(rad*ring)/4;i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)}
    ctx.closePath(); ctx.strokeStyle="rgba(0,0,0,0.03)"; ctx.lineWidth=1; ctx.stroke()
  }
  top.forEach((_,i)=>{
    const a=(i/sides)*Math.PI*2-Math.PI/2
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*rad,cy+Math.sin(a)*rad)
    ctx.strokeStyle="rgba(0,0,0,0.03)"; ctx.lineWidth=1; ctx.stroke()
  })
  const rt=easeOut(clamp(t*2,0,1))
  ctx.beginPath()
  top.forEach((s,i)=>{const a=(i/sides)*Math.PI*2-Math.PI/2,r=(s.percentage/100)*rad*rt;i===0?ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r):ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r)})
  ctx.closePath()
  const rg=ctx.createRadialGradient(cx,cy,0,cx,cy,rad)
  rg.addColorStop(0,"rgba(0,210,255,0.3)"); rg.addColorStop(1,"rgba(0,210,255,0.05)")
  ctx.fillStyle=rg; ctx.fill(); ctx.strokeStyle=COLORS.cyan; ctx.lineWidth=2; ctx.stroke()
  top.forEach((s,i)=>{
    const a=(i/sides)*Math.PI*2-Math.PI/2,r=(s.percentage/100)*rad*rt
    ctx.beginPath(); ctx.arc(cx+Math.cos(a)*r,cy+Math.sin(a)*r,4,0,Math.PI*2)
    ctx.fillStyle=COLORS.cyan; ctx.shadowColor=COLORS.cyan; ctx.shadowBlur=8; ctx.fill(); ctx.shadowBlur=0
    ctx.font="600 10px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim; ctx.textAlign="center"
    ctx.fillText(s.skill.slice(0,14),cx+Math.cos(a)*(rad+26),cy+Math.sin(a)*(rad+26))
  })
  const BCOLS=[COLORS.cyan,COLORS.green,COLORS.yellow,COLORS.purple,COLORS.pink,COLORS.orange]
  const bx=W*.6, bw=W*.32
  top.slice(0,6).forEach((s,i)=>{
    const bt=easeOut(clamp((t-i*.08)*3,0,1)); ctx.globalAlpha=bt
    const y=110+i*64,col=BCOLS[i%BCOLS.length]
    ctx.font="700 13px 'DM Mono',monospace"; ctx.textAlign="left"; ctx.fillStyle=COLORS.text
    ctx.fillText(s.skill.slice(0,24),bx,y)
    ctx.font="800 13px 'DM Mono',monospace"; ctx.textAlign="right"; ctx.fillStyle=col
    ctx.fillText(s.percentage+"%",bx+bw,y)
    roundRect(ctx,bx,y+8,bw,8,4,"rgba(0,0,0,0.03)",null)
    roundRect(ctx,bx,y+8,bw*(s.percentage/100)*bt,8,4,col,null)
    ctx.shadowColor=col; ctx.shadowBlur=5
    roundRect(ctx,bx,y+8,bw*(s.percentage/100)*bt,8,4,col,null); ctx.shadowBlur=0
  })
  ctx.globalAlpha=1; ctx.textAlign="left"
}

function renderArena(ctx,W,H,t,completedTasks) {
  ctx.font="800 30px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="center"
  ctx.shadowColor=COLORS.yellow; ctx.shadowBlur=15; ctx.fillText("Arena Performance",W/2,70); ctx.shadowBlur=0
  if(!completedTasks||!completedTasks.length){
    ctx.font="600 16px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.fillText("No tasks completed yet",W/2,H/2); ctx.textAlign="left"; return
  }
  const DIFF={Easy:COLORS.green,Medium:COLORS.yellow,Hard:COLORS.pink,easy:COLORS.green,medium:COLORS.yellow,hard:COLORS.pink}
  completedTasks.slice(0,5).forEach(({task,submission},i)=>{
    const ct=easeOut(clamp((t-i*.1)*3,0,1)); ctx.globalAlpha=ct
    const y=100+i*90,score=submission?.score||0,col=DIFF[task.difficulty]||COLORS.cyan
    roundRect(ctx,50,y,W-100,76,12,"rgba(8,15,30,0.88)",col+"24")
    ctx.font="800 11px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim; ctx.textAlign="left"
    ctx.fillText(String(i+1).padStart(2,"0"),72,y+28)
    roundRect(ctx,100,y+14,58,18,9,col+"1a",col+"44")
    ctx.font="700 9px 'DM Mono',monospace"; ctx.fillStyle=col; ctx.textAlign="center"
    ctx.fillText((task.difficulty||"").toUpperCase(),129,y+27)
    ctx.font="700 14px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="left"
    ctx.fillText((task.title||"Arena Task").slice(0,52),174,y+28)
    ctx.font="600 11px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.fillText(task.type||"",174,y+50)
    const rx=W-108,ry=y+38
    ctx.beginPath(); ctx.arc(rx,ry,26,0,Math.PI*2); ctx.strokeStyle="rgba(0,0,0,0.03)"; ctx.lineWidth=4; ctx.stroke()
    ctx.beginPath(); ctx.arc(rx,ry,26,-Math.PI/2,-Math.PI/2+(score/100)*Math.PI*2*ct)
    ctx.strokeStyle=col; ctx.lineWidth=4; ctx.shadowColor=col; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0
    ctx.font="800 13px 'DM Mono',monospace"; ctx.fillStyle=col; ctx.textAlign="center"; ctx.fillText(score,rx,ry+5)
    if(submission?.eloGained>0){ctx.font="700 10px 'DM Mono',monospace"; ctx.fillStyle=COLORS.green; ctx.fillText("+"+submission.eloGained+" ELO",rx,ry+58)}
  })
  ctx.globalAlpha=1; ctx.textAlign="left"
}

function renderExperience(ctx,W,H,t,experiences) {
  ctx.font="800 30px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="center"
  ctx.shadowColor=COLORS.purple; ctx.shadowBlur=15; ctx.fillText("Career Journey",W/2,70); ctx.shadowBlur=0
  if(!experiences||!experiences.length){
    ctx.font="600 16px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.textAlign="center"; ctx.fillText("No experience added yet",W/2,H/2); ctx.textAlign="left"; return
  }
  const NODE_COLS=[COLORS.cyan,COLORS.green,COLORS.yellow,COLORS.purple,COLORS.pink]
  const sx=100,sy=110
  const st=easeOut(clamp(t*2,0,1))
  const sh=Math.min(experiences.length,4)*112
  ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx,sy+sh*st)
  const sg=ctx.createLinearGradient(0,sy,0,sy+sh)
  sg.addColorStop(0,COLORS.cyan+"88"); sg.addColorStop(1,COLORS.purple+"22")
  ctx.strokeStyle=sg; ctx.lineWidth=2; ctx.stroke()
  experiences.slice(0,4).forEach((exp,i)=>{
    const ct=easeOut(clamp((t-i*.15)*3,0,1)); ctx.globalAlpha=ct
    const y=sy+i*112,col=NODE_COLS[i%NODE_COLS.length]
    ctx.beginPath(); ctx.arc(sx,y+22,8,0,Math.PI*2)
    ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=12; ctx.fill(); ctx.shadowBlur=0
    ctx.beginPath(); ctx.moveTo(sx+8,y+22); ctx.lineTo(sx+40,y+22)
    ctx.strokeStyle=col+"66"; ctx.lineWidth=1.5; ctx.stroke()
    roundRect(ctx,sx+40,y,W-sx-80,92,12,"rgba(8,15,30,0.9)",col+"2a")
    ctx.fillStyle=col; ctx.fillRect(sx+40,y,W-sx-80,3)
    ctx.font="800 15px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="left"
    ctx.fillText((exp.title||"Role").slice(0,40),sx+60,y+28)
    ctx.font="700 13px 'DM Mono',monospace"; ctx.fillStyle=col
    ctx.fillText(exp.company||"",sx+60,y+50)
    ctx.font="500 11px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.fillText((exp.start_year||"")+" → "+(exp.current?"Present":(exp.end_year||"")),sx+60,y+70)
    if(exp.verified){
      roundRect(ctx,W-162,y+12,82,18,9,"rgba(120,255,158,0.1)","rgba(120,255,158,0.3)")
      ctx.font="700 9px 'DM Mono',monospace"; ctx.fillStyle=COLORS.green; ctx.textAlign="center"
      ctx.fillText("✓ VERIFIED",W-121,y+25); ctx.textAlign="left"
    }
  })
  ctx.globalAlpha=1; ctx.textAlign="left"
}

function renderOutro(ctx,W,H,t,name,role,elo) {
  for(let r=0;r<3;r++){
    const p=(t*.5+r*.33)%1
    ctx.beginPath(); ctx.arc(W/2,H/2,80+p*200,0,Math.PI*2)
    ctx.strokeStyle=`rgba(0,210,255,${.15*(1-p)})`; ctx.lineWidth=1; ctx.stroke()
  }
  const mt=easeOut(clamp(t*3,0,1)); ctx.globalAlpha=mt
  ctx.font="700 14px 'DM Mono',monospace"; ctx.fillStyle=COLORS.cyan; ctx.textAlign="center"
  ctx.fillText("Open to New Opportunities",W/2,H/2-105)
  ctx.font="900 52px 'Syne',sans-serif"; ctx.shadowColor=COLORS.cyan; ctx.shadowBlur=28
  ctx.fillStyle=COLORS.text; ctx.fillText(name,W/2,H/2-32); ctx.shadowBlur=0
  ctx.font="700 22px 'Syne',sans-serif"; ctx.fillStyle=COLORS.cyan; ctx.fillText(role,W/2,H/2+22)
  roundRect(ctx,W/2-90,H/2+50,180,38,19,"rgba(120,255,158,0.1)","rgba(120,255,158,0.3)")
  ctx.font="800 14px 'DM Mono',monospace"; ctx.fillStyle=COLORS.green
  ctx.fillText("ELO "+elo+" · Top Performer",W/2,H/2+76)
  ctx.font="600 12px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
  ctx.fillText("capabilio.app",W/2,H/2+132)
  ctx.globalAlpha=1; ctx.textAlign="left"
}

function renderEloHistory(ctx,W,H,t,eloHistory,currentElo) {
  ctx.font="800 30px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="center"
  ctx.shadowColor=COLORS.cyan; ctx.shadowBlur=15
  ctx.fillText("ELO Growth Journey",W/2,70); ctx.shadowBlur=0

  // Build history points
  const history = eloHistory && eloHistory.length > 0
    ? eloHistory.filter(h=>h.elo||h.delta).slice(-12)
    : [{elo:800},{elo:850},{elo:900},{elo:880},{elo:950},{elo:1020},{elo:980},{elo:1100},{elo:1180},{elo:currentElo}]

  // Normalize ELO values
  const elos = history.map((h,i)=>{
    if(h.elo) return h.elo
    // reconstruct from deltas
    let base = 800
    for(let j=0;j<=i;j++) base += (history[j].delta||0)
    return base
  })

  const minElo = Math.min(...elos) - 50
  const maxElo = Math.max(...elos) + 50
  const chartX = 80, chartY = 110, chartW = W-160, chartH = H-240

  // Grid lines
  for(let i=0;i<=4;i++){
    const y = chartY + chartH - (i/4)*chartH
    const eloVal = Math.round(minElo + (i/4)*(maxElo-minElo))
    ctx.strokeStyle="rgba(0,0,0,0.03)"; ctx.lineWidth=1
    ctx.setLineDash([4,8])
    ctx.beginPath(); ctx.moveTo(chartX,y); ctx.lineTo(chartX+chartW,y); ctx.stroke()
    ctx.setLineDash([])
    ctx.font="600 10px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.textAlign="right"; ctx.fillText(eloVal,chartX-8,y+4)
  }

  // Animated line
  const rt = easeOut(clamp(t*1.5,0,1))
  const drawCount = Math.max(2, Math.floor(elos.length * rt))
  const pts = elos.slice(0,drawCount).map((e,i)=>({
    x: chartX + (i/(elos.length-1))*chartW,
    y: chartY + chartH - ((e-minElo)/(maxElo-minElo))*chartH
  }))

  // Gradient fill under line
  if(pts.length > 1){
    ctx.beginPath()
    ctx.moveTo(pts[0].x, chartY+chartH)
    pts.forEach(p=>ctx.lineTo(p.x,p.y))
    ctx.lineTo(pts[pts.length-1].x, chartY+chartH)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0,chartY,0,chartY+chartH)
    grad.addColorStop(0,"rgba(0,210,255,0.2)")
    grad.addColorStop(1,"rgba(0,210,255,0.01)")
    ctx.fillStyle=grad; ctx.fill()

    // Line
    ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y)
    for(let i=1;i<pts.length;i++){
      const cp1x=(pts[i-1].x+pts[i].x)/2, cp1y=pts[i-1].y
      const cp2x=(pts[i-1].x+pts[i].x)/2, cp2y=pts[i].y
      ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,pts[i].x,pts[i].y)
    }
    ctx.strokeStyle=COLORS.cyan; ctx.lineWidth=3
    ctx.shadowColor=COLORS.cyan; ctx.shadowBlur=8; ctx.stroke(); ctx.shadowBlur=0

    // Dots
    pts.forEach((p,i)=>{
      ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2)
      ctx.fillStyle=COLORS.cyan; ctx.shadowColor=COLORS.cyan; ctx.shadowBlur=6
      ctx.fill(); ctx.shadowBlur=0
    })

    // Current ELO badge at end
    const last = pts[pts.length-1]
    roundRect(ctx,last.x-50,last.y-44,100,28,14,COLORS.cyan+"22",COLORS.cyan+"66")
    ctx.font="800 14px 'DM Mono',monospace"; ctx.fillStyle=COLORS.cyan
    ctx.textAlign="center"; ctx.fillText("ELO "+currentElo,last.x,last.y-26)
  }

  // Tier labels
  const TIERS=[{elo:800,label:"Beginner",col:"#6366f1"},{elo:1000,label:"Developing",col:COLORS.yellow},
    {elo:1200,label:"Proficient",col:COLORS.cyan},{elo:1500,label:"Expert",col:COLORS.green}]
  TIERS.forEach(tier=>{
    if(tier.elo >= minElo && tier.elo <= maxElo){
      const y = chartY + chartH - ((tier.elo-minElo)/(maxElo-minElo))*chartH
      ctx.strokeStyle=tier.col+"33"; ctx.lineWidth=1; ctx.setLineDash([2,6])
      ctx.beginPath(); ctx.moveTo(chartX,y); ctx.lineTo(chartX+chartW,y); ctx.stroke()
      ctx.setLineDash([])
      ctx.font="600 9px 'DM Mono',monospace"; ctx.fillStyle=tier.col
      ctx.textAlign="left"; ctx.fillText(tier.label,chartX+4,y-4)
    }
  })

  ctx.textAlign="left"
}

function renderPortfolio(ctx,W,H,t,tasks) {
  ctx.font="800 30px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="center"
  ctx.shadowColor=COLORS.yellow; ctx.shadowBlur=15
  ctx.fillText("Portfolio Highlights",W/2,70); ctx.shadowBlur=0

  if(!tasks||!tasks.length){
    ctx.font="600 16px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.fillText("Complete Arena tasks to build your portfolio",W/2,H/2)
    ctx.textAlign="left"; return
  }

  const DIFF={Easy:COLORS.green,Medium:COLORS.yellow,Hard:COLORS.pink,
    easy:COLORS.green,medium:COLORS.yellow,hard:COLORS.pink}
  const showTasks = tasks.slice(0,3)

  showTasks.forEach(({task,submission},i)=>{
    const ct = easeOut(clamp((t-i*.15)*2.5,0,1))
    ctx.globalAlpha = ct
    const cardH = 155, gap = 16
    const y = 100 + i*(cardH+gap)
    const score = submission?.score||0
    const col = DIFF[task?.difficulty]||COLORS.cyan

    // Card background
    roundRect(ctx,50,y+(1-ct)*20,W-100,cardH,14,"rgba(8,15,30,0.92)",col+"30")
    // Top accent line
    ctx.fillStyle=col; ctx.fillRect(50,y+(1-ct)*20,W-100,3)

    // Left: task info
    roundRect(ctx,70,y+(1-ct)*20+18,70,20,10,col+"18",col+"44")
    ctx.font="700 9px 'DM Mono',monospace"; ctx.fillStyle=col; ctx.textAlign="center"
    ctx.fillText((task?.difficulty||"").toUpperCase(),105,y+(1-ct)*20+32)

    ctx.font="700 15px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="left"
    ctx.fillText((task?.title||"Arena Task").slice(0,48),155,y+(1-ct)*20+32)

    ctx.font="500 11px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.fillText((task?.category||task?.type||"Task")+" · "+(submission?.submittedAt ? new Date(submission.submittedAt).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : ""),155,y+(1-ct)*20+52)

    // Scenario snippet
    const scenario = task?.scenario||task?.description||""
    if(scenario){
      ctx.font="400 11px 'DM Mono',monospace"; ctx.fillStyle="rgba(240,253,255,0.45)"
      const words = scenario.split(" "), lines = [], line = []
      words.forEach(w=>{
        line.push(w)
        if(line.join(" ").length > 72){lines.push(line.join(" ")); line.length=0}
      })
      if(line.length) lines.push(line.join(" "))
      lines.slice(0,2).forEach((l,li)=>ctx.fillText(l,155,y+(1-ct)*20+70+li*16))
    }

    // AI feedback snippet
    const feedback = submission?.summary||submission?.feedback||""
    if(feedback){
      roundRect(ctx,155,y+(1-ct)*20+108,W-220,30,8,"rgba(0,210,255,0.05)","rgba(0,210,255,0.12)")
      ctx.font="500 10px 'DM Mono',monospace"; ctx.fillStyle="rgba(0,210,255,0.7)"
      ctx.fillText("AI: "+feedback.slice(0,85)+(feedback.length>85?"...":""),163,y+(1-ct)*20+127)
    }

    // Score ring (right side)
    const rx = W-90, ry = y+(1-ct)*20+72
    ctx.beginPath(); ctx.arc(rx,ry,30,0,Math.PI*2)
    ctx.strokeStyle="rgba(0,0,0,0.03)"; ctx.lineWidth=5; ctx.stroke()
    ctx.beginPath(); ctx.arc(rx,ry,30,-Math.PI/2,-Math.PI/2+(score/100)*Math.PI*2*ct)
    ctx.strokeStyle=col; ctx.lineWidth=5
    ctx.shadowColor=col; ctx.shadowBlur=10; ctx.stroke(); ctx.shadowBlur=0
    ctx.font="900 16px 'DM Mono',monospace"; ctx.fillStyle=col
    ctx.textAlign="center"; ctx.fillText(score,rx,ry+6)
    ctx.font="600 9px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.fillText("SCORE",rx,ry+22)

    // ELO gained
    if(submission?.eloDelta>0||submission?.eloGained>0){
      const elo = submission?.eloDelta||submission?.eloGained||0
      ctx.font="700 11px 'DM Mono',monospace"; ctx.fillStyle=COLORS.green
      ctx.textAlign="center"; ctx.fillText("+"+elo+" ELO",rx,ry+44)
    }
  })

  ctx.globalAlpha=1; ctx.textAlign="left"
}

// ── Skill Snapshot Cards — user explaining with match-background ──────────────
function renderSkillSnap(ctx,W,H,t,skills,completedTasks,role) {
  const topSkills=skills.slice(0,4)
  if(!topSkills.length){ ctx.font="600 16px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim; ctx.textAlign="center"; ctx.fillText("Complete Arena tasks to build skill story",W/2,H/2); ctx.textAlign="left"; return }

  // Rotating focus: show one skill at a time over 9 seconds
  const cycleT = t        // 0→1 over section
  const skillIdx = Math.min(Math.floor(cycleT*topSkills.length), topSkills.length-1)
  const s = topSkills[skillIdx]
  const intraT = (cycleT*topSkills.length) % 1   // 0→1 within each skill slot
  const slideT = easeOut(clamp(intraT*4,0,1))
  const col = skillColor(s.skill)

  // Contextual tinted background panel
  const bgGrad=ctx.createLinearGradient(0,0,W,H)
  bgGrad.addColorStop(0,col+"08"); bgGrad.addColorStop(1,"transparent")
  ctx.fillStyle=bgGrad; ctx.fillRect(0,0,W,H)

  // Section header
  ctx.globalAlpha=easeOut(clamp(t*5,0,1))
  ctx.font="800 26px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text; ctx.textAlign="center"
  ctx.shadowColor=col; ctx.shadowBlur=14; ctx.fillText("Skill Story",W/2,56); ctx.shadowBlur=0

  // Progress dots — which skill we're on
  topSkills.forEach((_,i)=>{
    const dx=W/2-(topSkills.length-1)*16+i*32, dy=80
    ctx.beginPath(); ctx.arc(dx,dy,i===skillIdx?5:3,0,Math.PI*2)
    ctx.fillStyle=i===skillIdx?col:"rgba(255,255,255,0.2)"; ctx.fill()
  })

  // Main skill snapshot card
  const cw=680, ch=380, cx=W/2-cw/2, cy=H/2-ch/2+10
  ctx.globalAlpha=slideT

  // Card tinted background
  const cg=ctx.createLinearGradient(cx,cy,cx+cw,cy+ch)
  cg.addColorStop(0,"rgba(8,15,30,0.97)"); cg.addColorStop(1,col+"18")
  roundRect(ctx,cx+(1-slideT)*30,cy,cw,ch,18,null,null)
  ctx.fillStyle=cg; ctx.fill()
  // Card border with skill color
  roundRect(ctx,cx+(1-slideT)*30,cy,cw,ch,18,null,col+"44")
  ctx.strokeStyle=col+"44"; ctx.lineWidth=1.5; ctx.stroke()
  // Top accent stripe
  ctx.fillStyle=col; ctx.fillRect(cx+(1-slideT)*30, cy, cw, 3)

  const ox=cx+(1-slideT)*30  // animated x

  // ── Left panel: skill identity ──
  const lx=ox+30, lw=220

  // Skill icon circle
  const iconR=32
  ctx.beginPath(); ctx.arc(lx+iconR,cy+55,iconR,0,Math.PI*2)
  ctx.fillStyle=col+"22"; ctx.fill()
  ctx.strokeStyle=col+"55"; ctx.lineWidth=1.5; ctx.stroke()
  ctx.font="22px sans-serif"; ctx.textAlign="center"; ctx.fillText(
    ["Python","SQL","Machine Learning"].includes(s.skill)?"🐍":
    s.skill.includes("SQL")?"🗄️":s.skill.includes("React")?"⚛️":
    s.skill.includes("Docker")?"🐳":s.skill.includes("Data")?"📊":
    s.skill.includes("Security")?"🛡️":"🎯",
    lx+iconR,cy+63
  )

  ctx.textAlign="left"; ctx.font="800 18px 'Syne',sans-serif"; ctx.fillStyle=col
  ctx.fillText(s.skill,lx,cy+120)
  ctx.font="600 11px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
  ctx.fillText(role+" Skill",lx,cy+140)

  // Score arc
  const arcR=42, arcCx=lx+54, arcCy=cy+230
  ctx.beginPath(); ctx.arc(arcCx,arcCy,arcR,0,Math.PI*2); ctx.strokeStyle="rgba(0,0,0,0.03)"; ctx.lineWidth=6; ctx.stroke()
  const arcAngle=-Math.PI/2 + (s.percentage/100)*Math.PI*2*slideT
  ctx.beginPath(); ctx.arc(arcCx,arcCy,arcR,-Math.PI/2,arcAngle)
  ctx.strokeStyle=col; ctx.lineWidth=6; ctx.shadowColor=col; ctx.shadowBlur=10; ctx.stroke(); ctx.shadowBlur=0
  ctx.font="900 20px 'DM Mono',monospace"; ctx.fillStyle=col; ctx.textAlign="center"; ctx.fillText(s.percentage+"%",arcCx,arcCy+7)
  ctx.font="600 9px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim; ctx.fillText("PROFICIENCY",arcCx,arcCy+22)

  // ── Right panel: skill snapshot content ──
  const rx=ox+280, rw=380
  // Find a related completed task for this skill
  const relatedTask=(completedTasks||[]).find(({task})=>(task?.skill||task?.category||"").toLowerCase().includes((s.skill||"").toLowerCase().slice(0,5)))
               ||(completedTasks||[])[skillIdx]
  const task=relatedTask?.task, sub=relatedTask?.submission

  ctx.textAlign="left"; ctx.font="700 11px 'DM Mono',monospace"; ctx.fillStyle="rgba(0,0,0,0.12)"
  ctx.fillText("ARENA EVIDENCE",rx,cy+38)

  if(task) {
    // Task card
    roundRect(ctx,rx,cy+48,rw-30,70,10,"rgba(0,0,0,0.02)","rgba(0,0,0,0.05)")
    const diff=task.difficulty||"Medium"
    const dcol=diff==="Hard"?COLORS.pink:diff==="Expert"?COLORS.purple:diff==="Easy"?COLORS.green:COLORS.yellow
    roundRect(ctx,rx+10,cy+58,56,16,8,dcol+"22",dcol+"44")
    ctx.font="700 8px 'DM Mono',monospace"; ctx.fillStyle=dcol; ctx.textAlign="center"
    ctx.fillText(diff.toUpperCase(),rx+38,cy+70)
    ctx.textAlign="left"; ctx.font="700 13px 'Syne',sans-serif"; ctx.fillStyle=COLORS.text
    ctx.fillText((task.title||"Arena Task").slice(0,42),rx+76,cy+66)
    ctx.font="500 10px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim
    ctx.fillText((task.category||s.skill)+" challenge",rx+76,cy+82)

    // Score visualization
    if(sub?.score!=null){
      const sc=sub.score
      const scoreCol=sc>=80?COLORS.green:sc>=60?COLORS.yellow:COLORS.pink
      ctx.font="700 11px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim; ctx.fillText("AI SCORE",rx,cy+148)
      roundRect(ctx,rx,cy+158,rw-30,12,6,"rgba(0,0,0,0.03)",null)
      roundRect(ctx,rx,cy+158,(rw-30)*(sc/100)*slideT,12,6,scoreCol,null)
      ctx.font="800 24px 'DM Mono',monospace"; ctx.fillStyle=scoreCol; ctx.textAlign="right"
      ctx.fillText(sc+"/100",rx+rw-30,cy+148)

      // AI feedback snippet
      const fb=sub.summary||sub.feedback||""
      if(fb){
        roundRect(ctx,rx,cy+182,rw-30,56,9,"rgba(0,210,255,0.05)","rgba(0,210,255,0.12)")
        ctx.font="500 10px 'DM Mono',monospace"; ctx.fillStyle="rgba(0,210,255,0.65)"; ctx.textAlign="left"
        ctx.fillText("AI: "+fb.slice(0,90)+(fb.length>90?"...":""),rx+8,cy+207)
        if(fb.length>90) ctx.fillText(fb.slice(90,175)+(fb.length>175?"...":""),rx+8,cy+225)
      }
    }
  } else {
    // No task yet — show skill "coming up" card
    ctx.font="600 13px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim; ctx.textAlign="left"
    ctx.fillText("Complete an Arena task on "+s.skill,rx,cy+78)
    ctx.fillText("to unlock your skill snapshot here.",rx,cy+96)
  }

  // ELO gained badge
  const relElo=relatedTask?.submission?.eloGained||relatedTask?.submission?.eloDelta||0
  if(relElo>0){
    ctx.globalAlpha=slideT
    roundRect(ctx,rx,cy+ch-52,100,30,15,"rgba(120,255,158,0.1)","rgba(120,255,158,0.3)")
    ctx.font="800 12px 'DM Mono',monospace"; ctx.fillStyle=COLORS.green; ctx.textAlign="center"
    ctx.fillText("+"+relElo+" ELO",rx+50,cy+ch-31)
  }

  // Skill index indicator
  ctx.globalAlpha=easeOut(clamp(t*4,0,1))*0.6
  ctx.font="700 10px 'DM Mono',monospace"; ctx.fillStyle=COLORS.dim; ctx.textAlign="right"
  ctx.fillText(`Skill ${skillIdx+1} of ${topSkills.length}`,W-30,H-75)

  ctx.globalAlpha=1; ctx.textAlign="left"
}

function renderFrame(ctx,W,H,t,section,data,particles) {
  const ud=data.userData||{}, name=ud.displayName||"Professional"
  const role=ud.keyword||"Professional", elo=ud.eloRating||800
  const tasks=data.completedTasks||[], skills=data.skills||[]
  const avgScore=tasks.length?Math.round(tasks.reduce((a,{submission})=>a+(submission?.score||0),0)/tasks.length):0
  renderBg(ctx,W,H,particles)
  const fade=Math.min(t*4,1); ctx.globalAlpha=fade
  if(section.id==="intro")      renderIntro(ctx,W,H,t,name,role,elo)
  if(section.id==="stats")      renderStats(ctx,W,H,t,elo,tasks.length,avgScore,skills.length)
  if(section.id==="skills")     renderSkills(ctx,W,H,t,skills)
  if(section.id==="skillsnap")  renderSkillSnap(ctx,W,H,t,skills,tasks,role)
  if(section.id==="elohistory") renderEloHistory(ctx,W,H,t,data.eloHistory||[],elo)
  if(section.id==="arena")      renderArena(ctx,W,H,t,tasks)
  if(section.id==="portfolio")  renderPortfolio(ctx,W,H,t,tasks)
  if(section.id==="experience") renderExperience(ctx,W,H,t,data.experiences||[])
  if(section.id==="outro")      renderOutro(ctx,W,H,t,name,role,elo)
  ctx.globalAlpha=1
  renderHUD(ctx,W,H,section,t)
}

export default function CareerVideoGenerator({ userData, skillGraph, completedTasks, experiences, onClose }) {
  const canvasRef=useRef(), rafRef=useRef(), recorderRef=useRef()
  const chunksRef=useRef([]), particlesRef=useRef([])
  const [phase,setPhase]=useState("preview")
  const [progress,setProgress]=useState(0)
  const [currentSec,setCurrentSec]=useState(0)
  const [videoUrl,setVideoUrl]=useState("")
  const [script,setScript]=useState([])
  const [loadingScript,setLoadingScript]=useState(false)
  const [previewSec,setPreviewSec]=useState(0)
  const W=1280, H=720

  const data = {
    userData,
    skills: (skillGraph||[]).map(s=>({skill:s.label||s.skill||"Skill",percentage:s.value??s.percentage??s.score??0})).filter(s=>s.percentage>0).sort((a,b)=>b.percentage-a.percentage),
    completedTasks: completedTasks||[],
    experiences: experiences||[],
    eloHistory: userData?.eloHistory||[],
  }

  useEffect(()=>{
    const COLS=[COLORS.cyan,COLORS.green,COLORS.yellow,COLORS.purple,COLORS.pink]
    particlesRef.current=Array.from({length:60},()=>({
      x:Math.random()*W, y:Math.random()*H,
      vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4,
      r:Math.random()*1.8+.4,
      col:COLS[Math.floor(Math.random()*COLS.length)],
      a:Math.random()*.3+.05,
    }))
  },[])

  useEffect(()=>{
    if(phase!=="preview")return
    let start=null
    const loop=(ts)=>{
      if(!start)start=ts
      const elapsed=(ts-start)/1000, totalT=elapsed%TOTAL_DURATION
      let acc=0, si=0
      for(let i=0;i<SECTIONS.length;i++){if(totalT<acc+SECTIONS[i].duration){si=i;break};acc+=SECTIONS[i].duration}
      const secT=(totalT-acc)/SECTIONS[si].duration
      setPreviewSec(si)
      particlesRef.current.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0
      })
      const canvas=canvasRef.current
      if(canvas)renderFrame(canvas.getContext("2d"),W,H,secT,SECTIONS[si],data,particlesRef.current)
      rafRef.current=requestAnimationFrame(loop)
    }
    rafRef.current=requestAnimationFrame(loop)
    return()=>cancelAnimationFrame(rafRef.current)
  },[phase,script])

  useEffect(()=>{
    setLoadingScript(true)
    const ud=userData||{}, name=ud.displayName||"the candidate"
    const role=ud.keyword||"Professional", elo=ud.eloRating||800
    const topSkills=data.skills.slice(0,4).map(s=>s.skill).join(", ")||"various skills"
    const expList=data.experiences.map(e=>e.company).join(", ")||"various companies"
    const prompt=`Write narration for a ${TOTAL_DURATION}-second personal brand career video for ${name}, a ${role} with ELO ${elo}. Skills: ${topSkills}. Experience: ${expList}. Tasks: ${(completedTasks||[]).length}.
Write exactly 9 short confident sentences (one per section): 3D Intro, Stats, Skills Overview, Skill Story (explain what they built), ELO Growth, Arena Performance, Portfolio, Experience, Outro.
Make them punchy, first-person where suitable, and professional. No filler words.
Return ONLY a JSON array of 9 strings, no markdown: ["s1","s2","s3","s4","s5","s6","s7","s8","s9"]`
    fetch(`${API}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})})
      .then(r=>r.json()).then(d=>{
        try{
          const clean=(d.text||"[]").replace(/```json|```/g,"").trim()
          const parsed=JSON.parse(clean.slice(clean.indexOf("["),clean.lastIndexOf("]")+1))
          setScript(Array.isArray(parsed)?parsed:[])
        }catch{
          setScript([
            `Meet ${name} — a verified ${role} on Capabilio.`,
            `With an ELO rating of ${elo}, they rank among the platform's top performers.`,
            `Their skill profile spans ${data.skills.length} assessed competencies with proven expertise.`,
            `Watch as they walk through real Arena tasks — each snapshot is a verified proof of skill.`,
            `Their ELO has grown consistently — a track record of real improvement, not just claims.`,
            `They've completed ${(completedTasks||[]).length} real-world Arena challenges, demonstrating consistent performance.`,
            `Every task in their portfolio shows the actual problem, solution, and AI review.`,
            `Their career journey includes experience at ${expList}.`,
            `${name} is open to new opportunities. Connect with them on Capabilio.`
          ])
        }
      }).catch(()=>{
        setScript([
          `Meet ${name} — a verified ${role}.`,
          `ELO ${elo} — among the top performers on Capabilio.`,
          `${data.skills.length} skills assessed. Proven expertise across key domains.`,
          `These are real task snapshots — evidence of skills in action, not just listed on a resume.`,
          `A consistent ELO growth curve — earned through daily real-world challenges.`,
          `${(completedTasks||[]).length} Arena tasks completed. Real skills, real results.`,
          `Portfolio with actual code, scenarios and AI-reviewed solutions.`,
          `Career experience at ${expList}.`,
          `Open to new opportunities. Find them on Capabilio.`
        ])
      }).finally(()=>setLoadingScript(false))
  },[])

  const generateVideo=useCallback(async()=>{
    setPhase("generating"); setProgress(0)
    cancelAnimationFrame(rafRef.current); chunksRef.current=[]
    const canvas=canvasRef.current
    const stream=canvas.captureStream(30)
    const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm"
    const recorder=new MediaRecorder(stream,{mimeType:mime})
    recorderRef.current=recorder
    recorder.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data)}
    recorder.onstop=()=>{
      const blob=new Blob(chunksRef.current,{type:"video/webm"})
      setVideoUrl(URL.createObjectURL(blob)); setPhase("done")
    }
    recorder.start(100)
    let si=0
    for(const section of SECTIONS){
      setCurrentSec(SECTIONS.indexOf(section))
      const text=script[si++]||""
      if(text&&window.speechSynthesis){
        window.speechSynthesis.cancel()
        const utt=new SpeechSynthesisUtterance(text)
        utt.rate=.92; utt.pitch=1; utt.volume=1
        const voices=window.speechSynthesis.getVoices()
        const eng=voices.find(v=>v.lang.startsWith("en")&&v.name.includes("Google"))||voices[0]
        if(eng)utt.voice=eng
        window.speechSynthesis.speak(utt)
      }
      const fps=30, frames=section.duration*fps, startMs=performance.now()
      for(let f=0;f<frames;f++){
        const t=f/frames
        particlesRef.current.forEach(p=>{
          p.x+=p.vx; p.y+=p.vy
          if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0
        })
        renderFrame(canvas.getContext("2d"),W,H,t,section,data,particlesRef.current)
        const done=SECTIONS.slice(0,SECTIONS.indexOf(section)).reduce((a,s)=>a+s.duration*fps,0)+f
        setProgress(Math.round((done/(TOTAL_DURATION*fps))*100))
        await new Promise(r=>{
          const elapsed=performance.now()-startMs, expected=(f/fps)*1000
          setTimeout(r,Math.max(0,expected-elapsed))
        })
      }
    }
    window.speechSynthesis?.cancel(); recorder.stop()
  },[script,data])

  const download=()=>{
    const a=document.createElement("a"); a.href=videoUrl
    a.download=`${(userData?.displayName||"career").replace(/\s+/g,"-")}-capabilio.webm`; a.click()
  }

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.93)",backdropFilter:"blur(18px)",
      zIndex:2000,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'DM Mono',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;900&family=DM+Mono:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .vbtn{transition:all .2s;cursor:pointer}.vbtn:hover{transform:translateY(-2px);filter:brightness(1.1)}
      `}</style>

      {/* Header */}
      <div style={{position:"absolute",top:0,left:0,right:0,padding:"18px 32px",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        borderBottom:"1px solid rgba(0,0,0,0.03)"}}>
        <div>
          <div style={{fontSize:17,fontWeight:800,color:"#f1f5f9",fontFamily:"'Syne',sans-serif"}}>🎬 AI Career Video</div>
          <div style={{fontSize:11,color:COLORS.dim,marginTop:2}}>{TOTAL_DURATION}s · 1280×720 · WebM</div>
        </div>
        <button onClick={onClose} className="vbtn" style={{background:"rgba(0,0,0,0.03)",
          border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,width:36,height:36,
          color:"#94a3b8",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</button>
      </div>

      <div style={{display:"flex",gap:24,padding:"76px 28px 20px",width:"100%",maxWidth:1360,
        alignItems:"flex-start",justifyContent:"center",overflowY:"auto"}}>

        {/* Canvas */}
        <div style={{flex:"0 0 auto"}}>
          <div style={{position:"relative",borderRadius:14,overflow:"hidden",
            border:"1px solid rgba(0,210,255,0.22)",
            boxShadow:"0 0 60px rgba(0,210,255,0.1),0 24px 60px rgba(0,0,0,0.5)"}}>
            <canvas ref={canvasRef} width={W} height={H} style={{display:"block",width:640,height:360}}/>
            {phase==="preview"&&<div style={{position:"absolute",bottom:10,left:10,
              background:"rgba(0,0,0,0.7)",borderRadius:7,padding:"3px 9px",
              fontSize:10,color:COLORS.cyan,fontWeight:700}}>LIVE PREVIEW</div>}
            {phase==="generating"&&(
              <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10}}>
                <div style={{fontSize:36,fontWeight:900,color:COLORS.cyan,fontFamily:"'Syne',sans-serif",
                  textShadow:`0 0 20px ${COLORS.cyan}`}}>{progress}%</div>
                <div style={{fontSize:12,color:COLORS.dim}}>Rendering {SECTIONS[currentSec]?.label}...</div>
                <div style={{width:180,height:4,background:"rgba(255,255,255,0.1)",borderRadius:99}}>
                  <div style={{height:"100%",width:`${progress}%`,borderRadius:99,
                    background:`linear-gradient(90deg,${COLORS.cyan},${COLORS.green})`,transition:"width .3s"}}/>
                </div>
              </div>
            )}
          </div>
          {/* Timeline */}
          <div style={{display:"flex",gap:4,marginTop:10}}>
            {SECTIONS.map((s,i)=>(
              <div key={s.id} style={{flex:s.duration,height:4,borderRadius:99,transition:"background .3s",
                background:phase==="preview"&&i===previewSec?COLORS.cyan
                  :phase==="generating"&&i===currentSec?COLORS.yellow
                  :phase==="generating"&&i<currentSec?COLORS.green
                  :"rgba(0,0,0,0.05)"}}/>
            ))}
          </div>
          <div style={{display:"flex",gap:4,marginTop:5}}>
            {SECTIONS.map((s,i)=>(
              <div key={s.id} style={{flex:s.duration,fontSize:9,textAlign:"center",fontWeight:700,
                color:phase==="preview"&&i===previewSec?COLORS.cyan:COLORS.dim,transition:"color .3s"}}>
                {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{flex:"0 0 310px",display:"flex",flexDirection:"column",gap:14,animation:"fadeIn .4s ease both"}}>

          {/* Script */}
          <div style={{background:"rgba(8,15,30,0.9)",border:"1px solid rgba(255,255,255,0.07)",
            borderRadius:14,padding:18}}>
            <div style={{fontSize:11,fontWeight:800,color:COLORS.dim,textTransform:"uppercase",
              letterSpacing:"0.12em",marginBottom:12}}>🎙️ Voiceover Script</div>
            {loadingScript?(
              <div style={{display:"flex",alignItems:"center",gap:8,color:COLORS.dim,fontSize:12}}>
                <div style={{width:12,height:12,border:`2px solid ${COLORS.cyan}`,borderTopColor:"transparent",
                  borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                Generating AI script...
              </div>
            ):SECTIONS.map((s,i)=>(
              <div key={s.id} style={{marginBottom:10,
                opacity:phase==="generating"&&i<currentSec?.4:1}}>
                <div style={{fontSize:9,fontWeight:800,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3,
                  color:phase==="preview"&&i===previewSec?COLORS.cyan
                    :phase==="generating"&&i===currentSec?COLORS.yellow:COLORS.dim}}>
                  {s.label} ({s.duration}s)
                </div>
                <div style={{fontSize:12,color:"rgba(240,253,255,0.6)",lineHeight:1.6}}>{script[i]||"—"}</div>
              </div>
            ))}
          </div>

          {/* Buttons */}
          {phase==="preview"&&(
            <button className="vbtn" onClick={generateVideo}
              disabled={loadingScript||script.length===0}
              style={{width:"100%",padding:"15px",borderRadius:12,border:"none",
                background:loadingScript?"rgba(0,0,0,0.03)":"linear-gradient(135deg,#f59e0b,#f97316)",
                color:loadingScript?COLORS.dim:"#000",fontSize:15,fontWeight:800,
                fontFamily:"'Syne',sans-serif",cursor:loadingScript?"not-allowed":"pointer"}}>
              {loadingScript?"⏳ Preparing...":"🎬 Generate Video"}
            </button>
          )}

          {phase==="generating"&&(
            <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",
              borderRadius:12,padding:"16px 18px",textAlign:"center"}}>
              <div style={{width:18,height:18,border:"2px solid #f59e0b",borderTopColor:"transparent",
                borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 8px"}}/>
              <div style={{fontSize:13,fontWeight:700,color:"#f59e0b"}}>Rendering... {progress}%</div>
              <div style={{fontSize:11,color:COLORS.dim,marginTop:3}}>Keep this tab open · ~{TOTAL_DURATION}s</div>
            </div>
          )}

          {phase==="done"&&(
            <div style={{animation:"fadeIn .4s ease both"}}>
              <div style={{background:"rgba(120,255,158,0.06)",border:"1px solid rgba(120,255,158,0.2)",
                borderRadius:12,padding:"16px 18px",textAlign:"center",marginBottom:12}}>
                <div style={{fontSize:26,marginBottom:6}}>🎉</div>
                <div style={{fontSize:14,fontWeight:800,color:COLORS.green,marginBottom:3}}>Video Ready!</div>
                <div style={{fontSize:11,color:COLORS.dim}}>Ready to share on LinkedIn, Twitter & more</div>
              </div>
              <button className="vbtn" onClick={download} style={{width:"100%",padding:"15px",borderRadius:12,
                border:"none",background:"linear-gradient(135deg,#78FF9E,#00D2FF)",
                color:"#030712",fontSize:15,fontWeight:800,fontFamily:"'Syne',sans-serif",marginBottom:8,cursor:"pointer"}}>
                ⬇️ Download Video
              </button>
              <video src={videoUrl} controls style={{width:"100%",borderRadius:10,marginBottom:8,
                border:"1px solid rgba(0,0,0,0.03)"}}/>
              <button className="vbtn" onClick={()=>{setPhase("preview");setVideoUrl("");setProgress(0)}}
                style={{width:"100%",padding:"11px",borderRadius:10,border:"1px solid rgba(0,0,0,0.05)",
                  background:"transparent",color:COLORS.dim,fontSize:13,cursor:"pointer"}}>
                🔄 Regenerate
              </button>
            </div>
          )}

          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(0,0,0,0.03)",
            borderRadius:10,padding:"12px 14px",fontSize:11,color:COLORS.dim,lineHeight:1.7}}>
            <span style={{fontWeight:700,color:"rgba(0,0,0,0.12)"}}>ℹ️ </span>
            Canvas + MediaRecorder renders locally in your browser. AI voiceover via Web Speech API.
          </div>
        </div>
      </div>
    </div>
  )
}
