import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Lock, Zap, FileText, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SkillGraph({ user, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ domains: [], skills: [] });
  const [hoveredNode, setHoveredNode] = useState(null);

  useEffect(() => {
    async function fetchSkills() {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('student_tasks')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'passed'); // Only show skills for passed missions
          
        if (error) throw error;
        
        let extractedDomains = {};
        let extractedSkills = [];
        let skillIdCounter = 1;

        if (data && data.length > 0) {
          data.forEach(task => {
            // Check for hidden skills metadata
            const match = task.ai_review?.match(/<!--SKILLS_DATA:(.*?)-->/);
            if (match && match[1]) {
              try {
                const skillsArr = JSON.parse(match[1]);
                skillsArr.forEach(sk => {
                  const dName = sk.domain || "Core Fundamentals";
                  const sName = sk.skill || "Problem Solving";
                  
                  if (!extractedDomains[dName]) {
                    extractedDomains[dName] = { id: `d_${Object.keys(extractedDomains).length}`, label: dName };
                  }
                  
                  // Avoid exact duplicate skills in the same domain
                  const isDuplicate = extractedSkills.find(e => e.domainId === extractedDomains[dName].id && e.label === sName);
                  if (!isDuplicate) {
                    extractedSkills.push({
                      id: `s_${skillIdCounter++}`,
                      domainId: extractedDomains[dName].id,
                      label: sName,
                      mission: task.task_title || task.company_name,
                      elo: `+${task.elo_reward}`,
                      unlocked: true
                    });
                  }
                });
              } catch(e) { console.error("Error parsing SKILLS_DATA", e); }
            }
          });
        }
        
        setGraphData({
          domains: Object.values(extractedDomains),
          skills: extractedSkills
        });
      } catch (err) {
        console.error("Failed to load skill graph:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, [user]);

  if (loading) {
    return (
      <div style={{ padding: "40px", width: "100%", minHeight: '100vh', background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" size={32} color="#9CA3AF" />
      </div>
    );
  }

  const hasData = graphData.domains.length > 0;

  return (
    <div style={{ padding: "40px", width: "100%", minHeight: '100vh', background: "#FAFAFA", display: "flex", flexDirection: "column" }}>
      
      {/* Header */}
      <div style={{ marginBottom: 40, zIndex: 10 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#202124', margin: 0, letterSpacing: "-0.02em" }}>Knowledge Graph</h1>
        <p style={{ fontSize: 16, color: '#5F6368', margin: "8px 0 0 0", maxWidth: 600 }}>
          The anatomy of your expertise. Every mission you complete in the Arena unlocks new micro-skills, intelligently extracted by Capabilio AI.
        </p>
      </div>

      {!hasData ? (
        <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 24, padding: 60, textAlign: "center", flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={48} color="#D1D5DB" style={{ marginBottom: 24 }} />
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 12 }}>No skills unlocked yet</h2>
          <p style={{ fontSize: 16, color: "#6B7280", maxWidth: 400 }}>Complete a mission in the Arena to start building your real-time Knowledge Graph.</p>
        </div>
      ) : (
        <div style={{ 
          background: "#FFFFFF", 
          border: "1px solid #E5E7EB", 
          borderRadius: 24, 
          padding: "40px 60px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          gap: 60,
          position: "relative"
        }}>
          {/* Subtle Dot Grid Background inside Graph Area */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(#E5E7EB 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            opacity: 0.3,
            zIndex: 0,
            borderRadius: 24
          }} />

          {graphData.domains.map((domain, index) => {
            const domainSkills = graphData.skills.filter(s => s.domainId === domain.id);
            const initial = domain.label.charAt(0).toUpperCase();
            
            return (
              <div key={domain.id} style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "flex-start" }}>
                
                {/* Domain Node */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 200, flexShrink: 0 }}>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    style={{ 
                      width: 80, height: 80, borderRadius: "50%", background: "#202124", 
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 12px 32px rgba(32, 33, 36, 0.2), 0 0 0 4px rgba(32, 33, 36, 0.05)",
                      border: "2px solid #FFFFFF",
                      fontSize: 32, fontWeight: 800, color: "#FFFFFF", fontFamily: 'ui-serif, Georgia, serif',
                      marginBottom: 16, zIndex: 2
                    }}
                  >
                    {initial}
                  </motion.div>
                  <div style={{ 
                    background: "#FFFFFF", padding: "8px 20px", borderRadius: 999, 
                    fontSize: 15, fontWeight: 700, color: "#202124", border: "1px solid #E5E7EB",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)", textAlign: "center"
                  }}>
                    {domain.label}
                  </div>
                </div>

                {/* Connecting Line (Horizontal Stem) */}
                <div style={{ 
                  width: 60, height: 2, background: "#D1D5DB", marginTop: 40, position: "relative", zIndex: 1
                }} />

                {/* Skills Container (Vertical Line branch off) */}
                <div style={{ 
                  display: "flex", flexDirection: "column", gap: 24, paddingTop: 22,
                  borderLeft: "2px solid #D1D5DB", paddingLeft: 30, position: "relative"
                }}>
                  {domainSkills.map((skill, sIndex) => {
                    const isHovered = hoveredNode === skill.id;
                    return (
                      <div key={skill.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        
                        {/* Connecting branch (Horizontal to Node) */}
                        <div style={{ 
                          position: "absolute", left: -32, top: "50%", width: 32, height: 2, background: "#D1D5DB" 
                        }} />

                        <motion.div
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ duration: 0.3, delay: (index * 0.1) + (sIndex * 0.05) }}
                          onHoverStart={() => setHoveredNode(skill.id)}
                          onHoverEnd={() => setHoveredNode(null)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            background: "#FFFFFF",
                            border: `2px solid ${isHovered ? "#FF5701" : "#E5E7EB"}`,
                            padding: "10px 20px",
                            borderRadius: 999,
                            boxShadow: isHovered ? "0 8px 24px rgba(255, 87, 1, 0.15)" : "0 2px 8px rgba(0,0,0,0.04)",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            position: "relative",
                            zIndex: isHovered ? 10 : 2
                          }}
                        >
                          <Target size={18} color={isHovered ? "#FF5701" : "#202124"} />
                          <span style={{ fontSize: 15, fontWeight: 600, color: isHovered ? "#FF5701" : "#202124" }}>
                            {skill.label}
                          </span>

                          {/* Hover Card Overlay */}
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: "100%",
                                  transform: "translateY(-50%)",
                                  marginLeft: 16,
                                  width: 240,
                                  background: "#202124",
                                  borderRadius: 12,
                                  padding: "16px 20px",
                                  boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
                                  color: "#FFFFFF",
                                  pointerEvents: "none",
                                  zIndex: 20
                                }}
                              >
                                <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Mission Origin</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: "#FFFFFF", marginBottom: 12, lineHeight: 1.4 }}>{skill.mission}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#10B981", fontSize: 13, fontWeight: 700 }}>
                                  <Zap size={14} fill="#10B981" /> {skill.elo} ELO Earned
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
