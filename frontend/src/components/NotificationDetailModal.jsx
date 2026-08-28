import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const notifRelTime = (iso) => {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function NotificationDetailModal({ isOpen, onClose, notification }) {
  if (!isOpen || !notification) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 10005,
            background: '#FAFAFA', display: 'flex', flexDirection: 'column'
          }}
        >
          {/* Top Navbar for Modal */}
          <div style={{
            padding: '24px 40px', background: '#FFFFFF', borderBottom: '1px solid #E4E6E9',
            display: 'flex', alignItems: 'center', gap: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <button 
              onClick={onClose}
              style={{
                background: 'transparent', border: '1px solid #E4E6E9', borderRadius: 8, 
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#14161A', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#14161A', fontFamily: '"Inter", sans-serif' }}>
              Notification Details
            </h1>
          </div>

          {/* Full Screen Content */}
          <div style={{ flex: 1, padding: '60px 40px', display: 'flex', justifyContent: 'center', overflowY: 'auto' }}>
            <div style={{ maxWidth: 800, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ fontSize: 14, color: '#8A8F98', fontWeight: 600 }}>
                  {notifRelTime(notification.created_at)}
                </div>
              </div>
              
              <h1 style={{ margin: '0 0 24px 0', fontSize: 32, fontWeight: 800, color: '#14161A', fontFamily: '"Inter", sans-serif', letterSpacing: '-0.5px' }}>
                {notification.title || "Notification"}
              </h1>
              
              <div style={{ 
                background: '#FFFFFF', border: '1px solid #E4E6E9', borderRadius: 16, padding: '32px',
                fontSize: 16, color: '#475569', lineHeight: 1.6, fontFamily: '"Inter", sans-serif',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}>
                <p style={{ margin: '0 0 24px 0', whiteSpace: 'pre-wrap' }}>{notification.body}</p>
                
                <div style={{ marginTop: 40 }}>
                  <button 
                    onClick={onClose}
                    style={{ 
                      padding: '12px 24px', borderRadius: 8, border: 'none', background: '#FF5701',
                      color: '#FFFFFF', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#EA580C' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FF5701' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
