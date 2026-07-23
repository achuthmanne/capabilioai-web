/**
 * ExecutiveFeed.jsx — Executive Feed
 *
 * Sprint 4 of EXECUTIVE_TECHNICAL_BLUEPRINT.md §14: NOT a new content
 * system. This is a themed, Executive-scoped view over the already-real
 * pulse_posts system (same table/API already powering Pulse.jsx elsewhere
 * in the app), per EXECUTIVE_INTELLIGENCE_LAYER_DESIGN_SPEC.md §1's
 * explicit instruction to reuse rather than rebuild. Sort options and
 * tag filtering map to what pulse_posts actually supports (tech_tags,
 * role_tags, engagement counters) rather than the editorial category list
 * in the spec, which doesn't have a real backing column yet — shown
 * honestly rather than faked with a filter that silently does nothing.
 */
import { useState, useEffect, useCallback } from "react"
import { pulseApi } from "../lib/api"
import { EXEC_COLORS as C, Card, Label, SectionHead, EmptyState } from "../components/ExecutiveUI"

const SORTS = [
  { id: "created_at",   label: "Newest" },
  { id: "signal",       label: "Most Signal" },
  { id: "discussed",    label: "Most Discussed" },
]

function useFeed(sort, techTag) {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { sort, limit: 20 }
      if (techTag.trim()) params.tech_tag = techTag.trim()
      const r = await pulseApi.feed(params)
      setData(r?.posts || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [sort, techTag])
  useEffect(() => { load() }, [load])
  return { data, loading, reload: load }
}

export default function ExecutiveFeed({ user, userData, onNavigate }) {
  const [sort, setSort] = useState("created_at")
  const [techTag, setTechTag] = useState("")
  const feed = useFeed(sort, techTag)

  const react = async (postId, action) => {
    try { await pulseApi.interact(postId, action) } catch (e) { console.error(e) }
    await feed.reload()
  }

  return (
    <div style={{ background: "#FFFFFF", flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 16px 32px", fontFamily: "DM Sans, sans-serif" }}>
      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: C.ink3, margin: 0, fontWeight: 500 }}>Executive Feed</p>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink, margin: "4px 0 0" }}>What's moving right now</h1>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {SORTS.map(s => (
          <button key={s.id} onClick={() => setSort(s.id)}
            style={{ padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${sort === s.id ? C.goldB : C.border}`, background: sort === s.id ? C.goldL : "transparent", color: sort === s.id ? C.goldD : C.ink3, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            {s.label}
          </button>
        ))}
        <input value={techTag} onChange={e => setTechTag(e.target.value)} placeholder="Filter by tag (e.g. fintech)"
          style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${C.border}`, fontSize: 12, outline: "none", fontFamily: "inherit", minWidth: 180 }} />
      </div>

      {feed.loading ? null : feed.data.length === 0 ? (
        <EmptyState icon="✦" title="Nothing here yet" sub="Follow more people or post something in your Executive Feed to see activity here." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {feed.data.map(post => (
            <Card key={post.id} style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1a1a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.gold, flexShrink: 0 }}>
                  {(post.author?.display_name || post.author?.name || "?").charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{post.author?.display_name || post.author?.name || "Someone"}</div>
                  <div style={{ fontSize: 11, color: C.ink3 }}>{new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                </div>
                {post.post_type && <Label>{post.post_type}</Label>}
              </div>
              <div style={{ fontSize: 13.5, color: C.ink2, lineHeight: 1.7, marginBottom: 10 }}>{post.content}</div>
              {(post.tech_tags?.length > 0) && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {post.tech_tags.map((t, i) => <span key={i} style={{ fontSize: 10.5, color: C.ink3, background: "#F3F1EC", borderRadius: 20, padding: "2px 8px" }}>#{t}</span>)}
                </div>
              )}
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.ink3 }}>
                <button onClick={() => react(post.id, "acknowledge")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontFamily: "inherit", fontWeight: 600 }}>👍 {post.acknowledge_count || 0}</button>
                <button onClick={() => react(post.id, "signal")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontFamily: "inherit", fontWeight: 600 }}>⚡ {post.signal_count || 0} Signal</button>
                <span>💬 {post.comment_count || 0}</span>
                <button onClick={() => react(post.id, "save")} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontFamily: "inherit", fontWeight: 600, marginLeft: "auto" }}>🔖 Save</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
