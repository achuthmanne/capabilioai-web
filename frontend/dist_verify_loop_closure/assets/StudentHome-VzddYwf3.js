import{j as e}from"./vendor-motion-C5ruZjZH.js";import{r as l}from"./vendor-misc-Cx8HjSZ9.js";import{b as L,g as Y}from"./index-DovmOh1h.js";import"./vendor-charts-CEykv1D6.js";import"./vendor-supabase-B7uu82gQ.js";const o={void:"#FFFFFF",raised:"#FFFFFF",glass:"rgba(0,0,0,0.03)",glassH:"rgba(0,0,0,0.06)",border:"#E8E3DA",indigo:"#6366F1",gold:"#F59E0B",emerald:"#10B981",rose:"#F43F5E",violet:"#8B5CF6",text1:"#1A1714",text2:"#475569",muted:"#A8A29E"};function C(t,r=900,a=0){const[s,u]=l.useState(0);return l.useEffect(()=>{let m,d=null;const c=0,y=setTimeout(()=>{const v=x=>{d||(d=x);const p=Math.min((x-d)/r,1),b=1-Math.pow(1-p,3);u(Math.round(c+(t-c)*b)),p<1&&(m=requestAnimationFrame(v))};m=requestAnimationFrame(v)},a);return()=>{clearTimeout(y),cancelAnimationFrame(m)}},[t,r,a]),s}function _(t){return t>=750?{tier:"Expert",color:o.gold,bg:"rgba(245,158,11,0.15)",border:"rgba(245,158,11,0.30)"}:t>=650?{tier:"Advanced",color:o.violet,bg:"rgba(139,92,246,0.15)",border:"rgba(139,92,246,0.30)"}:t>=550?{tier:"Rising",color:o.indigo,bg:"rgba(99,102,241,0.15)",border:"rgba(99,102,241,0.30)"}:t>=450?{tier:"Building",color:o.emerald,bg:"rgba(16,185,129,0.15)",border:"rgba(16,185,129,0.30)"}:t>=400?{tier:"Learning",color:o.gold,bg:"rgba(245,158,11,0.10)",border:"rgba(245,158,11,0.20)"}:{tier:"Beginner",color:o.muted,bg:"rgba(100,116,139,0.12)",border:"rgba(100,116,139,0.20)"}}function G(t){return{title:t.challenge_title||t.title||"Arena Challenge",company:t.company||t.domain||null,score:t.score??t.final_score??null,badge:t.percentile?`Top ${t.percentile}%`:null,time:t.submittedAt||t.completed_at?new Date(t.submittedAt||t.completed_at).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"Recent",elo:t.eloDelta??t.elo_delta??0}}function B({h:t=14,w:r="100%",radius:a=8,style:s={}}){return e.jsx("div",{className:"bento-skeleton",style:{height:t,width:r,borderRadius:a,...s}})}function I({size:t=28}){return e.jsxs("svg",{width:t,height:t,viewBox:"0 0 24 24",fill:"none",children:[e.jsx("path",{d:"M12 2C12 2 7 7.5 7 12.5C7 15.5 9.5 18 12 18C14.5 18 17 15.5 17 12.5C17 9.5 14 6 13 4C13 4 12.8 7 11 8.5C11 8.5 9 6.5 12 2Z",fill:"#F59E0B"}),e.jsx("path",{d:"M12 14C12 14 10 12.5 10 11C10 9.5 11 8.5 12 8C12 8 12 10 13 11C13.5 11.5 14 12 14 13C14 14.1 13.1 15 12 15C11.5 15 11 14.8 10.7 14.4",fill:"#FCD34D",opacity:"0.8"})]})}function Q({user:t,userData:r,onNavigate:a}){var w;const[s,u]=l.useState([]),[m,d]=l.useState(!0),[c,y]=l.useState(!1);l.useEffect(()=>{const n=setTimeout(()=>y(!0),80);return()=>clearTimeout(n)},[]),l.useEffect(()=>{if(!(t!=null&&t.id)&&!(t!=null&&t.uid)){d(!1);return}const n=t.id||t.uid;return L.subscribeHistory(n,k=>{u(k||[]),d(!1)})},[t==null?void 0:t.id,t==null?void 0:t.uid]);const x=((r==null?void 0:r.name)||(t==null?void 0:t.displayName)||"Student").split(" ")[0],p=(r==null?void 0:r.eloRating)||400,b=(r==null?void 0:r.streak)||0,M=(r==null?void 0:r.domain)||(r==null?void 0:r.keyword)||Y(r).label,{tier:z,color:A,bg:R,border:W}=_(p),g=s.filter(n=>Date.now()-new Date(n.submittedAt||n.completed_at||0).getTime()<7*24*60*60*1e3).reduce((n,i)=>n+(i.eloDelta||i.elo_delta||0),0),S=s.slice(0,3).map(G),f=s.filter(n=>{const i=n.submittedAt||n.completed_at;return i&&new Date(i).toDateString()===new Date().toDateString()}).length,E=Math.min(100,f*100),j=f>=1,F=new Date().getHours(),T=F<12?"Good morning":F<17?"Good afternoon":"Good evening",h={};s.forEach(n=>{const i=n.domain||n.skill||"General";h[i]||(h[i]=[]),h[i].push(n.score||0)});const $=((w=Object.entries(h).map(([n,i])=>({skill:n,avg:i.reduce((k,H)=>k+H,0)/i.length})).sort((n,i)=>n.avg-i.avg)[0])==null?void 0:w.skill)||"System Design",D=C(c?p:0,900,200),N=C(c?b:0,700,300);return e.jsxs("div",{style:{background:`radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%),
                   radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.08) 0%, transparent 50%),
                   ${o.void}`,minHeight:"100vh",padding:"24px 24px 48px",fontFamily:"'DM Sans', sans-serif",boxSizing:"border-box"},children:[e.jsx("style",{children:`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=DM+Mono:wght@400;500;600&display=swap');

        @keyframes bentoReveal {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fillBar {
          from { width: 0%; }
        }
        @keyframes shimmerDark {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }

        .bento-card {
          transition: transform 250ms ease, box-shadow 250ms ease, border-color 250ms ease;
        }
        .bento-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.08)) !important;
          border-color: rgba(0,0,0,0.08) !important;
        }
        .bento-skeleton {
          background: linear-gradient(90deg,
            rgba(0,0,0,0.02) 25%,
            rgba(0,0,0,0.05) 37%,
            rgba(0,0,0,0.02) 63%
          );
          background-size: 1200px 100%;
          animation: shimmerDark 1.4s ease-in-out infinite;
        }
        .gold-btn {
          background: linear-gradient(135deg, #F59E0B, #D97706);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          padding: 10px 18px;
          transition: transform 200ms ease, box-shadow 200ms ease;
          white-space: nowrap;
        }
        .gold-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(245,158,11,0.4);
        }
        .gold-btn:active { transform: scale(0.97); }

        .secondary-btn {
          background: rgba(0,0,0,0.03);
          border: 1px solid rgba(0,0,0,0.06);
          border-radius: 8px;
          color: ${o.text2};
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 7px 14px;
          transition: background 180ms ease, transform 180ms ease;
        }
        .secondary-btn:hover {
          background: rgba(0,0,0,0.06);
          transform: translateY(-1px);
        }

        .quick-action-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 14px;
          background: rgba(0,0,0,0.02);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 10px;
          cursor: pointer;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: ${o.text2};
          transition: background 180ms ease, border-color 180ms ease, transform 200ms ease;
          width: 100%;
          text-align: left;
        }
        .quick-action-row:hover {
          background: rgba(0,0,0,0.05);
          border-color: rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        .quick-action-row:active { transform: scale(0.98); }

        @media (max-width: 900px) {
          .bento-grid { grid-template-columns: 1fr 1fr !important; }
          .bento-span2 { grid-column: span 2 !important; }
          .bento-span4 { grid-column: span 2 !important; }
          .bento-span1 { grid-column: span 1 !important; }
        }
        @media (max-width: 560px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-span2, .bento-span4, .bento-span1 { grid-column: span 1 !important; }
        }
      `}),e.jsxs("div",{style:{marginBottom:28,animation:"fadeUp 0.4s ease-out both"},children:[e.jsxs("p",{style:{margin:0,fontSize:13,fontWeight:500,color:o.muted,letterSpacing:"0.01em"},children:[T,", ",x]}),e.jsx("h1",{style:{margin:"6px 0 0",fontSize:36,fontWeight:800,color:o.text1,letterSpacing:"-0.02em",lineHeight:1.15},children:"What's your move today?"})]}),e.jsxs("div",{className:"bento-grid",style:{display:"grid",gridTemplateColumns:"repeat(4, 1fr)",gap:16},children:[e.jsxs("div",{className:"bento-card bento-span2",style:{gridColumn:"span 2",background:o.glass,border:`1px solid ${o.glassH}`,borderRadius:20,padding:"22px 24px",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",animation:"bentoReveal 0.4s ease-out 0ms both"},children:[e.jsx("div",{style:{fontFamily:"'DM Mono', monospace",fontSize:10,fontWeight:700,color:"#A5B4FC",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:12},children:"Today's Goal"}),e.jsx("div",{style:{fontSize:22,fontWeight:700,color:o.text1,marginBottom:16,lineHeight:1.3},children:j?"Goal complete! Well done.":"Complete 1 Arena challenge"}),e.jsx("div",{style:{height:6,borderRadius:999,background:"rgba(0,0,0,0.06)",overflow:"hidden",marginBottom:20},children:e.jsx("div",{style:{height:"100%",width:c?`${E||(j?100:0)}%`:"0%",borderRadius:999,background:`linear-gradient(90deg, ${o.indigo}, ${o.violet})`,transition:"width 0.9s cubic-bezier(0,0,0.2,1) 0.4s"}})}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12},children:[e.jsx("span",{style:{fontSize:12,color:o.muted},children:j?`${f} challenge${f>1?"s":""} done today`:"Earn evidence recruiters can inspect"}),e.jsx("button",{className:"gold-btn",onClick:()=>a("arena"),children:"Enter Arena →"})]})]}),e.jsxs("div",{className:"bento-card bento-span1",style:{gridColumn:"span 1",background:o.raised,border:"1px solid rgba(245,158,11,0.18)",borderRadius:20,padding:"22px 20px",animation:"bentoReveal 0.4s ease-out 60ms both"},children:[e.jsx("div",{style:{fontFamily:"'DM Mono', monospace",fontSize:10,fontWeight:700,color:"rgba(245,158,11,0.6)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10},children:"ELO"}),e.jsx("div",{style:{fontFamily:"'DM Mono', monospace",fontSize:44,fontWeight:800,color:o.gold,lineHeight:1,marginBottom:6},children:D.toLocaleString()}),g!==0&&e.jsxs("div",{style:{fontSize:12,color:g>0?o.emerald:o.rose,fontWeight:600,marginBottom:12},children:[g>0?"▲":"▼"," ",g>0?"+":"",g," this week"]}),e.jsx("div",{style:{height:3,borderRadius:999,background:`linear-gradient(90deg, rgba(245,158,11,0.2), ${o.gold}, rgba(245,158,11,0.2))`,marginBottom:14,marginTop:g!==0?0:12}}),e.jsx("span",{style:{display:"inline-block",padding:"4px 12px",borderRadius:100,background:R,border:`1px solid ${W}`,color:A,fontSize:11,fontWeight:700,fontFamily:"'DM Mono', monospace",letterSpacing:"0.06em"},children:z})]}),e.jsxs("div",{className:"bento-card bento-span1",style:{gridColumn:"span 1",background:o.raised,border:"1px solid rgba(245,158,11,0.15)",borderRadius:20,padding:"22px 20px",animation:"bentoReveal 0.4s ease-out 120ms both"},children:[e.jsx("div",{style:{marginBottom:8},children:e.jsx(I,{size:28})}),e.jsx("div",{style:{fontFamily:"'DM Mono', monospace",fontSize:32,fontWeight:800,color:o.gold,lineHeight:1,marginBottom:4},children:N}),e.jsx("div",{style:{fontSize:12,color:o.muted,marginBottom:8,fontWeight:500},children:"day streak"}),e.jsx("div",{style:{fontSize:11,color:b>0?o.gold:o.muted,fontWeight:600},children:b>0?"Keep it alive!":"Start today!"})]}),e.jsxs("div",{className:"bento-card bento-span4",style:{gridColumn:"span 4",background:"linear-gradient(135deg, rgba(99,102,241,0.20), rgba(139,92,246,0.12))",border:"1px solid rgba(99,102,241,0.25)",borderRadius:16,padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:16,animation:"bentoReveal 0.4s ease-out 180ms both"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontFamily:"'DM Mono', monospace",fontSize:10,fontWeight:700,color:"#A5B4FC",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6},children:"Today's Missions"}),e.jsxs("div",{style:{fontSize:14,color:o.text2,fontWeight:500},children:["3 challenges ready · ",e.jsx("span",{style:{color:o.muted},children:M})]})]}),e.jsx("div",{style:{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"},children:[{label:"Easy",elo:"+8 ELO",color:o.emerald,bg:"rgba(16,185,129,0.15)",border:"rgba(16,185,129,0.25)"},{label:"Medium",elo:"+18 ELO",color:o.gold,bg:"rgba(245,158,11,0.15)",border:"rgba(245,158,11,0.25)"},{label:"Hard",elo:"+30 ELO",color:o.rose,bg:"rgba(244,63,94,0.15)",border:"rgba(244,63,94,0.25)"}].map(n=>e.jsxs("span",{style:{padding:"5px 12px",borderRadius:100,background:n.bg,border:`1px solid ${n.border}`,color:n.color,fontSize:12,fontWeight:700,fontFamily:"'DM Mono', monospace",whiteSpace:"nowrap"},children:[n.label," ",e.jsx("span",{style:{opacity:.8},children:n.elo})]},n.label))}),e.jsx("button",{className:"gold-btn",onClick:()=>a("arena"),children:"Enter Arena →"})]}),e.jsxs("div",{className:"bento-card bento-span1",style:{gridColumn:"span 1",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.18)",borderRadius:20,padding:"22px 20px",animation:"bentoReveal 0.4s ease-out 240ms both"},children:[e.jsx("div",{style:{fontFamily:"'DM Mono', monospace",fontSize:10,fontWeight:700,color:"#A5B4FC",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14},children:"⚡ Next Skill"}),e.jsx("div",{style:{fontSize:16,fontWeight:700,color:o.text1,marginBottom:6,lineHeight:1.3},children:$}),e.jsx("div",{style:{fontSize:12,color:o.emerald,fontWeight:600,marginBottom:18},children:"High market demand"}),e.jsx("button",{className:"secondary-btn",onClick:()=>a("arena"),children:"Start in Studio →"})]}),e.jsxs("div",{className:"bento-card bento-span2",style:{gridColumn:"span 2",background:o.raised,border:`1px solid ${o.border}`,borderRadius:20,padding:"22px 20px",animation:"bentoReveal 0.4s ease-out 300ms both"},children:[e.jsx("div",{style:{fontFamily:"'DM Mono', monospace",fontSize:10,fontWeight:700,color:o.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:16},children:"Recent Proof"}),m?e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:12},children:[0,1,2].map(n=>e.jsxs("div",{style:{padding:"12px 14px",background:"#FAFAFA",borderRadius:12,borderLeft:"3px solid rgba(99,102,241,0.2)"},children:[e.jsx(B,{h:13,w:"65%",style:{marginBottom:8}}),e.jsx(B,{h:10,w:"40%"})]},n))}):S.length===0?e.jsx("div",{style:{textAlign:"center",padding:"28px 16px",color:o.muted,fontSize:13,fontWeight:500},children:"No proofs yet · Complete an Arena challenge →"}):e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:10},children:S.map((n,i)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 14px",background:"#FAFAFA",borderRadius:12,borderLeft:`3px solid ${o.indigo}`,animation:`bentoReveal 0.4s ease-out ${320+i*60}ms both`,gap:12},children:[e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{style:{fontSize:13,fontWeight:600,color:o.text1,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:n.title}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[n.company&&e.jsx("span",{style:{fontSize:10,fontWeight:600,color:"#A5B4FC",background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.20)",borderRadius:6,padding:"2px 8px",fontFamily:"'DM Mono', monospace"},children:n.company}),e.jsx("span",{style:{fontSize:11,color:o.muted},children:n.time})]})]}),e.jsxs("div",{style:{textAlign:"right",flexShrink:0},children:[n.score!=null&&e.jsx("div",{style:{fontFamily:"'DM Mono', monospace",fontSize:20,fontWeight:800,color:n.score>=80?o.emerald:n.score>=50?o.gold:o.rose,lineHeight:1,marginBottom:2},children:n.score}),n.elo>0&&e.jsxs("div",{style:{fontSize:11,color:o.emerald,fontWeight:700},children:["+",n.elo," ELO"]})]})]},i))})]}),e.jsxs("div",{className:"bento-card bento-span1",style:{gridColumn:"span 1",background:o.raised,border:`1px solid ${o.border}`,borderRadius:20,padding:"22px 20px",animation:"bentoReveal 0.4s ease-out 360ms both"},children:[e.jsx("div",{style:{fontFamily:"'DM Mono', monospace",fontSize:10,fontWeight:700,color:o.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14},children:"Quick Actions"}),e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:[{icon:"⚔️",label:"Arena",page:"arena",accentColor:o.indigo},{icon:"📡",label:"Pulse",page:"pulse",accentColor:"#38BDF8"},{icon:"✦",label:"Aura",page:"aura",accentColor:o.violet},{icon:"👥",label:"Community",page:"nexus",accentColor:o.emerald}].map((n,i)=>e.jsxs("button",{className:"quick-action-row",onClick:()=>a(n.page),style:{animation:`bentoReveal 0.4s ease-out ${380+i*40}ms both`},children:[e.jsx("span",{style:{fontSize:16,lineHeight:1,flexShrink:0},children:n.icon}),e.jsx("span",{style:{flex:1,color:o.text2},children:n.label}),e.jsx("span",{style:{color:o.muted,fontSize:13},children:"→"})]},n.page))})]})]})]})}export{Q as default};
