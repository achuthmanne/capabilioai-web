import { useState } from "react"

export default function AccountType({ onSelect, onLogin, onBack }) {
  const [hovered, setHovered] = useState(null)

  const PATHS = [
    {
      id: "student",
      icon: "🎓",
      title: "Student",
      badge: "ELO starts at 400",
      badgeColor: "#6B6560",
      desc: "25 foundation MCQs calibrate your starting radar. ELO begins at 400 and grows through daily Arena challenges.",
      featured: false,
    },
    {
      id: "professional",
      icon: "💼",
      title: "Professional",
      badge: "ELO starts at 800",
      badgeColor: "#FF5701",
      desc: "Upload your resume and LinkedIn PDF. AI extracts your skills and assigns a starting ELO — minimum 800, no ceiling.",
      featured: true,
    },
    {
      id: "authority",
      icon: "🏆",
      title: "Executive",
      badge: "Authority profile",
      badgeColor: "#16A34A",
      desc: "Founders, professors, mentors, experts. Build an authority profile, grow your network, and share verified expertise.",
      featured: false,
    },
    {
      id: "institution",
      icon: "🏛️",
      title: "Organisation",
      badge: "Institution profile",
      badgeColor: "#D97706",
      desc: "Universities, bootcamps, and companies can publish challenges, track ELO outcomes, and hire from the leaderboard.",
      featured: false,
    },
  ]

  const badgeBg = {
    "#FF5701": "#FFF1E8",
    "#16A34A": "#F0FDF4",
    "#D97706": "#FFF7E8",
    "#6B6560": "#FAF7F2",
  }

  const badgeBorder = {
    "#FF5701": "rgba(255,87,1,0.18)",
    "#16A34A": "rgba(22,163,74,0.16)",
    "#D97706": "rgba(217,119,6,0.16)",
    "#6B6560": "#E8E3DA",
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(255,87,1,0.06), transparent 20%), linear-gradient(to bottom, #FFFFFF, #F6F6F1)",
        color: "#FFFFFF",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400\&family=DM+Mono:wght@400;500;600\&display=swap');

        * { box-sizing: border-box; }

        .acc-fade-up {
          animation: accFadeUp 0.38s ease both;
        }

        @keyframes accFadeUp {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .acc-card {
          transition: transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1), border-color 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .acc-card:hover {
          transform: translateY(-4px);
        }

        @media (max-width: 900px) {
          .acc-grid {
            grid-template-columns: 1fr !important;
          }

          .acc-nav {
            padding: 0 18px !important;
            height: auto !important;
            min-height: 64px;
            flex-wrap: wrap;
            gap: 12px;
            padding-top: 12px !important;
            padding-bottom: 12px !important;
          }

          .acc-content {
            padding: 40px 20px 64px !important;
          }

          .acc-title {
            font-size: 36px !important;
          }
        }
      `}</style>

      {/* Nav */}
      <nav
        className="acc-nav"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(17,24,39,0.08)",
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={onBack}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 14px",
              background: "#FFFFFF",
              border: "1px solid rgba(17,24,39,0.1)",
              borderRadius: 999,
              color: "#4B5563",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,87,1,0.22)"
              e.currentTarget.style.color = "#FF5701"
              e.currentTarget.style.transform = "translateY(-1px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(17,24,39,0.1)"
              e.currentTarget.style.color = "#4B5563"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            ← BACK
          </button>

          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
            }}
          >
            Capabilio
          </span>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: 12,
              color: "#6B6560",
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.02em",
            }}
          >
            Already have an account?
          </span>

          <button
            onClick={onLogin}
            style={{
              padding: "10px 18px",
              background: "#FF5701",
              border: "1px solid #FF5701",
              borderRadius: 12,
              color: "#FFFFFF",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.04em",
              boxShadow: "0 10px 24px rgba(255,87,1,0.14)",
              transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#D94700"
              e.currentTarget.style.borderColor = "#D94700"
              e.currentTarget.style.transform = "translateY(-1px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#FF5701"
              e.currentTarget.style.borderColor = "#FF5701"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            SIGN IN
          </button>
        </div>
      </nav>

      {/* Content */}
      <div
        className="acc-content"
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "72px 40px 88px",
        }}
      >
        <div className="acc-fade-up" style={{ textAlign: "center", marginBottom: 56 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#FFFFFF",
              border: "1px solid rgba(17,24,39,0.08)",
              borderRadius: 999,
              padding: "8px 16px",
              marginBottom: 22,
              boxShadow: "0 4px 14px rgba(17,24,39,0.04)",
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#FF5701",
                boxShadow: "0 0 0 4px rgba(255,87,1,0.10)",
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: "#6B6560",
                fontWeight: 700,
                letterSpacing: "0.14em",
                fontFamily: "'DM Mono', monospace",
                textTransform: "uppercase",
              }}
            >
              Step 1 of 2 · Choose your path
            </span>
          </div>

          <h1
            className="acc-title"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 52,
              fontWeight: 800,
              color: "#FFFFFF",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              marginBottom: 16,
            }}
          >
            Select the workflow
            <br />
            <span style={{ color: "#FF5701", fontStyle: "italic" }}>that fits your role.</span>
          </h1>

          <p
            style={{
              fontSize: 17,
              color: "#4B5563",
              lineHeight: 1.8,
              maxWidth: 650,
              margin: "0 auto",
            }}
          >
            Your path determines onboarding, starting ELO logic, profile structure, and the kind of work you will see first inside Capabilio.
          </p>
        </div>

        <div
          className="acc-grid acc-fade-up"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
            marginBottom: 36,
          }}
        >
          {PATHS.map((p) => {
            const isHovered = hovered === p.id
            const isActive = isHovered || p.featured

            return (
              <div
                key={p.id}
                className="acc-card"
                onMouseEnter={() => setHovered(p.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect?.(p.id)}
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${isActive ? "rgba(255,87,1,0.22)" : "rgba(17,24,39,0.08)"}`,
                  borderRadius: 22,
                  padding: 26,
                  cursor: "pointer",
                  boxShadow: isActive
                    ? "0 12px 28px rgba(255,87,1,0.10)"
                    : "0 8px 24px rgba(17,24,39,0.05)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {p.featured && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 20,
                      background: "#FF5701",
                      color: "#FFFFFF",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "6px 10px",
                      borderRadius: "0 0 10px 10px",
                      letterSpacing: "0.12em",
                      fontFamily: "'DM Mono', monospace",
                      textTransform: "uppercase",
                    }}
                  >
                    Popular
                  </div>
                )}

                <div
                  style={{
                    width: 50,
                    height: 50,
                    background: "#FFF1E8",
                    border: "1px solid rgba(255,87,1,0.14)",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    marginBottom: 18,
                  }}
                >
                  {p.icon}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#FFFFFF",
                      lineHeight: 1.1,
                    }}
                  >
                    {p.title}
                  </div>

                  <div
                    style={{
                      width: 34,
                      height: 34,
                      minWidth: 34,
                      borderRadius: "50%",
                      background: isActive ? "#FF5701" : "#F3F4F6",
                      color: isActive ? "#FFFFFF" : "#A8A29E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  >
                    →
                  </div>
                </div>

                <p
                  style={{
                    fontSize: 15,
                    color: "#4B5563",
                    lineHeight: 1.75,
                    marginBottom: 16,
                    maxWidth: 46,
                  }}
                >
                  {p.desc}
                </p>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 10px",
                    borderRadius: 999,
                    background: badgeBg[p.badgeColor] || "#FAF7F2",
                    color: p.badgeColor,
                    border: `1px solid ${badgeBorder[p.badgeColor] || "#E8E3DA"}`,
                    fontFamily: "'DM Mono', monospace",
                    letterSpacing: "0.02em",
                  }}
                >
                  {p.badge}
                </span>
              </div>
            )
          })}
        </div>

        <div
          className="acc-fade-up"
          style={{
            textAlign: "center",
            padding: "18px 22px",
            background: "rgba(255,255,255,0.82)",
            borderRadius: 18,
            border: "1px solid rgba(17,24,39,0.08)",
            boxShadow: "0 6px 18px rgba(17,24,39,0.04)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              color: "#6B6560",
              margin: 0,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: "0.01em",
              lineHeight: 1.8,
            }}
          >
            You can update your path later from settings · Free forever for candidates · No credit card needed
          </p>
        </div>
      </div>
    </div>
  )
}