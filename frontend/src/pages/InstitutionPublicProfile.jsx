/**
 * InstitutionPublicProfile.jsx — the public, recruiter-facing institution profile.
 * Self-contained: injects its own scoped `ip-*` styles and runs a canvas particle
 * hero + orbital stats + live ticker. Mirrors the institution-path prototype.
 *
 * Props:
 *   userData   — institution profile from Supabase (org_name, org_location, etc.)
 *   members    — array of org members (used to compute student count)
 *   onBack()   — optional, called by the "← Search" breadcrumb
 *   onAction(name) — optional, called for follow / request-access / brochure
 */
import { useEffect, useRef, useState } from "react"
import { verificationLevel } from "../lib/orgVerification"
import { collegeApi } from "../lib/api"

const IP_CSS = `
.ipx{--bg:#0b0a08;--bg2:#13100c;--line:rgba(255,255,255,.10);--line2:rgba(255,255,255,.16);
  --amber:#dc8b18;--gold:#f6c453;--green:#4fd4a3;--blue:#74a8ff;--purple:#ab93ff;--cyan:#54d9e0;--pink:#ff8db1;--red:#ff8177;--teal:#34d4bf;
  --txt:#f7f2ea;--mut:rgba(247,242,234,.68);--mut2:rgba(247,242,234,.44);
  color:var(--txt);font-family:DM Sans,sans-serif;height:100%;overflow-y:auto;}
.ipx *{box-sizing:border-box;}
.ipx .ip-hero{position:relative;min-height:430px;display:grid;grid-template-columns:55% 45%;overflow:hidden;background:#0b0a08;}
.ipx .ip-hero-bg{position:absolute;inset:0;z-index:0;}
.ipx .ipCanvas{position:absolute;inset:0;width:100%;height:100%;}
.ipx .ip-fg-left{position:absolute;inset:0;background:linear-gradient(105deg,rgba(11,10,8,.97) 42%,rgba(11,10,8,.55) 75%,transparent);z-index:1;}
.ipx .ip-fg-right{position:absolute;inset:0;background:linear-gradient(270deg,rgba(11,10,8,.82) 0%,transparent 50%);z-index:1;}
.ipx .ip-hero-left{position:relative;z-index:2;padding:36px 36px 36px 32px;display:flex;flex-direction:column;justify-content:center;}
.ipx .ip-hero-right{position:relative;z-index:2;padding:28px;display:flex;align-items:center;justify-content:center;}
.ipx .ip-nav-bar{position:relative;z-index:3;display:flex;align-items:center;gap:12px;padding:0 0 20px;}
.ipx .ip-breadcrumb{font-size:11px;color:var(--mut2);display:flex;align-items:center;gap:6px;}
.ipx .ip-breadcrumb button{background:none;border:none;color:var(--mut2);font-size:11px;cursor:pointer;padding:0;font-family:inherit;}
.ipx .ip-breadcrumb button:hover{color:var(--gold);}
.ipx .ip-tier-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(246,196,83,.10);border:1px solid rgba(246,196,83,.28);border-radius:999px;padding:7px 14px;font-size:10.5px;font-weight:800;color:var(--gold);margin-bottom:16px;width:fit-content;}
.ipx .ip-tier-badge .livdot{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 7px var(--green);animation:ippl 1.8s infinite;}
.ipx .ip-name{font-size:56px;font-weight:900;letter-spacing:-.04em;line-height:.88;margin-bottom:16px;}
.ipx .ip-name .serif-part{font-family:'Instrument Serif',serif;font-weight:400;font-style:italic;color:var(--gold);}
.ipx .ip-tagline{font-size:13px;color:var(--mut);margin-bottom:18px;max-width:400px;line-height:1.6;}
.ipx .ip-meta-row{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:20px;}
.ipx .ip-meta-row span{font-size:11.5px;color:var(--mut2);display:flex;align-items:center;gap:5px;}
.ipx .ip-meta-row span b{color:var(--txt);}
.ipx .ip-meta-row .live-badge{color:var(--green);font-weight:800;display:flex;align-items:center;gap:5px;}
.ipx .pulse{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 0 0 rgba(79,212,163,.6);animation:ippl 1.8s infinite;flex-shrink:0;}
@keyframes ippl{0%{box-shadow:0 0 0 0 rgba(79,212,163,.5)}70%{box-shadow:0 0 0 7px rgba(79,212,163,0)}100%{box-shadow:0 0 0 0 rgba(79,212,163,0)}}
.ipx .ip-actions{display:flex;gap:8px;flex-wrap:wrap;}
.ipx .btnP{padding:10px 17px;border-radius:12px;background:linear-gradient(135deg,var(--amber),var(--gold));color:#23170a;font-weight:800;font-size:12.5px;border:none;cursor:pointer;font-family:inherit;box-shadow:0 4px 16px rgba(220,139,24,.18);}
.ipx .btnG{padding:10px 15px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid var(--line2);color:var(--txt);font-weight:700;font-size:12.5px;cursor:pointer;font-family:inherit;}
.ipx .ip-orbit{position:relative;width:320px;height:320px;flex-shrink:0;}
.ipx .ip-ring1,.ipx .ip-ring2,.ipx .ip-ring3{position:absolute;top:50%;left:50%;border-radius:50%;transform:translate(-50%,-50%);}
.ipx .ip-ring1{width:100px;height:100px;border:1px solid rgba(246,196,83,.28);}
.ipx .ip-ring2{width:200px;height:200px;border:1px dashed rgba(116,168,255,.16);}
.ipx .ip-ring3{width:290px;height:290px;border:1px dashed rgba(255,255,255,.07);}
.ipx .ip-orbit-core{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:82px;height:82px;border-radius:50%;background:radial-gradient(circle,rgba(246,196,83,.22),rgba(220,139,24,.07));border:1.5px solid rgba(246,196,83,.4);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:2;}
.ipx .ip-orbit-core .cn{font-size:22px;font-weight:900;color:var(--gold);line-height:1;}
.ipx .ip-orbit-core .cl{font-size:8.5px;font-weight:800;color:var(--mut2);text-transform:uppercase;letter-spacing:.1em;margin-top:2px;}
.ipx .ip-orb-node{position:absolute;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:3px;z-index:2;}
.ipx .ip-orb-node .on-chip{height:42px;min-width:56px;border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 8px;backdrop-filter:blur(8px);border:1px solid;}
.ipx .ip-orb-node .on-n{font-size:14px;font-weight:900;line-height:1;}
.ipx .ip-orb-node .on-l{font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;opacity:.7;line-height:1;margin-top:2px;}
.ipx .ip-ticker{background:rgba(0,0,0,.6);border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:10px 0;overflow:hidden;}
.ipx .ip-ticker-track{display:flex;white-space:nowrap;animation:iptick 32s linear infinite;}
.ipx .ip-ticker-track:hover{animation-play-state:paused;}
@keyframes iptick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
.ipx .ip-tick-item{display:inline-flex;align-items:center;gap:7px;padding:0 24px;font-size:11px;font-weight:700;border-right:1px solid var(--line);}
.ipx .ip-tick-item .tid{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
.ipx .ip-body{padding:28px 30px 60px;max-width:1160px;margin:0 auto;}
.ipx .ip-statstrip{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:18px;overflow:hidden;margin-bottom:30px;}
.ipx .ip-stat{background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.025));padding:20px 18px;}
.ipx .ip-stat .sn{font-size:34px;font-weight:900;letter-spacing:-.04em;line-height:1;}
.ipx .ip-stat .sl{font-size:9.5px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mut2);margin-top:5px;}
.ipx .ip-stat .sd{font-size:10px;font-weight:700;margin-top:6px;display:flex;align-items:center;gap:4px;color:var(--green);}
.ipx .ip-sh{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
.ipx .ip-sh h2{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--mut2);white-space:nowrap;}
.ipx .ip-sh .hl{flex:1;height:1px;background:linear-gradient(90deg,var(--line2),transparent);}
.ipx .ip-sh .badge{font-size:10px;font-weight:800;padding:3px 10px;border-radius:999px;white-space:nowrap;}
.ipx .ip-dept-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:10px;margin-bottom:30px;}
.ipx .ip-dept{border:1px solid var(--line);border-radius:18px;padding:18px 16px;background:linear-gradient(160deg,rgba(255,255,255,.048),rgba(255,255,255,.018));position:relative;overflow:hidden;}
.ipx .ip-dept.feat{border-color:rgba(246,196,83,.3);background:linear-gradient(160deg,rgba(220,139,24,.11),rgba(246,196,83,.04));}
.ipx .ip-dept .dd-ghost{position:absolute;right:-6px;bottom:-12px;font-size:58px;font-weight:900;opacity:.055;pointer-events:none;letter-spacing:-.04em;line-height:1;}
.ipx .ip-dept .dd-code{font-size:24px;font-weight:900;letter-spacing:-.04em;margin-bottom:3px;}
.ipx .ip-dept .dd-sub{font-size:10.5px;color:var(--mut2);margin-bottom:12px;line-height:1.4;}
.ipx .ip-dept .dd-track{height:3px;background:rgba(255,255,255,.07);border-radius:999px;overflow:hidden;margin-bottom:12px;}
.ipx .ip-dept .dd-fill{height:100%;border-radius:999px;}
.ipx .ip-dept .dd-placed{font-size:30px;font-weight:900;letter-spacing:-.03em;line-height:1;}
.ipx .ip-dept .dd-elo{font-size:11px;color:var(--mut);margin-bottom:8px;}
.ipx .ip-rec-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-bottom:30px;}
.ipx .ip-rec{border:1px solid var(--line);border-radius:14px;padding:14px 10px;background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));display:flex;flex-direction:column;align-items:center;gap:5px;position:relative;}
.ipx .ip-rec.live-now::before{content:'';position:absolute;top:9px;right:9px;width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);animation:ippl 1.8s infinite;}
.ipx .ip-rec .ric{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;}
.ipx .ip-rec .rn{font-size:10.5px;font-weight:800;text-align:center;}
.ipx .ip-rec .rs{font-size:9px;color:var(--mut2);font-weight:700;text-align:center;}
.ipx .ip-bottom-row{display:grid;grid-template-columns:280px 1fr;gap:14px;margin-bottom:28px;}
.ipx .ip-trust{background:linear-gradient(135deg,rgba(79,212,163,.07),rgba(116,168,255,.04));border:1px solid rgba(79,212,163,.20);border-radius:18px;padding:20px;}
.ipx .ip-trust-score{font-size:58px;font-weight:900;color:var(--green);letter-spacing:-.05em;line-height:1;}
.ipx .ip-trust-label{font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--mut2);margin-top:3px;margin-bottom:16px;}
.ipx .ip-tcheck{display:flex;align-items:center;gap:8px;margin-bottom:7px;font-size:11.5px;}
.ipx .ip-tcheck .tc{width:18px;height:18px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:9.5px;flex-shrink:0;}
.ipx .ip-tcheck .tc.y{background:rgba(79,212,163,.2);color:var(--green);}
.ipx .ip-tcheck .tc.p{background:rgba(246,196,83,.16);color:var(--gold);}
.ipx .ip-tcheck .tc.n{background:rgba(255,129,119,.12);color:var(--red);}
.ipx .ip-hl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;}
.ipx .ip-hl{border:1px solid var(--line);border-radius:14px;padding:14px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.015));position:relative;overflow:hidden;}
.ipx .ip-hl .hy{font-size:9px;font-weight:800;color:var(--mut2);letter-spacing:.12em;text-transform:uppercase;margin-bottom:4px;}
.ipx .ip-hl .hv{font-size:26px;font-weight:900;letter-spacing:-.03em;line-height:1.05;}
.ipx .ip-hl .hs{font-size:10.5px;color:var(--mut);margin-top:4px;line-height:1.45;}
.ipx .ip-hl .hglow{position:absolute;right:-6px;bottom:-6px;width:54px;height:54px;border-radius:50%;opacity:.14;}
.ipx .ip-cta{border:1px solid rgba(246,196,83,.22);border-radius:18px;background:linear-gradient(135deg,rgba(220,139,24,.09),rgba(171,147,255,.05));padding:22px 24px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;}
.ipx .ip-cta .cta-text h3{font-size:15px;font-weight:800;margin-bottom:4px;}
.ipx .ip-cta .cta-text p{font-size:12px;color:var(--mut);}
.ipx .tag{font-size:10px;font-weight:800;padding:4px 9px;border-radius:999px;white-space:nowrap;}
.ipx .tag.gy{background:rgba(255,255,255,.07);color:var(--mut);}
@media(max-width:940px){.ipx .ip-hero{grid-template-columns:1fr;}.ipx .ip-hero-right{display:none;}.ipx .ip-dept-grid{grid-template-columns:1fr 1fr;}.ipx .ip-rec-grid{grid-template-columns:repeat(3,1fr);}.ipx .ip-statstrip{grid-template-columns:1fr 1fr;}.ipx .ip-bottom-row{grid-template-columns:1fr;}.ipx .ip-hl-grid{grid-template-columns:1fr 1fr;}}
@media(max-width:600px){.ipx .ip-name{font-size:36px;}.ipx .ip-dept-grid,.ipx .ip-hl-grid,.ipx .ip-statstrip{grid-template-columns:1fr;}.ipx .ip-rec-grid{grid-template-columns:repeat(2,1fr);}.ipx .ip-body{padding:18px 16px 50px;}.ipx .ip-hero-left{padding:24px 20px;}}
`

const C = { am:'#dc8b18',gold:'#f6c453',green:'#4fd4a3',blue:'#74a8ff',purple:'#ab93ff',cyan:'#54d9e0',pink:'#ff8db1',red:'#ff8177',teal:'#34d4bf' }

function buildBody(d) {
  // d = { orgName, orgLocation, orgType, naacGrade, studentCount, vLevel, websiteProvided, adminProvided, docUploaded }
  const orgName     = d.orgName     || "Your Institution"
  const orgLocation = d.orgLocation || "India"
  const orgType     = d.orgType     || "Higher Education"
  const naacGrade   = d.naacGrade   || ""
  const studentCount= d.studentCount|| "—"
  const vLevel      = d.vLevel || 0
  // "verified" here means Level 4 (Capabilio Verified badge) — the real,
  // manually-reviewed top level, not a single always-guessed boolean.
  const verified    = vLevel >= 4

  // Split org name: first word bold, rest italic-serif (like VIT / Vellore layout)
  const nameParts   = orgName.trim().split(/\s+/)
  const nameFirst   = nameParts[0]
  const nameRest    = nameParts.slice(1).join(" ")

  const naacBadge   = naacGrade ? ` · NAAC ${naacGrade}` : ""
  const verBadge    = verified
    ? `<span class="livdot"></span>✦ Capabilio Verified${naacBadge}`
    : vLevel > 0
    ? `<span style="width:6px;height:6px;border-radius:50%;background:var(--gold);display:inline-block"></span> ✦ Verification in progress (Level ${vLevel}/4)`
    : `<span style="width:6px;height:6px;border-radius:50%;background:var(--gold);display:inline-block"></span> ✦ Profile Active — Verification Pending`

  // Every row here maps to a real, checkable signal — see
  // lib/orgVerification.js for the level source of truth and
  // InstitutionOS.jsx's Settings → Verification tab for where each one is
  // actually completed. Nothing below is a static placeholder.
  const TRUST=[
    [vLevel >= 1 ? '✓' : '○', vLevel >= 1 ? 'Email verified' : 'Email verification pending', vLevel >= 1 ? 'y' : 'n'],
    [vLevel >= 2 ? '✓' : d.websiteProvided ? '⏳' : '○', vLevel >= 2 ? 'Institution domain verified' : d.websiteProvided ? 'Website on file — domain verification pending' : 'Website not provided', vLevel >= 2 ? 'y' : d.websiteProvided ? 'p' : 'n'],
    [d.adminProvided ? '✓' : '○', d.adminProvided ? 'Admin name & role on file' : 'Admin details not provided', d.adminProvided ? 'y' : 'n'],
    [d.docUploaded ? '✓' : '○', d.docUploaded ? 'NAAC / accreditation document uploaded' : 'NAAC certificate not uploaded', d.docUploaded ? 'y' : 'n'],
    [naacGrade ? '✓' : '○', naacGrade ? `NAAC ${naacGrade} grade on record` : 'NAAC grade not yet added', naacGrade ? 'y' : 'n'],
    [verified ? '✓' : d.docUploaded ? '⏳' : '○', verified ? 'Fully verified by Capabilio' : d.docUploaded ? 'Manual review in progress' : 'Awaiting document upload for review', verified ? 'y' : d.docUploaded ? 'p' : 'n'],
  ]
  // Weighted, not binary — each real signal contributes independently so
  // partial progress shows as partial credit, not a flat 40/72 toggle.
  const trustScore = Math.min(100, vLevel * 20 + (d.websiteProvided ? 5 : 0) + (d.adminProvided ? 5 : 0) + (d.docUploaded ? 5 : 0) + (naacGrade ? 5 : 0))

  // Canonical (institution_students / offers / placements) numbers when
  // available — real data, not a prediction. Each falls back to the honest
  // "Coming soon" placeholder it replaces when there's nothing to show yet
  // (e.g. no confirmed placements have a CTC recorded), same as before.
  const canon = d.canonical || {}
  const HLS=[
    canon.highestPackage != null
      ? {yr:'This cycle',v:`${canon.highestPackage} LPA`,s:'Highest confirmed package',c:C.gold}
      : {yr:'Coming soon',v:'—',s:'Highest package — add placement data to unlock',c:C.gold},
    canon.offersCount != null
      ? {yr:'This cycle',v:String(canon.offersCount),s:'Offers sent to your shared students',c:C.green}
      : {yr:'Coming soon',v:'—',s:'Offers this cycle — sync your placement records',c:C.green},
    canon.avgElo != null
      ? {yr:'Live',v:String(canon.avgElo),s:'Average student ELO across your roster',c:C.blue}
      : {yr:'Coming soon',v:'—',s:'Average ELO — students need Arena scores',c:C.blue},
    canon.placementRate != null
      ? {yr:'This cycle',v:`${canon.placementRate}%`,s:'Placement rate — confirmed placements / total roster',c:C.purple}
      : {yr:'Coming soon',v:'—',s:'Placement rate — complete student profiles to track',c:C.purple},
    canon.topElo != null
      ? {yr:'Live',v:String(canon.topElo),s:'Top student ELO on your roster',c:C.cyan}
      : {yr:'Coming soon',v:'—',s:'Top student ELO — pending Arena activity',c:C.cyan},
    canon.partnersCount != null
      ? {yr:'Live',v:String(canon.partnersCount),s:'Recruiters who have engaged your students',c:C.green}
      : {yr:'Coming soon',v:'—',s:'Recruiter partners — connect via Talent Network',c:C.green},
  ]

  const trustChecks=TRUST.map(t=>`<div class="ip-tcheck"><div class="tc ${t[2]}">${t[0]}</div><span>${t[1]}</span></div>`).join('')
  const hlCards=HLS.map(h=>`<div class="ip-hl"><div class="hy">${h.yr}</div><div class="hv" style="color:${h.c}">${h.v}</div><div class="hs">${h.s}</div><div class="hglow" style="background:${h.c}"></div></div>`).join('')

  return `<div class="ip-hero">
    <div class="ip-hero-bg"><canvas class="ipCanvas"></canvas><div class="ip-fg-left"></div><div class="ip-fg-right"></div></div>
    <div class="ip-hero-left">
      <div class="ip-nav-bar"><div class="ip-breadcrumb"><button data-ip="back">← Search</button><span>›</span><span>Institutions</span><span>›</span><b style="color:var(--txt)">${orgName}</b></div></div>
      <div class="ip-tier-badge">${verBadge}</div>
      <div class="ip-name">${nameFirst}${nameRest ? '<br><span class="serif-part">' + nameRest + '</span>' : ''}</div>
      <div class="ip-tagline">${orgName} — ${studentCount !== '—' ? studentCount + ' students' : 'building the next generation of talent'}, connecting with top recruiters on Capabilio.</div>
      <div class="ip-meta-row"><span>🏛️ ${orgType}</span>${orgLocation ? '<span>📍 ' + orgLocation + '</span>' : ''}<span>👥 <b>${studentCount}</b> students</span></div>
      <div class="ip-meta-row"><span class="live-badge"><span class="pulse"></span>Live on Capabilio</span><span>📅 Profile active</span></div>
      <div class="ip-actions"><button class="btnP" data-ip="reqAccess">⚡ Request Recruiter Access</button><button class="btnG" data-ip="follow">+ Follow</button><button class="btnG" data-ip="brochure">📥 Download Brochure</button></div>
    </div>
    <div class="ip-hero-right"><div class="ip-orbit" data-orbit><div class="ip-ring3"></div><div class="ip-ring2"></div><div class="ip-ring1"></div><div class="ip-orbit-core"><div class="cn">${studentCount}</div><div class="cl">Students</div></div></div></div>
  </div>
  <div class="ip-ticker"><div class="ip-ticker-track" data-ticker="${encodeURIComponent(orgName)}"></div></div>
  <div class="ip-body">
    <div class="ip-statstrip">
      <div class="ip-stat"><div class="sn" style="color:var(--green)">${canon.offersCount ?? '—'}</div><div class="sl">Offers this cycle</div><div class="sd" style="color:var(--mut2)">${canon.offersCount != null ? 'Live' : 'Add placement data'}</div></div>
      <div class="ip-stat"><div class="sn" style="color:var(--gold)">${canon.avgPackage != null ? canon.avgPackage + ' LPA' : '—'}</div><div class="sl">Avg Package</div><div class="sd" style="color:var(--mut2)">${canon.avgPackage != null ? 'Confirmed placements' : 'Pending records'}</div></div>
      <div class="ip-stat"><div class="sn" style="color:var(--blue)">${studentCount}</div><div class="sl">Students</div><div class="sd" style="color:var(--mut2)">On platform</div></div>
      <div class="ip-stat"><div class="sn" style="color:var(--cyan)">${canon.partnersCount ?? '—'}</div><div class="sl">Recruiter Partners</div><div class="sd" style="color:var(--mut2)">${canon.partnersCount != null ? 'Live' : 'Growing'}</div></div>
    </div>
    <div class="ip-sh"><h2>Departments</h2><div class="hl"></div><span class="badge" style="background:rgba(247,242,234,.07);color:var(--mut2)">${canon.branches && canon.branches.length ? 'Live' : 'Add via Settings'}</span></div>
    ${canon.branches && canon.branches.length
      ? '<div class="ip-dept-grid">' + canon.branches.slice(0,4).map((b,i)=>`<div class="ip-dept${i===0?' feat':''}"><div class="dd-code">${b.department}</div><div class="dd-sub">${b.students} students · avg ELO ${b.avgElo}</div><div class="dd-track"><div class="dd-fill" style="width:${Math.min(100,b.placedPct)}%;background:${C.gold}"></div></div><div class="dd-placed">${b.placedPct}%</div><div class="dd-elo">placed</div></div>`).join('') + '</div>'
      : '<div style="border:1px dashed rgba(255,255,255,.08);border-radius:16px;padding:32px;text-align:center;color:var(--mut2);font-size:12px;margin-bottom:24px">🎓 Department breakdown will appear here once students are linked to your institution</div>'}
    <div class="ip-sh"><h2>Recruiter Network</h2><div class="hl"></div><span class="badge" style="background:rgba(79,212,163,.12);color:var(--green)">● Active</span></div>
    ${canon.partnersCount ? `<div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px;text-align:center;color:var(--mut);font-size:13px;margin-bottom:24px">🤝 <b style="color:var(--txt)">${canon.partnersCount}</b> recruiter${canon.partnersCount===1?'':'s'} ${canon.partnersCount===1?'has':'have'} engaged your shared students</div>` : '<div style="border:1px dashed rgba(255,255,255,.08);border-radius:16px;padding:32px;text-align:center;color:var(--mut2);font-size:12px;margin-bottom:24px">🤝 Recruiter partners will appear here as they connect through Capabilio</div>'}
    <div class="ip-bottom-row">
      <div class="ip-trust"><div class="ip-trust-score" style="color:${verified ? 'var(--green)' : 'var(--gold)'}">${trustScore}</div><div class="ip-trust-label">Trust Score / 100</div>${trustChecks}</div>
      <div><div class="ip-sh"><h2>Landmark Outcomes</h2><div class="hl"></div></div><div class="ip-hl-grid">${hlCards}</div></div>
    </div>
    <div class="ip-cta"><div class="cta-text" style="flex:1"><h3>Partner with ${orgName}</h3><p>Access verified, skill-scored talent. NDA-gated. Sign a data agreement and receive curated shortlists in 48 hours.</p></div><button class="btnP" data-ip="reqAccess" style="white-space:nowrap">⚡ Request Access</button><button class="btnG" data-ip="follow" style="white-space:nowrap">+ Follow Institution</button></div>
  </div>`
}

function initInstPage(root) {
  // canvas particle field
  const cv = root.querySelector(".ipCanvas")
  let raf1, raf2, capTimer
  if (cv) {
    const ctx = cv.getContext("2d")
    let W, H, DPR = Math.min(window.devicePixelRatio || 1, 2), t2 = 0
    const rsz = () => { W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0) }
    rsz()
    const PTS = []
    for (let i = 0; i < 110; i++) PTS.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, r: Math.random() < .15 ? 2.5 : Math.random() < .4 ? 1.5 : 1, col: ['#f6c453', '#74a8ff', '#4fd4a3', '#ab93ff', '#54d9e0'][Math.floor(Math.random() * 5)], bright: Math.random() })
    const hx = (col, a) => { const n = parseInt(col.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')' }
    const loop = () => {
      if (!root.isConnected) return
      t2++; ctx.clearRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(255,255,255,.025)'; ctx.lineWidth = 1
      for (let i = 0; i < W; i += 56) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke() }
      for (let i = 0; i < H; i += 56) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke() }
      PTS.forEach(p => {
        p.x += p.vx; p.y += p.vy
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        const pulse = p.bright * .4 + .3 + Math.sin(t2 * .025 + p.bright * 6.28) * .25
        PTS.forEach(q => { const d = Math.hypot(p.x - q.x, p.y - q.y); if (d < 90 && d > 1) { ctx.strokeStyle = hx(p.col, (.9 - d / 90) * .10); ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke() } })
        if (p.r > 1.8) { const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4); g.addColorStop(0, hx(p.col, pulse * .7)); g.addColorStop(1, hx(p.col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 7); ctx.fill() }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = hx(p.col, pulse * .9); ctx.fill()
      })
      raf1 = requestAnimationFrame(loop)
    }
    loop()
  }
  // orbit nodes
  const orbit = root.querySelector("[data-orbit]")
  if (orbit) {
    const CX = 160, CY = 160
    const sc = orbit.closest(".ipx")?.dataset?.studentCount || "—"
    const ds = orbit.closest(".ipx")?.dataset || {}
    const ONODES = [
      { angle: 0,   r: 82,  n: sc,                              l: 'Students', col: '#74a8ff' },
      { angle: 180, r: 82,  n: ds.partners || '—',               l: 'Partners',  col: '#54d9e0' },
      { angle: 75,  r: 128, n: ds.avgPkg ? ds.avgPkg + ' LPA' : '—', l: 'Avg Pkg',   col: '#f6c453' },
      { angle: 255, r: 128, n: ds.offers || '—',                 l: 'Offers',    col: '#ab93ff' },
      { angle: 330, r: 152, n: ds.trust || '—',                  l: 'Trust',     col: '#4fd4a3' },
      { angle: 150, r: 152, n: ds.avgElo || '—',                 l: 'Avg ELO',   col: '#dc8b18' },
    ]
    ONODES.forEach(o => {
      const rad = o.angle * Math.PI / 180, px = CX + o.r * Math.cos(rad), py = CY + o.r * Math.sin(rad)
      const el = document.createElement("div"); el.className = "ip-orb-node"; el.style.cssText = 'left:' + px + 'px;top:' + py + 'px;'
      el.innerHTML = '<div class="on-chip" style="background:' + o.col + '18;border-color:' + o.col + '44;"><div class="on-n" style="color:' + o.col + '">' + o.n + '</div><div class="on-l" style="color:' + o.col + '">' + o.l + '</div></div>'
      orbit.appendChild(el)
    })
    const r2 = orbit.querySelector(".ip-ring2"), r3 = orbit.querySelector(".ip-ring3")
    if (r2) r2.style.animation = 'ipOrb 18s linear infinite'
    if (r3) r3.style.animation = 'ipOrb 28s linear infinite reverse'
    if (!document.getElementById("ipOrbKeyframes")) { const s = document.createElement("style"); s.id = "ipOrbKeyframes"; s.textContent = '@keyframes ipOrb{to{transform:translate(-50%,-50%) rotate(360deg)}}'; document.head.appendChild(s) }
  }
  // ticker
  const track = root.querySelector("[data-ticker]")
  if (track) {
    const name = decodeURIComponent(track.dataset.ticker || "Your Institution")
    const TICKS = [
      { col: '#4fd4a3', txt: `${name} is live on Capabilio` },
      { col: '#f6c453', txt: 'Recruiter access requests now open' },
      { col: '#74a8ff', txt: `${name} — talent signal updating in real time` },
      { col: '#ab93ff', txt: 'Students building verified skill profiles' },
      { col: '#54d9e0', txt: 'Placement data sync coming soon' },
      { col: '#dc8b18', txt: 'Complete your profile to unlock Trust Seal' },
      { col: '#4fd4a3', txt: 'Arena challenges active for students' },
      { col: '#ff8db1', txt: 'Add departments to unlock department breakdown' },
      { col: '#f6c453', txt: `${name} — building the next generation of talent` },
      { col: '#74a8ff', txt: 'Connect recruiter partners to grow your network' },
    ]
    track.innerHTML = TICKS.concat(TICKS).map(t => '<span class="ip-tick-item"><span class="tid" style="background:' + t.col + '"></span>' + t.txt + '</span>').join('')
  }
  return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); clearTimeout(capTimer) }
}

export default function InstitutionPublicProfile({ onBack, onAction, userData, members }) {
  const ref = useRef(null)
  // Fetched independently (not threaded through props) so this component
  // stays a self-contained public-profile view regardless of which page
  // renders it. Degrades to the existing "—" placeholders on any failure —
  // this is a showcase page, it must never hard-fail because of it.
  const [canonical, setCanonical] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const mine = await collegeApi.myInstitution()
        const institutionId = mine?.institution?.id
        if (!institutionId) return
        const [stats, branches, offers, placements] = await Promise.all([
          collegeApi.getStats(institutionId).catch(() => null),
          collegeApi.getBranches(institutionId).catch(() => null),
          collegeApi.listOffers(institutionId).catch(() => null),
          collegeApi.listPlacements(institutionId, { status: "tpo_confirmed" }).catch(() => null),
        ])
        if (cancelled) return
        const confirmedCtcs = (placements?.placements || []).map(p => p.ctc_lpa).filter(v => typeof v === "number")
        const partnerIds = new Set((offers?.offers || []).map(o => o.recruiter_id).filter(Boolean))
        setCanonical({
          totalStudents: stats?.totalStudents,
          avgElo: stats?.avgElo,
          topElo: (branches?.branches || []).reduce((m, b) => Math.max(m, b.avgElo || 0), 0) || null,
          placementRate: stats?.placementRate,
          offersCount: offers?.offers?.length ?? null,
          avgPackage: confirmedCtcs.length ? Math.round((confirmedCtcs.reduce((a, b) => a + b, 0) / confirmedCtcs.length) * 10) / 10 : null,
          highestPackage: confirmedCtcs.length ? Math.max(...confirmedCtcs) : null,
          partnersCount: partnerIds.size || null,
          branches: branches?.branches || [],
        })
      } catch (_) { /* stays null — placeholders render as before */ }
    })()
    return () => { cancelled = true }
  }, [])

  // Derive dynamic values from props
  const studentCount = canonical?.totalStudents ?? (members
    ? members.filter(m => m.role === "student" || m.role === "Student").length || members.length
    : (userData?.student_count || "—"))

  const profileData = {
    orgName:        userData?.org_name      || "Your Institution",
    orgLocation:    userData?.org_location  || "",
    orgType:        userData?.org_inst_type || userData?.org_industry || "Higher Education",
    naacGrade:      userData?.org_naac_grade|| "",
    studentCount:   studentCount || "—",
    // Real, institution-specific verification (Settings → Verification /
    // lib/orgVerification.js) — replaces the old `userData.verified` boolean,
    // which is a generic professional-identity flag (backend/routes/verify.js)
    // that institution accounts never go through, so it was always false and
    // the whole trust card always showed the same fake "40, pending" state.
    vLevel:         verificationLevel(userData),
    websiteProvided:!!userData?.org_website,
    adminProvided:  !!(userData?.org_admin_name && userData?.org_admin_role),
    docUploaded:    !!userData?.org_naac_cert_url,
    canonical,
  }

  useEffect(() => {
    const root = ref.current
    if (!root) return
    root.dataset.studentCount = profileData.studentCount
    root.dataset.partners = canonical?.partnersCount || ""
    root.dataset.avgPkg = canonical?.avgPackage || ""
    root.dataset.offers = canonical?.offersCount || ""
    root.dataset.avgElo = canonical?.avgElo || ""
    root.innerHTML = buildBody(profileData)
    const cleanup = initInstPage(root)
    const onClick = (e) => {
      const b = e.target.closest("[data-ip]")
      if (!b) return
      const act = b.dataset.ip
      if (act === "back" && onBack) onBack()
      else if (onAction) onAction(act)
    }
    root.addEventListener("click", onClick)
    return () => { root.removeEventListener("click", onClick); cleanup && cleanup() }
  // Re-render when userData, members, or fetched canonical data changes
  }, [onBack, onAction, userData, members, canonical])

  return (
    <>
      <style>{IP_CSS}</style>
      <div className="ipx" ref={ref} />
    </>
  )
}
