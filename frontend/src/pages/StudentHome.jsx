import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion";
import { Play, Flame, Target, BookOpen, Briefcase, ChevronRight, Lock, Code2, Rocket, ArrowRight, Zap, Trophy, X, Lightbulb, LayoutDashboard, CheckCircle } from "lucide-react"


const TypewriterText = ({ text, delay = 0, speed = 30, cursor = true }) => {
  const [displayedText, setDisplayedText] = useState("");
  useEffect(() => {
    let timeout;
    let index = 0;
    const startTyping = () => {
      const interval = setInterval(() => {
        setDisplayedText(text.slice(0, index));
        index++;
        if (index > text.length) clearInterval(interval);
      }, speed);
    };
    timeout = setTimeout(startTyping, delay);
    return () => clearTimeout(timeout);
  }, [text, delay, speed]);
  
  return (
    <span>
      {displayedText}
      {cursor && (
        <span style={{ 
          animation: "blink 1s step-end infinite", 
          opacity: displayedText.length === text.length ? 0 : 1,
          marginLeft: 2,
          fontWeight: 400
        }}>|</span>
      )}
    </span>
  );
};

export default function StudentHome({ user, userData, onNavigate }) {
  const name = userData?.displayName || userData?.name || user?.user_metadata?.full_name || "Student"
  const firstName = name.split(" ")[0]
  const elo = userData?.eloRating || 400
  const streak = userData?.arenaStreak || userData?.streak || 0
  const domain = userData?.domain || userData?.keyword || "Software Engineer"
  
  const getPortfolioCompletion = () => {
    let score = 0;
    if (userData?.displayName || userData?.name) score += 10;
    if (userData?.resumeUrl || userData?.resume_url) score += 20;
    if (userData?.experiences?.length > 0) score += 20;
    if (userData?.education?.length > 0) score += 15;
    if (userData?.githubUsername || userData?.linkedinUrl || userData?.portfolioUrl || userData?.github_username || userData?.linkedin_url) score += 15;
    if (userData?.arenaCompleted > 0 || userData?.arena_completed > 0) score += 10;
    if (userData?.certifications?.length > 0 || userData?.testimonials?.length > 0) score += 10;
    if (score === 0) score = 10; // Give them at least 10% just for signing up!
    return score;
  };
  const completionPercentage = getPortfolioCompletion();

  const [isGenerating, setIsGenerating] = useState(true);
  const [showProSheet, setShowProSheet] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [taskData, setTaskData] = useState(null);
  const [isLearnDrawerOpen, setIsLearnDrawerOpen] = useState(false);
  const [selectedCompany] = useState(() => {
    const companies = ["Google", "Netflix", "Uber", "Airbnb", "Stripe", "Discord", "Twitch", "Shopify", "Tesla", "Vercel", "Meta", "Amazon"];
    return companies[Math.floor(Math.random() * companies.length)];
  });

  useEffect(() => {
    let isMounted = true;
    
    const checkAndFetchTask = async () => {
      const today = new Date().toDateString();
      const cached = localStorage.getItem("capabilio_daily_mission");
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.date === today && parsed.taskData) {
            if (isMounted) {
              setTaskData({...parsed.taskData, completed: parsed.completed});
              setIsGenerating(false);
            }
            return;
          }
        } catch(e) {}
      }

      const t1 = setTimeout(() => { if (isMounted) setLoadingStep(1) }, 2000);
      const t2 = setTimeout(() => { if (isMounted) setLoadingStep(2) }, 4000);
      
      try {
        const fetchPromise = fetch('/api/tasks/generate-daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: domain, elo: parseInt(elo), company: selectedCompany })
        });
        
        // Wait for both the fetch AND the 5-second animation timer
        const [response] = await Promise.all([
          fetchPromise,
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (isMounted) {
          setTaskData(data);
          setIsGenerating(false);
          localStorage.setItem("capabilio_daily_mission", JSON.stringify({ date: today, taskData: data, completed: false }));
        }
      } catch (err) {
        console.error("Failed to fetch task:", err);
        // Fallback after timer
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (isMounted) {
          const fallbackData = {
            company: "Swiggy",
            title: "Refactor React Cart State",
            context: "Architecture Bug",
            taskDescription: "The checkout component is rendering twice on every item addition. Jump into the workspace, analyze the dependency tree, and implement O(1) re-renders using proper memoization techniques.",
            eloReward: 25,
            learningGuide: {
              concepts: ["React Re-renders", "useMemo & useCallback", "Dependency Arrays"],
              explanation: "In React, parent components re-rendering will cause all children to re-render by default. When passing objects or functions as props, their references change on every render, breaking child component memoization.",
              approach: "Wrap the expensive child component in React.memo(), and ensure any functions or objects passed as props are cached using useCallback or useMemo to maintain stable references across renders."
            }
          };
          setTaskData(fallbackData);
          setIsGenerating(false);
          localStorage.setItem("capabilio_daily_mission", JSON.stringify({ date: today, taskData: fallbackData, completed: false }));
        }
      }
    };
    
    checkAndFetchTask();

    return () => { 
      isMounted = false;
    };
  }, [domain, elo, selectedCompany]);

  


  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      background: "#F8F9FA",
      color: "#000000",
      boxSizing: "border-box",
      paddingBottom: 100
    }}>
      <style>{`
        * { box-sizing: border-box; }
        
        .hero-section {
          background: #FFFFFF;
          padding: 60px 5%;
          margin-bottom: 40px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        
        .main-grid {
          padding: 0 5% 120px 5%;
          display: grid;
          grid-template-columns: 2.2fr 1fr;
          gap: 40px;
          max-width: 1600px;
          margin: 0 auto;
        }
        
        .premium-card {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 40px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .premium-card:hover {
          box-shadow: 0 8px 30px rgba(0,0,0,0.06);
        }
        
        .arena-card {
          background: #FFFFFF;
          border-radius: 12px;
          padding: 48px;
          color: #000000;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
          border-left: 6px solid #FF5701;
          transition: all 0.3s ease;
        }
        .arena-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(255, 87, 1, 0.08);
        }

        .btn-orange {
          background: #FF5701;
          color: #FFFFFF;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 15px;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .btn-orange:hover {
          background: #E04B01;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(255, 87, 1, 0.25);
        }
        
        .btn-outline-orange {
          background: transparent;
          color: #FF5701;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 15px;
          border: 2px solid #FF5701;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          width: 100%;
        }
        .btn-outline-orange:hover {
          background: #FFF0E6;
        }

        .task-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .task-row {
          border-radius: 12px;
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #F8F9FA;
          transition: all 0.2s ease;
        }
        .task-row.locked {
          opacity: 0.8;
        }

        .progress-track {
          width: 100%;
          height: 8px;
          background: #F0F0F0;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 12px;
        }
        .progress-fill {
          height: "100%";
          background: #FF5701;
          border-radius: 999px;
        }
      `}</style>

      {/* HERO SECTION */}
      <div className="hero-section">
        <div style={{ maxWidth: 1600, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "#5F6368", marginBottom: 12 }}>
              {domain} Career Path
            </div>
            <h1 style={{ fontSize: 44, fontWeight: 400, color: "#202124", margin: "0 0 12px 0", lineHeight: 1.2 }}>
              Welcome back, <span style={{ fontWeight: 500, color: "#FF5701" }}>{firstName}</span>.
            </h1>
            <p style={{ fontSize: 16, color: "#3C4043", margin: 0, fontWeight: 400 }}>
              <TypewriterText text="Complete today's real-world challenge to increase your ELO rating." speed={40} delay={500} cursor={false} />
            </p>
          </div>

          <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#5F6368", marginBottom: 8 }}>Rating (ELO)</div>
              <div style={{ fontSize: 36, fontWeight: 400, color: "#202124", lineHeight: 1 }}>{elo}</div>
            </div>
            
            <div style={{ width: 1, height: 48, background: "#EAEAEA" }} />
            
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#5F6368", marginBottom: 8 }}>Daily Streak</div>
              <div style={{ fontSize: 36, fontWeight: 400, color: "#202124", lineHeight: 1, display: "flex", alignItems: "center", gap: 8 }}>
                {streak} <Flame size={28} color="#FF5701" strokeWidth={2} />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* MAIN GRID */}
      <div className="main-grid">
        
        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          
                    {/* Main Arena Challenge */}
          <div style={{
            background: "#FFFFFF",
            border: "1px solid #E0E0E0",
            borderRadius: 24,
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            gap: 24,
            minHeight: "350px",
            justifyContent: isGenerating ? "center" : "flex-start"
          }}>
            {isGenerating ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 16 }}>
                 <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
                 <Code2 size={32} color="#FF5701" />
                 <div style={{ fontSize: 16, color: "#202124", fontWeight: 400, fontFamily: "monospace" }}>
                   {loadingStep >= 0 && <div><span style={{color:"#10B981"}}>✔</span> <TypewriterText text="Analyzing ELO rating & past performance..." speed={20} cursor={loadingStep === 0} /></div>}
                   {loadingStep >= 1 && <div style={{marginTop: 8}}><span style={{color:"#10B981"}}>✔</span> <TypewriterText text="Generating real-world architecture mission..." delay={200} speed={20} cursor={loadingStep === 1} /></div>}
                   {loadingStep >= 2 && <div style={{marginTop: 8, color: "#FF5701", fontWeight: 600}}>System Ready.</div>}
                 </div>
              </div>
            ) : (
              <>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#5F6368", fontSize: 15, fontWeight: 500 }}>
                 <Code2 size={20} strokeWidth={1.5} /> Today&apos;s Mission
              </div>
              {taskData?.completed ? (
                taskData?.finalReward > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#188038", fontSize: 15, fontWeight: 600, background: "#E6F4EA", padding: "6px 14px", borderRadius: 999 }}>
                    <CheckCircle size={16} strokeWidth={2.5} /> +{taskData.finalReward} ELO Added!
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#D93025", fontSize: 15, fontWeight: 600, background: "#FCE8E6", padding: "6px 14px", borderRadius: 999 }}>
                    <CheckCircle size={16} strokeWidth={2.5} /> +0 ELO (Penalty)
                  </div>
                )
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#202124", fontSize: 15, fontWeight: 600, background: "#F1F3F4", padding: "6px 14px", borderRadius: 999 }}>
                  <Trophy size={16} color="#FF5701" strokeWidth={2.5} /> +{taskData?.eloReward || 25} ELO
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: 32, fontWeight: 400, color: "#202124", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>
                {taskData?.title || "Refactor React Cart State"}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#5F6368", fontWeight: 500 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", backgroundColor: "#F1F3F4", borderRadius: "16px", color: "#202124", fontWeight: 600, fontSize: "13px" }}>
                  {taskData?.company || "Swiggy"}
                </div>
                <span style={{ color: "#DADCE0" }}>•</span>
                <span>{taskData?.context || "Architecture Bug"}</span>
              </div>
            </div>

            <p style={{ fontSize: 16, color: "#3C4043", lineHeight: 1.6, margin: 0, maxWidth: "90%" }}>
              {taskData?.taskDescription || "The checkout component is rendering twice on every item addition. Jump into the workspace, analyze the dependency tree, and implement O(1) re-renders using proper memoization techniques."}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
              <button style={{
                background: "#FF5701",
                color: "#FFFFFF",
                padding: "12px 24px",
                borderRadius: 999,
                fontWeight: 600,
                fontSize: 15,
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "background 0.2s ease"
              }} onClick={() => onNavigate("arenaWorkspace")}>
                {taskData?.completed ? (
                  <>Review Solution <CheckCircle size={18} strokeWidth={2} /></>
                ) : (
                  <>Solve in Workspace <ArrowRight size={18} strokeWidth={2} /></>
                )}
              </button>
              
              {!taskData?.completed && (
                <button style={{
                  background: "transparent",
                  color: "#3C4043",
                  padding: "12px 24px",
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 15,
                  border: "1px solid #DADCE0",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s ease"
                }} onMouseOver={(e) => { e.currentTarget.style.background = "#F1F3F4" }} onMouseOut={(e) => { e.currentTarget.style.background = "transparent" }} onClick={() => setIsLearnDrawerOpen(true)}>
                  <BookOpen size={18} strokeWidth={1.5} /> Learn First
                </button>
              )}
            </div>
            </>
            )}
          </div>

          {!isGenerating && (
          <>
          {/* Upcoming Path */}
                    <div style={{
                      background: "#FFFFFF",
                      border: "1px solid #E0E0E0",
                      borderRadius: 24,
                      padding: "40px",
                      position: "relative",
                      overflow: "hidden"
                    }}>
                      <h3 style={{ fontSize: 22, fontWeight: 400, color: "#202124", margin: "0 0 24px 0", letterSpacing: "-0.01em" }}>Upcoming Missions</h3>
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 60 }}>
                        
                        <div onClick={() => setShowProSheet(true)} style={{ border: "1px solid #E0E0E0", borderRadius: 16, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => {e.currentTarget.style.backgroundColor="#F8F9FA"}} onMouseLeave={(e) => {e.currentTarget.style.backgroundColor="transparent"}}>
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: "#5F6368" }}>{taskData?.upcomingMissions?.[0]?.company || (domain.toLowerCase().includes('front') ? 'Cred • Frontend' : domain.toLowerCase().includes('data') ? 'MuSigma • Pipeline' : 'Razorpay • Backend')}</span>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 400, color: "#202124", letterSpacing: "-0.01em" }}>{taskData?.upcomingMissions?.[0]?.title || (domain.toLowerCase().includes('front') ? 'Framer Motion UI Optimizations' : domain.toLowerCase().includes('data') ? 'Model Drift Detection' : 'Idempotency Key Middleware')}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: "#202124" }}><Trophy size={14} color="#FF5701" strokeWidth={2.5} /> +{taskData?.upcomingMissions?.[0]?.eloReward || 30} ELO</div>
                        </div>
          
                        <div onClick={() => setShowProSheet(true)} style={{ border: "1px solid #E0E0E0", borderRadius: 16, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => {e.currentTarget.style.backgroundColor="#F8F9FA"}} onMouseLeave={(e) => {e.currentTarget.style.backgroundColor="transparent"}}>
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: "#5F6368" }}>{taskData?.upcomingMissions?.[1]?.company || (domain.toLowerCase().includes('front') ? 'Swiggy • Frontend' : domain.toLowerCase().includes('data') ? 'Fractal • Analysis' : 'Zerodha • Systems')}</span>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 400, color: "#202124", letterSpacing: "-0.01em" }}>{taskData?.upcomingMissions?.[1]?.title || (domain.toLowerCase().includes('front') ? 'Cart Memoization Engine' : domain.toLowerCase().includes('data') ? 'Predictive Fraud Graph' : 'WebSocket Feed Optimization')}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: "#202124" }}><Trophy size={14} color="#FF5701" strokeWidth={2.5} /> +{taskData?.upcomingMissions?.[1]?.eloReward || 35} ELO</div>
                        </div>
          
                      </div>
          
                      {/* Lock Overlay Banner */}
                      <motion.div 
                        initial={{ y: "100%" }}
                        animate={{ y: showProSheet ? 0 : "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        style={{
                          position: "absolute",
                          bottom: 0, left: 0, right: 0,
                          background: "linear-gradient(to top, rgba(255,255,255,1) 60%, rgba(255,255,255,0.8) 85%, rgba(255,255,255,0))",
                          backdropFilter: "blur(4px)",
                          padding: "120px 40px 32px 40px",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          textAlign: "center"
                        }}>
                        <button onClick={(e) => { e.stopPropagation(); setShowProSheet(false); }} style={{ position: "absolute", top: 80, right: 24, background: "none", border: "none", cursor: "pointer", color: "#5F6368" }}>
                          <X size={24} />
                        </button>
                        <div style={{ background: "#FFFFFF", padding: 12, borderRadius: 999, marginBottom: 16, border: "1px solid #E5E7EB" }}>
                          <Lock size={20} color="#6B7280" strokeWidth={2} />
                        </div>
                        <h4 style={{ fontSize: 20, fontWeight: 600, color: "#202124", margin: "0 0 8px 0" }}>Unlock Pro to access these missions</h4>
                        <p style={{ fontSize: 15, color: "#5F6368", margin: "0 0 24px 0", maxWidth: 300 }}>Free tier users receive one company mission every 24 hours.</p>
                        
                        <button style={{
                          background: "#202124",
                          color: "#FFFFFF",
                          padding: "14px 32px",
                          borderRadius: 999,
                          fontWeight: 600,
                          fontSize: 16,
                          border: "none",
                          cursor: "pointer",
                          transition: "background 0.2s ease, transform 0.2s ease",
                          width: "100%", maxWidth: 300
                        }} onMouseOver={(e) => { e.currentTarget.style.background = "#000000"; e.currentTarget.style.transform = "scale(1.02)"; }} onMouseOut={(e) => { e.currentTarget.style.background = "#202124"; e.currentTarget.style.transform = "scale(1)"; }}>
                          Upgrade to Pro
                        </button>
                      </motion.div>
                    </div>
          </>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          
          {/* Career Target */}
          <div style={{
            background: "#FFFFFF",
            border: "1px solid #E0E0E0",
            borderRadius: 24,
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: 32
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#5F6368", fontSize: 15, fontWeight: 500, marginBottom: 8 }}>
                <Briefcase size={20} strokeWidth={1.5} /> Proof of Work
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 400, color: "#202124", margin: 0, letterSpacing: "-0.01em" }}>
                Verified Portfolio
              </h3>
            </div>
            
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#5F6368" }}>Completion</div>
                <div style={{ fontSize: 24, fontWeight: 400, color: "#202124", lineHeight: 1 }}>35%</div>
              </div>
              <div style={{ width: "100%", height: 6, background: "#F1F3F4", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "35%", background: "#FF5701", borderRadius: 999 }} />
              </div>
              <p style={{ fontSize: 15, color: "#5F6368", lineHeight: 1.6, margin: "16px 0 0 0" }}>
                Reach 80% to unlock priority Mock Interviews with industry experts.
              </p>
            </div>

            <button style={{
              background: "transparent",
              color: "#3C4043",
              padding: "12px 24px",
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 15,
              border: "1px solid #DADCE0",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s ease",
              width: "100%"
            }} onMouseOver={(e) => { e.currentTarget.style.background = "#F1F3F4" }} onMouseOut={(e) => { e.currentTarget.style.background = "transparent" }} onClick={() => onNavigate("portfolio")}>
              View Profile <ArrowRight size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* Upsell */}
          <div style={{
            background: "#FFFFFF",
            border: "1px solid #E0E0E0",
            borderRadius: 24,
            padding: "32px",
            display: "flex",
            flexDirection: "column",
            gap: 24
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ background: "#FFF0E6", padding: 10, borderRadius: 12 }}>
                <Rocket size={20} color="#FF5701" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 500, color: "#202124", margin: 0 }}>Capabilio Elite</h3>
            </div>
            <p style={{ fontSize: 15, color: "#5F6368", lineHeight: 1.6, margin: 0 }}>
              Unlock 6 daily tasks, deep AI code reviews, and guaranteed recruiter visibility.
            </p>
            <button style={{
              background: "#FF5701",
              color: "#FFFFFF",
              padding: "12px 24px",
              borderRadius: 999,
              fontWeight: 600,
              fontSize: 15,
              border: "none",
              cursor: "pointer",
              transition: "background 0.2s ease",
              width: "100%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }} onMouseOver={(e) => { e.currentTarget.style.background = "#E04B01" }} onMouseOut={(e) => { e.currentTarget.style.background = "#FF5701" }}>
              View Elite Plans
            </button>
          </div>

        </div>
      </div>

      {/* Learning Drawer */}
      <AnimatePresence>
        {isLearnDrawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLearnDrawerOpen(false)}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0, 0, 0, 0.4)",
                backdropFilter: "blur(4px)",
                zIndex: 999
              }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                bottom: 0,
                width: "100%",
                maxWidth: "480px",
                backgroundColor: "#FFFFFF",
                boxShadow: "-8px 0 24px rgba(0, 0, 0, 0.12)",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                borderLeft: "1px solid #E0E0E0"
              }}
            >
              <div style={{ padding: "32px", borderBottom: "1px solid #E0E0E0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 500, color: "#FF5701", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Mission Prep</div>
                  <div style={{ fontSize: "24px", fontWeight: 500, color: "#202124" }}>{taskData?.title}</div>
                </div>
                <button 
                  onClick={() => setIsLearnDrawerOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#5F6368",
                    padding: "8px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#F1F3F4"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ padding: "32px", flex: 1, overflowY: "auto" }}>
                <div style={{ marginBottom: "32px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#FCE8E6", display: "flex", alignItems: "center", justifyContent: "center", color: "#D93025" }}>
                      <BookOpen size={18} />
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 500, color: "#202124" }}>Core Concepts</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {taskData?.learningGuide?.concepts?.map((c, i) => (
                      <span key={i} style={{ padding: "6px 12px", backgroundColor: "#F1F3F4", borderRadius: "16px", fontSize: "14px", color: "#3C4043", fontWeight: 500 }}>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "32px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#E6F4EA", display: "flex", alignItems: "center", justifyContent: "center", color: "#188038" }}>
                      <Zap size={18} />
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 500, color: "#202124" }}>Theory</div>
                  </div>
                  <div style={{ fontSize: "15px", lineHeight: "1.6", color: "#3C4043" }}>
                    {taskData?.learningGuide?.explanation}
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#FEF7E0", display: "flex", alignItems: "center", justifyContent: "center", color: "#F29900" }}>
                      <Lightbulb size={18} />
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 500, color: "#202124" }}>Approach Hint</div>
                  </div>
                  <div style={{ fontSize: "15px", lineHeight: "1.6", color: "#3C4043", padding: "16px", backgroundColor: "#F8F9FA", borderRadius: "12px", border: "1px solid #E8EAED" }}>
                    {taskData?.learningGuide?.approach}
                  </div>
                </div>
              </div>

              <div style={{ padding: "24px 32px", borderTop: "1px solid #E0E0E0", backgroundColor: "#F8F9FA" }}>
                <button
                  style={{
                    width: "100%",
                    padding: "16px",
                    backgroundColor: "#FF5701",
                    color: "white",
                    border: "none",
                    borderRadius: "999px",
                    fontSize: "16px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => onNavigate("arenaWorkspace")}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)"
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(255, 87, 1, 0.25)"
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  I'm Ready <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>


      
    </div>
  )
}
