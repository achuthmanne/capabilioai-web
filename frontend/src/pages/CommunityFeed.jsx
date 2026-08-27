import React from 'react';

export default function CommunityFeed({ user, userData, onNavigate }) {
  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: '0 auto', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#202124', marginBottom: 16 }}>Student Feed</h1>
      <p style={{ fontSize: 16, color: '#5F6368', lineHeight: 1.6, maxWidth: 600 }}>
        This module is currently being constructed for Phase 5.
        Stay tuned for Student Feed tracking and AI-driven features!
      </p>
    </div>
  );
}
