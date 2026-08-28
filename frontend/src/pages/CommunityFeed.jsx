import React, { useState, useEffect } from 'react';
import { BadgeCheck, Image, Video, Calendar, Briefcase, ThumbsUp, MessageSquare, Repeat2, Send, Flame, Trophy, TrendingUp, Sparkles, UserPlus, Edit3, X, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { userDoc } from '../lib/db';
import { resolveRoleLabel } from '../config/roleConfig';

// Insta-style Verified Badge Component
// tier: "pro" (outlined) | "elite" (filled)
const CapabilioBadge = ({ tier = "pro", size = 16 }) => {
  const isElite = tier === "elite";
  const color = isElite ? "#FF5701" : "#202124"; // Elite is orange, Pro is black
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={isElite ? color : "none"} 
      stroke={color} 
      strokeWidth={isElite ? 0 : 2}
      strokeLinejoin="miter"
      style={{ display: "inline-block", marginLeft: 4, verticalAlign: "-3px" }}
    >
      {/* Mathematically perfect 12-point sharp starburst */}
      <polygon points="12.00,1.00 14.20,3.79 17.50,2.47 18.01,5.99 21.53,6.50 20.21,9.80 23.00,12.00 20.21,14.20 21.53,17.50 18.01,18.01 17.50,21.53 14.20,20.21 12.00,23.00 9.80,20.21 6.50,21.53 5.99,18.01 2.47,17.50 3.79,14.20 1.00,12.00 3.79,9.80 2.47,6.50 5.99,5.99 6.50,2.47 9.80,3.79" />
      {/* Checkmark */}
      <path d="M7.5 12.5L10.5 15.5L16.5 8.5" stroke={isElite ? "#FFFFFF" : color} strokeWidth={isElite ? 2.5 : 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default function CommunityFeed({ user, userData, onNavigate }) {
  const [postText, setPostText] = useState("");
  const [posts, setPosts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Profile Editing State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editAvatar, setEditAvatar] = useState("");

  const name = userData?.displayName || userData?.display_name || userData?.name || "Candidate";
  const rawRole = userData?.targetRole || userData?.target_role || userData?.domain_key || userData?.domain || userData?.keyword || "Software Engineer";
  const role = resolveRoleLabel ? resolveRoleLabel(rawRole) : (rawRole || "Software Engineer");
  
  const elo = userData?.eloRating || userData?.elo_rating || 0;
  
  const avatarUrl = userData?.avatarUrl || userData?.avatar_url || (user ? `https://i.pravatar.cc/150?u=${user.id}` : "");

  useEffect(() => {
    // Initialize edit fields
    setEditName(name);
    setEditRole(role);
    setEditAvatar(userData?.avatarUrl || userData?.avatar_url || "");
    
    fetchPosts();
    
    // Subscribe to new posts
    const subscription = supabase
      .channel('public:community_posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, payload => {
        fetchPosts();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(subscription);
    }
  }, [name, role, userData?.avatarUrl]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (data) {
      setPosts(data.map(p => {
        return {
          id: p.id,
          author: p.author_name || "Community Member", 
          role: p.author_role || "Capabilio Student",
          avatar: p.author_avatar || `https://i.pravatar.cc/150?u=${p.user_id}`,
          tier: p.author_tier || "none",
          time: new Date(p.created_at).toLocaleDateString(), // Or some timeago logic
          content: p.content,
          embed: p.embed_data,
          likes: p.likes_count || 0,
          comments: p.comments_count || 0
        };
      }));
    }
  };

  const handlePost = async () => {
    if (!postText.trim() || !user) return;
    setIsSubmitting(true);
    try {
      await supabase.from('community_posts').insert({
        user_id: user.id,
        content: postText,
        author_name: name,
        author_role: role,
        author_avatar: avatarUrl,
        author_tier: "none" // Current user is free tier
      });
      setPostText("");
      fetchPosts();
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };
  
  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // Update the DB
      await userDoc.update(user.id, {
        displayName: editName,
        targetRole: editRole,
        avatarUrl: editAvatar
      });
      setIsEditingProfile(false);
      // Reload to easily refresh the global state (App.jsx userData) without passing setUserData
      window.location.reload();
    } catch (error) {
      console.error("Failed to update profile", error);
    }
    setIsSubmitting(false);
  };

  // Completely real-time feed, no dummy posts
  const allPosts = posts;

  return (
    <div style={{ backgroundColor: "#F3F2EF", minHeight: "100vh", paddingTop: 40, paddingBottom: 40, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ 
        width: "100%", 
        margin: "0 auto", 
        display: "grid", 
        gridTemplateColumns: "300px 1fr 350px", 
        gap: 32,
        padding: "0 64px"
      }}>
        
        {/* LEFT COLUMN: Profile & Upgrade Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Profile Card - Clean & Neat */}
          <div style={{ backgroundColor: "#FFF", borderRadius: 8, padding: 24, border: "1px solid #E0E0E0", textAlign: "center", position: "relative" }}>
            
            <div style={{ 
              width: 72, height: 72, borderRadius: "50%", backgroundColor: "#F9FAFB", margin: "0 auto 16px auto",
              fontSize: 24, fontWeight: "bold", color: "#FF5701", display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden", position: "relative"
            }}>
              {(isEditingProfile ? editAvatar : avatarUrl) && (isEditingProfile ? editAvatar : avatarUrl).includes('pravatar') === false ? (
                <img src={isEditingProfile ? editAvatar : avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                name.charAt(0)
              )}

              {isEditingProfile && (
                <label style={{
                  position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", 
                  display: "flex", alignItems: "center", justifyContent: "center", 
                  color: "#FFF", cursor: "pointer", opacity: 1
                }}
                >
                  <Camera size={24} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{ display: "none" }} 
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setEditAvatar(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>
            
            {isEditingProfile ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left", marginBottom: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, display: "block" }}>Full Name</label>
                  <input 
                    type="text" 
                    placeholder="Full Name"
                    value={editName} 
                    onChange={e => setEditName(e.target.value)} 
                    style={{ width: "100%", padding: "10px 12px", boxSizing: "border-box", fontSize: 13, border: "1px solid #E0E0E0", borderRadius: 6, outline: "none", transition: "border 0.2s" }} 
                    onFocus={e => e.target.style.border = "1px solid #FF5701"}
                    onBlur={e => e.target.style.border = "1px solid #E0E0E0"}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#666", marginBottom: 4, display: "block" }}>Professional Role</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Frontend Developer"
                    value={editRole} 
                    onChange={e => setEditRole(e.target.value)} 
                    style={{ width: "100%", padding: "10px 12px", boxSizing: "border-box", fontSize: 13, border: "1px solid #E0E0E0", borderRadius: 6, outline: "none", transition: "border 0.2s" }} 
                    onFocus={e => e.target.style.border = "1px solid #FF5701"}
                    onBlur={e => e.target.style.border = "1px solid #E0E0E0"}
                  />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <button onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: "8px 0", background: "#F3F2EF", color: "#333", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveProfile} disabled={isSubmitting} style={{ flex: 1, padding: "8px 0", background: "#FF5701", color: "#FFF", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    {isSubmitting ? "..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#191919", margin: "0 0 4px 0" }}>{name}</h2>
                <p style={{ fontSize: 13, color: "#666", margin: 0 }}>{role}</p>
                
                <button 
                  onClick={() => {
                    setEditName(name);
                    setEditRole(rawRole); // Save raw so they can change "frontend" to "Data Scientist"
                    setEditAvatar(avatarUrl);
                    setIsEditingProfile(true);
                  }}
                  style={{ 
                    marginTop: 16, padding: "6px 16px", background: "transparent", 
                    color: "#666", border: "1px solid #E0E0E0", borderRadius: 999, 
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" 
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#333"; e.currentTarget.style.backgroundColor = "#F3F4F6"; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = "#E0E0E0"; e.currentTarget.style.color = "#666"; e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  Edit Profile
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid #E0E0E0" }}>
                  <span style={{ color: "#666" }}>Verified ELO</span>
                  <span style={{ fontWeight: 600, color: "#191919" }}>{elo}</span>
                </div>
              </>
            )}
          </div>

          {/* Upgrade Promo Card */}
          <div style={{ backgroundColor: "#FFF", borderRadius: 8, padding: 20, border: "1px solid #E0E0E0" }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, margin: "0 0 12px 0", color: "#191919" }}>Verification Badges</h3>
            <p style={{ fontSize: 12, color: "#666", marginBottom: 20, lineHeight: 1.5 }}>
              Stand out in the community feed by verifying your proof of work.
            </p>
            
            {/* Pro Preview */}
            <div style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Pro Preview</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#E5E7EB", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", color: "#FF5701" }}>
                  {avatarUrl && avatarUrl.includes('pravatar') === false ? (
                    <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : name.charAt(0)}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#191919", lineHeight: 1 }}>{name}</span>
                    <CapabilioBadge tier="pro" size={14} />
                  </div>
                  <span style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{role}</span>
                </div>
              </div>
            </div>
            
            <button style={{ width: "100%", padding: "8px 0", background: "transparent", border: "1px solid #202124", color: "#202124", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 20, cursor: "pointer", transition: "all 0.2s" }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = "#F3F4F6"}
              onMouseOut={e => e.currentTarget.style.backgroundColor = "transparent"}
            >
              Upgrade to Pro
            </button>

            {/* Elite Preview */}
            <div style={{ backgroundColor: "#FFF4ED", border: "1px solid #FFEDD5", borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#EA580C", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Elite Preview</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "#FFEDD5", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", color: "#FF5701" }}>
                  {avatarUrl && avatarUrl.includes('pravatar') === false ? (
                    <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : name.charAt(0)}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#191919", lineHeight: 1 }}>{name}</span>
                    <CapabilioBadge tier="elite" size={14} />
                  </div>
                  <span style={{ fontSize: 11, color: "#666", marginTop: 2 }}>{role}</span>
                </div>
              </div>
            </div>
            
            <button style={{ width: "100%", padding: "8px 0", background: "#FF5701", border: "none", color: "#FFF", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(255,87,1,0.2)" }}
              onMouseOver={e => e.currentTarget.style.transform = "translateY(-1px)"}
              onMouseOut={e => e.currentTarget.style.transform = "none"}
            >
              Upgrade to Elite
            </button>
          </div>
        </div>

        {/* MIDDLE COLUMN: Feed */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Post Composer */}
          <div style={{ backgroundColor: "#FFF", borderRadius: 8, padding: "16px", border: "1px solid #E0E0E0" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", backgroundColor: "#F3F2EF", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "#FF5701", overflow: "hidden" }}>
                {avatarUrl && avatarUrl.includes('pravatar') === false ? (
                  <img src={avatarUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  name.charAt(0)
                )}
              </div>
              <input 
                type="text"
                placeholder="Share an update or an Arena mission..."
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePost()}
                style={{ flex: 1, borderRadius: 999, border: "1px solid #B0B0B0", padding: "0 16px", fontSize: 14, outline: "none", backgroundColor: "#FFF", transition: "all 0.2s" }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#5E5E5E", fontSize: 14, fontWeight: 600 }}>
                  <Image size={18} color="#378FE9" /> Media
                </button>
                <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#5E5E5E", fontSize: 14, fontWeight: 600 }}>
                  <Calendar size={18} color="#C37D16" /> Event
                </button>
                <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#5E5E5E", fontSize: 14, fontWeight: 600 }}>
                  <Briefcase size={18} color="#E16745" /> Mission
                </button>
              </div>
              <button 
                onClick={handlePost}
                disabled={isSubmitting || !postText.trim()}
                style={{
                  padding: "8px 24px",
                  backgroundColor: postText.trim() ? "#FF5701" : "#E5E7EB",
                  color: postText.trim() ? "#FFF" : "#9CA3AF",
                  border: "none",
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: postText.trim() ? "pointer" : "not-allowed"
                }}
              >
                {isSubmitting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          {/* Feed Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, height: 1, backgroundColor: "#E0E0E0" }} />
            <span style={{ fontSize: 12, color: "#666" }}>Sort by: <strong style={{ color: "#191919" }}>Top</strong></span>
          </div>

          {/* Posts */}
          {allPosts.map(post => (
            <div key={post.id} style={{ backgroundColor: "#FFF", borderRadius: 8, border: "1px solid #E0E0E0", overflow: "hidden" }}>
              {/* Post Header */}
              <div style={{ padding: "16px 16px 8px", display: "flex", gap: 12 }}>
                <img src={post.avatar} alt={post.author} style={{ width: 48, height: 48, borderRadius: "50%" }} />
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#191919" }}>{post.author}</span>
                    {post.tier !== "none" && <CapabilioBadge tier={post.tier} size={14} />}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>{post.role}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{post.time}</div>
                </div>
              </div>

              {/* Post Content */}
              <div style={{ padding: "0 16px 16px", fontSize: 14, color: "#191919", lineHeight: 1.5 }}>
                {post.content}
              </div>

              {/* Arena Embed (if any) */}
              {post.embed && (
                <div style={{ margin: "0 16px 16px", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "12px 16px", backgroundColor: "#F9FAFB", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Sparkles size={16} color="#FF5701" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Capabilio Arena Mission</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#059669" }}>{post.embed.elo} ELO</span>
                  </div>
                  <div style={{ padding: 16, backgroundColor: "#FFF" }}>
                    <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{post.embed.company}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 12 }}>{post.embed.title}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {post.embed.skills.map(skill => (
                        <span key={skill} style={{ padding: "4px 10px", backgroundColor: "#F3F4F6", borderRadius: 999, fontSize: 12, color: "#4B5563", fontWeight: 500 }}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Engagement Stats */}
              <div style={{ padding: "0 16px", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#666", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#3B82F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ThumbsUp size={10} color="#FFF" />
                  </div>
                  {post.likes}
                </div>
                <span>{post.comments} comments</span>
              </div>

              <div style={{ height: 1, backgroundColor: "#EBEBEB", margin: "0 16px" }} />

              {/* Action Buttons */}
              <div style={{ padding: "4px 16px", display: "flex", justifyContent: "space-between" }}>
                <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#666", fontSize: 14, fontWeight: 600 }}>
                  <ThumbsUp size={20} /> Like
                </button>
                <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#666", fontSize: 14, fontWeight: 600 }}>
                  <MessageSquare size={20} /> Comment
                </button>
                <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#666", fontSize: 14, fontWeight: 600 }}>
                  <Repeat2 size={20} /> Repost
                </button>
                <button style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", background: "transparent", border: "none", borderRadius: 4, cursor: "pointer", color: "#666", fontSize: 14, fontWeight: 600 }}>
                  <Send size={20} /> Send
                </button>
              </div>
            </div>
          ))}

        </div>

        {/* RIGHT COLUMN: Widgets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          
          {/* Search Box */}
          <div style={{ backgroundColor: "#FFF", borderRadius: 8, padding: 12, border: "1px solid #E0E0E0", display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={16} color="#666" />
            <input 
              type="text" 
              placeholder="Search Network..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ border: "none", outline: "none", fontSize: 14, width: "100%" }}
            />
          </div>

          <div style={{ backgroundColor: "#FFF", borderRadius: 8, padding: 16, border: "1px solid #E0E0E0" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px 0", color: "#191919" }}>Trending in Arena</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#191919", display: "flex", alignItems: "center", gap: 6 }}>
                  <Flame size={16} color="#FF5701" /> React State Optimization
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>4,231 students grinding</div>
              </div>
              
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#191919", display: "flex", alignItems: "center", gap: 6 }}>
                  <TrendingUp size={16} color="#3B82F6" /> Postgres Indexing
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Top tech skill today</div>
              </div>
              
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#191919", display: "flex", alignItems: "center", gap: 6 }}>
                  <Trophy size={16} color="#EAB308" /> Swiggy Architecture
                </div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Most attempted company</div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "#FFF", borderRadius: 8, padding: 16, border: "1px solid #E0E0E0" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 16px 0", color: "#191919" }}>Top Performers</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <img src="https://i.pravatar.cc/150?u=a" alt="User" style={{ width: 48, height: 48, borderRadius: "50%" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#191919", display: "flex", alignItems: "center", gap: 4 }}>
                    Arjun Reddy <CapabilioBadge tier="elite" size={14} />
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Principal Engineer @ Zepto</div>
                  <button style={{ padding: "4px 16px", background: "transparent", border: "1px solid #666", borderRadius: 999, fontSize: 14, fontWeight: 600, color: "#666", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    <UserPlus size={16} /> Follow
                  </button>
                </div>
              </div>
              
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <img src="https://i.pravatar.cc/150?u=b" alt="User" style={{ width: 48, height: 48, borderRadius: "50%" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#191919", display: "flex", alignItems: "center", gap: 4 }}>
                    Neha Gupta <CapabilioBadge tier="pro" size={14} />
                  </div>
                  <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>SDE 2 @ Razorpay</div>
                  <button style={{ padding: "4px 16px", background: "transparent", border: "1px solid #666", borderRadius: 999, fontSize: 14, fontWeight: 600, color: "#666", display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                    <UserPlus size={16} /> Follow
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#666", textAlign: "center", marginTop: 8 }}>
            Capabilio © 2026<br/>
            About • Accessibility • Help Center<br/>
            Privacy & Terms • Ad Choices
          </div>

        </div>
      </div>
    </div>
  );
}
