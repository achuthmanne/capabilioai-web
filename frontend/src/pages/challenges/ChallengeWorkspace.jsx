import React, { useState, useEffect } from 'react'
import { ArrowLeft, Play, CheckCircle, XCircle, Zap, Terminal } from 'lucide-react'
import { api } from '../../lib/api'
import Editor from '@monaco-editor/react'

export default function ChallengeWorkspace({ questionId, onBack }) {
  const [question, setQuestion] = useState(null)
  const [code, setCode] = useState('// Write your code here\\n')
  const [language, setLanguage] = useState('javascript')
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [results, setResults] = useState(null)
  const [card, setCard] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [qRes, cRes] = await Promise.all([
        api.get(`/api/challenges/questions/${questionId}`),
        api.get('/api/challenges/current')
      ])
      
      setQuestion(qRes.question)
      setCard(cRes.card)
      
      if (qRes.question.workspace_type === 'python') setLanguage('python')
      else if (qRes.question.workspace_type === 'cpp') setLanguage('cpp')
      else if (qRes.question.workspace_type === 'java') setLanguage('java')
      
    } catch (e) {
      console.error(e)
    }
  }

  const handleRunTests = async () => {
    setIsEvaluating(true)
    setResults(null)
    try {
      const res = await api.post('/api/challenges/evaluate', {
        code,
        language,
        questionId,
        cardId: card.id
      })
      setResults(res)
    } catch (e) {
      console.error(e)
      setResults({ passed: false, error: e.message || "Execution failed" })
    } finally {
      setIsEvaluating(false)
    }
  }

  if (!question) return <div style={{ padding: '40px', color: '#5F6368' }}>Loading Workspace...</div>

  const isCompleted = card?.completed_questions?.includes(questionId) || results?.passed

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#F8F9FA', overflow: 'hidden' }}>
      
      {/* Top Navbar */}
      <div style={{ height: '64px', minHeight: '64px', backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={onBack} 
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#5F6368', padding: '8px', borderRadius: '50%', transition: 'background-color 0.2s', margin: '-8px 0 -8px -8px'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(95,99,104,0.04)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <div style={{ fontSize: '20px', fontWeight: 500, color: '#202124', display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            Workspace
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", backgroundColor: "#F8F9FA", borderRadius: "100px", color: "#3C4043", fontWeight: 600, fontSize: "14px", border: '1px solid #E0E0E0' }}>
            {question.branch} Test
          </div>
          <button 
            onClick={handleRunTests}
            disabled={isEvaluating || isCompleted}
            style={{ 
              backgroundColor: isCompleted ? '#188038' : (results?.passed === false ? '#D93025' : '#FF5701'), 
              color: 'white', border: 'none', padding: '10px 24px', borderRadius: '100px',
              fontWeight: 600, fontSize: '14px', cursor: (isEvaluating || isCompleted) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              opacity: isEvaluating ? 0.7 : 1, transition: 'background-color 0.2s'
            }}
          >
            {isCompleted ? <CheckCircle size={18} /> : (results?.passed === false ? <XCircle size={18} /> : (isEvaluating ? <Zap size={18} className="animate-pulse" /> : <Play size={18} />))}
            {isCompleted ? 'Solved' : (results?.passed === false ? 'Tests Failed' : (isEvaluating ? 'Evaluating...' : 'Run Code'))}
          </button>
        </div>
      </div>

      {/* Main Split Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left Pane - Mission Details */}
        <div style={{ width: '40%', backgroundColor: '#FFFFFF', borderRight: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', color: '#FF5701', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                {question.difficulty} | {question.points} Pts
              </div>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#202124', marginBottom: '16px' }}>{question.title}</h1>
              <div style={{ fontSize: '15px', color: '#5F6368', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                {question.description}
              </div>
            </div>

            <div style={{ height: '1px', backgroundColor: '#E0E0E0', margin: '32px 0' }} />

            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#202124', marginBottom: '16px' }}>Test Case Results</h2>
              
              {!results && !isEvaluating && (
                <div style={{ fontSize: '15px', color: '#3C4043', backgroundColor: '#F8F9FA', padding: '24px', borderRadius: '12px', border: '1px solid #E0E0E0' }}>
                  Run your code to evaluate it against the hidden test cases.
                </div>
              )}

              {isEvaluating && (
                <div style={{ fontSize: '15px', color: '#FF5701', backgroundColor: 'rgba(255,87,1,0.05)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(255,87,1,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Zap size={18} className="animate-pulse" /> Evaluating logic...
                </div>
              )}

              {results?.error && (
                 <div style={{ padding: '16px', backgroundColor: '#FCE8E6', border: '1px solid #FAD2CF', borderRadius: '8px', color: '#D93025', fontSize: '14px' }}>
                   {results.error}
                 </div>
              )}

              {results?.results && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {results.results.map((r, i) => (
                    <div key={i} style={{ border: `1px solid ${r.passed ? '#CEEAD6' : '#FAD2CF'}`, borderRadius: '8px', padding: '16px', backgroundColor: r.passed ? '#F6FEF9' : '#FCE8E6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 600, color: r.passed ? '#188038' : '#D93025' }}>
                        {r.passed ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        Test Case {i + 1}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13px' }}>
                        <div>
                          <div style={{ color: '#5F6368', marginBottom: '4px', fontWeight: 500 }}>Input:</div>
                          <div style={{ fontFamily: 'monospace', color: '#202124', backgroundColor: '#FFF', padding: '8px', borderRadius: '4px', border: '1px solid #E0E0E0' }}>{r.input}</div>
                        </div>
                        <div>
                          <div style={{ color: '#5F6368', marginBottom: '4px', fontWeight: 500 }}>Expected Output:</div>
                          <div style={{ fontFamily: 'monospace', color: '#202124', backgroundColor: '#FFF', padding: '8px', borderRadius: '4px', border: '1px solid #E0E0E0' }}>{r.expected}</div>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <div style={{ color: '#5F6368', marginBottom: '4px', fontWeight: 500 }}>Actual Output:</div>
                          <div style={{ fontFamily: 'monospace', color: r.passed ? '#202124' : '#D93025', backgroundColor: '#FFF', padding: '8px', borderRadius: '4px', border: '1px solid #E0E0E0' }}>
                            {r.error ? r.error : (r.actual || '<empty>')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Right Pane - Editor */}
        <div style={{ width: '60%', display: 'flex', flexDirection: 'column', backgroundColor: '#1E1E1E' }}>
          <div style={{ height: '40px', backgroundColor: '#2D2D2D', borderBottom: '1px solid #1E1E1E', display: 'flex', alignItems: 'center', padding: '0 16px', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', color: '#E0E0E0', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} /> 
              solution
            </div>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                backgroundColor: '#1E1E1E', color: '#E0E0E0', border: '1px solid #333', 
                borderRadius: '6px', padding: '4px 24px 4px 12px', fontSize: '13px', outline: 'none', cursor: 'pointer',
                appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23E0E0E0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px top 50%', backgroundSize: '10px auto'
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python 3</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={setCode}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                padding: { top: 16 }
              }}
            />
          </div>
        </div>

      </div>
    </div>
  )
}
