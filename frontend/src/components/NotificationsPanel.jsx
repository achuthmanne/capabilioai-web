import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, ChevronRight } from 'lucide-react';

const DUMMY_NOTIFS = [
  { id: 1, title: "New Interview Opportunity", body: "Google has shortlisted your profile for the Frontend Engineer role.", time: "10m ago", is_read: false },
  { id: 2, title: "Arena Task Completed", body: "You successfully completed the React UI challenge. +15 ELO.", time: "2h ago", is_read: false },
  { id: 3, title: "Skill Stale Warning", body: "You haven't practiced Node.js in 14 days. Your ELO is at risk of decay.", time: "1d ago", is_read: true },
  { id: 4, title: "Connection Request", body: "A recruiter from Microsoft wants to connect with you.", time: "2d ago", is_read: true },
];

export default function NotificationsPanel({ isOpen, onClose, onNotificationClick }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              background: 'rgba(20, 22, 26, 0.4)', backdropFilter: 'blur(4px)'
            }}
          />

          <motion.div
            initial={{ x: '100%', boxShadow: '0 0 0 rgba(0,0,0,0)' }}
            animate={{ x: 0, boxShadow: '-8px 0 32px rgba(20, 22, 26, 0.08)' }}
            exit={{ x: '100%', boxShadow: '0 0 0 rgba(0,0,0,0)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 10000,
              width: '100%', maxWidth: 440, background: '#FFFFFF',
              display: 'flex', flexDirection: 'column', borderLeft: '1px solid #E4E6E9'
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '24px 28px', borderBottom: '1px solid #E4E6E9', background: '#FAFAFA'
            }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#14161A', fontFamily: '"Inter", sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={20} color="#FF5701" /> Notifications
              </h2>
              <button 
                onClick={onClose}
                style={{ 
                  background: '#FFFFFF', border: '1px solid #E4E6E9', borderRadius: 99, 
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#8A8F98', transition: 'all 0.2s'
                }}
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {DUMMY_NOTIFS.map((n) => (
                <div 
                  key={n.id} 
                  onClick={() => onNotificationClick(n)}
                  style={{ 
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '20px 28px', 
                    borderBottom: '1px solid #F3F4F6', background: !n.is_read ? '#FFF7F3' : '#FFFFFF', 
                    cursor: 'pointer', transition: 'background 0.2s' 
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = !n.is_read ? '#FFF2EB' : '#F9FAFB' }}
                  onMouseLeave={e => { e.currentTarget.style.background = !n.is_read ? '#FFF7F3' : '#FFFFFF' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: !n.is_read ? 700 : 500, color: '#14161A', fontFamily: '"Inter", sans-serif', marginBottom: 4 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, fontFamily: '"Inter", sans-serif' }}>
                      {n.body.length > 50 ? n.body.substring(0, 50) + '...' : n.body}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A8F98', marginTop: 8, fontWeight: 500 }}>
                      {n.time}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', color: '#8A8F98' }}>
                    <ChevronRight size={18} />
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ padding: '20px 28px', borderTop: '1px solid #E4E6E9', background: '#FAFAFA', textAlign: 'center' }}>
              <span style={{ fontSize: 13, color: '#8A8F98', fontWeight: 500 }}>You have 2 unread notifications</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
