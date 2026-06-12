/**
 * MissionDesk.jsx — the assignment-first Arena homepage (spec §3).
 *
 * Page order: readiness strip → daily mission hero → mission queue →
 * proof shelf + ELO trend (right rail) → workstation quick access →
 * practice library entry. The library is deliberately demoted: the page's
 * job is to get you into today's mission in under ten seconds.
 *
 * Preserves the existing slot economy: 24h cooldowns, plan-gated slots,
 * and upgrade teasers all keep working — they just render as queue rows
 * instead of a card grid.
 */
import React, { useState, useEffect, useMemo } from "react"
import { resolveWorkstationType } from "../pages/ArenaWorkstations"
import { getWorkstationMeta } from "./workstationMeta"
import {
  T, Spinner, Pill, WorkstationBadge, EloRing, Sparkline, EmptyDirective,
  getTier, diffColor, diffBg, CountdownDisplay,
} from "./arenaUi"
import { arenaDb } from "../lib/db"

// ── Readiness strip ──────────────────────────────────────────────────────────
function ReadinessStrip({ domain, elo, streak, completedCount }) {
  const tier = getTier(elo)
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 22px", display: "flex", alignItems: "center", gap: 22, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 30 }}>{domain.icon}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: T.ink }}>{domain.label}</div>
          <div style={{ fontSize: 10, color: T.ink4, letterSpacing: 0.4 }}>YOUR ROLE · OWNERSHIP MODEL</div>
        </div>
      </div>
      <div style={{ width: 1, height: 44, background: T.border }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <EloRing elo={elo} size={56} />
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: T.ink, fontFamily: "'DM Mono',monospace", lineHeight: 1 }}>{elo.toLocaleString()}</div>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: tier.color, marginTop: 3 }}>{tier.icon} {tier.label}</div>
        </div>
      </div>
      <div style={{ width: 1, height: 44, background: T.border }} />
      <div>
        <div style={{ fontSize: 19, fontWeight: 900, color: streak > 0 ? T.amber : T.ink4, fontFamily: "'DM Mono',monospace" }}>{streak > 0 ? `🔥 ${streak}` : "—"}</div>
        <div style={{ fontSize: 10, color: T.ink4 }}>day streak</div>
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 900, color: T.ink, fontFamily: "'DM Mono',monospace" }}>{completedCount}</div>
        <div style={{ fontSize: 10, color: T.ink4 }}>missions proven</div>
      </div>
      <div style={{ marginLeft: "auto", textAlign: "right" }}>
        <div style={{ fontSize: 10, color: T.ink4, lineHeight: 1.5, maxWidth: 200 }}>
          Every submission freezes a proof artifact recruiters can verify. Validation is free — ELO moves only on submit.
        </div>
      </div>
    </div>
  )
}

// ── Daily mission hero (C1) ──────────────────────────────────────────────────
function MissionHero({ slot, domain, onStart }) {
  const [hov, setHov] = useState(false)

  if (!slot || slot.status === "loading") {
    return (
      <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 16, padding: 26, minHeight: 200 }}>
        <div style={{ height: 14, width: 120, background: T.borderSoft, borderRadius: 5, marginBottom: 14, animation: "shimmer 1.5s ease-in-out infinite" }} />
        <div style={{ height: 22, width: "55%", background: T.borderSoft, borderRadius: 6, marginBottom: 10, animation: "shimmer 1.5s ease-in-out infinite 0.15s" }} />
        <div style={{ height: 48, background: "#FAFAF8", borderRadius: 9, marginBottom: 16, animation: "shimmer 1.5s ease-in-out infinite 0.3s" }} />
        <div style={{ height: 42, width: 200, background: T.borderSoft, borderRadius: 10, animation: "shimmer 1.5s ease-in-out infinite 0.45s" }} />
      </div>
    )
  }

  // Completed → compact done state; the hero slot is never empty (spec §3.3)
  if (slot.status === "cooldown") {
    return (
      <div style={{ background: T.greenBg, border: "1.5px solid #BBF7D0", borderRadius: 16, padding: "22px 26px", display: "flex", alignItems: "center", gap: 18 }}>
        <div style={{ width: 50, height: 50, borderRadius: "50%", background: "#fff", border: "2px solid #86EFAC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: "#15803D" }}>Daily mission complete — streak alive</div>
          <div style={{ fontSize: 11.5, color: "#166534", marginTop: 3 }}>
            {slot.challenge?.title ? `"${slot.challenge.title}" is frozen in your proof history. ` : ""}Next mission assigns automatically from a different skill area.
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 9.5, color: "#166534", marginBottom: 3 }}>NEXT MISSION IN</div>
          <div style={{ fontSize: 18 }}><CountdownDisplay cooldownUntil={slot.cooldownUntil} color="#15803D" /></div>
        </div>
      </div>
    )
  }

  const ch = slot.challenge
  if (!ch) return <EmptyDirective icon="⚡" height={180} label="No mission assigned yet — one will be generated shortly. Meanwhile, the practice library below is open." />

  const wsType = resolveWorkstationType({ ...ch, workstation: ch.workstation, sandbox: ch.workstation })
  const meta = getWorkstationMeta(wsType)

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: "#fff", border: `1.5px solid ${hov ? domain.color + "66" : T.border}`, borderRadius: 16, padding: "24px 26px", position: "relative", overflow: "hidden", boxShadow: hov ? `0 10px 32px ${domain.color}14` : "0 1px 4px rgba(0,0,0,0.04)", transition: "all 0.18s" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${domain.color}, ${domain.color}55)` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Pill color="#fff" bg={T.orange} size={9.5}>TODAY'S MISSION</Pill>
        <WorkstationBadge meta={meta} />
        <span style={{ fontSize: 9.5, fontWeight: 800, color: diffColor(ch.difficulty), background: diffBg(ch.difficulty), padding: "2px 9px", borderRadius: 99 }}>{ch.difficulty}</span>
        <span style={{ fontSize: 10, color: T.ink4 }}>⏱ {ch.timeLimit}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 900, color: T.green, fontFamily: "'DM Mono',monospace" }}>+{ch.eloGain} ELO</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 900, color: T.ink, marginBottom: 7, lineHeight: 1.25 }}>{ch.icon} {ch.title}</div>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: T.ink3, lineHeight: 1.65, maxWidth: 560, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {ch.scenario}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => onStart(ch, slot.index, "daily")}
          style={{ padding: "12px 28px", borderRadius: 10, border: "none", background: hov ? domain.color : T.ink, color: "#fff", fontSize: 13.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, transition: "background 0.18s" }}>
          ▶ Start Mission
        </button>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {(ch.tools || []).slice(0, 4).map(t => <Pill key={t} color={domain.color} bg={`${domain.color}10`} border={`${domain.color}28`} size={9.5}>{t}</Pill>)}
        </div>
      </div>
    </div>
  )
}

// ── Mission queue rows (E) ───────────────────────────────────────────────────
function QueueRow({ slot, domain, onStart, locked, onUpgrade, planLabel }) {
  const [hov, setHov] = useState(false)

  if (locked) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "#FBFBF9", border: `1.5px dashed ${T.border}`, borderRadius: 11 }}>
        <span style={{ fontSize: 16, opacity: 0.6 }}>🔒</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink3 }}>Mission slot locked — {planLabel} plan</div>
          <div style={{ fontSize: 10.5, color: T.ink4 }}>More daily missions, more proof, faster ELO growth</div>
        </div>
        <button onClick={onUpgrade} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: T.purple, color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Unlock</button>
      </div>
    )
  }

  if (!slot || slot.status === "loading") {
    return <div style={{ height: 58, background: "#fff", border: `1px solid ${T.border}`, borderRadius: 11, animation: "shimmer 1.5s ease-in-out infinite" }} />
  }

  if (slot.status === "cooldown") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", background: "#FBFBF9", border: `1px solid ${T.border}`, borderRadius: 11, opacity: 0.85 }}>
        <span style={{ fontSize: 15 }}>🧊</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {slot.challenge?.title || "Mission"} — completed ✓
          </div>
          <div style={{ fontSize: 10.5, color: T.ink4 }}>frozen in proof history · next mission rotates in</div>
        </div>
        <CountdownDisplay cooldownUntil={slot.cooldownUntil} color={T.purple} />
      </div>
    )
  }

  const ch = slot.challenge
  if (!ch) return null
  const wsType = resolveWorkstationType({ ...ch, workstation: ch.workstation, sandbox: ch.workstation })
  const meta = getWorkstationMeta(wsType)

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fff", border: `1.5px solid ${hov ? domain.color + "55" : T.border}`, borderRadius: 11, transition: "all 0.15s", boxShadow: hov ? "0 4px 14px rgba(0,0,0,0.06)" : "none" }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{ch.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3 }}>{ch.title}</div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <WorkstationBadge meta={meta} size={9} />
          <span style={{ fontSize: 9.5, fontWeight: 800, color: diffColor(ch.difficulty) }}>{ch.difficulty}</span>
          <span style={{ fontSize: 9.5, color: T.ink4 }}>⏱ {ch.timeLimit}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 900, color: T.green, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>+{ch.eloGain}</span>
      <button onClick={() => onStart(ch, slot.index, "daily")}
        style={{ padding: "7px 18px", borderRadius: 8, border: `1.5px solid ${hov ? domain.color : T.border}`, background: hov ? domain.color : "#fff", color: hov ? "#fff" : T.ink2, fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", flexShrink: 0 }}>
        Start
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MISSION DESK
// ─────────────────────────────────────────────────────────────────────────────
export default function MissionDesk({
  slots, domain, domainKey, loadingSlots, allChallenges,
  onBrowseAll, unlockedCount, onUpgrade, onStart, onFreePractice, onOpenHistory,
  elo, streak, completedCount, uid,
}) {
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!uid) return
    let unsub
    try { unsub = arenaDb.subscribeHistory(uid, docs => setHistory(docs || [])) } catch { /* noop */ }
    return () => { try { unsub?.() } catch { /* noop */ } }
  }, [uid])

  // ELO trend from history (oldest → newest)
  const trend = useMemo(() => {
    const pts = [...history]
      .sort((a, b) => new Date(a.createdAt || a.created_at || 0) - new Date(b.createdAt || b.created_at || 0))
      .map(d => d.newElo || d.new_elo)
      .filter(n => typeof n === "number")
    return pts.slice(-20)
  }, [history])

  const proofs = useMemo(() =>
    [...history]
      .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))
      .slice(0, 3),
  [history])

  const visibleSlots = (slots || []).slice(0, unlockedCount)
  const heroSlot     = visibleSlots[0]
  const queueSlots   = visibleSlots.slice(1)
  const lockedCount  = Math.max(0, (slots || []).length - unlockedCount)

  // Workstation quick access — one tile per distinct workstation in this role's challenge bank
  const quickAccess = useMemo(() => {
    const seen = new Map()
    ;(allChallenges || []).forEach(ch => {
      const wsType = resolveWorkstationType({ ...ch, workstation: ch.workstation, sandbox: ch.workstation })
      if (!seen.has(wsType)) seen.set(wsType, getWorkstationMeta(wsType))
    })
    return [...seen.entries()].slice(0, 6)
  }, [allChallenges])

  return (
    <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 28px 48px" }}>

        {/* B — readiness strip */}
        <ReadinessStrip domain={domain} elo={elo} streak={streak} completedCount={completedCount} />

        {/* C + D — hero and right rail */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(260px,1fr)", gap: 16, marginTop: 16, alignItems: "start" }}>

          {/* left column: hero + queue */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
            <MissionHero slot={heroSlot} domain={domain} onStart={onStart} />

            {/* E — mission queue */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: T.ink, textTransform: "uppercase", letterSpacing: 0.8 }}>Mission Queue</span>
                {loadingSlots && <Spinner size={11} color={domain.color} />}
                <button onClick={onBrowseAll} style={{ marginLeft: "auto", padding: "5px 13px", borderRadius: 7, border: `1px solid ${T.border}`, background: "#fff", fontSize: 11, fontWeight: 700, color: T.ink3, cursor: "pointer", fontFamily: "inherit" }}>
                  Browse practice library →
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {queueSlots.map((s, i) => (
                  <QueueRow key={i} slot={s} domain={domain} onStart={onStart} />
                ))}
                {Array.from({ length: lockedCount }).map((_, i) => (
                  <QueueRow key={`lock_${i}`} locked domain={domain}
                    planLabel={unlockedCount + i === 1 ? "Pro" : "Elite"}
                    onUpgrade={() => onUpgrade(unlockedCount + i === 1 ? "pro" : "elite")} />
                ))}
                {queueSlots.length === 0 && lockedCount === 0 && (
                  <EmptyDirective icon="🎯" label="Queue clear beyond today's mission. Add work from the practice library — every attempt mints proof." />
                )}
              </div>
            </div>

            {/* G — workstation quick access */}
            {quickAccess.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: T.ink, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Your Workstations</div>
                <div style={{ fontSize: 10.5, color: T.ink4, marginBottom: 10 }}>Open any environment in free-practice mode — seeded data, real execution, unranked.</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
                  {quickAccess.map(([wsType, meta]) => (
                    <button key={wsType} onClick={() => onFreePractice(wsType, meta)}
                      style={{ textAlign: "left", background: "#fff", border: `1.5px solid ${T.border}`, borderRadius: 12, padding: "13px 14px", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = meta.hue; e.currentTarget.style.transform = "translateY(-1px)" }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "none" }}>
                      <div style={{ fontSize: 20, marginBottom: 6 }}>{meta.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: T.ink, marginBottom: 2 }}>{meta.label}</div>
                      <div style={{ fontSize: 9.5, color: T.ink4 }}>Free practice · unranked</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* right rail: trend, proof shelf, activity */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* D1 — ELO trend */}
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>ELO trend · last {Math.max(trend.length, 0)} missions</div>
              <Sparkline points={trend} width={240} height={52} color={domain.color} />
            </div>

            {/* F — proof shelf */}
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.8 }}>Proof shelf</span>
                {history.length > 0 && (
                  <button onClick={onOpenHistory} style={{ marginLeft: "auto", border: "none", background: "none", fontSize: 10, fontWeight: 700, color: T.blue, cursor: "pointer", fontFamily: "inherit" }}>
                    All proof →
                  </button>
                )}
              </div>
              {proofs.length === 0 ? (
                <EmptyDirective icon="🧊" height={110} label="This is what recruiters will see. Complete today's mission to mint your first proof artifact." />
              ) : proofs.map((d, i) => (
                <div key={d.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", border: `1px solid ${T.borderSoft}`, borderRadius: 9, marginBottom: 6, background: "#FCFCFA" }}>
                  <span style={{ fontSize: 15 }}>🧊</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: T.ink2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {d.title || d.missionTitle || d.mission_title || "Frozen attempt"}
                    </div>
                    <div style={{ fontSize: 9.5, color: T.ink4 }}>{new Date(d.createdAt || d.created_at || Date.now()).toLocaleDateString()}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 900, fontFamily: "'DM Mono',monospace", color: (d.score ?? 0) >= 70 ? T.green : T.amber }}>{d.score ?? "—"}</span>
                </div>
              ))}
            </div>

            {/* D2 — recent activity */}
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 13, padding: "14px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: T.ink3, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Recent activity</div>
              {history.length === 0 ? (
                <div style={{ fontSize: 11, color: T.ink4, lineHeight: 1.6 }}>Your first mission writes your story →</div>
              ) : [...history].slice(0, 5).map((d, i) => (
                <div key={d.id || i} style={{ display: "flex", gap: 8, fontSize: 11, color: T.ink3, padding: "4px 0", borderBottom: i < 4 ? `1px solid ${T.borderSoft}` : "none" }}>
                  <span style={{ color: T.green, fontFamily: "'DM Mono',monospace", fontWeight: 800, flexShrink: 0 }}>+{d.eloGain ?? d.elo_gain ?? 0}</span>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title || d.missionTitle || d.mission_title || "Mission"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
