import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Code, MessageSquare, ChevronDown, ChevronUp, Terminal, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function CodeVault({ user, userData, onNavigate }) {
  const [vaultTasks, setVaultTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);

  useEffect(() => {
    async function fetchVault() {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('student_tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          // Map DB columns to our UI keys
          const mappedTasks = data.map(row => ({
            id: row.id,
            company: row.company_name,
            title: row.task_title,
            context: row.task_context,
            taskDescription: row.task_description,
            status: row.status,
            savedCode: row.saved_code,
            aiReview: row.ai_review,
            reward: row.elo_reward,
            timestamp: row.created_at
          }));
          setVaultTasks(mappedTasks);
        } else {
          // Fallback to empty state
          setVaultTasks([]);
        }
      } catch (err) {
        console.error("Error fetching Code Vault from DB:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchVault();
  }, [user]);

  // Group by company
  const groupedTasks = vaultTasks.reduce((acc, task) => {
    if (!acc[task.company]) {
      acc[task.company] = { total: 0, passed: 0, failed: 0, tasks: [] };
    }
    acc[task.company].total++;
    if (task.status.startsWith('passed')) acc[task.company].passed++;
    else acc[task.company].failed++;
    acc[task.company].tasks.push(task);
    return acc;
  }, {});

  if (loading) {
    return (
      <div style={{ padding: "40px", width: "100%", minHeight: '100vh', background: "#FAFAFA", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" size={32} color="#9CA3AF" />
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", width: "100%", minHeight: '100vh', background: "#FAFAFA" }}>
      
      {/* Header (No Icon, clean text) */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#202124', margin: 0, letterSpacing: "-0.02em" }}>Code Vault</h1>
        <p style={{ fontSize: 16, color: '#5F6368', margin: "8px 0 0 0" }}>
          Your permanent, verifiable proof of work. Every mission, every line of code, and every AI review is securely logged in your database.
        </p>
      </div>

      {Object.keys(groupedTasks).length === 0 ? (
        <div style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 16, padding: 40, textAlign: "center" }}>
          <Code size={40} color="#9CA3AF" style={{ marginBottom: 16, margin: "0 auto" }} />
          <h3 style={{ fontSize: 18, color: "#374151", fontWeight: 600, margin: 0 }}>Your vault is empty</h3>
          <p style={{ color: "#6B7280", marginTop: 8 }}>Complete Arena missions to build your verifiable code history.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {Object.entries(groupedTasks).map(([company, data]) => {
            const isExpanded = expandedCompany === company;
            return (
              <div key={company} style={{ background: "#FFF", border: "1px solid #E5E7EB", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                
                {/* Company Header Row */}
                <div 
                  onClick={() => setExpandedCompany(isExpanded ? null : company)}
                  style={{ padding: "24px 32px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: isExpanded ? "#F9FAFB" : "#FFF", transition: "background 0.2s" }}
                >
                  <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>{company}</h2>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, fontSize: 14, fontWeight: 500 }}>
                      <span style={{ color: "#6B7280" }}>{data.total} Mission{data.total > 1 ? 's' : ''}</span>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#D1D5DB" }} />
                      <span style={{ color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}><CheckCircle size={16} /> {data.passed} Passed</span>
                      <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#D1D5DB" }} />
                      <span style={{ color: "#EF4444", display: "flex", alignItems: "center", gap: 4 }}><XCircle size={16} /> {data.failed} Failed</span>
                    </div>
                  </div>
                  <div style={{ color: "#9CA3AF" }}>
                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </div>

                {/* Tasks List for Company */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid #E5E7EB", background: "#FFF" }}>
                    {data.tasks.map((task) => {
                      const isTaskExpanded = expandedTask === task.id;
                      const isPass = task.status.startsWith('passed');
                      return (
                        <div key={task.id} style={{ borderBottom: "1px solid #F3F4F6", padding: "24px 32px" }}>
                          
                          <div 
                            onClick={() => setExpandedTask(isTaskExpanded ? null : task.id)}
                            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                {isPass ? <CheckCircle size={18} color="#10B981" /> : <XCircle size={18} color="#EF4444" />}
                                <span style={{ fontSize: 18, fontWeight: 600, color: "#1F2937" }}>{task.title}</span>
                                  {task.status.includes('_second_attempt') && (
                                    <span style={{ fontSize: 11, fontWeight: 700, color: "#4B5563", background: "#E5E7EB", padding: "4px 8px", borderRadius: 6, letterSpacing: "0.02em" }}>
                                      Retry Attempt
                                    </span>
                                  )}
                              </div>
                              <div style={{ fontSize: 13, color: "#6B7280" }}>
                                Submitted on {new Date(task.timestamp).toLocaleDateString()} at {new Date(task.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </div>
                            
                            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              {isPass && (
                                <span style={{ fontSize: 14, fontWeight: 700, color: "#D97706", background: "#FEF3C7", padding: "6px 14px", borderRadius: 999 }}>
                                  +{task.reward} ELO
                                </span>
                              )}
                              <span style={{ fontSize: 14, color: "#2563EB", fontWeight: 600 }}>
                                {isTaskExpanded ? 'Hide Details' : 'View Code & Review'}
                              </span>
                            </div>
                          </div>

                          {/* Task Details (Question, Code & Review) */}
                          {isTaskExpanded && (
                            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 24 }}>
                              
                              {/* 1. Original Question / Context */}
                              <div style={{ background: "#F3F4F6", borderRadius: 12, padding: 20 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#4B5563", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                                  <FileText size={18} /> Task Description
                                </div>
                                <div style={{ fontSize: 15, color: "#1F2937", lineHeight: 1.6 }}>
                                  <p style={{ margin: "0 0 12px 0" }}><strong>Context:</strong> {task.context || "No context provided."}</p>
                                  <p style={{ margin: 0 }}><strong>Objective:</strong> {task.taskDescription || "No objective provided."}</p>
                                </div>
                              </div>

                              {/* 2. Saved Code */}
                              <div style={{ background: "#1E1E1E", borderRadius: 12, overflow: "hidden" }}>
                                <div style={{ background: "#2D2D2D", padding: "12px 20px", display: "flex", alignItems: "center", gap: 8, color: "#E5E7EB", fontSize: 13, fontFamily: "monospace" }}>
                                  <Terminal size={16} /> Solution Submitted
                                </div>
                                <pre style={{ margin: 0, padding: 20, color: "#D4D4D4", fontSize: 14, fontFamily: 'Consolas, Monaco, "Courier New", monospace', overflowX: "auto", whiteSpace: "pre-wrap" }}>
                                  {task.savedCode}
                                </pre>
                              </div>
                              
                              {/* 3. AI Review */}
                              <div style={{ background: isPass ? "#ECFDF5" : "#FEF2F2", border: `1px solid ${isPass ? "#A7F3D0" : "#FECACA"}`, borderRadius: 12, padding: 20 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, color: isPass ? "#065F46" : "#991B1B", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>
                                  <MessageSquare size={18} /> Capabilio Sr. Engineer Feedback
                                </div>
                                <p style={{ margin: 0, fontSize: 15, color: isPass ? "#064E3B" : "#7F1D1D", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                                  {task.aiReview.replace("Capabilio Sr. Engineer Feedback:\\n", "")}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
