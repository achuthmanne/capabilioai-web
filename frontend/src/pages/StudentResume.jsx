import React, { useState, useEffect } from 'react';
import { Download, Share2, Sparkles, ShieldCheck, Lock, X, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

export default function StudentResume({ user, userData }) {
  const [showProSheet, setShowProSheet] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Real-time State
  const [resumeData, setResumeData] = useState({
    totalElo: 0,
    tier: 'Iron (Beginner)',
    globalRank: 'Top 99%',
    topSkills: {},
    topMissions: [],
    missionCount: 0
  });

  useEffect(() => {
    async function fetchResumeData() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('student_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'passed')
          .order('elo_reward', { ascending: false });
          
        if (error) throw error;
        
        let totalElo = 0;
        let skillCounts = {};
        
        if (data && data.length > 0) {
          data.forEach(task => {
            totalElo += (task.elo_reward || 0);
            
            // Extract skills from hidden AI metadata
            const match = task.ai_review?.match(/<!--SKILLS_DATA:(.*?)-->/);
            if (match && match[1]) {
              try {
                const skillsArr = JSON.parse(match[1]);
                skillsArr.forEach(sk => {
                  const domain = sk.domain || "Core Engineering";
                  if (!skillCounts[domain]) skillCounts[domain] = [];
                  if (!skillCounts[domain].includes(sk.skill)) {
                    skillCounts[domain].push(sk.skill);
                  }
                });
              } catch(e) {}
            }
          });
        }

        // Tier Logic
        let tier = 'Iron (Beginner)';
        let rank = 'Top 99%';
        if (totalElo >= 100) { tier = 'Bronze (Capable)'; rank = 'Top 50%'; }
        if (totalElo >= 300) { tier = 'Silver (Proficient)'; rank = 'Top 25%'; }
        if (totalElo >= 600) { tier = 'Gold (Advanced)'; rank = 'Top 10%'; }
        if (totalElo >= 1000) { tier = 'Diamond (Elite)'; rank = 'Top 2%'; }

        setResumeData({
          totalElo,
          tier,
          globalRank: rank,
          topSkills: skillCounts,
          topMissions: data ? data.slice(0, 3) : [],
          missionCount: data ? data.length : 0
        });

      } catch (err) {
        console.error("Failed to build resume:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchResumeData();
  }, [user]);

  // Process actual user data
  let firstName = "Candidate";
  let lastName = "";
  const rawName = userData?.display_name || userData?.displayName || userData?.name || user?.user_metadata?.full_name;
  if (rawName) {
    const parts = rawName.trim().split(" ");
    firstName = parts[0];
    lastName = parts.slice(1).join(" ");
  }
  
  const name = `${firstName} ${lastName}`.trim();
  const role = userData?.domain || userData?.keyword || userData?.targetRole || "Software Engineer";
  const email = user?.email || "contact@capabilio.com";

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(`https://capabilio.com/verify/${user?.id?.substring(0,8).toUpperCase() || 'AC89-2X'}`);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>Loading Verified Profile...</div>;
  }

  // Generate dynamic AI assessment text
  const topSkillNames = Object.values(resumeData.topSkills).flat().slice(0, 3).join(", ");
  const aiAssessmentText = resumeData.missionCount > 0 
    ? `Based on ${resumeData.missionCount} successfully evaluated missions in the Arena, this candidate operates at a ${resumeData.tier.split(' ')[0]} level. They have consistently demonstrated practical mastery in ${topSkillNames || 'software engineering'}, producing production-ready solutions that pass strict edge-case testing.`
    : `This candidate has just joined the Capabilio ecosystem and is currently undergoing Arena evaluations to build their verified proof of work.`;

  return (
    <div style={{ padding: "40px", width: "100%", background: "#FAFAFA" }}>
      
      {/* Action Bar (Not part of the printed resume) */}
      <div style={{ width: "100%", maxWidth: 850, margin: "0 auto 24px auto", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
        <button onClick={() => setShowProSheet(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: "10px 20px", background: "#FFFFFF", border: "1px solid #D1D5DB", borderRadius: 4, fontSize: 13, fontWeight: 700, color: "#374151", cursor: 'pointer' }}>
          <Download size={16} /> Download PDF
        </button>
        <button onClick={handleShare} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: "10px 24px", background: "#FF5701", border: "none", borderRadius: 4, fontSize: 14, fontWeight: 700, color: "#FFFFFF", cursor: 'pointer', transition: "background 0.2s" }} onMouseOver={(e) => { e.currentTarget.style.background = "#E64A00"; }} onMouseOut={(e) => { e.currentTarget.style.background = "#FF5701"; }}>
          {isCopied ? <Check size={16} /> : <Share2 size={16} />}
          {isCopied ? "Link Copied!" : "Share Profile"}
        </button>
      </div>

      {/* The A4 Resume Paper */}
      <div style={{ 
        width: "100%", maxWidth: 850, margin: "0 auto", background: "#FFFFFF", padding: "80px",
        border: "1px solid #E5E7EB", // Flat border instead of shadow
        position: "relative",
        overflow: "hidden",
        fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', // Highly professional serif font
        color: "#111827"
      }}>
        
        {/* HUGE Diagonal Watermark */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%) rotate(-35deg)",
          fontSize: "120px",
          fontWeight: 900,
          color: "rgba(20, 22, 26, 0.03)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          letterSpacing: "-0.03em"
        }}>
          CAPABILIO <span style={{ color: "rgba(255, 87, 1, 0.05)" }}>AI</span> VERIFIED
        </div>

        {/* Content (z-index ensures it sits above watermark) */}
        <div style={{ position: "relative", zIndex: 10 }}>
          
          {/* Header */}
          <div style={{ textAlign: "center", borderBottom: "2px solid #111827", paddingBottom: 24, marginBottom: 32 }}>
            <h1 style={{ fontSize: 40, fontWeight: 400, margin: "0 0 8px 0", letterSpacing: "1px", textTransform: "uppercase" }}>
              {name}
            </h1>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 12px 0", color: "#4B5563", letterSpacing: "2px", textTransform: "uppercase" }}>
              {role}
            </h2>
            <div style={{ fontSize: 13, color: "#6B7280", fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
              {email} • {userData?.linkedinUrl || userData?.linkedin_url ? (userData.linkedinUrl || userData.linkedin_url).replace(/^https?:\/\/(www\.)?/, '') : 'linkedin.com/in/profile'} • Verify at: capabilio.com/verify/{user?.id?.substring(0,8).toUpperCase() || 'AC89-2X'}
            </div>
          </div>

          {/* Core Stats (The AI Verified Stats) */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32, background: "#F9FAFB", padding: "16px 24px", border: "1px solid #E5E7EB", fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Global Tier</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#3B82F6" }}>{resumeData.tier}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Verified ELO Score</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{resumeData.totalElo.toLocaleString()} Points</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>Global Rank</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{resumeData.globalRank}</div>
            </div>
          </div>

          {/* Capabilio AI Assessment */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #E5E7EB", paddingBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="#FF5701" /> Capabilio AI Assessment
            </h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: "#374151" }}>
              {aiAssessmentText}
            </p>
          </div>

          {/* Skills Section */}
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px 0", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #E5E7EB", paddingBottom: 4 }}>
              Verified Capabilities
            </h3>
            {Object.keys(resumeData.topSkills).length > 0 ? (
              Object.entries(resumeData.topSkills).map(([category, skills]) => (
                <div key={category} style={{ marginBottom: 8, fontSize: 14, lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 700, marginRight: 8, color: "#111827" }}>{category}:</span>
                  <span style={{ color: "#374151" }}>{skills.join(", ")}</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 14, color: "#6B7280", fontStyle: "italic" }}>
                Skills will appear here once missions are completed and verified by Capabilio AI.
              </div>
            )}
          </div>

          {/* Experience / Proof of Work */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px 0", textTransform: "uppercase", letterSpacing: "1px", borderBottom: "1px solid #E5E7EB", paddingBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} color="#6B7280" /> Verified Platform Experience (Code Vault)
            </h3>
            
            {resumeData.topMissions.length > 0 ? (
              resumeData.topMissions.map((exp, i) => (
                <div key={i} style={{ marginBottom: 28 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{exp.company_name || "Platform Mission"}</div>
                    <div style={{ fontSize: 13, color: "#6B7280", fontFamily: 'ui-sans-serif, system-ui, sans-serif', fontWeight: 600 }}>
                      {new Date(exp.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} &nbsp;•&nbsp; <span style={{ color: "#059669" }}>+{exp.elo_reward || 0} ELO</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontStyle: "italic", marginBottom: 12, color: "#4B5563" }}>
                    {exp.task_title || "Technical Evaluation"}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.6, color: "#374151" }}>
                    {exp.task_description && (
                      <li style={{ marginBottom: 6 }}>{exp.task_description}</li>
                    )}
                    {exp.ai_review && (
                      <li style={{ marginBottom: 6 }}>
                        <strong>Verified by Capabilio AI:</strong> {exp.ai_review.replace(/<!--SKILLS_DATA:.*?-->/g, '').replace(/\[|\]/g, '').substring(0, 150)}...
                      </li>
                    )}
                  </ul>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 14, color: "#6B7280", fontStyle: "italic", padding: "20px 0" }}>
                No verified missions found yet. Complete Arena missions to build your proof of work.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Lock Overlay Banner */}
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: showProSheet ? 0 : "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          background: "linear-gradient(to top, rgba(255,255,255,1) 60%, rgba(255,255,255,0.85) 85%, rgba(255,255,255,0))",
          backdropFilter: "blur(8px)",
          padding: "100px 40px 40px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-end",
          textAlign: "center",
          zIndex: 9999
        }}>
        <button onClick={() => setShowProSheet(false)} style={{ position: "absolute", top: 80, right: 24, background: "none", border: "none", cursor: "pointer", color: "#5F6368", padding: 8 }}>
          <X size={24} />
        </button>
        <div style={{ background: "#FFFFFF", padding: 12, borderRadius: 999, marginBottom: 16, border: "1px solid #E5E7EB" }}>
          <Lock size={20} color="#6B7280" strokeWidth={2} />
        </div>
        <h4 style={{ fontSize: 20, fontWeight: 600, color: "#202124", margin: "0 0 8px 0" }}>Unlock Pro to Download</h4>
        <p style={{ fontSize: 15, color: "#5F6368", margin: "0 0 24px 0", maxWidth: 350 }}>Free tier users can view their Verified Identity. Upgrade to Pro to export as PDF and share officially.</p>
        
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
  );
}
