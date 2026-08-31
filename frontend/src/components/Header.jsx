/**
 * CAPABILIO — Header.jsx (Glassmorphic Cosmos)
 * Dark glass top bar, indigo/gold brand, ELO crown jewel badge, cinematic feel
 */

import { useEffect, useRef, useState } from "react"
import { nexusApi } from "../lib/api"

export default function Header({
  user,
  currentPage = "aura",
  activeTab   = "dashboard",
  onNavigate,
  onTabChange,
  onSignOut,
  userData     = {},
  pageVisibility = {},
}) {
  const [scrolled,          setScrolled]          = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu,      setShowUserMenu]       = useState(false)
  const [badgeAnimKey,      setBadgeAnimKey]       = useState(0)
  const [prevNotifCount,    setPrevNotifCount]     = useState(0)
  const [eloUpdated,        setEloUpdated]         = useState(false)
  const prevElo                                    = useRef(null)

  // "?"? nav config "?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?"?
  const NAV_BY_PATH = {
      student: [
        { id: "aura",        label: "Aura",        icon: "?" },
        { id: "skillstudio", label: "Skill Studio", icon: "??" },
        { id: "launchpad",   label: "Launchpad",    icon: "??" },
        { 
          id: "services", 
          label: "Services", 
          icon: "???", 
          isDropdown: true,
          items: [
            { id: "codeVault", label: "Code Vault", desc: "Saved snippets", icon: "??" },
            { id: "challenges", label: "Challenges", desc: "Climb the leaderboard", icon: "??" },
            { id: "communityFeed", label: "Community Feed", desc: "See what others build", icon: "??" },
            { id: "codeVerification", label: "Code Integrity", desc: "GitHub Verification", icon: "???" },
            { id: "resumeVerification", label: "Verified Resume", desc: "Capabilio Trust Verification", icon: "??" }
          ]
        }
      ],
      professional: [
        { id: "aura",      label: "Orbit",     icon: "?"  },
        { id: "arena",     label: "Forge",     icon: "??"  },
        { id: "nexus",     label: "Nexus",     icon: "??" },
        { id: "launchpad", label: "Launchpad", icon: "??"  },
        { id: "pulse",     label: "Signal",    icon: "??"  },
      ],
      authority: [
        { id: "aura",      label: "Authority",   icon: "?"  },
        { id: "nexus",     label: "Nexus",       icon: "??" },
        { id: "pulse",     label: "Signal Room", icon: "??"  },
        { id: "launchpad", label: "Launchpad",   icon: "??"  },
      ],
      institution: [
        { id: "monthreport", label: "Reports",       icon: "??" },
        { id: "settings",    label: "Settings",      icon: "??" },
      ],
    }

  const AURA_TABS_BY_PATH = {
    student: [
      { id: "dashboard",   label: "Dashboard",    icon: "▦"  },
      { id: "skillgraph",  label: "Skills",        icon: "↗"  },
      { id: "voucher",     label: "Skill Voucher", icon: "🎫" },
      { id: "interview",   label: "AI Interview",  icon: "□"  },
      { id: "vault",       label: "Vault",         icon: "◫"  },
      { id: "skillgap",    label: "Skill Gaps",    icon: "⚡" },
      { id: "resilience",  label: "Resilience",    icon: "💪" },
      { id: "fingerprint", label: "Code DNA",      icon: "🧬" },
      { id: "settings",    label: "Settings",      icon: "⚙️" },
    ],
    professional: [
      { id: "dashboard",   label: "Dashboard",   icon: "▦"  },
      { id: "skillgraph",  label: "Skills",       icon: "↗"  },
      { id: "skillgap",    label: "Skill Gaps",   icon: "⚡" },
      { id: "interview",   label: "AI Interview", icon: "□"  },
      { id: "vault",       label: "Vault",        icon: "◫"  },
      { id: "monthreport", label: "Month Report", icon: "📊" },
      { id: "resilience",  label: "Resilience",   icon: "💪" },
      { id: "fingerprint", label: "Code DNA",     icon: "🧬" },
      { id: "settings",    label: "Settings",     icon: "⚙️" },
    ],
    authority: [
      { id: "dashboard",   label: "Dashboard", icon: "▦"  },
      { id: "vault",       label: "Vault",      icon: "◫"  },
      { id: "monthreport", label: "Insights",   icon: "📊" },
      { id: "settings",    label: "Settings",   icon: "⚙️" },
    ],
    institution: [
      { id: "dashboard",   label: "Dashboard",    icon: "▦"  },
      { id: "skillgraph",  label: "Cohort Skills", icon: "↗"  },
      { id: "monthreport", label: "Reports",       icon: "📊" },
      { id: "settings",    label: "Settings",      icon: "⚙️" },
    ],
  }

  const navLinks     = NAV_BY_PATH[path]       || NAV_BY_PATH.student
  const auraTabs     = AURA_TABS_BY_PATH[path] || AURA_TABS_BY_PATH.student
  const userMenuTabs = auraTabs.map(t => ({ icon: t.icon, label: t.label, tab: t.id }))

  // ── notifications ──────────────────────────────────────────────────────────
  // 2026-08-05 BUG FIX: this used to be 4 hardcoded fake rows shown to every
  // user regardless of what actually happened on their account — the bell
  // never reflected reality. The real `notifications` table + GET/POST
  // /api/nexus/notifications routes already existed (used by Nexus.jsx's
  // Notifications tab and by recruiterComms.js/pulseNexus.js as writers) —
  // this was just never wired up here despite being the platform's most
  // visible, cross-path notification surface. Now reads the real feed, which
  // also makes the new re-engagement digest (streak-break / ELO-decay /
  // stale-skill nudges — see backend/scripts/sendReengagementDigest.js)
  // actually visible to users instead of only existing in the database.
  const [notifications, setNotifications] = useState([])
  const NOTIF_META = {
    connection_request:  { icon: "🤝", color: "#6366F1" },
    connection_accepted: { icon: "✅", color: "#10B981" },
    recruiter_message:   { icon: "💬", color: "#6366F1" },
    post_acknowledge:    { icon: "👏", color: "#8B5CF6" },
    post_signal:         { icon: "⚡", color: "#6366F1" },
    interview_scheduled: { icon: "📅", color: "#F59E0B" },
    offer_received:      { icon: "🎁", color: "#10B981" },
    offer_response:      { icon: "🎁", color: "#10B981" },
    new_application:     { icon: "💼", color: "#10B981" },
    new_follower:        { icon: "👤", color: "#6366F1" },
    streak_break_risk:   { icon: "🔥", color: "#F59E0B" },
    elo_decay_risk:      { icon: "⚡", color: "#DC2626" },
    skill_stale:         { icon: "🧠", color: "#8B5CF6" },
  }
  const DEFAULT_NOTIF_META = { icon: "🔔", color: "#6366F1" }

  function relTime(iso) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  }

  const loadNotifications = () => {
    if (!user) return
    nexusApi.notifications().then(d => setNotifications(Array.isArray(d) ? d : [])).catch(() => {})
  }

  useEffect(() => { loadNotifications() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  // Refresh on open so the bell doesn't show stale data from a stale mount.
  useEffect(() => { if (showNotifications) loadNotifications() }, [showNotifications]) // eslint-disable-line react-hooks/exhaustive-deps

  const unreadCount = notifications.filter(n => !n.is_read).length

  const markAllRead = () => {
    if (unreadCount === 0) return
    setNotifications(ns => ns.map(n => ({ ...n, is_read: true })))
    nexusApi.markRead().catch(() => {})
  }

  useEffect(() => {
    if (unreadCount !== prevNotifCount) {
      setBadgeAnimKey(k => k + 1)
      setPrevNotifCount(unreadCount)
    }
  }, [unreadCount, prevNotifCount])

  // ── profile strength ───────────────────────────────────────────────────────
  const profileStrength = (() => {
    let s = 0
    if (userData?.onboardingComplete)                          s += 20
    if (vaultFiles.some(f => f.category === "Resume"))         s += 20
    if (eloRating >= 650)                                      s += 15
    if ((userData?.skillGraph || []).length >= 5)              s += 15
    if ((userData?.strengths  || []).length > 0)               s += 15
    if (vaultFiles.some(f => f.category === "Certification"))  s += 15
    return s
  })()

  // ── user identity ──────────────────────────────────────────────────────────
  const firstName    = user?.displayName?.split(" ")[0] || "User"
  const initial      = user?.displayName?.charAt(0)?.toUpperCase() || "U"
  const accountLabel = path === "student"      ? "Student"
                     : path === "professional" ? "Professional"
                     : path === "institution"  ? "Institution"
                     : "Authority"

  // ── handlers ───────────────────────────────────────────────────────────────
  const closeOverlays     = () => { setShowNotifications(false); setShowUserMenu(false) }
  const handleNavigate    = (id) => { onNavigate?.(id); closeOverlays() }
  const handleUserMenuTab = (tabId) => { onNavigate?.("aura"); onTabChange?.(tabId); setShowUserMenu(false) }

  const NAV_HEIGHT    = 64
  const SUBNAV_HEIGHT = currentPage === "aura" ? 52 : 0

  // ── tiny pill helper ───────────────────────────────────────────────────────
  const pill = (bg, border, color) => ({
    background: bg, border: `1px solid ${border}`, borderRadius: 999,
    padding: "2px 8px", fontSize: 10, color, fontWeight: 700, lineHeight: 1.5,
    display: "inline-flex", alignItems: "center",
  })

  return (
    <>
      {/* ── Keyframes & class helpers ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');

        @keyframes hdrSlideDown {
          from { opacity:0; transform:translateY(-14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes popoverIn {
          from { opacity:0; transform:scale(0.88) translateY(-8px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes badgePop {
          0%   { transform:scale(0); }
          65%  { transform:scale(1.3); }
          100% { transform:scale(1); }
        }
        @keyframes profileBarFill {
          from { width:0%; }
        }
        @keyframes eloPulse {
          0%   { box-shadow:0 0 0 0 rgba(245,158,11,0.55); }
          50%  { box-shadow:0 0 0 8px rgba(245,158,11,0); }
          100% { box-shadow:0 0 0 0 rgba(245,158,11,0); }
        }

        .cg-shell {
          position:fixed; top:0; left:0; right:0; z-index:400;
          font-family:'DM Sans',system-ui,sans-serif;
          animation: hdrSlideDown 0.45s cubic-bezier(0,0,0.2,1) both;
        }
        .cg-topbar {
          height:${NAV_HEIGHT}px;
          display:grid;
          grid-template-columns:240px 1fr 320px;
          align-items:center;
          padding:0 24px;
          background:rgba(250,247,242,0.97);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          border-bottom:1px solid #E8E3DA;
          transition:box-shadow 0.3s ease;
        }
        .cg-topbar.scrolled {
          box-shadow:0 4px 20px rgba(26,23,20,0.07);
          border-bottom-color:#C8C2BA;
        }

        /* Logo mark */
        .cg-logo-mark {
          width:36px; height:36px; border-radius:10px; flex-shrink:0;
          background:#FF5701;
          display:flex; align-items:center; justify-content:center;
          font-family:'DM Sans',sans-serif; font-size:16px; font-weight:900; color:#fff;
          box-shadow:0 4px 18px rgba(255,87,1,0.30);
          transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
          user-select:none; cursor:pointer;
          letter-spacing:-0.5px;
        }
        .cg-logo-mark:hover {
          transform:scale(1.1) rotate(-5deg);
          box-shadow:0 8px 28px rgba(255,87,1,0.42);
        }          /* Dropdown styles */
          .cg-nav-item-wrapper { position: relative; display: inline-flex; }
          .cg-dropdown-menu {
            position: absolute; top: 100%; left: 50%; transform: translateX(-50%) translateY(10px);
            background: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 12px;
            box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1), 0 0 15px rgba(0,0,0,0.03);
            padding: 8px; min-width: 260px;
            opacity: 0; visibility: hidden; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            z-index: 100; margin-top: 4px; pointer-events: none;
          }
          .cg-nav-item-wrapper:hover .cg-dropdown-menu {
            opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); pointer-events: auto;
          }
          .cg-dropdown-item {
            display: flex; align-items: center; gap: 12px;
            padding: 12px 16px; color: #4B5563; font-size: 14px; font-weight: 500;
            cursor: pointer; text-decoration: none; border: none; background: transparent;
            width: 100%; text-align: left; transition: all 0.15s; border-radius: 8px;
            font-family: 'DM Sans', sans-serif;
          }
          .cg-dropdown-item:hover { background: #F3F4F6; color: #111827; }
          .cg-dropdown-icon { 
            width: 32px; height: 32px; border-radius: 8px; 
            display: flex; align-items: center; justifyContent: center;
            background: #F3F4F6; font-size: 16px;
          }
          .cg-dropdown-item:hover .cg-dropdown-icon { background: #FFFFFF; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

          /* Nav links */
        .cg-nav-link {
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 15px; border-radius:10px;
          border:1px solid transparent; background:transparent;
          color:#6B6560; font-size:13px; font-weight:500; cursor:pointer;
          transition:all 0.18s ease; white-space:nowrap;
          font-family:'DM Sans',sans-serif; position:relative;
        }
        .cg-nav-link:hover { color:#1A1714; background:#F2EDE4; border-color:#E8E3DA; }
        .cg-nav-link:active { transform:scale(0.95); }
        .cg-nav-link.active {
          background:rgba(255,87,1,0.07); border-color:rgba(255,87,1,0.2);
          color:#FF5701; font-weight:600;
        }
        .cg-nav-link.active::after {
          content:''; position:absolute; bottom:-1px; left:50%; transform:translateX(-50%);
          width:20px; height:2px; border-radius:999px; background:#FF5701;
        }

        /* Icon button */
        .cg-icon-btn {
          width:38px; height:38px; border-radius:10px;
          border:1px solid #E8E3DA; background:#F2EDE4;
          color:#3D3935; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          position:relative; transition:all 0.18s ease;
        }
        .cg-icon-btn:hover {
          background:#EDE8DF;
          border-color:#C8C2BA;
          transform:translateY(-1px);
        }
        .cg-icon-btn:active { transform:scale(0.92); }

        /* Notification badge */
        .cg-notif-badge {
          position:absolute; top:4px; right:4px;
          min-width:16px; height:16px; border-radius:999px;
          background:#EF4444; border:2px solid #FFFFFF;
          color:#fff; font-size:8px; font-weight:800;
          display:flex; align-items:center; justify-content:center;
          padding:0 3px; line-height:1;
        }
        .cg-notif-badge.pop { animation:badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }

        /* ELO badge */
        .cg-elo-badge {
          display:inline-flex; align-items:center; gap:6px;
          padding:5px 14px; border-radius:9999px;
          background:#FFFBEB; border:1px solid rgba(217,119,6,0.25);
          transition:box-shadow 0.2s ease;
        }
        .cg-elo-badge.updated { animation:eloPulse 1s ease; }

        /* Popover */
        .cg-popover {
          position:absolute; top:48px; right:0;
          background:#FFFFFF; border:1px solid #E8E3DA;
          border-radius:14px; box-shadow:0 8px 32px rgba(26,23,20,0.10), 0 2px 8px rgba(26,23,20,0.05);
          overflow:hidden; z-index:500;
          animation:popoverIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both;
          transform-origin:top right;
        }

        /* Notification row */
        .cg-notif-row {
          display:flex; gap:12px; padding:12px 16px;
          cursor:pointer; transition:background 0.15s;
          border-bottom:1px solid #F0EBE3;
        }
        .cg-notif-row:last-child { border-bottom:none; }
        .cg-notif-row:hover { background:#FAF7F2; }

        /* Menu button */
        .cg-menu-btn {
          width:100%; display:flex; align-items:center; gap:10px;
          padding:11px 16px; background:transparent;
          border:none; border-bottom:1px solid #F0EBE3;
          color:#6B6560; font-size:13px; text-align:left;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s;
        }
        .cg-menu-btn:hover { background:#FAF7F2; color:#1A1714; }
        .cg-menu-btn.active { background:rgba(255,87,1,0.06); color:#FF5701; }
        .cg-menu-btn:last-of-type { border-bottom:none; }

        /* Avatar button */
        .cg-avatar-btn {
          display:flex; align-items:center; gap:10px;
          padding:5px 8px 5px 5px; border-radius:12px;
          border:1px solid transparent; background:transparent;
          cursor:pointer; transition:all 0.18s ease;
        }
        .cg-avatar-btn:hover {
          background:rgba(0,0,0,0.03);
          border-color:rgba(0,0,0,0.05);
        }

        /* Avatar ring */
        .cg-avatar-ring {
          width:34px; height:34px; border-radius:50%; flex-shrink:0;
          background:rgba(255,87,1,0.12); border:2px solid rgba(255,87,1,0.35);
          display:flex; align-items:center; justify-content:center;
          font-size:13px; font-weight:800; color:#FF5701;
          font-family:'DM Sans',sans-serif; position:relative;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .cg-avatar-btn:hover .cg-avatar-ring {
          border-color:rgba(255,87,1,0.6);
          box-shadow:0 0 0 3px rgba(255,87,1,0.12);
        }

        /* Online dot */
        .cg-online-dot {
          position:absolute; right:0; bottom:0;
          width:9px; height:9px; border-radius:50%;
          background:#10B981; border:2px solid #FFFFFF;
        }

        /* Chevron */
        .cg-chevron { font-size:10px; color:#A8A29E; transition:transform 0.2s; }
        .cg-chevron.open { transform:rotate(180deg); }

        /* Vertical divider */
        .cg-vdivider { width:1px; height:26px; background:#E8E3DA; margin:0 4px; flex-shrink:0; }

        /* Sub-tab bar */
        .cg-subbar {
          height:${SUBNAV_HEIGHT}px;
          background:#FAF7F2;
          border-bottom:1px solid #E8E3DA;
          display:flex; align-items:center; gap:2px;
          padding:0 24px; overflow-x:auto; scrollbar-width:none;
        }
        .cg-subbar::-webkit-scrollbar { display:none; }

        /* Sub-tab */
        .cg-subtab {
          display:inline-flex; align-items:center; gap:6px;
          padding:10px 13px;
          border:none; border-bottom:2px solid transparent;
          background:transparent; color:#A8A29E;
          font-size:12.5px; font-weight:500; cursor:pointer;
          white-space:nowrap; flex-shrink:0; font-family:'DM Sans',sans-serif;
          transition:all 0.18s ease;
        }
        .cg-subtab:hover { color:#3D3935; }
        .cg-subtab.active { color:#FF5701; border-bottom-color:#FF5701; font-weight:700; }

        /* Profile bar */
        .cg-profile-bar {
          height:5px; background:#E8E3DA;
          border-radius:999px; overflow:hidden;
        }
        .cg-profile-bar-fill {
          height:100%; border-radius:999px;
          background:linear-gradient(90deg,#FF5701,#E04D00);
          animation:profileBarFill 0.9s ease both;
        }

        /* Sign-out */
        .cg-signout-btn {
          width:100%; display:flex; align-items:center; gap:10px;
          padding:12px 16px; border:none; background:transparent;
          color:#DC2626; font-size:13px; text-align:left;
          cursor:pointer; font-family:'DM Sans',sans-serif; transition:background 0.15s;
        }
        .cg-signout-btn:hover { background:#FAF7F2; }
      `}</style>

      <div className="cg-shell">

        {/* ── Top bar ────────────────────────────────────────────────────────── */}
        <div className={`cg-topbar${scrolled ? " scrolled" : ""}`}>

          {/* ? Nav ????????????????????????????????????????????? */}
          <nav style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:2, minWidth:0 }}>
            {navLinks.map(link => {
              if (link.isDropdown) {
                return (
                  <div key={link.id} className="cg-nav-item-wrapper">
                    <button
                      className={cg-nav-link}>
                      <span style={{ fontSize:13 }}>{link.icon}</span>
                      {link.label}
                      <span style={{ fontSize:10, marginLeft: 4 }}>?</span>
                    </button>
                    <div className="cg-dropdown-menu">
                      {link.items.map(item => (
                        <button key={item.id} className="cg-dropdown-item" onClick={() => handleNavigate(item.id)}>
                          <div className="cg-dropdown-icon">{item.icon}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2 }}>{item.label}</div>
                            <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 400 }}>{item.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }
              return (
                <button key={link.id}
                  onClick={() => handleNavigate(link.id)}
                  className={cg-nav-link}>
                  <span style={{ fontSize:13 }}>{link.icon}</span>
                  {link.label}
                </button>
              )
            })}
          </nav>

          {/* ── Right cluster ─────────────────────────────────── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8 }}>

            {/* ELO badge — crown jewel */}
            <div className={`cg-elo-badge${eloUpdated ? " updated" : ""}`}>
              <span style={{
                fontFamily:"'DM Mono',monospace", fontSize:10,
                fontWeight:600, color:"rgba(217,119,6,0.65)", letterSpacing:"0.1em",
                lineHeight:1,
              }}>
                ELO
              </span>
              <span style={{
                fontFamily:"'DM Mono',monospace", fontSize:15,
                fontWeight:800, color:"#D97706", lineHeight:1,
              }}>
                {eloRating}
              </span>
            </div>

            <div className="cg-vdivider" />

            {/* Notifications bell */}
            <div style={{ position:"relative" }}>
              <button className="cg-icon-btn"
                onClick={() => { setShowNotifications(p => !p); setShowUserMenu(false) }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity:0.75 }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span key={badgeAnimKey} className="cg-notif-badge pop">{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <div className="cg-popover" style={{ width:340 }}>
                  <div style={{
                    padding:"14px 16px 12px",
                    borderBottom:"1px solid #F3F4F6",
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                  }}>
                    <span style={{ fontSize:14, fontWeight:700, color:"#1A1714" }}>Notifications</span>
                    <button onClick={markAllRead} disabled={unreadCount === 0}
                      style={{ border:"none", background:"transparent", color: unreadCount === 0 ? "#A8A29E" : "#FF5701", fontSize:11, fontWeight:700, cursor: unreadCount === 0 ? "default" : "pointer" }}>
                      Mark all read
                    </button>
                  </div>

                  {notifications.length === 0 && (
                    <div style={{ padding:"22px 16px", textAlign:"center", fontSize:12, color:"#A8A29E" }}>
                      No notifications yet.
                    </div>
                  )}

                  {notifications.slice(0, 8).map((item) => {
                    const meta = NOTIF_META[item.type] || DEFAULT_NOTIF_META
                    return (
                      <div key={item.id} className="cg-notif-row"
                        style={{ background: !item.is_read ? "rgba(255,87,1,0.04)" : "transparent" }}>
                        <div style={{
                          width:34, height:34, borderRadius:10,
                          background:`${meta.color}1A`,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          fontSize:15, flexShrink:0,
                        }}>
                          {meta.icon}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, color:"#3D3935", lineHeight:1.5, marginBottom:2, fontWeight: item.is_read ? 400 : 600 }}>{item.title || item.body}</div>
                          {item.title && item.body && (
                            <div style={{ fontSize:11, color:"#6B6560", lineHeight:1.4, marginBottom:2 }}>{item.body}</div>
                          )}
                          <div style={{ fontSize:10, color:"#A8A29E" }}>{relTime(item.created_at)}</div>
                        </div>
                        {!item.is_read && (
                          <div style={{ width:7, height:7, borderRadius:"50%", background:meta.color, marginTop:5, flexShrink:0 }} />
                        )}
                      </div>
                    )
                  })}

                  <div style={{ padding:"11px 16px", textAlign:"center", borderTop:"1px solid #E8E3DA" }}>
                    <button onClick={() => { setShowNotifications(false); onNavigate?.("nexus") }}
                      style={{ border:"none", background:"transparent", color:"#FF5701", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                      View all →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="cg-vdivider" />

            {/* Avatar + user menu */}
            <div style={{ position:"relative" }}>
              <button className="cg-avatar-btn"
                onClick={() => { setShowUserMenu(p => !p); setShowNotifications(false) }}>
                <div className="cg-avatar-ring">
                  {initial}
                  <div className="cg-online-dot" />
                </div>
                <div style={{ textAlign:"left", minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1A1714", lineHeight:1.2, whiteSpace:"nowrap" }}>
                    {firstName}
                  </div>
                  <div style={{ fontSize:10, color:"#6B6560", lineHeight:1.3, whiteSpace:"nowrap" }}>
                    {keyword}
                    {" · "}
                    <span style={{ color:eloTier.color, fontWeight:700 }}>{eloTier.tier}</span>
                  </div>
                </div>
                <span className={`cg-chevron${showUserMenu ? " open" : ""}`}>▾</span>
              </button>

              {showUserMenu && (
                <div className="cg-popover" style={{ width:276 }}>

                  {/* Profile header */}
                  <div style={{ padding:16, borderBottom:"1px solid #E8E3DA" }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                      <div style={{
                        width:48, height:48, borderRadius:"50%", flexShrink:0,
                        background:"rgba(255,87,1,0.12)", border:"2px solid rgba(255,87,1,0.3)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:18, fontWeight:800, color:"#FF5701",
                        fontFamily:"'DM Sans',sans-serif", position:"relative",
                      }}>
                        {initial}
                        <div style={{
                          position:"absolute", right:1, bottom:1,
                          width:10, height:10, borderRadius:"50%",
                          background:"#16A34A", border:"2px solid #FFFFFF",
                        }} />
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#1A1714", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {user?.displayName || "User"}
                        </div>
                        <div style={{ fontSize:11, color:"#6B6560", marginBottom:7, wordBreak:"break-word" }}>
                          {user?.email || ""}
                        </div>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                          <span style={pill("rgba(255,87,1,0.10)","rgba(255,87,1,0.28)","#FF5701")}>{keyword}</span>
                          <span style={pill(`${eloTier.color}1A`,`${eloTier.color}40`,eloTier.color)}>{eloTier.tier}</span>
                          <span style={pill("rgba(22,163,74,0.10)","rgba(22,163,74,0.28)","#16A34A")}>{accountLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Profile strength */}
                    <div style={{ background:"#F2EDE4", borderRadius:10, padding:"10px 11px", border:"1px solid #E8E3DA" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{
                          fontSize:10, color:"#6B6560", fontWeight:700,
                          fontFamily:"'DM Mono',monospace", letterSpacing:"0.08em",
                        }}>
                          PROFILE STRENGTH
                        </span>
                        <span style={{
                          fontSize:10, fontWeight:800, fontFamily:"'DM Mono',monospace",
                          color: profileStrength >= 75 ? "#16A34A" : "#D97706",
                        }}>
                          {profileStrength}%
                        </span>
                      </div>
                      <div className="cg-profile-bar">
                        <div className="cg-profile-bar-fill" style={{ width:`${profileStrength}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Tab navigation */}
                  <div style={{ maxHeight:280, overflowY:"auto", scrollbarWidth:"none" }}>
                    {userMenuTabs.map(item => (
                      <button key={item.tab}
                        onClick={() => handleUserMenuTab(item.tab)}
                        className={`cg-menu-btn${activeTab === item.tab && currentPage === "aura" ? " active" : ""}`}>
                        <span style={{ width:20, textAlign:"center", fontSize:14 }}>{item.icon}</span>
                        <span>{item.label}</span>
                        {item.tab === "vault" && vaultFiles.length > 0 && (
                          <span style={{
                            marginLeft:"auto", background:"#FF5701", color:"#fff",
                            fontSize:9, fontWeight:800, padding:"2px 6px", borderRadius:999, lineHeight:1.4,
                          }}>
                            {vaultFiles.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Sign out */}
                  <div style={{ borderTop:"1px solid #E8E3DA" }}>
                    <button className="cg-signout-btn"
                      onClick={() => { setShowUserMenu(false); onSignOut?.() }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                        <polyline points="16 17 21 12 16 7"/>
                        <line x1="21" y1="12" x2="9" y2="12"/>
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sub-tab bar (aura page only) ───────────────────────────────────── */}
        {currentPage === "aura" && (
          <div className="cg-subbar">
            <div style={{
              marginRight:16, paddingRight:16,
              borderRight:"1px solid #E8E3DA",
              flexShrink:0, display:"flex", flexDirection:"column", justifyContent:"center",
            }}>
              <div style={{
                fontSize:13, fontWeight:700, color:"#1A1714",
                fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.2px", lineHeight:1.2,
              }}>
                Aura
              </div>
              <div style={{ fontSize:10, color:"#6B6560", lineHeight:1.3 }}>Career profile &amp; insights</div>
            </div>

            {auraTabs.map(tab => (
              <button key={tab.id}
                className={`cg-subtab${activeTab === tab.id ? " active" : ""}`}
                onClick={() => onTabChange?.(tab.id)}>
                <span style={{ fontSize:12 }}>{tab.icon}</span>
                {tab.label}
                {tab.id === "vault" && vaultFiles.length > 0 && (
                  <span style={{
                    background:"#FF5701", color:"#fff",
                    fontSize:9, fontWeight:800, padding:"1px 6px", borderRadius:999, lineHeight:1.5,
                  }}>
                    {vaultFiles.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Overlay to close popovers */}
      {(showNotifications || showUserMenu) && (
        <div style={{ position:"fixed", inset:0, zIndex:399 }} onClick={closeOverlays} />
      )}

      {/* Spacer so page content clears the fixed header */}
      <div style={{ height: NAV_HEIGHT + SUBNAV_HEIGHT }} />
    </>
  )
}

