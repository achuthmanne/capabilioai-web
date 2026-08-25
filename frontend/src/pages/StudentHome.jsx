import { useState, useEffect } from "react"
import { arenaDb } from "../lib/db"
import { getRoleConfig } from "../config/roleConfig"
import { Play, Flame, Target, LineChart, BookOpen, Briefcase, ChevronRight } from "lucide-react"

export default function StudentHome({ user, userData, onNavigate }) {
  const [submissions, setSubmissions] = useState([])
  const [loadingProof, setLoadingProof] = useState(true)

  useEffect(() => {
    if (!user?.id && !user?.uid) { setLoadingProof(false); return }
    const uid = user.id || user.uid
    const unsub = arenaDb.subscribeHistory(uid, (data) => {
      setSubmissions(data || [])
      setLoadingProof(false)
    })
    return unsub
  }, [user?.id, user?.uid])

  const name = userData?.name || user?.displayName || "Student"
  const firstName = name.split(" ")[0]
  const elo = userData?.eloRating || 400
  const streak = userData?.streak || 0
  const domain = userData?.domain || userData?.keyword || getRoleConfig(userData).label

  const todaySubmissions = submissions.filter(s => {
    const t = s.submittedAt || s.completed_at
    return t && new Date(t).toDateString() === new Date().toDateString()
  }).length

  const recentProofs = submissions.slice(0, 3)

  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "#FFFFFF",
      fontFamily: '"Inter", "DM Sans", sans-serif',
      color: "#14161A",
      boxSizing: "border-box"
    }}>
      <style>{`
        * { box-sizing: border-box; }
        .sh-card {
          background: #FFFFFF;
          border: 1px solid #E5E7EB;
          border-radius: 16px;
          padding: 24px;
          transition: all 0.2s ease;
        }
        .sh-card:hover {
          border-color: #D1D5DB;
        }
        .sh-btn-primary {
          background: #FF5701;
          color: #FFFFFF;
          padding: 12px 24px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .sh-btn-primary:hover {
          background: #E04B01;
        }
        .sh-btn-secondary {
          background: #F4F5F7;
          color: #14161A;
          padding: 12px 24px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 14px;
          border: none;
          cursor: pointer;
          transition: background 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .sh-btn-secondary:hover {
          background: #E5E7EB;
        }
        .sh-list-item {
          display: flex;
          align-items: center;
          padding: 16px;
          background: #F9FAFB;
          border-radius: 12px;
          margin-bottom: 8px;
          border: 1px solid transparent;
          transition: border-color 0.2s ease;
        }
        .sh-list-item:hover {
          border-color: #E5E7EB;
        }
      `}</style>

      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "48px 40px" }}>
        
        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#8A8F98", marginBottom: 8, letterSpacing: "0.03em", textTransform: "uppercase" }}>
              Student Dashboard
            </div>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: "#14161A", letterSpacing: "-0.03em", margin: 0 }}>
              Welcome back, {firstName}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8A8F98" }}>Current ELO</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#FF5701", letterSpacing: "-0.02em" }}>{elo}</div>
            </div>
            <div style={{ width: 1, background: "#E5E7EB", margin: "0 8px" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#8A8F98" }}>Active Streak</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#14161A", letterSpacing: "-0.02em" }}>{streak} <Flame size={20} color="#FF5701" style={{ marginLeft: 4, display: "inline-block", verticalAlign: "middle" }} strokeWidth={2.5} /></div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
          
          {/* Main Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Action Plan / Next Steps */}
            <div className="sh-card" style={{ background: "#FDFDFD", border: "1px solid #E5E7EB" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FFF0E6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Target size={20} color="#FF5701" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#14161A", margin: 0, letterSpacing: "-0.02em" }}>Daily Mission</h2>
                  <div style={{ fontSize: 14, color: "#4A4E54", marginTop: 2 }}>Build your proof portfolio to stand out</div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F9FAFB", padding: "20px 24px", borderRadius: 12, border: "1px solid #F3F4F6" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#14161A", marginBottom: 4 }}>
                    {todaySubmissions > 0 ? "Mission Accomplished!" : "Complete 1 Arena Task"}
                  </div>
                  <div style={{ fontSize: 14, color: "#8A8F98" }}>
                    {todaySubmissions > 0 ? "You've completed your daily goal. Keep it up!" : "Solve a real-world engineering challenge to gain ELO."}
                  </div>
                </div>
                <button className="sh-btn-primary" onClick={() => onNavigate("arena")}>
                  {todaySubmissions > 0 ? "Enter Arena Again" : "Start Challenge"} <Play size={16} fill="currentColor" strokeWidth={0} />
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              <div className="sh-card" style={{ padding: 20, cursor: "pointer" }} onClick={() => onNavigate("skills")}>
                <Activity size={24} color="#14161A" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#14161A", marginBottom: 4 }}>Skill Graph</div>
                <div style={{ fontSize: 13, color: "#8A8F98" }}>View your identified weaknesses</div>
              </div>
              <div className="sh-card" style={{ padding: 20, cursor: "pointer" }} onClick={() => onNavigate("studio")}>
                <ShieldCheck size={24} color="#14161A" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#14161A", marginBottom: 4 }}>Skill Studio</div>
                <div style={{ fontSize: 13, color: "#8A8F98" }}>Fix gaps with targeted learning</div>
              </div>
              <div className="sh-card" style={{ padding: 20, cursor: "pointer" }} onClick={() => onNavigate("portfolio")}>
                <Map size={24} color="#14161A" style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#14161A", marginBottom: 4 }}>Portfolio</div>
                <div style={{ fontSize: 13, color: "#8A8F98" }}>Manage your verified evidence</div>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Recent Proofs */}
            <div className="sh-card">
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#14161A", margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>Recent Proof</h3>
              
              {loadingProof ? (
                <div style={{ padding: 20, textAlign: "center", color: "#8A8F98", fontSize: 14 }}>Loading...</div>
              ) : recentProofs.length === 0 ? (
                <div style={{ padding: "32px 20px", textAlign: "center", background: "#F9FAFB", borderRadius: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#4A4E54", marginBottom: 8 }}>No proofs yet</div>
                  <div style={{ fontSize: 13, color: "#8A8F98", marginBottom: 16 }}>Complete an Arena task to build evidence</div>
                  <button className="sh-btn-secondary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => onNavigate("arena")}>
                    Go to Arena
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {recentProofs.map((p, i) => (
                    <div key={i} className="sh-list-item">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#14161A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.challenge_title || p.title || "Arena Challenge"}
                        </div>
                        <div style={{ fontSize: 12, color: "#8A8F98", marginTop: 2 }}>
                          {p.score != null ? `Score: ${p.score}` : "Completed"}
                        </div>
                      </div>
                      {p.elo_delta > 0 && (
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#10B981", marginLeft: 12, flexShrink: 0 }}>
                          +{p.elo_delta} ELO
                        </div>
                      )}
                    </div>
                  ))}
                  <button className="sh-btn-secondary" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => onNavigate("portfolio")}>
                    View All Vault
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
