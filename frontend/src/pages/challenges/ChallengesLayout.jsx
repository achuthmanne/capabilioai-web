import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Trophy, Clock, Zap } from 'lucide-react'
import ChallengesTab from './ChallengesTab'
import LeaderboardTab from './LeaderboardTab'
import HistoryTab from './HistoryTab'
import ChallengeWorkspace from './ChallengeWorkspace'

export default function ChallengesLayout({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('challenges')
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null)
  const [isScratched, setIsScratched] = useState(false)
  const [winningTheme, setWinningTheme] = useState(null)
  
  if (activeWorkspaceId) {
    return (
      <ChallengeWorkspace 
        questionId={activeWorkspaceId} 
        onBack={() => setActiveWorkspaceId(null)} 
      />
    )
  }

  // Remove the forced dark mode. The application uses a light dashboard theme.
  const isDark = false

  // Convert hex to rgba for the background tinting
  const getHexOpacity = (hex, opacity) => {
    if (!hex) return 'rgba(0,0,0,0.03)'
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  const getBgBase = () => {
    if (activeTab !== 'challenges') return isDark ? '#14161A' : '#FFFFFF';
    if (winningTheme === 'plain') return isDark ? '#14161A' : '#FFFFFF';
    if (isDark) return '#14161A';
    if (winningTheme) return getHexOpacity(winningTheme.color || winningTheme, 0.08);
    return '#FFF3E0';
  }

  const getRayColor = () => {
    if (activeTab !== 'challenges') return 'transparent';
    if (winningTheme === 'plain') return 'transparent';
    if (isDark) return 'transparent';
    if (winningTheme) return getHexOpacity(winningTheme.color || winningTheme, 0.15);
    return 'rgba(255, 138, 0, 0.04)';
  }

  const bgBase = getBgBase();
  const rayColor = getRayColor();

  return (
    <div style={{ 
      height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', 
      backgroundColor: bgBase, 
      backgroundImage: isDark ? 'none' : `repeating-conic-gradient(from 0deg at 50% 50%, ${rayColor} 0deg, ${rayColor} 15deg, transparent 15deg, transparent 30deg)`,
      overflow: 'hidden', transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)' 
    }}>
      
      {/* Top Navbar */}
      <div style={{ height: 76, minHeight: 76, backgroundColor: isDark ? '#1A1D21' : '#FFFFFF', borderBottom: isDark ? '1px solid #2A2E33' : '1px solid #E4E6E9', display: 'flex', alignItems: 'center', padding: '0 28px', position: 'sticky', top: 0, zIndex: 90, transition: 'all 0.8s ease' }}>
        
        {/* Left Side: Back button and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '300px' }}>
          <button 
            onClick={() => onNavigate('studentHome')} 
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isDark ? '#E4E6E9' : '#5F6368', padding: '8px', borderRadius: '50%', transition: 'background-color 0.2s', margin: '-8px 0 -8px -8px'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(95,99,104,0.04)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft size={22} />
          </button>
          <div style={{ fontSize: '20px', fontWeight: 500, color: isDark ? '#FFFFFF' : '#202124', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            Challenges
          </div>
        </div>
        
        {/* Center Tabs: Pill Style (matches Main Nav) */}
        <div style={{ display: 'flex', gap: '16px', margin: '0 auto', alignItems: 'center' }}>
          
          <button 
            onClick={() => setActiveTab('challenges')} 
            onMouseEnter={e => ! (activeTab === 'challenges') && (e.currentTarget.style.backgroundColor = isDark ? '#2A2E33' : '#F4F5F7', e.currentTarget.style.color = isDark ? '#FFFFFF' : '#14161A')}
            onMouseLeave={e => ! (activeTab === 'challenges') && (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = isDark ? '#8A8F98' : '#8A8F98')}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', 
              padding: '8px 24px', borderRadius: 999,
              border: activeTab === 'challenges' ? (isDark ? '1px solid #4B5563' : '1px solid #D1D5DB') : '1px solid transparent',
              background: activeTab === 'challenges' ? (isDark ? '#2A2E33' : '#FFFFFF') : 'transparent',
              boxShadow: activeTab === 'challenges' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              color: activeTab === 'challenges' ? (isDark ? '#FFFFFF' : '#14161A') : '#8A8F98',
              fontWeight: activeTab === 'challenges' ? 700 : 600,
              fontSize: '14px', fontFamily: '"Inter", sans-serif',
              transition: 'all 0.2s ease', userSelect: 'none', whiteSpace: 'nowrap'
            }}
          >
            <Zap size={16} color={activeTab === 'challenges' ? '#FF5701' : '#8A8F98'} /> Active Week
          </button>
          
          <button 
            onClick={() => setActiveTab('leaderboard')} 
            onMouseEnter={e => ! (activeTab === 'leaderboard') && (e.currentTarget.style.backgroundColor = isDark ? '#2A2E33' : '#F4F5F7', e.currentTarget.style.color = isDark ? '#FFFFFF' : '#14161A')}
            onMouseLeave={e => ! (activeTab === 'leaderboard') && (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = isDark ? '#8A8F98' : '#8A8F98')}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', 
              padding: '8px 24px', borderRadius: 999,
              border: activeTab === 'leaderboard' ? (isDark ? '1px solid #4B5563' : '1px solid #D1D5DB') : '1px solid transparent',
              background: activeTab === 'leaderboard' ? (isDark ? '#2A2E33' : '#FFFFFF') : 'transparent',
              boxShadow: activeTab === 'leaderboard' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              color: activeTab === 'leaderboard' ? (isDark ? '#FFFFFF' : '#14161A') : '#8A8F98',
              fontWeight: activeTab === 'leaderboard' ? 700 : 600,
              fontSize: '14px', fontFamily: '"Inter", sans-serif',
              transition: 'all 0.2s ease', userSelect: 'none', whiteSpace: 'nowrap'
            }}
          >
            <Trophy size={16} color={activeTab === 'leaderboard' ? '#FF5701' : '#8A8F98'} /> Leaderboard
          </button>
          
          <button 
            onClick={() => setActiveTab('history')} 
            onMouseEnter={e => ! (activeTab === 'history') && (e.currentTarget.style.backgroundColor = isDark ? '#2A2E33' : '#F4F5F7', e.currentTarget.style.color = isDark ? '#FFFFFF' : '#14161A')}
            onMouseLeave={e => ! (activeTab === 'history') && (e.currentTarget.style.backgroundColor = 'transparent', e.currentTarget.style.color = isDark ? '#8A8F98' : '#8A8F98')}
            style={{ 
              display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', 
              padding: '8px 24px', borderRadius: 999,
              border: activeTab === 'history' ? (isDark ? '1px solid #4B5563' : '1px solid #D1D5DB') : '1px solid transparent',
              background: activeTab === 'history' ? (isDark ? '#2A2E33' : '#FFFFFF') : 'transparent',
              boxShadow: activeTab === 'history' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              color: activeTab === 'history' ? (isDark ? '#FFFFFF' : '#14161A') : '#8A8F98',
              fontWeight: activeTab === 'history' ? 700 : 600,
              fontSize: '14px', fontFamily: '"Inter", sans-serif',
              transition: 'all 0.2s ease', userSelect: 'none', whiteSpace: 'nowrap'
            }}
          >
            <Clock size={16} color={activeTab === 'history' ? '#FF5701' : '#8A8F98'} /> History
          </button>
        </div>
        
        {/* Right Side Placeholder */}
        <div style={{ width: '300px' }}></div>
      </div>
      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'challenges' && (
            <motion.div key="ch" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ height: '100%', width: '100%', overflowY: 'auto' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', minHeight: '100%', padding: '40px 5%', display: 'flex', flexDirection: 'column' }}>
                <ChallengesTab 
                  onOpenWorkspace={setActiveWorkspaceId} 
                  onScratchedStateChange={setIsScratched} 
                  isDarkTheme={isDark}
                  onThemeChange={setWinningTheme}
                />
              </div>
            </motion.div>
          )}
          {activeTab === 'leaderboard' && (
            <motion.div key="l" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ height: '100%', width: '100%', overflowY: 'auto' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '40px 5%' }}>
                <LeaderboardTab />
              </div>
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div key="h" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ height: '100%', width: '100%', overflowY: 'auto' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '40px 5%' }}>
                <HistoryTab />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
