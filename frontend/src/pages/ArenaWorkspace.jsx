import React, { useState, useEffect, useRef } from 'react';

import Editor from '@monaco-editor/react';
import { ArrowLeft, Play, Terminal, CheckCircle, Zap, Layout, Box, Activity, XCircle, Clock, Pause, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { userDoc } from "../lib/db";
import { supabase } from "../lib/supabase";
import { SandpackProvider, SandpackPreview, SandpackLayout } from "@codesandbox/sandpack-react";

const API = import.meta.env.VITE_API_URL || "https://capabilio-web.onrender.com";

export default function ArenaWorkspace({ user, userData, setUserData, onNavigate }) {
  
  const [taskData, setTaskData] = useState(null);
  const [activeConsoleTab, setActiveConsoleTab] = useState('output');
  
  useEffect(() => {
    const cached = localStorage.getItem("capabilio_daily_mission");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.taskData) {
          setTaskData({ ...parsed.taskData, completed: parsed.completed, passed: parsed.passed });
          if (parsed.taskData.workspaceType === 'sql') setLanguage('sql');
          else if (parsed.taskData.workspaceType === 'autocad') { setLanguage('python'); setActiveConsoleTab('cad'); }
          else if (parsed.taskData.workspaceType === 'jupyter') { setLanguage('python'); setActiveConsoleTab('jupyter'); }
          else if (parsed.taskData.workspaceType === 'hardware_hdl') { setLanguage('cpp'); setActiveConsoleTab('waveform'); }
          else if (parsed.taskData.workspaceType === 'terminal') { setLanguage('shell'); setActiveConsoleTab('ssh'); }
          else if (parsed.taskData.workspaceType === 'log_viewer') { setLanguage('shell'); setActiveConsoleTab('logs'); }
          else if (parsed.taskData.workspaceType === 'code') setActiveConsoleTab('preview');
        }
        if (parsed.violations) setViolations(parsed.violations);
        const draft = localStorage.getItem('arena_draft_code');
        if (parsed.savedCode) setCode(parsed.savedCode);
        else if (draft) setCode(draft);
        else if (parsed.taskData?.startingCode) setCode(parsed.taskData.startingCode);
        if (parsed.savedOutput) setConsoleOutput(parsed.savedOutput);
      } catch (e) {}
    }
  }, []);

  const [code, setCode] = useState(() => {
    const saved = localStorage.getItem('arena_draft_code');
    return saved || '// Write your solution here\n// Await system instructions...';
  });

  useEffect(() => {
    localStorage.setItem('arena_draft_code', code);
  }, [code]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(null);
  const [showRetryCountdown, setShowRetryCountdown] = useState(0);

  useEffect(() => {
    if (showRetryCountdown > 0) {
      const timer = setTimeout(() => setShowRetryCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showRetryCountdown]);

  useEffect(() => {
    if (redirectSeconds !== null && redirectSeconds > 0) {
      const timer = setTimeout(() => setRedirectSeconds(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (redirectSeconds === 0) {
      onNavigate('studentHome');
    }
  }, [redirectSeconds, onNavigate]);
  const [language, setLanguage] = useState('javascript');
  const [consoleOutput, setConsoleOutput] = useState("System ready. Waiting for submission...");
  const [proctorWarning, setProctorWarning] = useState(null);
  const [violations, setViolations] = useState(0);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  // Proctoring Rules: Block Copy, Paste, Right Click, and Screenshots
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    
    const showWarning = (msg) => {
      setViolations(prev => {
        const next = prev + 1;
        const cached = localStorage.getItem("capabilio_daily_mission");
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            parsed.violations = next;
            localStorage.setItem("capabilio_daily_mission", JSON.stringify(parsed));
          } catch(e) {}
        }
        return next;
      });
      setProctorWarning(msg);
      setTimeout(() => setProctorWarning(null), 3000);
    };

    const handleCopyPaste = (e) => {
      e.preventDefault();
      showWarning("Copying and pasting is strictly prohibited in the Arena Workspace.");
    };

    const handleKeyDown = (e) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        showWarning("Screenshots are strictly prohibited. Action recorded.");
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "s" || e.key === "S" || e.key === "3" || e.key === "4")) {
        e.preventDefault();
        showWarning("Screenshots are strictly prohibited. Action recorded.");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C" || e.key === "v" || e.key === "V")) {
        e.preventDefault();
        showWarning("Copying and pasting is strictly prohibited in the Arena Workspace.");
        return;
      }
    };
    
    const handleWindowBlur = () => {
      showWarning("You have left the workspace window. This action is discouraged.");
    };

    const handleMouseLeave = () => {
      // Optional: blur or warn when mouse leaves document
      // setProctorWarning("Out of bounds"); 
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const handleSubmit = async () => {
    if (!taskData) return;

    // Fast local syntax check using Monaco
    if (monacoRef.current && editorRef.current && (language === 'javascript' || language === 'typescript')) {
      const model = editorRef.current.getModel();
      const markers = monacoRef.current.editor.getModelMarkers({ resource: model.uri });
      const errors = markers.filter(m => m.severity === 8); // 8 is Error severity in Monaco
      
      if (errors.length > 0) {
        setActiveConsoleTab('output');
        setConsoleOutput("Syntax Error(s) detected. Please fix them before running:\n" + errors.map(e => `Line ${e.startLineNumber}: ${e.message}`).join("\n"));
        return;
      }
    }

    setIsEvaluating(true);
    setActiveConsoleTab('output');
    setConsoleOutput("Analyzing code structure...\nRunning unit tests with AI Evaluator...\n");
    
          try {
        const res = await fetch(`${API}/api/tasks/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, taskData, code, language })
        });
        
        const result = await res.json();
        
        let testCasesOutput = "";
        if (result.testCases && result.testCases.length > 0) {
            testCasesOutput = "\n\n--- TEST CASES ---\n";
            result.testCases.forEach((tc, i) => {
                testCasesOutput += `[${tc.passed ? 'PASS' : 'FAIL'}] ${tc.name}: ${tc.details}\n`;
            });
            testCasesOutput += "------------------";
        }
        
        let baseOutput = `Output:
${result.consoleOutput}${testCasesOutput}

Capabilio Sr. Engineer Feedback:
${result.feedback}`;
        
        let finalReward = 0;
        let finalOutput = baseOutput;
        
        const isPass = result.passed;
        
        if (isPass) {
          let earned = taskData.eloReward || 25;
          let penalty = violations * 10;
          if (penalty > earned) penalty = earned;
          finalReward = earned - penalty;
          
          let outputMessage = `

? MISSION ACCOMPLISHED! ?`;
          if (violations > 0) {
              outputMessage += `
Task Reward: +${earned} ELO`;
              outputMessage += `
Indisciplinary Penalty: -${penalty} ELO (${violations} proctoring violations detected)`;
          }
          
          if (finalReward >= 0) {
              outputMessage += `
Total ELO Added: +${finalReward} Points!`;
          } else {
              outputMessage += `
Total ELO Deducted: ${finalReward} Points!`;
          }
          
          finalOutput = baseOutput + outputMessage;
          setConsoleOutput(finalOutput.replace(/\\n/g, '\n'));
        } else {
          let outputMessage = `\n\n? MISSION FAILED ?\nReview the test cases and feedback, then try again.`;
          if (timeLeft === 0) {
             const potentialElo = taskData.eloReward || 25;
             if (violations === 0) {
                 const penalty = Math.round(potentialElo * 0.25);
                 outputMessage += `\n\nTime is up! Genuine Attempt recorded.\nIndisciplinary Penalty: -0 ELO\nFailure Penalty (25%): -${penalty} ELO`;
             } else {
                 const cheatPenalty = violations * 10;
                 outputMessage += `\n\nTime is up!\nIndisciplinary Penalty: -${cheatPenalty} ELO (${violations} violations detected)`;
             }
          }
          finalOutput = baseOutput + outputMessage;
          setConsoleOutput(finalOutput.replace(/\\n/g, '\n'));
          if (timeLeft > 0) setShowRetryCountdown(3);
        }

        let dbFinalOutput = finalOutput;
        if (isPass && violations === 0 && result.graphSkills && result.graphSkills.length > 0) {
            dbFinalOutput += `

<!--SKILLS_DATA:${JSON.stringify(result.graphSkills)}-->`;
        }

        // --- Only complete the mission if they PASSED or TIME RAN OUT ---
        if (isPass || timeLeft === 0) {
          setRedirectSeconds(10); // auto-redirect on finish

          const cached = localStorage.getItem("capabilio_daily_mission");
          let parsed = cached ? JSON.parse(cached) : { generatedAt: Date.now(), taskData: taskData };
          parsed.completed = true;
          parsed.passed = isPass;
          parsed.completedAt = Date.now();
          parsed.savedCode = code;
          parsed.savedOutput = dbFinalOutput.replace(/\\n/g, '\n');
          if (!parsed.taskData) parsed.taskData = taskData;
          if (isPass) parsed.taskData.finalReward = finalReward;
          localStorage.setItem("capabilio_daily_mission", JSON.stringify(parsed));
          
          try {
            const vaultStr = localStorage.getItem("capabilio_task_vault");
            const vault = vaultStr ? JSON.parse(vaultStr) : [];
            vault.unshift({
              id: Date.now().toString(),
              company: taskData.company,
              title: taskData.title,
              context: taskData.context,
              taskDescription: taskData.taskDescription,
              status: (taskData.dbStatus === 'fallback_retry' || taskData.dbStatus === 'failed_second_attempt') ? (isPass ? 'passed_second_attempt' : 'failed_second_attempt') : (isPass ? 'passed' : 'failed'),
              savedCode: code,
              aiReview: dbFinalOutput,
              reward: isPass ? finalReward : 0,
              timestamp: new Date().toISOString()
            });
            localStorage.setItem("capabilio_task_vault", JSON.stringify(vault));
          } catch(e) {}
          
          if (user?.id) {
            let vaultStatus = isPass ? 'passed' : 'failed';
            if (taskData.dbStatus === 'fallback_retry' || taskData.dbStatus === 'failed_second_attempt') {
              vaultStatus = isPass ? 'passed_second_attempt' : 'failed_second_attempt';
            }
            
            supabase.from('student_tasks').insert({
              user_id: user.id,
              company_name: taskData.company || "Unknown Company",
              task_title: taskData.title || "Daily Mission",
              task_context: taskData.context || "",
              task_description: taskData.taskDescription || "",
              status: vaultStatus,
              saved_code: code,
              ai_review: dbFinalOutput.replace(/\\n/g, '\n'),
              elo_reward: isPass ? finalReward : 0
            }).then(({ error }) => {
              if (error) console.error("Failed to save to Supabase vault:", error);
            });
          }
          
          setTaskData(prev => ({ ...prev, completed: true, passed: isPass, finalReward }));
        } else {
          // Failed but timer is still going. Let them try again!
          setViolations(0);
          const cached = localStorage.getItem("capabilio_daily_mission");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              parsed.violations = 0;
              localStorage.setItem("capabilio_daily_mission", JSON.stringify(parsed));
            } catch(e) {}
          }
        }

        // --- DB STATE UPDATES (ELO & STREAKS) ---
        if ((isPass || timeLeft === 0) && setUserData && userData) {
          let updatedElo = parseInt(userData.eloRating || 400);
          let updatedStreak = parseInt(userData.streak || userData.arenaStreak || 0);

          if (isPass) {
            updatedElo += parseInt(finalReward || 0);
            updatedStreak += 1;
          } else {
            updatedStreak = 0; // Streak breaks on fail
            
            if (violations === 0) {
              // Genuine Fail: 25% deduction
              const potentialElo = taskData.eloReward || 25;
              const penalty = Math.round(potentialElo * 0.25);
              updatedElo -= penalty;
            } else {
              // Cheat Fail: Severe deduction based on violations
              const cheatPenalty = violations * 10;
              updatedElo -= cheatPenalty;
            }
            if (updatedElo < 0) updatedElo = 0;
          }

          setUserData(prev => ({
            ...prev,
            eloRating: updatedElo,
            streak: updatedStreak,
            arenaStreak: updatedStreak
          }));

          if (user?.id) {
            fetch(`${API}/api/tasks/sync-arena-state`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, eloRating: updatedElo, arenaStreak: updatedStreak })
            }).catch(err => console.error("Failed to securely sync ELO to DB:", err));
          }
        }

      } catch (err) {
      setConsoleOutput("System Error: Failed to contact AI Evaluator. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

    const hasFailed = taskData?.passed === false;
  
    // --- 15-Minute Timer Logic ---
    const [timeLeft, setTimeLeft] = useState(() => {
      const saved = localStorage.getItem('arena_timer');
      return saved !== null ? parseInt(saved, 10) : 900;
    });
    const [isTimerActive, setIsTimerActive] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [showExitPopup, setShowExitPopup] = useState(false);
    const hasAutoSubmitted = useRef(false);

    useEffect(() => {
      if (timeLeft <= 900) localStorage.setItem('arena_timer', timeLeft.toString());
    }, [timeLeft]);

    useEffect(() => {
      const missionPassed = taskData?.completed && taskData?.passed !== false && !consoleOutput?.includes('MISSION FAILED');
      if (missionPassed) {
          localStorage.removeItem('arena_timer');
          localStorage.removeItem('arena_draft_code');
          setIsTimerActive(false);
        return;
      }
      if (!isTimerActive || timeLeft <= 0 || isPaused) return;
      
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, [isTimerActive, timeLeft, taskData, consoleOutput, isPaused]);

    useEffect(() => {
      const missionPassed = taskData?.completed && taskData?.passed !== false && !consoleOutput?.includes('MISSION FAILED');
      if (timeLeft === 0 && !isEvaluating && !missionPassed && !hasAutoSubmitted.current) {
        hasAutoSubmitted.current = true;
        setIsTimerActive(false);
        handleSubmit();
      }
    }, [timeLeft, isEvaluating, taskData, consoleOutput]);
    // -----------------------------

    const isMissionPassed = taskData?.completed && !hasFailed;

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FA', overflow: 'hidden' }}>
      {/* Exit Confirmation Popup */}
      {showExitPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF', padding: '28px', borderRadius: '20px',
            width: '420px', maxWidth: '90%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: '#111827', fontWeight: 700 }}>Pause Mission?</h3>
            <p style={{ margin: '0 0 24px 0', color: '#4B5563', lineHeight: '1.6', fontSize: '15px' }}>
              Are you sure you want to exit the workspace? Your timer will be paused automatically, and you can resume this mission later from the dashboard.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => {
                  setIsPaused(false);
                  setShowExitPopup(false);
                }}
                style={{
                  padding: '10px 20px', borderRadius: '999px', border: '1px solid #E5E7EB',
                  backgroundColor: '#FFFFFF', color: '#374151', fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => onNavigate('studentHome')}
                style={{
                  padding: '10px 20px', borderRadius: '999px', border: 'none',
                  backgroundColor: '#FF5701', color: '#FFFFFF', fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(255, 87, 1, 0.2)', transition: 'opacity 0.2s'
                }}
              >
                Pause & Exit
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Success Redirect Overlay */}
      {redirectSeconds !== null && (
        <div style={{
          position: 'fixed', top: 30, left: '50%', transform: 'translateX(-50%)',
          backgroundColor: '#E6F4EA', color: '#188038', padding: '12px 24px', borderRadius: 999,
          fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #CEEAD6', fontSize: 15
        }}>
          <CheckCircle size={20} />
          Returning to Dashboard in {redirectSeconds}s...
        </div>
      )}

      {/* Proctoring Warning Overlay */}
      {proctorWarning && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
          backgroundColor: '#D93025', color: 'white', zIndex: 99999, 
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          fontSize: '24px', fontWeight: 600, textAlign: 'center', padding: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div>{proctorWarning}</div>
          <div style={{ fontSize: '16px', fontWeight: 400, marginTop: '16px', opacity: 0.8 }}>
            Continuing this behavior may result in automatic failure.
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <div style={{ height: '60px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
              onClick={() => {
                if (!isMissionPassed && timeLeft > 0) {
                  setIsPaused(true);
                  setShowExitPopup(true);
                } else {
                  onNavigate('studentHome');
                }
              }} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#5F6368' }}
            >
            <ArrowLeft size={20} />
          </button>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#202124', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Arena Workspace
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", backgroundColor: "#F1F3F4", borderRadius: "16px", color: "#202124", fontWeight: 600, fontSize: "13px" }}>
              {taskData?.company || "Swiggy"}
            </div>
            
            {/* Timer UI */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                display: "flex", alignItems: "center", gap: 6, padding: "6px 16px", 
                backgroundColor: timeLeft === 0 ? "#FEE2E2" : (timeLeft < 60 ? "#FEF08A" : (isPaused ? "#F3F4F6" : "#FFFFFF")), 
                border: `1px solid ${timeLeft === 0 ? "#EF4444" : (timeLeft < 60 ? "#F59E0B" : (isPaused ? "#D1D5DB" : "#E5E7EB"))}`,
                borderRadius: "16px", 
                color: timeLeft === 0 ? "#B91C1C" : (timeLeft < 60 ? "#B45309" : (isPaused ? "#6B7280" : "#374151")), 
                fontWeight: 700, fontSize: "14px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.3s ease"
              }}>
                <Clock size={16} className={timeLeft > 0 && timeLeft <= 60 && !isPaused ? "animate-pulse" : ""} />
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <button 
                onClick={() => setIsPaused(!isPaused)}
                disabled={timeLeft === 0 || isMissionPassed}
                title={isPaused ? "Resume Timer" : "Pause Timer"}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '34px', height: '34px', borderRadius: '50%',
                  border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF',
                  color: '#374151', cursor: (timeLeft === 0 || isMissionPassed) ? 'not-allowed' : 'pointer',
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                }}
              >
                {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
              </button>
            </div>
          <button 
              onClick={handleSubmit}
              disabled={isEvaluating || isMissionPassed || timeLeft === 0 || showRetryCountdown > 0}
              style={{ 
                backgroundColor: isMissionPassed ? '#10B981' : ((hasFailed || showRetryCountdown > 0) ? '#EF4444' : '#FF5701'), color: 'white', border: 'none', padding: '8px 24px', borderRadius: '999px',
                fontWeight: 600, cursor: (isEvaluating || isMissionPassed || timeLeft === 0 || showRetryCountdown > 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                opacity: isEvaluating ? 0.7 : 1, transition: 'all 0.3s ease'
              }}
            >
              {isMissionPassed ? <CheckCircle size={16} /> : ((hasFailed || showRetryCountdown > 0) ? <XCircle size={16} /> : (isEvaluating ? <Zap size={16} className="animate-pulse" /> : <Play size={16} />))}
              {isMissionPassed ? 'Mission Passed' : (timeLeft === 0 && hasFailed ? 'Time Up - Failed' : (hasFailed ? 'Mission Failed' : (showRetryCountdown > 0 ? `Failed - Retry in ${showRetryCountdown}s` : (isEvaluating ? 'Evaluating...' : (timeLeft === 0 ? 'Time Up' : 'Run Code')))))}
            </button>
        </div>
      </div>

      {/* Main Split Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', transition: 'filter 0.2s ease' }}>
        
        {/* Left Pane - Mission Details */}
        <div style={{ width: '40%', backgroundColor: '#FFFFFF', borderRight: '1px solid #E0E0E0', position: 'relative', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
          
          {/* Capabilio AI Watermark Pattern */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0, display: 'flex', flexDirection: 'column', gap: '60px', paddingTop: '40px' }}>
            {Array.from({ length: 15 }).map((_, rowIndex) => (
              <div key={rowIndex} style={{ display: 'flex', gap: '80px', transform: rowIndex % 2 === 0 ? 'translateX(-40px)' : 'translateX(20px)' }}>
                {Array.from({ length: 10 }).map((_, colIndex) => (
                  <span key={colIndex} style={{ 
                    fontSize: '24px', 
                    fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif', 
                    fontWeight: 800, 
                    letterSpacing: "-0.02em", 
                    color: "rgba(20, 22, 26, 0.08)", 
                    transform: 'rotate(-30deg)',
                    whiteSpace: 'nowrap'
                  }}>
                    Capabilio <span style={{ color: "rgba(255, 87, 1, 0.12)" }}>AI</span>
                  </span>
                ))}
              </div>
            ))}
          </div>

          <div style={{ padding: '32px', overflowY: 'auto', flex: 1, position: 'relative', zIndex: 1 }}>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: '#FF5701', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Today's Mission</div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#202124', marginBottom: '16px' }}>{taskData?.title || "Restaurant Card Price Bug"}</h1>
              <div style={{ fontSize: '15px', color: '#5F6368', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {taskData?.context || "On the Swiggy restaurant listing page, discounted prices are not displaying correctly when a restaurant has an active offer. Users see the original price and discounted price overlapping or showing NaN in some cases. This is causing confusion during checkout decisions."}
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#E0E0E0', margin: '32px 0' }} />

            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#202124', marginBottom: '16px' }}>Task Requirements</h2>
              <div style={{ fontSize: '15px', color: '#3C4043', lineHeight: '1.6', backgroundColor: '#F8F9FA', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0' }}>
                {taskData?.taskDescription || "Fix the calculateDiscount function so it correctly calculates and displays the discounted price only when a valid discountPercent is passed as a parameter.\n\nIf discountPercent is missing, undefined, or zero, only the original price should be returned. Ensure the discount calculation rounds to the nearest whole number and handles cases where price is a string instead of a number."}
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#202124', marginBottom: '16px' }}>Reward</h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#FCE8E6', borderRadius: '999px', color: '#D93025', fontWeight: 600 }}>
                <CheckCircle size={18} />
                +{taskData?.eloReward || 25} ELO Points
              </div>
            </div>

          </div>
        </div>

        {/* Right Pane - Code & Terminal */}
        <div style={{ width: '60%', display: 'flex', flexDirection: 'column', backgroundColor: '#1E1E1E' }}>
          
          {/* Editor Header */}
          <div style={{ height: '40px', backgroundColor: '#2D2D2D', borderBottom: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', color: '#E0E0E0', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} /> 
              {taskData?.workspaceType === 'terminal' ? 'server_terminal' : taskData?.workspaceType === 'log_viewer' ? 'system_logs.txt' : taskData?.workspaceType === 'sql' ? 'query.sql' : taskData?.workspaceType === 'hardware_hdl' ? 'logic_design.v' : taskData?.workspaceType === 'autocad' ? 'design_macro.py' : taskData?.workspaceType === 'jupyter' ? 'notebook.ipynb' : language === 'javascript' ? 'index.js' : language === 'python' ? 'main.py' : language === 'java' ? 'Main.java' : language === 'cpp' ? 'main.cpp' : 'code'}
            </div>
            {(!taskData?.workspaceType || taskData?.workspaceType === 'code') && (
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)}
                style={{
                  backgroundColor: '#1E1E1E', color: '#E0E0E0', border: '1px solid #333', 
                  borderRadius: '6px', padding: '6px 28px 6px 12px', fontSize: '13px', outline: 'none', cursor: 'pointer',
                  appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23E0E0E0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px top 50%', backgroundSize: '10px auto'
                }}
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="python">Python 3</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
                <option value="typescript">TypeScript</option>
              </select>
            )}
          </div>

          {/* Monaco Editor */}
          <div style={{ flex: 1, padding: '16px 0', position: 'relative' }}>
            {isPaused && (
              <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(30, 30, 30, 0.95)', backdropFilter: 'blur(8px)',
                zIndex: 10, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', gap: 16
              }}>
                <Lock size={48} style={{ opacity: 0.5 }} />
                <div style={{ fontSize: 20, fontWeight: 600 }}>Timer Paused</div>
                <div style={{ fontSize: 14, color: '#A0A0A0', maxWidth: 300, textAlign: 'center', lineHeight: 1.5 }}>
                  Your code is hidden while the timer is paused to prevent unfair advantages.
                </div>
                <button
                  onClick={() => setIsPaused(false)}
                  style={{
                    marginTop: 8, backgroundColor: '#FF5701', color: 'white',
                    border: 'none', padding: '10px 32px', borderRadius: 999,
                    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8
                  }}
                >
                  <Play size={16} fill="currentColor" /> Resume Mission
                </button>
              </div>
            )}
            <Editor
              height="100%"
              language={language}
              path={language === 'typescript' ? 'main.tsx' : language === 'javascript' ? 'main.jsx' : language === 'python' ? 'main.py' : language === 'java' ? 'Main.java' : language === 'cpp' ? 'main.cpp' : undefined}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value)}
              beforeMount={(monaco) => {
                const compilerOptions = {
                  jsx: 2, // monaco.languages.typescript.JsxEmit.React
                  jsxFactory: 'React.createElement',
                  reactNamespace: 'React',
                  allowNonTsExtensions: true,
                  target: 99, // ScriptTarget.Latest
                };
                monaco.languages.typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
                monaco.languages.typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
                monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: true,
                  noSyntaxValidation: false,
                });
                monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
                  noSemanticValidation: true,
                  noSyntaxValidation: false,
                });
              }}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
              }}
              options={{
                minimap: { enabled: false },
                  readOnly: isMissionPassed || false,
                fontSize: 14,
                fontFamily: 'Consolas, "Courier New", monospace',
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                contextmenu: false
              }}
            />
          </div>

          {/* Terminal / Code Review Console */}
          <div style={{ height: '30%', backgroundColor: '#1E1E1E', borderTop: '1px solid #333333', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '36px', backgroundColor: '#2D2D2D', display: 'flex', alignItems: 'center', padding: '0 16px', fontSize: '12px', gap: '20px' }}>
              <div 
                onClick={() => setActiveConsoleTab('output')}
                style={{ color: activeConsoleTab === 'output' ? '#FFFFFF' : '#888', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: activeConsoleTab === 'output' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px', borderBottom: activeConsoleTab === 'output' ? '2px solid #FF5701' : '2px solid transparent', height: '100%' }}
              >
                <Terminal size={14} /> Output / AI Review
              </div>
              
              {taskData?.workspaceType === 'code' && (
                <div 
                  onClick={() => setActiveConsoleTab('preview')}
                  style={{ color: activeConsoleTab === 'preview' ? '#FFFFFF' : '#888', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: activeConsoleTab === 'preview' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px', borderBottom: activeConsoleTab === 'preview' ? '2px solid #FF5701' : '2px solid transparent', height: '100%' }}
                >
                  <Layout size={14} /> Live Web Preview
                </div>
              )}
              {taskData?.workspaceType === 'jupyter' && (
                <div 
                  onClick={() => setActiveConsoleTab('jupyter')}
                  style={{ color: activeConsoleTab === 'jupyter' ? '#FFFFFF' : '#888', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: activeConsoleTab === 'jupyter' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px', borderBottom: activeConsoleTab === 'jupyter' ? '2px solid #FF5701' : '2px solid transparent', height: '100%' }}
                >
                  <Box size={14} /> Notebook Output
                </div>
              )}
              {taskData?.workspaceType === 'hardware_hdl' && (
                <div 
                  onClick={() => setActiveConsoleTab('waveform')}
                  style={{ color: activeConsoleTab === 'waveform' ? '#FFFFFF' : '#888', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: activeConsoleTab === 'waveform' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px', borderBottom: activeConsoleTab === 'waveform' ? '2px solid #FF5701' : '2px solid transparent', height: '100%' }}
                >
                  <Activity size={14} /> Logic Analyzer
                </div>
              )}
              {taskData?.workspaceType === 'autocad' && (
                <div 
                  onClick={() => setActiveConsoleTab('cad')}
                  style={{ color: activeConsoleTab === 'cad' ? '#FFFFFF' : '#888', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: activeConsoleTab === 'cad' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px', borderBottom: activeConsoleTab === 'cad' ? '2px solid #FF5701' : '2px solid transparent', height: '100%' }}
                >
                  <Box size={14} /> <Box size={14} /> CAD Renderer
                </div>
              )}
              {taskData?.workspaceType === 'terminal' && (
                <div 
                  onClick={() => setActiveConsoleTab('ssh')}
                  style={{ color: activeConsoleTab === 'ssh' ? '#FFFFFF' : '#888', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: activeConsoleTab === 'ssh' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px', borderBottom: activeConsoleTab === 'ssh' ? '2px solid #FF5701' : '2px solid transparent', height: '100%' }}
                >
                  <Terminal size={14} /> Live SSH Terminal
                </div>
              )}
              {taskData?.workspaceType === 'log_viewer' && (
                <div 
                  onClick={() => setActiveConsoleTab('logs')}
                  style={{ color: activeConsoleTab === 'logs' ? '#FFFFFF' : '#888', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: activeConsoleTab === 'logs' ? 600 : 400, display: 'flex', alignItems: 'center', gap: '6px', borderBottom: activeConsoleTab === 'logs' ? '2px solid #FF5701' : '2px solid transparent', height: '100%' }}
                >
                  <Activity size={14} /> System Log Stream
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {activeConsoleTab === 'output' ? (
                <div style={{ padding: '16px', color: '#E0E0E0', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {consoleOutput}
                </div>
              ) : activeConsoleTab === 'jupyter' ? (
                <div style={{ flex: 1, backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e0e0e0', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div style={{ color: '#F37626', fontWeight: 600, fontSize: '18px' }}>Jupyter</div>
                    <div style={{ color: '#777', fontSize: '14px', marginLeft: 'auto' }}>Trusted | Python 3 (ipykernel)</div>
                  </div>
                  
                  {/* Mock Cell Input */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ color: '#2b579a', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'nowrap', paddingTop: '4px' }}>In [1]:</div>
                    <div style={{ flex: 1, border: '1px solid #cfcfcf', backgroundColor: '#f7f7f7', borderRadius: '4px', padding: '8px', fontFamily: 'monospace', fontSize: '13px', color: '#333' }}>
                      <span style={{color: '#008000'}}>import</span> pandas <span style={{color: '#008000'}}>as</span> pd<br/>
                      <span style={{color: '#008000'}}>import</span> matplotlib.pyplot <span style={{color: '#008000'}}>as</span> plt<br/>
                      <span style={{color: '#888'}}># Executing analysis...</span>
                    </div>
                  </div>

                  {/* Mock Cell Output */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    <div style={{ color: '#d84a38', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'nowrap', paddingTop: '4px' }}>Out[1]:</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      {/* DataFrame Mock */}
                      <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '100%', maxWidth: '500px', textAlign: 'right' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #ccc' }}>
                            <th style={{ padding: '4px 8px' }}></th>
                            <th style={{ padding: '4px 8px' }}>feature_1</th>
                            <th style={{ padding: '4px 8px' }}>feature_2</th>
                            <th style={{ padding: '4px 8px' }}>target</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' }}><td style={{ fontWeight: 'bold', padding: '4px 8px' }}>0</td><td style={{ padding: '4px 8px' }}>0.45</td><td style={{ padding: '4px 8px' }}>-1.23</td><td style={{ padding: '4px 8px' }}>1</td></tr>
                          <tr style={{ borderBottom: '1px solid #eee' }}><td style={{ fontWeight: 'bold', padding: '4px 8px' }}>1</td><td style={{ padding: '4px 8px' }}>0.88</td><td style={{ padding: '4px 8px' }}>2.04</td><td style={{ padding: '4px 8px' }}>0</td></tr>
                          <tr style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' }}><td style={{ fontWeight: 'bold', padding: '4px 8px' }}>2</td><td style={{ padding: '4px 8px' }}>-0.12</td><td style={{ padding: '4px 8px' }}>0.44</td><td style={{ padding: '4px 8px' }}>1</td></tr>
                        </tbody>
                      </table>

                      {/* Matplotlib Mock */}
                      <div style={{ width: '300px', height: '200px', border: '1px solid #e0e0e0', position: 'relative', marginTop: '8px' }}>
                        <div style={{ position: 'absolute', bottom: '20px', left: '20px', right: '10px', height: '1px', backgroundColor: '#333' }}></div>
                        <div style={{ position: 'absolute', bottom: '20px', left: '20px', top: '10px', width: '1px', backgroundColor: '#333' }}></div>
                        
                        <div style={{ position: 'absolute', bottom: '40px', left: '60px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1f77b4' }}></div>
                        <div style={{ position: 'absolute', bottom: '80px', left: '100px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#1f77b4' }}></div>
                        <div style={{ position: 'absolute', bottom: '150px', left: '150px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff7f0e' }}></div>
                        <div style={{ position: 'absolute', bottom: '120px', left: '200px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff7f0e' }}></div>
                        
                        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                          <path d="M 20 180 L 290 30" fill="none" stroke="rgba(255,0,0,0.5)" strokeWidth="2" strokeDasharray="5 5" />
                        </svg>
                      </div>

                    </div>
                  </div>
                  
                </div>
              ) : activeConsoleTab === 'ssh' ? (
                <div style={{ flex: 1, backgroundColor: '#000000', padding: '16px', fontFamily: 'monospace', color: '#00FF00', overflowY: 'auto' }}>
                  <div style={{ opacity: 0.7, marginBottom: '12px' }}>Connecting to production-server-01.capabilio.internal...</div>
                  <div style={{ opacity: 0.7, marginBottom: '12px' }}>Authentication successful.</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#00FF00', fontWeight: 'bold' }}>root@prod-01:~#</span>
                    <span><motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }}>_</motion.span></span>
                  </div>
                  <div style={{ marginTop: '24px', opacity: 0.5, fontSize: '12px' }}>// Awaiting script execution...</div>
                </div>
              ) : activeConsoleTab === 'logs' ? (
                <div style={{ flex: 1, backgroundColor: '#111111', padding: '16px', fontFamily: 'monospace', color: '#CCCCCC', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ opacity: 0.7, marginBottom: '12px', color: '#FFD700' }}>$ tail -f /var/log/syslog</div>
                  <div><span style={{ color: '#888' }}>[12:00:01]</span> <span style={{ color: '#00FF00' }}>INFO</span> System started.</div>
                  <div><span style={{ color: '#888' }}>[12:00:05]</span> <span style={{ color: '#00FF00' }}>INFO</span> Network interface eth0 up.</div>
                  <div><span style={{ color: '#888' }}>[12:00:15]</span> <span style={{ color: '#FFD700' }}>WARN</span> Memory usage approaching 80%.</div>
                  <div><span style={{ color: '#888' }}>[12:01:02]</span> <span style={{ color: '#FF0000' }}>ERROR</span> Connection to database timed out.</div>
                  <div><span style={{ color: '#888' }}>[12:01:05]</span> <span style={{ color: '#FFD700' }}>WARN</span> Retrying connection (1/3)...</div>
                  <div><motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ color: '#888' }}>Waiting for new logs...</motion.span></div>
                </div>
              ) : activeConsoleTab === 'ssh' ? (
                <div style={{ flex: 1, backgroundColor: '#000000', padding: '16px', fontFamily: 'monospace', color: '#00FF00', overflowY: 'auto' }}>
                  <div style={{ opacity: 0.7, marginBottom: '12px' }}>Connecting to production-server-01.capabilio.internal...</div>
                  <div style={{ opacity: 0.7, marginBottom: '12px' }}>Authentication successful.</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: '#00FF00', fontWeight: 'bold' }}>root@prod-01:~#</span>
                    <span><motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }}>_</motion.span></span>
                  </div>
                  <div style={{ marginTop: '24px', opacity: 0.5, fontSize: '12px' }}>// Awaiting script execution...</div>
                </div>
              ) : activeConsoleTab === 'logs' ? (
                <div style={{ flex: 1, backgroundColor: '#111111', padding: '16px', fontFamily: 'monospace', color: '#CCCCCC', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ opacity: 0.7, marginBottom: '12px', color: '#FFD700' }}>$ tail -f /var/log/syslog</div>
                  <div><span style={{ color: '#888' }}>[12:00:01]</span> <span style={{ color: '#00FF00' }}>INFO</span> System started.</div>
                  <div><span style={{ color: '#888' }}>[12:00:05]</span> <span style={{ color: '#00FF00' }}>INFO</span> Network interface eth0 up.</div>
                  <div><span style={{ color: '#888' }}>[12:00:15]</span> <span style={{ color: '#FFD700' }}>WARN</span> Memory usage approaching 80%.</div>
                  <div><span style={{ color: '#888' }}>[12:01:02]</span> <span style={{ color: '#FF0000' }}>ERROR</span> Connection to database timed out.</div>
                  <div><span style={{ color: '#888' }}>[12:01:05]</span> <span style={{ color: '#FFD700' }}>WARN</span> Retrying connection (1/3)...</div>
                  <div><motion.span animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ color: '#888' }}>Waiting for new logs...</motion.span></div>
                </div>
              ) : activeConsoleTab === 'waveform' ? (
                <div style={{ flex: 1, backgroundColor: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(0,255,100,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,100,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                  <div style={{ zIndex: 1, color: '#00FF66', fontFamily: 'monospace', width: '100%', padding: '40px' }}>
                    <div style={{ fontSize: '14px', letterSpacing: '2px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={18} /> RTL LOGIC ANALYZER / OSCILLOSCOPE
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', opacity: 0.8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '60px', fontSize: '12px' }}>CLK</div>
                        <div style={{ flex: 1, height: '30px', position: 'relative' }}>
                          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 10">
                            <polyline points="0,10 5,10 5,0 15,0 15,10 25,10 25,0 35,0 35,10 45,10 45,0 55,0 55,10 65,10 65,0 75,0 75,10 85,10 85,0 95,0 95,10 100,10" fill="none" stroke="#00FF66" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                          </svg>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '60px', fontSize: '12px' }}>DATA_IN</div>
                        <div style={{ flex: 1, height: '30px', position: 'relative' }}>
                          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 10">
                            <polyline points="0,0 20,0 20,10 40,10 40,0 70,0 70,10 90,10 90,0 100,0" fill="none" stroke="#00FF66" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                          </svg>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ width: '60px', fontSize: '12px' }}>TX_OUT</div>
                        <div style={{ flex: 1, height: '30px', position: 'relative' }}>
                          <svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 10">
                            <polyline points="0,10 15,10 15,0 30,0 30,10 80,10 80,0 100,0" fill="none" stroke="#00FF66" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : activeConsoleTab === 'cad' ? (
                <div style={{ flex: 1, backgroundColor: '#0A0A0A', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  <div style={{ zIndex: 1, color: '#00FF41', fontFamily: 'monospace', textAlign: 'center' }}>
                    <Box size={48} style={{ margin: '0 auto 16px', opacity: 0.8 }} />
                    <div style={{ fontSize: '14px', letterSpacing: '2px', marginBottom: '8px' }}>AUTOCAD ENGINE RUNNING</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>Rendering preview from macro parameters...</div>
                    <div style={{ marginTop: '24px', width: '200px', height: '200px', border: '1px solid #00FF41', margin: '24px auto 0', position: 'relative', borderRadius: '50%' }}>
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(0, 255, 65, 0.3)' }} />
                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(0, 255, 65, 0.3)' }} />
                      <svg width="100%" height="100%" viewBox="0 0 100 100">
                        <path d="M 20 50 Q 50 10 80 50 T 20 50" fill="none" stroke="#00FF41" strokeWidth="1" opacity="0.8" />
                        <circle cx="50" cy="50" r="15" fill="none" stroke="#00FF41" strokeWidth="1" strokeDasharray="4 4" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, backgroundColor: '#ffffff' }}>
                  <SandpackProvider template="react" theme="dark" files={{ "/App.js": code }}>
                    <SandpackLayout style={{ height: '100%', minHeight: '400px' }}>
                      <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton={true} style={{ height: '100%', minHeight: '400px' }} />
                    </SandpackLayout>
                  </SandpackProvider>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
