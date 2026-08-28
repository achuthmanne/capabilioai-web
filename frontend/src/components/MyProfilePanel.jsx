import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Briefcase, GraduationCap, Link, CheckCircle2 } from 'lucide-react';
import { userDoc } from "../lib/db";

export default function MyProfilePanel({ isOpen, onClose, user, userData, setUserData }) {
  const [form, setForm] = useState({
    displayName: userData?.displayName || userData?.display_name || "",
    bio: userData?.bio || "",
    githubUrl: userData?.personalInfo?.githubUrl || userData?.githubUrl || "",
    linkedinUrl: userData?.personalInfo?.linkedinUrl || userData?.linkedinUrl || "",
    targetRole: userData?.targetRole || userData?.target_role || userData?.keyword || "",
    yearsExp: userData?.yearsExp || userData?.years_of_experience || "",
    college: userData?.college || "",
    branch: userData?.branch || "",
    degree: userData?.degree || "",
    gradYear: userData?.gradYear || "",
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const patch = {
        displayName: form.displayName,
        display_name: form.displayName,
        bio: form.bio,
        targetRole: form.targetRole,
        target_role: form.targetRole,
        keyword: form.targetRole, 
        yearsExp: form.yearsExp,
        years_of_experience: form.yearsExp,
        college: form.college,
        branch: form.branch,
        degree: form.degree,
        gradYear: form.gradYear,
        personalInfo: {
          ...(userData?.personalInfo || {}),
          githubUrl: form.githubUrl,
          linkedinUrl: form.linkedinUrl,
        }
      };
      
      if (user?.id) {
        await userDoc.update(user.id, patch);
      }
      if (setUserData) {
        setUserData(prev => ({ ...prev, ...patch }));
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const rawName = userData?.displayName || userData?.name || user?.email?.split("@")[0] || "User";
  const initials = rawName.split(" ").map(n => n.charAt(0)).slice(0, 2).join("").toUpperCase();
  const avatarUrl = userData?.profilePhotoURL || null;

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
              
              {/* Profile Photo Area */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ 
                  width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', 
                  border: '1px solid #E4E6E9', background: '#F4F5F7', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 20, fontWeight: 700, color: '#14161A', letterSpacing: '0.5px' }}>{initials}</span>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#14161A', fontFamily: '"Inter", sans-serif' }}>{form.displayName || rawName}</div>
                  <div style={{ fontSize: 13, color: '#8A8F98' }}>{user?.email}</div>
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
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}><Link size={12}/> GitHub</label>
                    <input type="text" value={form.githubUrl} onChange={f('githubUrl')} style={inputStyle} placeholder="Username or URL" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}><Link size={12}/> LinkedIn</label>
                    <input type="text" value={form.linkedinUrl} onChange={f('linkedinUrl')} style={inputStyle} placeholder="Username or URL" />
                  </div>
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
              display: 'flex', justifyContent: 'flex-end', gap: 12
            }}>
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
