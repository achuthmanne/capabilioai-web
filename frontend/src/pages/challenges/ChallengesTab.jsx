import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../lib/api'
import { Terminal, Box, Activity, Database, Sparkles, CheckCircle, Gift, Trophy, Pointer, ArrowRight, Lock } from 'lucide-react'

export default function ChallengesTab({ onOpenWorkspace, onScratchedStateChange, isDarkTheme, onThemeChange }) {
  const [cardState, setCardState] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [scratchProgress, setScratchProgress] = useState(0)
  const [isExploding, setIsExploding] = useState(false)
  const [showCards, setShowCards] = useState(false)
  const [hasStartedScratching, setHasStartedScratching] = useState(false)
  
  // Wheel, Theme & Miracle Transition State
  const [stage, setStage] = useState('wheel') // 'wheel' -> 'exiting_wheel' -> 'card'
  const hasSpun = stage === 'card'
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winningTheme, setWinningTheme] = useState(null)
  
  // Timer State for Sundays
  const [timeLeft, setTimeLeft] = useState('')
  const [isSunday, setIsSunday] = useState(false)

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date()
      const day = now.getDay()
      if (day === 0) { // Sunday
        setIsSunday(true)
        const nextMidnight = new Date()
        nextMidnight.setHours(24, 0, 0, 0)
        const diff = nextMidnight - now
        
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
      } else {
        setIsSunday(false)
      }
    }
    updateTimer()
    const int = setInterval(updateTimer, 1000)
    return () => clearInterval(int)
  }, [])
  
  const canvasRef = useRef(null)
  const isDrawing = useRef(false)
  const lastPos = useRef(null)

  const wheelSlices = [
    { label: '5 TASKS', color: '#E11D48', text: '#FFF', grad: ['#FDA4AF', '#E11D48', '#881337'], canvasBg: ['#FB7185', '#E11D48', '#881337'] }, // Premium Rose
    { label: '6 TASKS', color: '#0891B2', text: '#FFF', grad: ['#67E8F9', '#06B6D4', '#155E75'], canvasBg: ['#22D3EE', '#0891B2', '#164E63'] }, // Cyan/Teal
    { label: '7 TASKS', color: '#2563EB', text: '#FFF', grad: ['#93C5FD', '#3B82F6', '#1E3A8A'], canvasBg: ['#60A5FA', '#2563EB', '#1E3A8A'] }, // Blue
    { label: '8 TASKS', color: '#10B981', text: '#FFF', grad: ['#6EE7B7', '#10B981', '#064E3B'], canvasBg: ['#34D399', '#10B981', '#064E3B'] }, // Emerald
    { label: '9 TASKS', color: '#8B5CF6', text: '#FFF', grad: ['#C4B5FD', '#8B5CF6', '#4C1D95'], canvasBg: ['#A78BFA', '#8B5CF6', '#4C1D95'] }, // Purple
    { label: '10 TASKS', color: '#F59E0B', text: '#FFF', grad: ['#FDE68A', '#F59E0B', '#78350F'], canvasBg: ['#FBBF24', '#F59E0B', '#78350F'] }, // Gold
  ]

  useEffect(() => {
    fetchCurrentCard()
  }, [])

  const fetchCurrentCard = async () => {
    try {
      const res = await api.get('/challenges/current')
      setCardState(res.card)
      if (res.card.is_scratched && res.card.assigned_questions) {
         fetchQuestions(res.card.assigned_questions)
         setStage('card')
         setShowCards(true) // Immediately show if already scratched
         setWinningTheme(wheelSlices[0]) // default to rose if already spun previously
         if (onScratchedStateChange) onScratchedStateChange(true)
         if (onThemeChange) onThemeChange(wheelSlices[0].color)
      } else {
         setStage('wheel')
         if (onScratchedStateChange) onScratchedStateChange(false)
         setLoading(false)
      }
    } catch (e) {
      console.error(e)
      setCardState({ id: 'mock-card', is_scratched: false, completed_questions: [] })
      setStage('wheel')
      if (onScratchedStateChange) onScratchedStateChange(false)
      setLoading(false)
    }
  }

  const fetchQuestions = async (ids) => {
    try {
      const res = await api.post('/challenges/questions', { questionIds: ids })
      setQuestions(res.questions)
      setLoading(false)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  const spinWheel = () => {
    if (isSpinning) return
    setIsSpinning(true)
    
    const extraSpins = 5 * 360 // Spin exactly 5 times plus...
    const randomDegree = Math.floor(Math.random() * 360)
    const totalRotation = rotation + extraSpins + randomDegree
    setRotation(totalRotation)
  
    // Calculate winning slice (accounting for the 60deg slices)
    const normalizedRotation = totalRotation % 360
    const winningIndex = Math.round((360 - normalizedRotation) / 60) % 6
    const winner = wheelSlices[winningIndex]

    setTimeout(() => {
      // Step 1: Change background theme immediately when wheel stops
      if (onThemeChange) onThemeChange(winner.color)
      setWinningTheme(winner)
      
      // Step 2: Trigger Wheel exit animation (sucks into black hole)
      setStage('exiting_wheel')
      
      setTimeout(() => {
         // Step 3: Trigger Flash and Scratch Card materialization
         setStage('card')
      }, 800) // Wait 0.8s for the wheel to suck in before exploding
    }, 4000)
  }

  // --- Dynamic Canvas based on Winning Theme ---
  useEffect(() => {
    if (loading || cardState?.is_scratched || isExploding || !hasSpun || !winningTheme) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    
    // 1. Ultra-Smooth 3D Gradient Background with Dynamic Theme
    const bg = ctx.createRadialGradient(
      canvas.width / 2, -50, 10, 
      canvas.width / 2, canvas.height, canvas.height * 1.5
    )
    bg.addColorStop(0, winningTheme.canvasBg[0])
    bg.addColorStop(0.4, winningTheme.canvasBg[1])
    bg.addColorStop(1, winningTheme.canvasBg[2])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Optional: Subtle white gloss overlay
    const gloss = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.4)
    gloss.addColorStop(0, 'rgba(255,255,255,0.25)')
    gloss.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gloss
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const drawFloatingSymbol = (text, x, y, angle, fontSize) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(angle * Math.PI / 180)
      ctx.font = `800 ${fontSize}px monospace`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)' 
      ctx.shadowColor = 'rgba(0,0,0,0.1)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetY = 2
      ctx.textAlign = 'center'
      ctx.fillText(text, 0, 0)
      ctx.restore()
    }
    
    drawFloatingSymbol('{ }', 75, 95, -15, 48)
    drawFloatingSymbol('< >', canvas.width - 65, 120, 25, 40)
    drawFloatingSymbol('/>', 85, canvas.height - 110, -20, 50)
    drawFloatingSymbol('();', canvas.width - 80, canvas.height - 90, 15, 36)

    // 4. Exact Text Layout & Crispness
    ctx.fillStyle = '#FFFFFF'
    ctx.textAlign = 'center'
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)'
    ctx.shadowBlur = 12
    ctx.shadowOffsetY = 6

    ctx.font = '700 24px system-ui, -apple-system, sans-serif'
    ctx.fillText('Unlock your', canvas.width/2, canvas.height/2 - 50)

    ctx.font = '900 64px system-ui, -apple-system, sans-serif'
    ctx.fillText(winningTheme.label, canvas.width/2, canvas.height/2 + 15)

    ctx.font = '700 28px system-ui, -apple-system, sans-serif'
    ctx.fillText('Weekly Reward', canvas.width/2, canvas.height/2 + 65)

    ctx.shadowColor = 'transparent'
    
    ctx.font = '500 13px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.textAlign = 'right'
    ctx.fillText('Scratch to play', canvas.width - 25, canvas.height - 25)

  }, [loading, cardState?.is_scratched, isExploding, hasSpun, winningTheme])

  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const handlePointerDown = (e) => {
    if (isExploding) return
    isDrawing.current = true
    lastPos.current = getCanvasPos(e)
    if (!hasStartedScratching) setHasStartedScratching(true)
  }

  const handlePointerMove = (e) => {
    if (!isDrawing.current || isExploding) return
    const pos = getCanvasPos(e)
    const ctx = canvasRef.current.getContext('2d')
    
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    // Very smooth and wide brush
    ctx.lineWidth = 60 
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // Removed shadowBlur to prevent jagged artifacts during fast scratching
    
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    
    lastPos.current = pos
    calculateScratchProgress()
  }

  const handlePointerUp = () => {
    isDrawing.current = false
  }

  const calculateScratchProgress = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = imageData.data
    let transparent = 0
    
    // Check every 4th pixel for performance
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] === 0) transparent++
    }
    
    const progress = (transparent / (pixels.length / 16)) * 100
    setScratchProgress(progress)

    if (progress > 50 && !isExploding) {
      triggerReveal()
    }
  }

  const triggerReveal = async () => {
    setIsExploding(true)
    
    // Determine number of tasks from the wheel slice (or default 5)
    const taskCount = winningTheme ? parseInt(winningTheme.label.split(' ')[0]) : 5
    
    try {
      if (cardState?.id === 'mock-card' || !cardState) throw new Error('Using mock fallback')
      
      const res = await api.post('/challenges/scratch', { cardId: cardState.id })
      await fetchQuestions(res.card.assigned_questions)
      setCardState(res.card)
    } catch (e) {
      console.error("Using mock data for blast transition", e)
      const mockQuestions = Array.from({ length: taskCount }).map((_, i) => ({
        id: `mock-q-${i}`,
        title: i % 2 === 0 ? 'Data Structures & Algorithms' : 'Backend System Design',
        workspace_type: i % 3 === 0 ? 'database' : 'ide',
        difficulty: i === 0 ? 'Hard' : (i % 2 === 0 ? 'Medium' : 'Easy'),
        points: 50 + (i * 10)
      }))
      setQuestions(mockQuestions)
      setCardState({ id: 'mock-card', is_scratched: true, completed_questions: [] })
    }
    
    // Delay showing the cards so the scratch card MASSIVE blast animation can finish
    setTimeout(() => {
      setStage('cards')
      setShowCards(true)
      if (onScratchedStateChange) onScratchedStateChange(true)
      if (onThemeChange) onThemeChange('plain') // Reset Background to purely white/dark!
    }, 600)
  }

  const getIcon = (type) => {
    switch (type) {
      case 'code': return <Terminal size={18} />
      case 'sql': return <Database size={18} />
      case 'hardware_hdl': return <Activity size={18} />
      case 'autocad': return <Box size={18} />
      case 'jupyter': return <Terminal size={18} />
      default: return <Terminal size={18} />
    }
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: '100px', color: '#5F6368', fontWeight: 500 }}>Loading Weekly Data...</div>

  return (
    <div style={{ width: '100%', flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
          <h1 style={{ margin: 0, color: isDarkTheme ? '#FFFFFF' : '#14161A', fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
            Weekly Challenges
          </h1>
        </div>

      <div style={{ flex: showCards ? 0 : 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'flex 0.5s ease' }}>
        
        {/* Absolute Center Anchor for both elements to overlap perfectly */}
        <motion.div 
          animate={{ height: stage === 'cards' ? 0 : 440, opacity: stage === 'cards' ? 0 : 1, marginBottom: stage === 'cards' ? -30 : 0 }}
          style={{ position: 'relative', width: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(-30px)' }}
        >

          {/* --- 1. THE SPINNING WHEEL --- */}
          <AnimatePresence>
            {(stage === 'wheel' || stage === 'exiting_wheel') && !cardState?.is_scratched && (
              <motion.div 
                key="wheel"
                initial={{ scale: 0, opacity: 0, rotate: -720, filter: 'blur(20px)' }}
                animate={{ scale: 1, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
                exit={{ 
                  scale: [1, 0.5, 0], 
                  rotate: [0, 180, 1080], 
                  opacity: [1, 1, 0],
                  filter: ['blur(0px)', 'blur(5px)', 'blur(20px)'],
                }}
                transition={{ 
                  duration: 0.6, ease: "anticipate",
                  scale: { type: "spring", damping: 14, stiffness: 80 },
                  rotate: { type: "spring", damping: 14, stiffness: 80 }
                }}
                style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}
              >
                <div style={{ position: 'relative', width: '320px', height: '320px' }}>
                  {/* Center Pointer */}
                  <div style={{
                    position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)',
                    width: 0, height: 0, 
                    borderLeft: '20px solid transparent', borderRight: '20px solid transparent',
                    borderTop: '32px solid #FF3D00', 
                    zIndex: 30, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.4))'
                  }} />
                  
                  {/* The Wheel */}
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden',
                    boxShadow: '0 32px 64px rgba(0,0,0,0.15), inset 0 0 0 4px rgba(255,255,255,0.2)', 
                    border: '12px solid #14161A', 
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
                    position: 'relative',
                    backgroundColor: '#E4E6E9'
                  }}>
                    {wheelSlices.map((slice, i) => (
                      <div key={i} style={{
                        position: 'absolute',
                        top: 0,
                        left: '21.135%', 
                        width: '57.73%', 
                        height: '50%',
                        transformOrigin: '50% 100%',
                        transform: `rotate(${i * 60}deg)`,
                        clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
                        backgroundColor: slice.color,
                        display: 'flex',
                        justifyContent: 'center',
                        paddingTop: '28px' 
                      }}>
                        <span style={{ 
                          color: slice.text, fontWeight: 900, fontSize: '20px', 
                          fontFamily: 'system-ui, sans-serif', letterSpacing: '0.5px' 
                        }}>
                          {slice.label}
                        </span>
                      </div>
                    ))}
                    
                    {/* Premium Center Hub */}
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                      width: '76px', height: '76px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #FFFFFF 0%, #E4E6E9 100%)',
                      border: '1px solid #D1D5DB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      zIndex: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                    }}>
                       {/* Inner Hub core */}
                       <div style={{
                         width: '44px', height: '44px', borderRadius: '50%',
                         background: 'linear-gradient(135deg, #14161A 0%, #2A2E33 100%)',
                         boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.6), 0 2px 4px rgba(255,255,255,0.8)'
                       }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* --- 1.1 Spin Button (Separated from wheel) --- */}
          <AnimatePresence>
            {stage === 'wheel' && !cardState?.is_scratched && (
              <motion.button 
                key="spin-btn"
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ duration: 0.4, type: "spring", bounce: 0.5, delay: 0.2, exit: { duration: 0.1 } }}
                onClick={isSunday ? undefined : spinWheel}
                disabled={isSpinning || isSunday}
                style={{
                  position: 'absolute', bottom: '-40px', zIndex: 40,
                  padding: '16px 48px', fontSize: '18px', fontWeight: 900,
                  background: isSunday ? (isDarkTheme ? 'rgba(255, 87, 1, 0.05)' : '#FFF5F0') : 'linear-gradient(180deg, #FF7A00 0%, #FF3D00 100%)', 
                  color: isSunday ? '#FF5701' : '#FFF', 
                  border: isSunday ? (isDarkTheme ? '1px solid rgba(255, 87, 1, 0.2)' : '1px solid rgba(255, 87, 1, 0.2)') : '1px solid #E63500', 
                  borderRadius: '999px',
                  cursor: (isSpinning || isSunday) ? 'not-allowed' : 'pointer',
                  boxShadow: isSunday ? (isDarkTheme ? '0 0 20px rgba(255, 87, 1, 0.05)' : '0 4px 12px rgba(255, 87, 1, 0.08)') : '0 6px 0 #D03000, 0 12px 24px rgba(0,0,0,0.15)',
                  opacity: (isSpinning && !isSunday) ? 0.7 : 1, transition: 'all 0.1s ease',
                  letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                }}
                onMouseEnter={e => !(isSpinning || isSunday) && (
                  e.currentTarget.style.transform = 'translateY(2px)', 
                  e.currentTarget.style.boxShadow = '0 4px 0 #D03000, 0 8px 16px rgba(0,0,0,0.1)'
                )}
                onMouseLeave={e => !(isSpinning || isSunday) && (
                  e.currentTarget.style.transform = 'translateY(0)', 
                  e.currentTarget.style.boxShadow = '0 6px 0 #D03000, 0 12px 24px rgba(0,0,0,0.15)'
                )}
                onMouseDown={e => !(isSpinning || isSunday) && (
                  e.currentTarget.style.transform = 'translateY(6px)', 
                  e.currentTarget.style.boxShadow = '0 0 0 #D03000, 0 0 0 rgba(0,0,0,0.1)'
                )}
                onMouseUp={e => !(isSpinning || isSunday) && (
                  e.currentTarget.style.transform = 'translateY(2px)', 
                  e.currentTarget.style.boxShadow = '0 4px 0 #D03000, 0 8px 16px rgba(0,0,0,0.1)'
                )}
              >
                {isSunday ? (
                  <>
                    <Lock size={20} strokeWidth={2.5} />
                    UNLOCKS IN {timeLeft}
                  </>
                ) : (isSpinning ? 'SPINNING...' : 'SPIN FOR TASKS')}
              </motion.button>
            )}
          </AnimatePresence>

          {/* Button Pixel Blast Effect */}
          {stage === 'exiting_wheel' && (
            <div style={{ position: 'absolute', bottom: '0px', left: '50%', zIndex: 40, pointerEvents: 'none' }}>
              {Array.from({ length: 40 }).map((_, i) => {
                // Pre-calculate pseudo-random values based on index so it's deterministic per render
                const angle = (i * 9) * (Math.PI / 180);
                const distance = 40 + (i % 5) * 20; 
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance - 20;
                const size = 4 + (i % 4) * 2;
                const colors = ['#FF7A00', '#FF3D00', '#D03000', '#FFFFFF', '#FFA000'];
                const color = colors[i % colors.length];
                return (
                  <motion.div
                    key={`blast-${i}`}
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{ x, y, scale: 0, opacity: 0, rotate: (i % 2 === 0 ? 360 : -360) }}
                    transition={{ duration: 0.5 + (i % 3) * 0.2, ease: "easeOut" }}
                    style={{
                      position: 'absolute',
                      width: size, height: size,
                      backgroundColor: color,
                      borderRadius: i % 3 === 0 ? '50%' : '2px', // mix of pixels and sparks
                      boxShadow: `0 0 8px ${color}`
                    }}
                  />
                )
              })}
            </div>
          )}

          {/* --- 1.5. THE MAGICAL SHOCKWAVE FLASH --- */}
          <AnimatePresence>
            {(stage === 'card' && !cardState?.is_scratched && !showCards) && (
               <motion.div
                 initial={{ scale: 0, opacity: 1 }}
                 animate={{ scale: [0, 4, 15], opacity: [1, 0.8, 0] }}
                 transition={{ duration: 0.8, ease: "easeOut" }}
                 style={{
                   position: 'absolute', top: '50%', left: '50%', x: '-50%', y: '-50%',
                   width: '200px', height: '200px', borderRadius: '50%',
                   background: `radial-gradient(circle, ${winningTheme?.color || '#FFF'} 0%, transparent 70%)`,
                   zIndex: 50, pointerEvents: 'none', mixBlendMode: 'screen'
                 }}
               />
            )}
          </AnimatePresence>

          {/* Card Explosion Pixel Blast */}
          <AnimatePresence>
            {isExploding && !showCards && (
              <div style={{ position: 'absolute', top: '50%', left: '50%', zIndex: 45, pointerEvents: 'none' }}>
                {Array.from({ length: 60 }).map((_, i) => {
                  const angle = (i * 6) * (Math.PI / 180);
                  const distance = 80 + (i % 6) * 30; 
                  const x = Math.cos(angle) * distance;
                  const y = Math.sin(angle) * distance;
                  const size = 6 + (i % 4) * 4;
                  const colors = winningTheme ? winningTheme.grad : ['#FF7A00', '#FF3D00', '#FFF'];
                  const color = colors[i % colors.length];
                  return (
                    <motion.div
                      key={`cardblast-${i}`}
                      initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                      animate={{ x, y, scale: 0, opacity: 0, rotate: (i % 2 === 0 ? 360 : -360) }}
                      transition={{ duration: 0.6 + (i % 3) * 0.2, ease: "easeOut" }}
                      style={{
                        position: 'absolute',
                        width: size, height: size,
                        backgroundColor: color,
                        borderRadius: i % 2 === 0 ? '50%' : '2px',
                        boxShadow: `0 0 12px ${color}`
                      }}
                    />
                  )
                })}
              </div>
            )}
          </AnimatePresence>

          {/* --- 2. THE SCRATCH CARD (Expands from center) --- */}
          <AnimatePresence>
            {(stage === 'card' && !showCards) && (
              <motion.div 
                key="card"
                initial={{ scale: 0, opacity: 0, rotateZ: -720, filter: 'blur(20px)' }}
                animate={{ scale: 1, opacity: 1, rotateZ: 0, filter: 'blur(0px)' }}
                exit={{ 
                  scale: [1, 1.2, 0], 
                  rotateZ: [0, -15, 90], 
                  opacity: [1, 1, 0],
                  filter: ['blur(0px)', 'blur(5px)', 'blur(20px)']
                }}
                transition={{ type: "spring", damping: 15, stiffness: 100, delay: 0.2, exit: { duration: 0.5, ease: "anticipate", delay: 0 } }}
                style={{ 
                  position: 'absolute', // Exact same center as wheel
                  width: '340px', height: '440px', 
                  borderRadius: '24px', 
                  boxSizing: 'border-box',
                  border: '6px solid transparent',
                  background: `linear-gradient(#14161A, #14161A) padding-box, linear-gradient(135deg, ${winningTheme?.grad[0] || '#FFD180'} 0%, ${winningTheme?.grad[1] || '#FF8A00'} 50%, ${winningTheme?.grad[2] || '#B33600'} 100%) border-box`,
                  boxShadow: `0 32px 64px ${winningTheme ? winningTheme.grad[2] : 'rgba(0,0,0,0.5)'}40, 0 0 80px ${winningTheme ? winningTheme.grad[1] : 'rgba(0,0,0,0.5)'}30`, 
                  zIndex: 30,
                  overflow: 'hidden' 
                }}
              >
              {/* Base Card underneath the scratch canvas */}
              <div style={{ 
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center', 
                background: 'linear-gradient(135deg, #14161A 0%, #202124 100%)' 
              }}>
                 <div style={{ position: 'relative' }}>
                   <Trophy color="#FFD180" size={64} style={{ marginBottom: '16px' }} />
                 </div>
                 <h2 style={{ margin: '0 0 8px 0', color: '#FFFFFF', fontSize: '26px', fontWeight: 900 }}>Unlocked!</h2>
                 <p style={{ color: '#FFB74D', fontSize: '15px', fontWeight: 600 }}>Get ready to code...</p>
              </div>
              
              <canvas
                ref={canvasRef}
                width={328} // 340 - 12 (6px border * 2)
                height={428} // 440 - 12 (6px border * 2)
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: 'crosshair', touchAction: 'none' }}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
                
                {/* Tutorial Hand Animation */}
                {!hasStartedScratching && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ 
                      opacity: [0, 1, 1, 1, 1, 1, 0, 0],
                      scale: [0.8, 1, 1, 1, 1, 1, 0.8, 0.8],
                      x: [20, -20, 20, -20, 20, -20, 0, 0],
                      y: [20, 15, 10, 5, 0, -5, -10, -10],
                      rotate: [0, -10, 10, -10, 10, -10, 0, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      position: 'absolute',
                      top: '55%',
                      left: '50%',
                      marginLeft: '-24px', // center the icon horizontally
                      zIndex: 60,
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))',
                      color: '#FFF'
                    }}
                  >
                    <Pointer size={48} fill="#14161A" strokeWidth={1.5} />
                  </motion.div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
        </motion.div>
      </div>
      
      {/* Confetti Explosion Container */}
      <AnimatePresence>
          {showCards && (
            <motion.div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
                gap: '24px',
                width: '100%',
                paddingTop: '20px'
              }}
            >
              {questions.map((q, i) => {
                const isCompleted = cardState.completed_questions?.includes(q.id)
                const pastels = [
                  { bg: '#FFF0E6', text: '#D94A00', icon: '#FF5701', darkBg: 'rgba(255, 87, 1, 0.08)' }, // Orange
                  { bg: '#E6F4EA', text: '#137333', icon: '#188038', darkBg: 'rgba(24, 128, 56, 0.08)' }, // Green
                  { bg: '#E8F0FE', text: '#1967D2', icon: '#1A73E8', darkBg: 'rgba(26, 115, 232, 0.08)' }, // Blue
                  { bg: '#FCE8E6', text: '#C5221F', icon: '#D93025', darkBg: 'rgba(217, 48, 37, 0.08)' }, // Red
                  { bg: '#F3E8FD', text: '#681DA8', icon: '#8430CE', darkBg: 'rgba(132, 48, 206, 0.08)' }, // Purple
                ]
                const theme = pastels[i % pastels.length]
                
                return (
                  <motion.div 
                    key={q.id}
                    // Start from exact center (relative to where the blast happened), small, and invisible
                    initial={{ opacity: 0, scale: 0, y: -150, rotate: (i % 2 === 0 ? 15 : -15) }}
                    // Animate to their natural grid positions
                    animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                    transition={{ 
                      type: 'spring', stiffness: 200, damping: 20, 
                      delay: 0.1 + (i * 0.15) // Stagger the magic shoot out
                    }}
                    onClick={() => !isCompleted && onOpenWorkspace(q.id)}
                    style={{
                      backgroundColor: isDarkTheme ? theme.darkBg : theme.bg,
                      border: isDarkTheme ? `1px solid ${theme.darkBg.replace('0.08', '0.15')}` : 'none',
                      borderRadius: '24px',
                      padding: '32px',
                      cursor: isCompleted ? 'default' : 'pointer',
                      position: 'relative',
                      transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      opacity: isCompleted ? 0.6 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: 'none', // NO SHADOWS AS REQUESTED
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      if(!isCompleted) {
                        e.currentTarget.style.transform = 'scale(1.02)'; // Just a neat scale, no shadow elevation
                      }
                    }}
                    onMouseLeave={(e) => {
                      if(!isCompleted) {
                        e.currentTarget.style.transform = 'scale(1)';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: theme.icon }}>
                        {getIcon(q.workspace_type)}
                        <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {q.difficulty}
                        </span>
                      </div>
                      <div style={{ padding: '6px 14px', backgroundColor: isDarkTheme ? 'rgba(255,255,255,0.1)' : '#FFFFFF', borderRadius: '999px', fontSize: '13px', fontWeight: 700, color: theme.text }}>
                        +{q.points} Pts
                      </div>
                    </div>
                    
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', color: isDarkTheme ? '#FFFFFF' : '#14161A', fontWeight: 700, lineHeight: 1.4, letterSpacing: '-0.3px' }}>{q.title}</h3>
                    
                    <p style={{ fontSize: '14px', color: isDarkTheme ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', lineHeight: 1.5, margin: '0 0 24px 0', flex: 1 }}>
                       {q.workspace_type === 'ide' ? 'Solve the algorithm in our collaborative cloud IDE.' : 'Write optimized queries in the SQL Workspace.'}
                    </p>
                    
                    <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isCompleted ? (isDarkTheme ? '#10B981' : '#137333') : theme.text, fontSize: '15px', fontWeight: 700 }}>
                        {isCompleted ? 'Completed' : 'Solve Task'} <ArrowRight size={18} strokeWidth={2.5} style={{ opacity: isCompleted ? 0 : 1 }} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
  )
}

