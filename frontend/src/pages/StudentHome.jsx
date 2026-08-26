import { useState, useEffect } from "react"
import { Play, Flame, Target, BookOpen, Briefcase, ChevronRight, Lock, Code2, Rocket, ArrowRight, Zap, Trophy, LayoutDashboard } from "lucide-react"


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
  const streak = userData?.streak || 0
  const domain = userData?.domain || userData?.keyword || "Software Engineer"

  const [isGenerating, setIsGenerating] = useState(true);
  const [loadingStep, setLoadingStep] = useState(0);
  const [taskData, setTaskData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const t1 = setTimeout(() => { if (isMounted) setLoadingStep(1) }, 2000);
    const t2 = setTimeout(() => { if (isMounted) setLoadingStep(2) }, 4000);
    
    const fetchTask = async () => {
      try {
        const fetchPromise = fetch('/api/tasks/generate-daily', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: domain, elo: parseInt(elo) })
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
        }
      } catch (err) {
        console.error("Failed to fetch task:", err);
        // Fallback after timer
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (isMounted) {
          setTaskData({
            company: "Swiggy",
            title: "Refactor React Cart State",
            context: "Architecture Bug",
            taskDescription: "The checkout component is rendering twice on every item addition. Jump into the workspace, analyze the dependency tree, and implement O(1) re-renders using proper memoization techniques.",
            eloReward: 25
          });
          setIsGenerating(false);
        }
      }
    };
    
    fetchTask();

    return () => { 
      isMounted = false;
      clearTimeout(t1); 
      clearTimeout(t2); 
    };
  }, [domain, elo]);

  


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
                   {loadingStep >= 1 && <div style={{marginTop: 8}}><span style={{color:"#10B981"}}>✔</span> <TypewriterText text="Generating Swiggy architecture mission..." delay={200} speed={20} cursor={loadingStep === 1} /></div>}
                   {loadingStep >= 2 && <div style={{marginTop: 8, color: "#FF5701", fontWeight: 600}}>System Ready.</div>}
                 </div>
              </div>
            ) : (
              <>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#5F6368", fontSize: 15, fontWeight: 500 }}>
                 <Code2 size={20} strokeWidth={1.5} /> Today&apos;s Mission
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#202124", fontSize: 15, fontWeight: 600, background: "#F1F3F4", padding: "6px 14px", borderRadius: 999 }}><Trophy size={16} color="#FF5701" strokeWidth={2.5} /> +{taskData?.eloReward || 25} ELO</div>
            </div>

            <div>
              <h3 style={{ fontSize: 32, fontWeight: 400, color: "#202124", margin: "0 0 12px 0", letterSpacing: "-0.02em" }}>
                {taskData?.title || "Refactor React Cart State"}
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 15, color: "#5F6368", fontWeight: 500 }}>
                 <span>{taskData?.company || "Swiggy"}</span>
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
              }} onClick={() => onNavigate("arena")}>
                Solve in Workspace <ArrowRight size={18} strokeWidth={2} />
              </button>
              
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
              }} onMouseOver={(e) => { e.currentTarget.style.background = "#F1F3F4" }} onMouseOut={(e) => { e.currentTarget.style.background = "transparent" }}>
                <BookOpen size={18} strokeWidth={1.5} /> Learn First
              </button>
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
                      
                      <div style={{ display: "flex", flexDirection: "column", gap: 16, pointerEvents: "none", paddingBottom: 60 }}>
                        
                        <div style={{ border: "1px solid #E0E0E0", borderRadius: 16, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: "#5F6368" }}>Razorpay • Backend</span>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 400, color: "#202124", letterSpacing: "-0.01em" }}>Idempotency Key Middleware</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: "#202124" }}><Trophy size={14} color="#FF5701" strokeWidth={2.5} /> +{taskData?.eloReward || 25} ELO</div>
                        </div>
          
                        <div style={{ border: "1px solid #E0E0E0", borderRadius: 16, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 500, color: "#5F6368" }}>Cred • Frontend</span>
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 400, color: "#202124", letterSpacing: "-0.01em" }}>Framer Motion UI Optimizations</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 14, fontWeight: 600, color: "#202124" }}><Trophy size={14} color="#FF5701" strokeWidth={2.5} /> +30 ELO</div>
                        </div>
          
                      </div>
          
                      {/* Lock Overlay Banner */}
                      <div style={{
                        position: "absolute",
                        bottom: 0, left: 0, right: 0,
                        background: "linear-gradient(to top, rgba(255,255,255,1) 40%, rgba(255,255,255,0.6) 80%, rgba(255,255,255,0))",
                        backdropFilter: "blur(2px)",
                        padding: "80px 40px 32px 40px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        textAlign: "center"
                      }}>
                        <div style={{ background: "#F1F3F4", padding: 12, borderRadius: 999, marginBottom: 16 }}>
                          <Lock size={20} color="#5F6368" strokeWidth={1.5} />
                        </div>
                        <h4 style={{ fontSize: 18, fontWeight: 500, color: "#202124", margin: "0 0 8px 0" }}>Unlock Pro to access these missions</h4>
                        <p style={{ fontSize: 15, color: "#5F6368", margin: "0 0 24px 0" }}>Free tier users receive one company mission every 24 hours.</p>
                        
                        <button style={{
                          background: "#202124",
                          color: "#FFFFFF",
                          padding: "12px 28px",
                          borderRadius: 999,
                          fontWeight: 600,
                          fontSize: 15,
                          border: "none",
                          cursor: "pointer",
                          transition: "background 0.2s ease"
                        }} onMouseOver={(e) => { e.currentTarget.style.background = "#000000" }} onMouseOut={(e) => { e.currentTarget.style.background = "#202124" }}>
                          Upgrade to Pro
                        </button>
                      </div>
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
              Unlock unlimited daily tasks, deep AI code reviews, and guaranteed recruiter visibility.
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
    </div>
  )
}
