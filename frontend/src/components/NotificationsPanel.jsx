import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

const notifRelTime = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function NotificationsPanel({ isOpen, onClose, notifications = [], onNotificationClick }) {
  if (!isOpen) return null;
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#14161A', fontFamily: '"Inter", sans-serif' }}>
                Notifications
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
              {notifications.length === 0 && (
                <div style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 15, color: '#475569', fontWeight: 500, fontFamily: '"Inter", sans-serif' }}>No notifications yet.</div>
                </div>
              )}
              {notifications.map((n) => (
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
                      {n.title || "Notification"}
                    </div>
                    {n.body && (
                      <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, fontFamily: '"Inter", sans-serif' }}>
                        {n.body.length > 70 ? n.body.substring(0, 70) + '...' : n.body}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: '#8A8F98', marginTop: 8, fontWeight: 500 }}>
                      {notifRelTime(n.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', alignSelf: 'center', color: '#8A8F98' }}>
                    <ChevronRight size={18} />
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ padding: '20px 28px', borderTop: '1px solid #E4E6E9', background: '#FAFAFA', textAlign: 'center' }}>
              <span style={{ fontSize: 13, color: '#8A8F98', fontWeight: 500 }}>
                {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You are all caught up!'}
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
