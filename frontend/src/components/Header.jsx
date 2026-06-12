/**
 * CAPABILIO — Header.jsx (Glassmorphic Cosmos)
 * Dark glass top bar, indigo/gold brand, ELO crown jewel badge, cinematic feel
 */

import { useEffect, useRef, useState } from "react"

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

  // ── scroll shadow ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // ── derived user data ──────────────────────────────────────────────────────
  const keyword     = userData?.keyword    || "General"
  const path        = userData?.path       || "student"
  const eloRating   = userData?.eloScore   || userData?.eloRating || 800
  const vaultFiles  = Array.isArray(userData?.vaultFiles) ? userData.vaultFiles : []
  const arenaStreak = userData?.arenaStreak || 0

  // ── ELO pulse on change ───────────────────────────────────────────────────
  useEffect(() => {
    if (prevElo.current !== null && prevElo.current !== eloRating) {
      setEloUpdated(true)
      const t = setTimeout(() => setEloUpdated(false), 1200)
      return () => clearTimeout(t)
    }
    prevElo.current = eloRating
  }, [eloRating])

  // ── getEloTier ─────────────────────────────────────────────────────────────
  const getEloTier = (elo) => {
    if (elo >= 750) return { tier: "Expert",   color: "#F59E0B" }
    if (elo >= 650) return { tier: "Advanced", color: "#8B5CF6" }
    if (elo >= 550) return { tier: "Rising",   color: "#6366F1" }
    if (elo >= 450) return { tier: "Building", color: "#10B981" }
    if (elo >= 400) return { tier: "Learning", color: "#F59E0B" }
    return                  { tier: "Beginner",color: "#64748B" }
  }
  const eloTier = getEloTier(eloRating)

  // ── nav config ─────────────────────────────────────────────────────────────
  const NAV_BY_PATH = {
    student: [
      { id: "aura",        label: "Aura",        icon: "✦" },
      { id: "arena",       label: "Arena",        icon: "⚔" },
      { id: "skillstudio", label: "Skill Studio", icon: "🎓" },
      { id: "launchpad",   label: "Launchpad",    icon: "🚀" },
    ],
    professional: [
      { id: "aura",      label: "Orbit",     icon: "✦"  },
      { id: "arena",     label: "Forge",     icon: "⚔"  },
      { id: "nexus",     label: "Nexus",     icon: "🏛️" },
      { id: "launchpad", label: "Launchpad", icon: "🚀"  },
      { id: "pulse",     label: "Signal",    icon: "📡"  },
    ],
    authority: [
      { id: "aura",      label: "Authority",   icon: "✦"  },
      { id: "nexus",     label: "Nexus",       icon: "🏛️" },
      { id: "pulse",     label: "Signal Room", icon: "📡"  },
      { id: "launchpad", label: "Launchpad",   icon: "🚀"  },
    ],
    institution: [
      { id: "aura",      label: "Institution", icon: "✦"  },
      { id: "nexus",     label: "Nexus",       icon: "🏛️" },
      { id: "launchpad", label: "Placements",  icon: "🚀"  },
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
  const notifications = [
    { icon: "⚡", text: `ELO updated to ${eloRating}`,                                  time: "Just now",   color: "#6366F1", unread: true  },
    { icon: "🔥", text: arenaStreak > 0 ? `${arenaStreak}-day streak!` : "Start a task today", time: "Today", color: "#F59E0B", unread: true },
    { icon: "💼", text: "New jobs matched to your profile",                              time: "2 hours ago",color: "#10B981", unread: false },
    { icon: "🎯", text: "New Arena tasks available",                                     time: "1 hour ago", color: "#8B5CF6", unread: true  },
  ]
  const unreadCount = notifications.filter(n => n.unread).length

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700;800&display=swap');

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
          font-family:'Inter',sans-serif;
          animation: hdrSlideDown 0.45s cubic-bezier(0,0,0.2,1) both;
        }
        .cg-topbar {
          height:${NAV_HEIGHT}px;
          display:grid;
          grid-template-columns:240px 1fr 320px;
          align-items:center;
          padding:0 24px;
          background:rgba(255,255,255,0.96);
          backdrop-filter:blur(20px);
          -webkit-backdrop-filter:blur(20px);
          border-bottom:1px solid #E5E7EB;
          transition:box-shadow 0.3s ease;
        }
        .cg-topbar.scrolled {
          box-shadow:0 4px 20px rgba(0,0,0,0.07);
          border-bottom-color:#D1D5DB;
        }

        /* Logo mark */
        .cg-logo-mark {
          width:36px; height:36px; border-radius:10px; flex-shrink:0;
          background:linear-gradient(135deg,#6366F1,#8B5CF6);
          display:flex; align-items:center; justify-content:center;
          font-family:'Inter',sans-serif; font-size:16px; font-weight:900; color:#fff;
          box-shadow:0 4px 18px rgba(99,102,241,0.38);
          transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
          user-select:none; cursor:pointer;
          letter-spacing:-0.5px;
        }
        .cg-logo-mark:hover {
          transform:scale(1.1) rotate(-5deg);
          box-shadow:0 8px 32px rgba(99,102,241,0.55);
        }

        /* Nav links */
        .cg-nav-link {
          display:inline-flex; align-items:center; gap:7px;
          padding:8px 15px; border-radius:10px;
          border:1px solid transparent; background:transparent;
          color:#6B7280; font-size:13px; font-weight:500; cursor:pointer;
          transition:all 0.18s ease; white-space:nowrap;
          font-family:'Inter',sans-serif; position:relative;
        }
        .cg-nav-link:hover { color:#0F172A; background:#F9FAFB; border-color:#E5E7EB; }
        .cg-nav-link:active { transform:scale(0.95); }
        .cg-nav-link.active {
          background:rgba(99,102,241,0.07); border-color:rgba(99,102,241,0.2);
          color:#4F46E5; font-weight:600;
        }
        .cg-nav-link.active::after {
          content:''; position:absolute; bottom:-1px; left:50%; transform:translateX(-50%);
          width:20px; height:2px; border-radius:999px; background:#6366F1;
        }

        /* Icon button */
        .cg-icon-btn {
          width:38px; height:38px; border-radius:10px;
          border:1px solid rgba(0,0,0,0.05); background:rgba(0,0,0,0.02);
          color:#374151; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          position:relative; transition:all 0.18s ease;
        }
        .cg-icon-btn:hover {
          background:rgba(0,0,0,0.05);
          border-color:rgba(0,0,0,0.08);
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
          background:rgba(245,158,11,0.12); border:1px solid rgba(245,158,11,0.25);
          transition:box-shadow 0.2s ease;
        }
        .cg-elo-badge.updated { animation:eloPulse 1s ease; }

        /* Popover */
        .cg-popover {
          position:absolute; top:48px; right:0;
          background:#FFFFFF; border:1px solid #E5E7EB;
          border-radius:14px; box-shadow:0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
          overflow:hidden; z-index:500;
          animation:popoverIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both;
          transform-origin:top right;
        }

        /* Notification row */
        .cg-notif-row {
          display:flex; gap:12px; padding:12px 16px;
          cursor:pointer; transition:background 0.15s;
          border-bottom:1px solid rgba(0,0,0,0.03);
        }
        .cg-notif-row:last-child { border-bottom:none; }
        .cg-notif-row:hover { background:rgba(0,0,0,0.03); }

        /* Menu button */
        .cg-menu-btn {
          width:100%; display:flex; align-items:center; gap:10px;
          padding:11px 16px; background:transparent;
          border:none; border-bottom:1px solid rgba(0,0,0,0.02);
          color:#6B7280; font-size:13px; text-align:left;
          cursor:pointer; font-family:'Inter',sans-serif; transition:all 0.15s;
        }
        .cg-menu-btn:hover { background:#F9FAFB; color:#0F172A; }
        .cg-menu-btn.active { background:rgba(99,102,241,0.06); color:#4F46E5; }
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
          background:rgba(99,102,241,0.16); border:2px solid rgba(99,102,241,0.4);
          display:flex; align-items:center; justify-content:center;
          font-size:13px; font-weight:800; color:#818CF8;
          font-family:'Inter',sans-serif; position:relative;
          transition:border-color 0.2s, box-shadow 0.2s;
        }
        .cg-avatar-btn:hover .cg-avatar-ring {
          border-color:rgba(99,102,241,0.65);
          box-shadow:0 0 0 3px rgba(99,102,241,0.12);
        }

        /* Online dot */
        .cg-online-dot {
          position:absolute; right:0; bottom:0;
          width:9px; height:9px; border-radius:50%;
          background:#10B981; border:2px solid #FFFFFF;
        }

        /* Chevron */
        .cg-chevron { font-size:10px; color:#9CA3AF; transition:transform 0.2s; }
        .cg-chevron.open { transform:rotate(180deg); }

        /* Vertical divider */
        .cg-vdivider { width:1px; height:26px; background:rgba(0,0,0,0.05); margin:0 4px; flex-shrink:0; }

        /* Sub-tab bar */
        .cg-subbar {
          height:${SUBNAV_HEIGHT}px;
          background:#FFFFFF;
          border-bottom:1px solid #E5E7EB;
          display:flex; align-items:center; gap:2px;
          padding:0 24px; overflow-x:auto; scrollbar-width:none;
        }
        .cg-subbar::-webkit-scrollbar { display:none; }

        /* Sub-tab */
        .cg-subtab {
          display:inline-flex; align-items:center; gap:6px;
          padding:10px 13px;
          border:none; border-bottom:2px solid transparent;
          background:transparent; color:#9CA3AF;
          font-size:12.5px; font-weight:500; cursor:pointer;
          white-space:nowrap; flex-shrink:0; font-family:'Inter',sans-serif;
          transition:all 0.18s ease;
        }
        .cg-subtab:hover { color:#374151; }
        .cg-subtab.active { color:#6366F1; border-bottom-color:#6366F1; font-weight:700; }

        /* Profile bar */
        .cg-profile-bar {
          height:5px; background:rgba(0,0,0,0.03);
          border-radius:999px; overflow:hidden;
        }
        .cg-profile-bar-fill {
          height:100%; border-radius:999px;
          background:linear-gradient(90deg,#6366F1,#8B5CF6);
          animation:profileBarFill 0.9s ease both;
        }

        /* Sign-out */
        .cg-signout-btn {
          width:100%; display:flex; align-items:center; gap:10px;
          padding:12px 16px; border:none; background:transparent;
          color:#FB7185; font-size:13px; text-align:left;
          cursor:pointer; font-family:'Inter',sans-serif; transition:background 0.15s;
        }
        .cg-signout-btn:hover { background:rgba(0,0,0,0.02); }
      `}</style>

      <div className="cg-shell">

        {/* ── Top bar ────────────────────────────────────────────────────────── */}
        <div className={`cg-topbar${scrolled ? " scrolled" : ""}`}>

          {/* ── Brand ────────────────────────────────────────── */}
          <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
            <div className="cg-logo-mark" onClick={() => handleNavigate("aura")}>C</div>
            <div style={{ minWidth:0, display:"flex", flexDirection:"column", gap:3 }}>
              <div style={{
                fontFamily:"'Inter',sans-serif", fontSize:15, fontWeight:800,
                letterSpacing:"0.1em", color:"#0F172A", lineHeight:1,
              }}>
                CAPABILIO
              </div>
              <div style={{
                fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                color:"#64748B", letterSpacing:"0.12em", lineHeight:1,
                whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:6,
              }}>
                <span style={{ color:"#94A3B8" }}>{accountLabel}</span>
                <span style={{ opacity:0.4 }}>·</span>
                <span>{keyword}</span>
              </div>
            </div>
          </div>

          {/* ── Nav ──────────────────────────────────────────── */}
          <nav style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:2, minWidth:0 }}>
            {navLinks.map(link => (
              <button key={link.id}
                onClick={() => handleNavigate(link.id)}
                className={`cg-nav-link${currentPage === link.id ? " active" : ""}`}>
                <span style={{ fontSize:13 }}>{link.icon}</span>
                {link.label}
              </button>
            ))}
          </nav>

          {/* ── Right cluster ─────────────────────────────────── */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"flex-end", gap:8 }}>

            {/* ELO badge — crown jewel */}
            <div className={`cg-elo-badge${eloUpdated ? " updated" : ""}`}>
              <span style={{
                fontFamily:"'JetBrains Mono',monospace", fontSize:10,
                fontWeight:600, color:"rgba(245,158,11,0.65)", letterSpacing:"0.1em",
                lineHeight:1,
              }}>
                ELO
              </span>
              <span style={{
                fontFamily:"'JetBrains Mono',monospace", fontSize:15,
                fontWeight:800, color:"#F59E0B", lineHeight:1,
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
                    <span style={{ fontSize:14, fontWeight:700, color:"#0F172A" }}>Notifications</span>
                    <button style={{ border:"none", background:"transparent", color:"#6366F1", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                      Mark all read
                    </button>
                  </div>

                  {notifications.map((item, i) => (
                    <div key={i} className="cg-notif-row"
                      style={{ background: item.unread ? "rgba(99,102,241,0.04)" : "transparent" }}>
                      <div style={{
                        width:34, height:34, borderRadius:10,
                        background:`${item.color}1A`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:15, flexShrink:0,
                      }}>
                        {item.icon}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, color:"#475569", lineHeight:1.5, marginBottom:2 }}>{item.text}</div>
                        <div style={{ fontSize:10, color:"#64748B" }}>{item.time}</div>
                      </div>
                      {item.unread && (
                        <div style={{ width:7, height:7, borderRadius:"50%", background:item.color, marginTop:5, flexShrink:0 }} />
                      )}
                    </div>
                  ))}

                  <div style={{ padding:"11px 16px", textAlign:"center", borderTop:"1px solid #F3F4F6" }}>
                    <button style={{ border:"none", background:"transparent", color:"#6366F1", fontSize:12, fontWeight:700, cursor:"pointer" }}>
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
                  <div style={{ fontSize:13, fontWeight:700, color:"#0F172A", lineHeight:1.2, whiteSpace:"nowrap" }}>
                    {firstName}
                  </div>
                  <div style={{ fontSize:10, color:"#64748B", lineHeight:1.3, whiteSpace:"nowrap" }}>
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
                  <div style={{ padding:16, borderBottom:"1px solid #F3F4F6" }}>
                    <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:12 }}>
                      <div style={{
                        width:48, height:48, borderRadius:"50%", flexShrink:0,
                        background:"rgba(99,102,241,0.16)", border:"2px solid rgba(99,102,241,0.35)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:18, fontWeight:800, color:"#818CF8",
                        fontFamily:"'Inter',sans-serif", position:"relative",
                      }}>
                        {initial}
                        <div style={{
                          position:"absolute", right:1, bottom:1,
                          width:10, height:10, borderRadius:"50%",
                          background:"#10B981", border:"2px solid #FFFFFF",
                        }} />
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:700, color:"#0F172A", marginBottom:2, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                          {user?.displayName || "User"}
                        </div>
                        <div style={{ fontSize:11, color:"#64748B", marginBottom:7, wordBreak:"break-word" }}>
                          {user?.email || ""}
                        </div>
                        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                          <span style={pill("rgba(99,102,241,0.12)","rgba(99,102,241,0.3)","#818CF8")}>{keyword}</span>
                          <span style={pill(`${eloTier.color}1A`,`${eloTier.color}40`,eloTier.color)}>{eloTier.tier}</span>
                          <span style={pill("rgba(16,185,129,0.12)","rgba(16,185,129,0.3)","#34D399")}>{accountLabel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Profile strength */}
                    <div style={{ background:"#F9FAFB", borderRadius:10, padding:"10px 11px", border:"1px solid rgba(0,0,0,0.03)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <span style={{
                          fontSize:10, color:"#64748B", fontWeight:700,
                          fontFamily:"'JetBrains Mono',monospace", letterSpacing:"0.08em",
                        }}>
                          PROFILE STRENGTH
                        </span>
                        <span style={{
                          fontSize:10, fontWeight:800, fontFamily:"'JetBrains Mono',monospace",
                          color: profileStrength >= 75 ? "#34D399" : "#F59E0B",
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
                            marginLeft:"auto", background:"#6366F1", color:"#fff",
                            fontSize:9, fontWeight:800, padding:"2px 6px", borderRadius:999, lineHeight:1.4,
                          }}>
                            {vaultFiles.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Sign out */}
                  <div style={{ borderTop:"1px solid #F3F4F6" }}>
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
              borderRight:"1px solid #E5E7EB",
              flexShrink:0, display:"flex", flexDirection:"column", justifyContent:"center",
            }}>
              <div style={{
                fontSize:13, fontWeight:700, color:"#0F172A",
                fontFamily:"'Inter',sans-serif", letterSpacing:"0.3px", lineHeight:1.2,
              }}>
                Aura
              </div>
              <div style={{ fontSize:10, color:"#64748B", lineHeight:1.3 }}>Career profile &amp; insights</div>
            </div>

            {auraTabs.map(tab => (
              <button key={tab.id}
                className={`cg-subtab${activeTab === tab.id ? " active" : ""}`}
                onClick={() => onTabChange?.(tab.id)}>
                <span style={{ fontSize:12 }}>{tab.icon}</span>
                {tab.label}
                {tab.id === "vault" && vaultFiles.length > 0 && (
                  <span style={{
                    background:"#6366F1", color:"#fff",
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
