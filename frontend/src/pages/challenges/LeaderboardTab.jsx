import React, { useState } from 'react';
import { Trophy, Medal, Flame, Target, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

const DUMMY_DATA = [
  { id: 1, name: "Rahul Kumar", branch: "CSE", score: 450, completed: 42, streak: 12, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul" },
  { id: 2, name: "Priya Sharma", branch: "ECE", score: 420, completed: 38, streak: 8, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya" },
  { id: 3, name: "Karthik Reddy", branch: "CSE", score: 410, completed: 37, streak: 15, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Karthik" },
  { id: 4, name: "Sneha Rao", branch: "MECH", score: 380, completed: 32, streak: 4, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha" },
  { id: 5, name: "Arjun Das", branch: "CSE", score: 350, completed: 30, streak: 6, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun" },
  { id: 6, name: "Nitya Iyer", branch: "ECE", score: 340, completed: 28, streak: 3, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nitya" },
  { id: 7, name: "Vikas Patel", branch: "CSE", score: 310, completed: 25, streak: 2, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikas" },
  { id: 8, name: "Divya Singh", branch: "CIVIL", score: 290, completed: 24, streak: 5, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Divya" },
  { id: 9, name: "Mohammed Ali", branch: "CSE", score: 280, completed: 22, streak: 0, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ali" },
  { id: 10, name: "Swathi Naidu", branch: "ECE", score: 260, completed: 20, streak: 1, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Swathi" },
];

const CURRENT_USER = {
  id: 42, rank: 42, name: "You", branch: "CSE", score: 120, completed: 10, streak: 2, avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=You"
};

export default function LeaderboardTab() {
  const [filter, setFilter] = useState("global"); // 'global' or 'branch'
  const userBranch = "CSE";

  const displayedData = filter === "global" 
    ? DUMMY_DATA 
    : DUMMY_DATA.filter(u => u.branch === userBranch);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Header & Tabs */}
      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', margin: '0 0 16px 0', color: '#111827', fontWeight: 800, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <Trophy size={36} color="#FF5701" />
          Challenge Leaderboard
        </h1>
        <p style={{ color: '#4B5563', margin: '0 0 24px 0', fontSize: '16px' }}>
          Complete weekly challenges to climb the ranks and avoid Saturday penalties!
        </p>

        {/* Filter Toggle */}
        <div style={{ display: 'inline-flex', backgroundColor: '#F3F4F6', padding: '4px', borderRadius: '12px' }}>
          <button 
            onClick={() => setFilter("global")}
            style={{ 
              padding: '10px 24px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: filter === "global" ? '#FFFFFF' : 'transparent',
              color: filter === "global" ? '#111827' : '#6B7280',
              boxShadow: filter === "global" ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
            }}>
            Global Rank
          </button>
          <button 
            onClick={() => setFilter("branch")}
            style={{ 
              padding: '10px 24px', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              backgroundColor: filter === "branch" ? '#FFFFFF' : 'transparent',
              color: filter === "branch" ? '#111827' : '#6B7280',
              boxShadow: filter === "branch" ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
            }}>
            My Branch ({userBranch})
          </button>
        </div>
      </div>

      {/* Top 3 Podium View */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '20px', marginBottom: '40px', marginTop: '40px', height: '220px' }}>
        
        {/* 2nd Place */}
        {displayedData[1] && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#E5E7EB', padding: '4px', border: '3px solid #9CA3AF' }}>
                <img src={displayedData[1].avatar} alt="avatar" style={{ width: '100%', borderRadius: '50%' }} />
              </div>
              <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#9CA3AF', color: 'white', fontSize: '12px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', border: '2px solid white' }}>2</div>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>{displayedData[1].name}</h3>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '12px', marginBottom: '8px' }}>{displayedData[1].branch}</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF5701' }}>{displayedData[1].score} pts</div>
          </motion.div>
        )}

        {/* 1st Place */}
        {displayedData[0] && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '34%', zIndex: 10 }}>
            <Sparkles size={24} color="#F59E0B" style={{ marginBottom: '8px' }} />
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#FEF3C7', padding: '4px', border: '4px solid #F59E0B', boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)' }}>
                <img src={displayedData[0].avatar} alt="avatar" style={{ width: '100%', borderRadius: '50%' }} />
              </div>
              <div style={{ position: 'absolute', bottom: '-10px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#F59E0B', color: 'white', fontSize: '14px', fontWeight: 800, padding: '2px 10px', borderRadius: '12px', border: '2px solid white' }}>1</div>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#111827' }}>{displayedData[0].name}</h3>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '12px', marginBottom: '8px' }}>{displayedData[0].branch}</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#FF5701' }}>{displayedData[0].score} pts</div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {displayedData[2] && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#FFEDD5', padding: '4px', border: '3px solid #D97706' }}>
                <img src={displayedData[2].avatar} alt="avatar" style={{ width: '100%', borderRadius: '50%' }} />
              </div>
              <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#D97706', color: 'white', fontSize: '12px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', border: '2px solid white' }}>3</div>
            </div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#111827' }}>{displayedData[2].name}</h3>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#6B7280', backgroundColor: '#F3F4F6', padding: '2px 8px', borderRadius: '12px', marginBottom: '8px' }}>{displayedData[2].branch}</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF5701' }}>{displayedData[2].score} pts</div>
          </motion.div>
        )}
      </div>

      {/* List View (Rank 4+) */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E7EB', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {displayedData.slice(3).map((user, index) => (
          <div key={user.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', borderBottom: index !== displayedData.slice(3).length - 1 ? '1px solid #F3F4F6' : 'none' }}>
            <div style={{ width: '40px', fontSize: '16px', fontWeight: 700, color: '#6B7280' }}>#{index + 4}</div>
            
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#F3F4F6', marginRight: '16px', overflow: 'hidden' }}>
              <img src={user.avatar} alt="" style={{ width: '100%' }} />
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>{user.name}</h4>
                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6B7280', backgroundColor: '#F3F4F6', padding: '2px 6px', borderRadius: '6px' }}>{user.branch}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '2px', display: 'flex', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Target size={14} /> {user.completed} Tasks</span>
                {user.streak > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#F59E0B' }}><Flame size={14} /> {user.streak} Streak</span>}
              </div>
            </div>

            <div style={{ fontSize: '16px', fontWeight: 800, color: '#FF5701' }}>
              {user.score} pts
            </div>
          </div>
        ))}
        
        {/* Current User Pinned at Bottom */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 24px', backgroundColor: '#FFF7ED', borderTop: '2px solid #FFEDD5' }}>
            <div style={{ width: '40px', fontSize: '16px', fontWeight: 800, color: '#FF5701' }}>#{CURRENT_USER.rank}</div>
            
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#FFEDD5', marginRight: '16px', overflow: 'hidden', border: '2px solid #FF5701' }}>
              <img src={CURRENT_USER.avatar} alt="" style={{ width: '100%' }} />
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#9A3412' }}>{CURRENT_USER.name}</h4>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9A3412', backgroundColor: '#FFEDD5', padding: '2px 6px', borderRadius: '6px' }}>{CURRENT_USER.branch}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#C2410C', marginTop: '2px', display: 'flex', gap: '12px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Target size={14} /> {CURRENT_USER.completed} Tasks</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={14} /> {CURRENT_USER.streak} Streak</span>
              </div>
            </div>

            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FF5701' }}>
              {CURRENT_USER.score} pts
            </div>
          </div>
      </div>
    </div>
  );
}
