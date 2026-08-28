import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Briefcase, GraduationCap, CheckCircle2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function MyProfilePanel({ isOpen, onClose, user, userData, onSignOut }) {
  const [form, setForm] = useState({
    displayName: userData?.full_name || '',
    bio: userData?.bio || '',
    targetRole: userData?.target_role || '',
    yearsExp: userData?.years_exp || '',
    college: userData?.college || '',
    degree: userData?.degree || '',
    branch: userData?.branch || '',
    gradYear: userData?.graduation_year || ''
  });
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const f = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        full_name: form.displayName,
        bio: form.bio,
        target_role: form.targetRole,
        years_exp: form.yearsExp,
        college: form.college,
        degree: form.degree,
        branch: form.branch,
        graduation_year: form.gradYear,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase.from('users').update(updates).eq('id', user.id);
      if (error) throw error;
      
      if (typeof window !== 'undefined' && window.updateUserContext) {
        window.updateUserContext({ ...userData, ...updates });
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

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
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#14161A', fontFamily: '"Inter", sans-serif' }}>My Profile</h2>
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

            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 32 }}>
              
              {/* Top Tier Profile Header */}
              <div style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', 
                padding: '16px 0 32px 0', borderBottom: '1px solid #E4E6E9',
                textAlign: 'center'
              }}>
                <div style={{ 
                  width: 88, height: 88, borderRadius: '50%', background: '#F9FAFB', 
                  border: '3px solid #FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)', 
                  overflow: 'hidden', flexShrink: 0, marginBottom: 16
                }}>
                  {userData?.profilePhotoURL ? (
                    <img src={userData.profilePhotoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#9CA3AF', fontWeight: 700, fontFamily: '"Inter", sans-serif' }}>
                      {userData?.full_name?.charAt(0) || user?.email?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
                
                <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: '0 0 4px 0', fontFamily: '"Inter", sans-serif', letterSpacing: '-0.5px' }}>
                  {userData?.full_name || 'Capabilio User'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: '#6B7280' }}>
                  <span style={{ color: '#FF5701' }}>@{userData?.username || 'username'}</span>
                  <span>•</span>
                  <span>{user?.email || 'No email provided'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#14161A', fontWeight: 700, fontSize: 14 }}>
                  <User size={16} color="#6366F1" /> Personal Details
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Full Name</label>
                  <input type="text" value={form.displayName} onChange={f('displayName')} style={inputStyle} />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Bio / Headline</label>
                  <textarea value={form.bio} onChange={f('bio')} style={{ ...inputStyle, minHeight: 80, resize: 'none' }} placeholder="Tell us about yourself..." />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#14161A', fontWeight: 700, fontSize: 14 }}>
                  <Briefcase size={16} color="#F59E0B" /> Career Target
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Target Role</label>
                  <input type="text" value={form.targetRole} onChange={f('targetRole')} style={inputStyle} placeholder="e.g. Frontend Developer" />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Experience Level</label>
                  <select value={form.yearsExp} onChange={f('yearsExp')} style={inputStyle}>
                    <option value="">Select...</option>
                    <option value="0">Fresher (0 years)</option>
                    <option value="1">1 year</option>
                    <option value="2">2 years</option>
                    <option value="3">3 years</option>
                    <option value="5">5+ years</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#14161A', fontWeight: 700, fontSize: 14 }}>
                  <GraduationCap size={16} color="#10B981" /> Education
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>College / University</label>
                  <input type="text" value={form.college} onChange={f('college')} style={inputStyle} />
                </div>
                
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Degree</label>
                    <input type="text" value={form.degree} onChange={f('degree')} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Branch</label>
                    <input type="text" value={form.branch} onChange={f('branch')} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Graduation Year</label>
                  <input type="text" value={form.gradYear} onChange={f('gradYear')} style={inputStyle} />
                </div>
              </div>
              <div style={{ height: 40 }} /> 
            </div>

            <div style={{
              padding: '20px 28px', borderTop: '1px solid #E4E6E9', background: '#FAFAFA',
              display: 'flex', justifyContent: 'flex-end', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  onClick={onClose}
                  style={{ 
                    padding: '10px 20px', borderRadius: 8, border: '1px solid #E4E6E9', background: '#FFFFFF',
                    color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  style={{ 
                    padding: '10px 24px', borderRadius: 8, border: 'none', background: saved ? '#10B981' : '#FF5701',
                    color: '#FFFFFF', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                  }}
                >
                  {saving ? 'Saving...' : saved ? <><CheckCircle2 size={16} /> Saved</> : 'Save Profile'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #E4E6E9',
  background: '#FFFFFF', color: '#14161A', fontSize: 13, fontFamily: '"Inter", sans-serif', outline: 'none'
};
