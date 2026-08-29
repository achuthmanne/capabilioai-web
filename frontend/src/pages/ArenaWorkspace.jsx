import React, { useState, useEffect, useRef } from 'react';

import Editor from '@monaco-editor/react';
import { ArrowLeft, Play, Terminal, CheckCircle, Zap, Layout, Box, Activity, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { userDoc } from "../lib/db";
import { supabase } from "../lib/supabase";
import { SandpackProvider, SandpackPreview, SandpackLayout } from "@codesandbox/sandpack-react";

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
          else if (parsed.taskData.workspaceType === 'autocad') setLanguage('python');
          else if (parsed.taskData.workspaceType === 'hardware_hdl') setLanguage('cpp'); // closest for verilog // use python syntax highlighting for scripts
          else if (parsed.taskData.workspaceType === 'terminal' || parsed.taskData.workspaceType === 'log_viewer') setLanguage('shell');
        }
        if (parsed.violations) setViolations(parsed.violations);
        if (parsed.savedCode) setCode(parsed.savedCode);
        else if (parsed.taskData?.startingCode) setCode(parsed.taskData.startingCode);
        if (parsed.savedOutput) setConsoleOutput(parsed.savedOutput);
      } catch (e) {}
    }
  }, []);

  const [code, setCode] = useState('// Write your solution here\n// Await system instructions...');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(null);

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
        setConsoleOutput("Syntax Error(s) detected. Please fix them before running:\n" + errors.map(e => `Line ${e.startLineNumber}: ${e.message}`).join("\n"));
        return;
      }
    }

    setIsEvaluating(true);
    setConsoleOutput("Analyzing code structure...\nRunning unit tests with AI Evaluator...\n");
    
          try {
        const res = await fetch('/api/tasks/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskData, code, language })
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
        
        if (result.passed) {
          let earned = taskData.eloReward || 25;
          let penalty = violations * 10;
          if (penalty > earned) penalty = earned;
          finalReward = earned - penalty;
          
          let outputMessage = `

🌟 MISSION ACCOMPLISHED! 🌟`;
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
          setRedirectSeconds(10); // auto-redirect on pass
        } else {
          let outputMessage = `

❌ MISSION FAILED ❌
Review the test cases and feedback, then try again.`;
          finalOutput = baseOutput + outputMessage;
          setConsoleOutput(finalOutput.replace(/\\n/g, '\n'));
          // Wait 10 seconds and redirect even on fail so they don't get stuck forever
          setRedirectSeconds(10);
          
          // Reset violations for their next attempt since this one failed
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

        // Append hidden graph skills ONLY if passed AND no proctoring violations
        let dbFinalOutput = finalOutput;
        if (result.passed && violations === 0 && result.graphSkills && result.graphSkills.length > 0) {
            dbFinalOutput += `\n\n<!--SKILLS_DATA:${JSON.stringify(result.graphSkills)}-->`;
        }

        // Save to cache
        const cached = localStorage.getItem("capabilio_daily_mission");
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.completed = true;
          parsed.completedAt = Date.now();
          parsed.savedCode = code;
          parsed.savedOutput = dbFinalOutput.replace(/\\n/g, '\n');
          parsed.taskData.finalReward = finalReward;
          localStorage.setItem("capabilio_daily_mission", JSON.stringify(parsed));
        }
        
        // Save to permanent Code Vault (Supabase)
        const isPass = result.passed;
        
        try {
          const vaultStr = localStorage.getItem("capabilio_task_vault");
          const vault = vaultStr ? JSON.parse(vaultStr) : [];
          vault.unshift({
            id: Date.now().toString(),
            company: taskData.company,
            title: taskData.title,
            context: taskData.context,
            taskDescription: taskData.taskDescription,
            status: isPass ? 'passed' : 'failed',
            savedCode: code,
            aiReview: dbFinalOutput,
            reward: isPass ? finalReward : 0,
            timestamp: new Date().toISOString()
          });
          localStorage.setItem("capabilio_task_vault", JSON.stringify(vault));
        } catch(e) {}
        
        if (user?.id) {
          supabase.from('student_tasks').insert({
            user_id: user.id,
            company_name: taskData.company || "Unknown Company",
            task_title: taskData.title || "Daily Mission",
            task_context: taskData.context || "",
            task_description: taskData.taskDescription || "",
            status: isPass ? 'passed' : 'failed',
            saved_code: code,
            ai_review: dbFinalOutput.replace(/\\n/g, '\n'),
            elo_reward: isPass ? finalReward : 0
          }).then(({ error }) => {
            if (error) console.error("Failed to save to Supabase vault:", error);
          });
        }
        
        setTaskData(prev => ({ ...prev, completed: true, passed: isPass, finalReward }));

        // Update ELO only if passed
        if (result.passed && setUserData && userData) {
          const updatedElo = parseInt(userData.eloRating || 400) + parseInt(finalReward || 0);
          const updatedStreak = parseInt(userData.streak || userData.arenaStreak || 0) + 1;
            
          setUserData(prev => ({
            ...prev,
            eloRating: updatedElo,
            streak: updatedStreak,
            arenaStreak: updatedStreak
          }));

          if (user?.id) {
            userDoc.update(user.id, {
              eloRating: updatedElo,
              arenaStreak: updatedStreak
            }).catch(err => console.error("Failed to update ELO in DB:", err));
          }
        }

      } catch (err) {
      setConsoleOutput("System Error: Failed to contact AI Evaluator. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

    const hasFailed = taskData?.passed === false || consoleOutput?.includes('MISSION FAILED');
  const isMissionPassed = taskData?.completed && !hasFailed;

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FA', overflow: 'hidden' }}>
      
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
          <button onClick={() => onNavigate('studentHome')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#5F6368' }}>
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
          <button 
            onClick={handleSubmit}
            disabled={isEvaluating || isMissionPassed}
            style={{ 
              backgroundColor: isMissionPassed ? '#10B981' : (hasFailed ? '#EF4444' : '#FF5701'), color: 'white', border: 'none', padding: '8px 24px', borderRadius: '999px',
              fontWeight: 600, cursor: (isEvaluating || isMissionPassed) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              opacity: isEvaluating ? 0.7 : 1
            }}
          >
            {isMissionPassed ? <CheckCircle size={16} /> : (hasFailed ? <XCircle size={16} /> : (isEvaluating ? <Zap size={16} className="animate-pulse" /> : <Play size={16} />))}
            {isMissionPassed ? 'Mission Passed' : (hasFailed ? 'Mission Failed' : (isEvaluating ? 'Evaluating...' : 'Run Code'))}
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
              {taskData?.workspaceType === 'terminal' ? 'server_terminal' : taskData?.workspaceType === 'log_viewer' ? 'system_logs.txt' : taskData?.workspaceType === 'sql' ? 'query.sql' : taskData?.workspaceType === 'hardware_hdl' ? 'logic_design.v' : taskData?.workspaceType === 'autocad' ? 'design_macro.py' : language === 'javascript' ? 'index.js' : language === 'python' ? 'main.py' : language === 'java' ? 'Main.java' : language === 'cpp' ? 'main.cpp' : 'code'}
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
          <div style={{ flex: 1, padding: '16px 0' }}>
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
                  <Box size={14} /> CAD Renderer
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {activeConsoleTab === 'output' ? (
                <div style={{ padding: '16px', color: '#E0E0E0', fontFamily: 'monospace', fontSize: '13px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {consoleOutput}
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
