/**
 * DiagramSpecView — deterministic SVG/React animation renderer for a
 * lesson's diagram_spec block (Skill Studio Phase 1, 2026-07-30).
 * ---------------------------------------------------------------------------
 * This is the concrete "animated diagram" from the redesign spec WITHOUT a
 * video pipeline: the AI returns a small strict JSON shape —
 *   { type, nodes: [{id,label}], edges: [{from,to,label?}], steps: [string] }
 * — and this component renders it as a simple node/edge graph with a
 * step-by-step reveal driven by Framer Motion (already a dependency — no new
 * animation library). Deterministic: same diagram_spec always renders the
 * same layout, no randomness, no external render/video service involved.
 *
 * Defensive by design: a malformed or missing diagram_spec (e.g. an older
 * cached lesson generated before this field existed, or a provider that
 * omitted it) renders nothing rather than throwing — callers should only
 * mount this when a diagram_spec block actually exists.
 */
import { useState, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { D, sectionLabel } from "./tokens"

const MAX_NODES = 6
const MAX_STEPS = 4

function isValidSpec(spec) {
  return spec && Array.isArray(spec.nodes) && spec.nodes.length > 0 && spec.nodes.length <= MAX_NODES
}

/** Simple deterministic layout: nodes placed left-to-right (flow/comparison)
 *  or in a ring (hierarchy/merge) — no external layout library needed for
 *  up to MAX_NODES nodes. */
function layoutNodes(nodes, type, width, height) {
  const n = nodes.length
  if (type === "hierarchy" || type === "merge") {
    const cx = width / 2, cy = height / 2, r = Math.min(width, height) / 2 - 40
    return nodes.map((node, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      return { ...node, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
    })
  }
  // flow / comparison: even horizontal spread
  const gap = width / (n + 1)
  return nodes.map((node, i) => ({ ...node, x: gap * (i + 1), y: height / 2 }))
}

// controlledStep (optional): when provided (a finite number), the caller
// owns which step is shown — internal prev/next state and buttons are
// disabled. Added for Phase 2a's "Watch" tab, where narration audio (not the
// learner clicking buttons) drives which diagram step is on screen. Learn
// tab usage is unaffected — it never passes this prop, so nothing changes
// for the existing uncontrolled behavior.
export default function DiagramSpecView({ diagramSpec, controlledStep }) {
  const [internalStep, setInternalStep] = useState(0)
  const isControlled = Number.isFinite(controlledStep)
  const step = isControlled ? controlledStep : internalStep
  const steps = Array.isArray(diagramSpec?.steps) ? diagramSpec.steps.slice(0, MAX_STEPS) : []
  const totalSteps = Math.max(1, steps.length)

  useEffect(() => { if (!isControlled) setInternalStep(0) }, [diagramSpec, isControlled])

  const width = 520, height = 200
  const laidOut = useMemo(
    () => (isValidSpec(diagramSpec) ? layoutNodes(diagramSpec.nodes, diagramSpec.type, width, height) : []),
    [diagramSpec]
  )
  const byId = useMemo(() => Object.fromEntries(laidOut.map((n) => [n.id, n])), [laidOut])

  if (!isValidSpec(diagramSpec)) return null

  // Reveal progression: at step k, the first (k+1)/totalSteps fraction of
  // nodes+edges are visible — a simple, deterministic mapping from "step
  // index" to "how much of the diagram is drawn", not tied to node count.
  const revealFraction = (step + 1) / totalSteps
  const visibleNodeCount = Math.max(1, Math.ceil(laidOut.length * revealFraction))
  const visibleNodes = laidOut.slice(0, visibleNodeCount)
  const visibleIds = new Set(visibleNodes.map((n) => n.id))
  const edges = Array.isArray(diagramSpec.edges) ? diagramSpec.edges : []
  const visibleEdges = edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to))

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...sectionLabel, marginBottom: 8 }}>Visual walkthrough</div>
      <div style={{ background: D.float, borderRadius: 14, border: `1px solid ${D.border}`, padding: "16px 12px" }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
          <AnimatePresence>
            {visibleEdges.map((e) => {
              const from = byId[e.from], to = byId[e.to]
              if (!from || !to) return null
              return (
                <motion.g key={`${e.from}-${e.to}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={D.indigo} strokeWidth={1.5} markerEnd="url(#arrow)" />
                  {e.label && (
                    <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6} fontSize={9} fill={D.muted} textAnchor="middle">{e.label}</text>
                  )}
                </motion.g>
              )
            })}
          </AnimatePresence>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill={D.indigo} />
            </marker>
          </defs>
          <AnimatePresence>
            {visibleNodes.map((n) => (
              <motion.g key={n.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.35 }}>
                <rect x={n.x - 44} y={n.y - 18} width={88} height={36} rx={10} fill={D.void} stroke={D.indigo} strokeWidth={1.5} />
                <text x={n.x} y={n.y + 4} fontSize={11} fontWeight={700} fill={D.text1} textAnchor="middle">
                  {String(n.label || n.id).slice(0, 14)}
                </text>
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>

        {steps.length > 0 && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 12, color: D.text2, flex: 1 }}>{steps[step]}</div>
            {!isControlled && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => setInternalStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={stepBtn}>‹</button>
                <span style={{ fontSize: 10, color: D.muted, alignSelf: "center" }}>{step + 1}/{totalSteps}</span>
                <button onClick={() => setInternalStep((s) => Math.min(totalSteps - 1, s + 1))} disabled={step >= totalSteps - 1} style={stepBtn}>›</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const stepBtn = {
  width: 24, height: 24, borderRadius: 8, border: `1px solid ${D.border}`,
  background: D.void, cursor: "pointer", fontFamily: "inherit", fontSize: 13,
}
