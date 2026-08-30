import React from 'react'
import { Clock } from 'lucide-react'

export default function HistoryTab() {
  return (
    <div>
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '28px', margin: '0 0 12px 0', color: '#202124', fontWeight: 600 }}>
          Challenge History
        </h1>
        <p style={{ color: '#5F6368', margin: 0, fontSize: '16px', maxWidth: '600px', marginInline: 'auto' }}>
          Review your past scratch cards and completed challenges.
        </p>
      </div>
      
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '12px', padding: '24px' }}>
        <div style={{ color: '#5F6368', textAlign: 'center', padding: '60px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
           <Clock size={48} color="#FF5701" opacity={0.5} />
           No past weeks found. Start scratching your current card!
        </div>
      </div>
    </div>
  )
}
