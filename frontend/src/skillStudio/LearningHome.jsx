/**
 * LearningHome — "Mission Control" (Skill Studio Phase 1 part E, 2026-07-30).
 * ---------------------------------------------------------------------------
 * Replaces the old flat "list of journeys" framing with four surfaces, all
 * derived from data that ALREADY exists elsewhere in the system — no new
 * backend routes, no new scoring/metric formulas invented for this view:
 *
 *   1. Today's Mission     — GET /skill-studio/home's topRecommendations[0],
 *                            the same deterministic ranking recommendationEngine.js
 *                            already produces (spec Principle #5: selection is
 *                            never re-ranked client-side).
 *   2. Critical Skills     — journeys/recommendations whose memory band is
 *                            "low" (memoryEngine's existing decay-confidence
 *                            banding, same thresholds MemoryPanel/NextSkillPanel
 *                            already use), deduped with decayAlerts.
 *   3. Arena/Interview     — POST /skill-studio/arena/readiness per active
 *      Readiness             journey, the exact same call ArenaGatePanel makes
 *                            for a single skill (arenaBridge.checkReadiness's
 *                            existing memoryConfidence/quizPassRate/mistake
 *                            thresholds) — aggregated here across all active
 *                            journeys instead of one. No new readiness formula.
 *   4. Knowledge Retention — dueReviews / decayAlerts from GET /skill-studio/home,
 *                            same data MemoryPanel already renders per-item.
 *
 * Everything above is explicitly labeled as derived from existing
 * quiz/memory/mistake data — no salary, recruiter-demand, or other
 * unsupported prediction is shown anywhere on this page.
 */
import { useState, useEffect, useCallback } from "react"
import { skillStudioV2Api } from "../lib/api"
import { D, cardStyle, sectionLabel } from "./tokens"
import NextSkillPanel from "./NextSkillPanel"
import MemoryPanel from "./MemoryPanel"
import ArenaIngestionPanel from "./ArenaIngestionPanel"

// 2026-07-30 rate-limit incident fix: this used to fan out to 8 parallel
// arena/readiness requests on EVERY LearningHome mount — combined with the
// home/memory/ingestion calls that also fire on mount, that alone could
// approach a whole minute's request budget from one page load, and repeated
// navigation back to Mission Control (e.g. after finishing a module) refired
// all 8 again. Two changes: capped to 3 (Mission Control only needs "are you
// close to Arena-ready," not an exhaustive per-skill audit), and results are
// cached in-memory per skillGraphNodeId for a few minutes so revisiting this
// page shortly after doesn't re-issue the same requests. Module-scope (not
// component state) so it survives this component unmounting/remounting on
// navigation — a plain useRef would not.
const READINESS_CACHE_TTL_MS = 3 * 60 * 1000
const readinessCache = new Map() // skillGraphNodeId -> { result, fetchedAt }

export default function LearningHome({ jobTitle, domainKey, onOpenJourney, onOpenGraph }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newSkill, setNewSkill] = useState("")
  const [creating, setCreating] = useState(false)
  const [readiness, setReadiness] = useState({ loading: true, readyCount: 0, total: 0, items: [] })

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const home = await skillStudioV2Api.home()
      setData(home)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Arena/Interview Readiness aggregate — bounded to active journeys (same
  // per-skill call ArenaGatePanel already makes one-at-a-time; this just
  // fans it out across a small, naturally-bounded list). Capped at 3 (was 8
  // — see the incident note above) to keep Mission Control's own request
  // burst small regardless of how many journeys a learner has active.
  useEffect(() => {
    const journeys = (data?.activeJourneys || []).slice(0, 3)
    if (journeys.length === 0) {
      setReadiness({ loading: false, readyCount: 0, total: 0, items: [] })
      return
    }
    let cancelled = false
    setReadiness((r) => ({ ...r, loading: true }))
    Promise.all(
      journeys.map(async (j) => {
        const nodeId = j.skill_graph_nodes?.id
        if (!nodeId) return null
        const cached = readinessCache.get(nodeId)
        if (cached && Date.now() - cached.fetchedAt < READINESS_CACHE_TTL_MS) {
          return { journeyId: j.id, skill: j.skill_graph_nodes?.label || "Skill", ...cached.result }
        }
        try {
          const r = await skillStudioV2Api.arenaReadiness(nodeId)
          const result = { ready: !!r.ready, quizPassRate: r.quizPassRate, memoryConfidence: r.memoryConfidence }
          readinessCache.set(nodeId, { result, fetchedAt: Date.now() })
          return { journeyId: j.id, skill: j.skill_graph_nodes?.label || "Skill", ...result }
        } catch {
          return null // a single skill's readiness check failing shouldn't blank the whole dashboard
        }
      })
    ).then((results) => {
      if (cancelled) return
      const items = results.filter(Boolean)
      setReadiness({ loading: false, readyCount: items.filter((i) => i.ready).length, total: items.length, items })
    })
    return () => { cancelled = true }
  }, [data?.activeJourneys])

  async function startJourney() {
    if (!newSkill.trim()) return
    setCreating(true)
    try {
      const { journey } = await skillStudioV2Api.createJourney(newSkill.trim(), domainKey, jobTitle)
      setNewSkill("")
      await load()
      onOpenJourney?.(journey)
    } catch (e) { setError(e.message) }
    setCreating(false)
  }

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: D.muted, fontSize: 13 }}>Loading your learning home…</div>

  const topRec = (data?.topRecommendations || [])[0] || null
  const activeJourneys = data?.activeJourneys || []
  const decayAlerts = data?.decayAlerts || []

  // Critical Skills: low-confidence recommendations + decay alerts, deduped
  // by skillGraphNodeId — both already computed server-side (memoryEngine
  // decay banding), this view just merges the two existing lists.
  const criticalMap = new Map()
  for (const rec of data?.topRecommendations || []) {
    if (rec.band === "low") criticalMap.set(rec.skillGraphNodeId, { skill: rec.skill, why: rec.why, skillGraphNodeId: rec.skillGraphNodeId, journeyId: rec.journeyId, domainKey: rec.domainKey })
  }
  for (const alert of decayAlerts) {
    const nodeId = alert.skill_graph_node_id
    const label = alert.skill_graph_nodes?.label || "Skill"
    if (!criticalMap.has(nodeId)) {
      criticalMap.set(nodeId, { skill: label, why: `Confidence has decayed to ${Math.round((alert.confidence || 0) * 100)}% — revisit before it's forgotten.`, skillGraphNodeId: nodeId, journeyId: null, domainKey: null })
    }
  }
  const criticalSkills = Array.from(criticalMap.values()).slice(0, 5)

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: D.text1 }}>Mission Control</div>
          <div style={{ fontSize: 13, color: D.text2, marginTop: 2 }}>What to do next, ranked for {jobTitle || "your track"}.</div>
        </div>
        <button onClick={onOpenGraph} style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${D.border}`, background: D.glass, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          View Skill Graph
        </button>
      </div>

      {error && <div style={{ fontSize: 12, color: D.rose, marginBottom: 12 }}>{error}</div>}

      {/* Today's Mission — the single highest-ranked recommendation, big and unambiguous */}
      <div style={{ ...cardStyle, padding: 22, marginBottom: 16, background: `linear-gradient(135deg, ${D.indigo}10, ${D.raised})`, border: `1px solid ${D.indigo}30` }}>
        <div style={{ ...sectionLabel, marginBottom: 8 }}>Today&apos;s Mission</div>
        {topRec ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 900, color: D.text1, marginBottom: 4 }}>{topRec.skill}</div>
              <div style={{ fontSize: 12, color: D.text2 }}>{topRec.why}</div>
            </div>
            <button
              onClick={() => onOpenJourney?.({ id: topRec.journeyId, skill_graph_nodes: { id: topRec.skillGraphNodeId, label: topRec.skill, domain_key: topRec.domainKey }, target_role: jobTitle })}
              style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: D.indigo, color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}
            >Start</button>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: D.muted }}>No active journeys yet — start one below to get your first mission.</div>
        )}
      </div>

      {/* Critical Skills + Arena/Interview Readiness + Knowledge Retention */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ ...cardStyle, padding: 18 }}>
          <div style={{ ...sectionLabel, marginBottom: 10 }}>Critical Skills</div>
          {criticalSkills.length === 0 && <div style={{ fontSize: 12, color: D.muted }}>Nothing critical right now.</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {criticalSkills.map((c) => (
              <button key={c.skillGraphNodeId} onClick={() => onOpenJourney?.({ id: c.journeyId, skill_graph_nodes: { id: c.skillGraphNodeId, label: c.skill, domain_key: c.domainKey }, target_role: jobTitle })}
                style={{ textAlign: "left", padding: "8px 10px", borderRadius: 10, border: `1px solid ${D.rose}30`, background: D.rose + "0d", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: D.text1 }}>{c.skill}</div>
                <div style={{ fontSize: 10, color: D.text2, marginTop: 2 }}>{c.why}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 18 }}>
          <div style={{ ...sectionLabel, marginBottom: 10 }}>Arena / Interview Readiness</div>
          {readiness.loading ? (
            <div style={{ fontSize: 12, color: D.muted }}>Checking readiness…</div>
          ) : readiness.total === 0 ? (
            <div style={{ fontSize: 12, color: D.muted }}>No active journeys to evaluate yet.</div>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 900, color: readiness.readyCount > 0 ? D.emerald : D.text1, marginBottom: 4 }}>
                {readiness.readyCount}/{readiness.total}
              </div>
              <div style={{ fontSize: 10, color: D.muted, marginBottom: 10 }}>skills ready — based on your recent quiz pass rate and memory confidence</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {readiness.items.map((i) => (
                  <div key={i.journeyId} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: D.text2 }}>{i.skill}</span>
                    <span style={{ fontWeight: 700, color: i.ready ? D.emerald : D.muted }}>{i.ready ? "Ready" : "Not yet"}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ ...cardStyle, padding: 18 }}>
          <div style={{ ...sectionLabel, marginBottom: 10 }}>Knowledge Retention</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: decayAlerts.length > 0 ? D.amber : D.emerald, marginBottom: 4 }}>
            {decayAlerts.length}
          </div>
          <div style={{ fontSize: 10, color: D.muted }}>
            {decayAlerts.length === 0
              ? "no skills currently below the revision-confidence threshold"
              : `skill${decayAlerts.length === 1 ? "" : "s"} below the revision-confidence threshold — see below to review`}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <div style={{ ...sectionLabel, marginBottom: 10 }}>Your Active Skills</div>
          {activeJourneys.length === 0 && (
            <div style={{ fontSize: 12, color: D.muted, marginBottom: 12 }}>No active journeys yet — start one below.</div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {activeJourneys.map((j) => (
              <button key={j.id} onClick={() => onOpenJourney?.(j)} style={{
                textAlign: "left", padding: "10px 14px", borderRadius: 12, border: `1px solid ${D.border}`,
                background: D.glass, cursor: "pointer", fontFamily: "inherit",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: D.text1 }}>{j.skill_graph_nodes?.label || "Skill"}</span>
                <span style={{ fontSize: 10, color: D.muted }}>{j.target_role || ""}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && startJourney()}
              placeholder="Start a new skill journey (e.g. React Hooks)"
              style={{ flex: 1, padding: "9px 12px", borderRadius: 10, border: `1px solid ${D.border}`, fontFamily: "inherit", fontSize: 12 }} />
            <button onClick={startJourney} disabled={creating || !newSkill.trim()} style={{
              padding: "9px 16px", borderRadius: 10, border: "none", background: D.indigo, color: "#fff",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>{creating ? "Starting…" : "Start"}</button>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: 20 }}>
          <NextSkillPanel recommendations={data?.topRecommendations || []} onSelect={(rec) => onOpenJourney?.({ id: rec.journeyId, skill_graph_nodes: { id: rec.skillGraphNodeId, label: rec.skill, domain_key: rec.domainKey }, target_role: jobTitle })} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ ...cardStyle, padding: 20 }}>
          <MemoryPanel limit={5} />
        </div>
        <div style={{ ...cardStyle, padding: 20 }}>
          <ArenaIngestionPanel limit={5} />
        </div>
      </div>
    </div>
  )
}
