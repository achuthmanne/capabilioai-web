/**
 * VaultTrustCenter.jsx — Vault Trust Center (Phase 2, Step 1: UI)
 * ---------------------------------------------------------------------------
 * Replaces VaultManager as the Vault surface. Adds the trust/verification
 * layer on top of the existing, working document store: overview stats,
 * a 5-state verification badge per document, a detail drawer with
 * preview/status/method/timeline/evidence/hash sections, a Trust Provider
 * directory, and a global verification audit log.
 *
 * STEP 2 (2026-08-02, done): `vault_documents.proof_object_id` now links each
 * document to a real `proof_objects` row (migration
 * vault_documents_proof_object_link). `computeDocStatus` reads the real,
 * persisted `trust_level` for that document — "Verified" is never shown
 * unless a real verification actually ran and returned verified. The one
 * exception is `lastAttempt` (this session's just-ran result), which is
 * shown immediately without waiting for a reload, since the backend already
 * persisted it by the time this component sees the response.
 *
 * "Request Verification" calls the real POST /api/verification/verify
 * endpoint against the certificate_ocr provider (genuinely OCRs the file and
 * asks an LLM whether it matches the claimed name/issuer), passing this
 * document's id — the backend creates-or-reuses a proof_object for it and
 * persists the result there, so a page reload shows the same "Verified"
 * status, not just this session.
 *
 * NOT wired into any page yet as of this pass — this component still needs
 * to replace (or be added alongside) the ad-hoc `vaultFiles` JSON-array
 * upload flow in Aura.jsx, which is a separate, larger migration (existing
 * student/professional uploads live in that array, not in `vault_documents`
 * at all) — deliberately out of scope here to avoid touching a working,
 * load-bearing upload/resume-parsing flow in the same change.
 */
import { useState, useEffect, useRef, useMemo } from "react"
import { vaultApi, verificationApi } from "../lib/api"

const T = {
  cream: "#F6F6F1", ink: "#1A1A18", ink2: "#3A3A38", ink3: "#6B6B68",
  indigo: "#3D4EAC", indigo2: "#EEF0FB", indigo3: "#F5F6FC",
  green: "#1A7A4A", green2: "#E8F7EF",
  amber: "#B8620A", amber2: "#FDF3E7",
  red: "#C0392B", red2: "#FDECEA",
  blue: "#2563A8", blue2: "#E9F1FB",
  slate: "#5B6472", slate2: "#EEF0F3",
  border: "rgba(26,26,24,0.09)", shadow: "0 2px 12px rgba(26,26,24,0.07)",
  shadowLg: "0 12px 40px rgba(26,26,24,0.16)",
}

const DOC_TYPES = [
  { id: "resume", label: "Resume", icon: "📄", accept: ".pdf,.doc,.docx" },
  { id: "offer_letter", label: "Offer Letter", icon: "✉️", accept: ".pdf,.doc,.docx,.jpg,.png" },
  { id: "experience_letter", label: "Experience Letter", icon: "🏆", accept: ".pdf,.doc,.docx,.jpg,.png" },
  { id: "certification", label: "Certification", icon: "🎓", accept: ".pdf,.jpg,.png" },
  { id: "payslip", label: "Pay Slip", icon: "💰", accept: ".pdf,.jpg,.png" },
  { id: "contract", label: "Contract", icon: "📝", accept: ".pdf,.doc,.docx" },
  { id: "invoice", label: "Invoice", icon: "🧾", accept: ".pdf,.jpg,.png" },
  { id: "other", label: "Other", icon: "📁", accept: "*" },
]
const DOC_TYPE_META = Object.fromEntries(DOC_TYPES.map(d => [d.id, d]))

// ── Which doc types have a real verification provider today. Only
//    "certification" maps to a real, working provider (certificate_ocr).
//    Everything else is honestly "unsupported" until a real provider exists
//    (see lib/verification/providers/declared.js on the backend). ──────────
const PROVIDER_FOR_DOC_TYPE = { certification: "certificate_ocr" }

// ── 5-state badge vocabulary, matching the roadmap's model. ────────────────
const STATUS_META = {
  verified: { label: "Verified", icon: "✓", color: T.green, bg: T.green2 },
  pending: { label: "Pending", icon: "◔", color: T.amber, bg: T.amber2 },
  self_claimed: { label: "Self-Claimed", icon: "◐", color: T.blue, bg: T.blue2 },
  failed: { label: "Failed", icon: "✕", color: T.red, bg: T.red2 },
  unsupported: { label: "Unsupported", icon: "—", color: T.slate, bg: T.slate2 },
}

// Step 2: real lookup. `lastAttempt` (this session's just-ran result) wins
// when present so the badge updates immediately without a reload; otherwise
// this reads the persisted trust_level via doc.proof_object_id/doc.trust_level
// (added by GET /pro/vault's join). trust_level only ever moves
// self-claimed → verified at the DB level (see proof_objects' CHECK
// constraint) — a "failed" status only ever exists as this-session feedback
// from lastAttempt, never persisted, which is why a failed attempt doesn't
// permanently brand a document.
function computeDocStatus(doc, lastAttempt) {
  if (lastAttempt?.status === "verified") return "verified"
  if (lastAttempt?.status === "rejected") return "failed"
  if (lastAttempt?.status === "error") return "failed"
  if (doc.proof_object_id) return doc.trust_level === "verified" ? "verified" : "self_claimed"
  return PROVIDER_FOR_DOC_TYPE[doc.doc_type] ? "self_claimed" : "unsupported"
}

function formatBytes(b) {
  if (!b) return "—"
  if (b < 1024) return `${b}B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`
  return `${(b / 1024 / 1024).toFixed(1)}MB`
}
function fmtDate(d) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}
function fmtDateTime(d) {
  if (!d) return "—"
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

// ═══════════════════════════════════════════════════════════════════════════
// Small shared primitives
// ═══════════════════════════════════════════════════════════════════════════

function StatusBadge({ status, size = "md" }) {
  const m = STATUS_META[status] || STATUS_META.unsupported
  const pad = size === "sm" ? "2px 8px" : "3px 10px"
  const fs = size === "sm" ? 10.5 : 11.5
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: pad, borderRadius: 999,
      background: m.bg, color: m.color, fontSize: fs, fontWeight: 700, letterSpacing: "0.02em",
      fontFamily: "'DM Mono', monospace",
    }}>
      <span>{m.icon}</span>{m.label}
    </span>
  )
}

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px", boxShadow: T.shadow }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || T.ink, fontFamily: "'DM Sans', serif" }}>{value}</div>
      <div style={{ fontSize: 12.5, color: T.ink3, marginTop: 2, fontWeight: 600 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, color: T.ink3, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: T.ink, textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</div>
      {right}
    </div>
  )
}

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 20 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: "10px 16px", background: "none", border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 700, color: active === t.id ? T.indigo : T.ink3,
          borderBottom: active === t.id ? `2px solid ${T.indigo}` : "2px solid transparent",
          marginBottom: -1, display: "flex", alignItems: "center", gap: 6,
        }}>
          {t.label}
          {t.count != null && (
            <span style={{
              fontSize: 10.5, background: active === t.id ? T.indigo : T.slate2,
              color: active === t.id ? "#fff" : T.ink3, borderRadius: 999, padding: "1px 6px", fontWeight: 700,
            }}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Document card
// ═══════════════════════════════════════════════════════════════════════════

function DocCard({ doc, status, onOpen, onDelete, onDownload }) {
  const meta = DOC_TYPE_META[doc.doc_type] || DOC_TYPE_META.other
  const [downloading, setDownloading] = useState(false)

  async function handleDownload(e) {
    e.stopPropagation()
    setDownloading(true)
    try {
      const { url } = await onDownload(doc.id)
      const a = document.createElement("a")
      a.href = url; a.download = doc.file_name; a.click()
    } catch (e) { alert(e.message) }
    finally { setDownloading(false) }
  }

  return (
    <div onClick={() => onOpen(doc)} style={{
      background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 18px",
      boxShadow: T.shadow, cursor: "pointer", transition: "box-shadow .15s, transform .15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = T.shadowLg; e.currentTarget.style.transform = "translateY(-1px)" }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.transform = "none" }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: T.indigo2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
          {meta.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 5 }}>{doc.file_name}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
            <StatusBadge status={status} size="sm" />
            <span style={{ fontSize: 11, background: "#F4F4F0", color: T.ink3, padding: "1px 7px", borderRadius: 99 }}>{meta.label}</span>
            {doc.is_private && <span style={{ fontSize: 11, background: T.amber2, color: T.amber, padding: "1px 7px", borderRadius: 99 }}>🔒 Private</span>}
          </div>
          <div style={{ display: "flex", gap: 10, fontSize: 11, color: T.ink3 }}>
            <span>{formatBytes(doc.file_size)}</span>
            <span>Uploaded {fmtDate(doc.created_at)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={handleDownload} disabled={downloading} title="Download" style={{ width: 30, height: 30, background: T.indigo2, border: "none", borderRadius: 8, color: T.indigo, cursor: "pointer", fontSize: 13 }}>
            {downloading ? "…" : "⬇"}
          </button>
          <button onClick={() => onDelete(doc.id)} title="Delete" style={{ width: 30, height: 30, background: T.red2, border: "none", borderRadius: 8, color: T.red, cursor: "pointer", fontSize: 13 }}>
            🗑
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Verification lifecycle timeline (per document)
// ═══════════════════════════════════════════════════════════════════════════

function VerificationTimeline({ doc, status, lastAttempt }) {
  const eligible = !!PROVIDER_FOR_DOC_TYPE[doc.doc_type]
  const activity = doc.activity_log || []
  const uploadedAt = activity.find(a => a.action === "uploaded")?.at || doc.created_at

  const steps = [
    { key: "uploaded", label: "Uploaded", done: true, at: uploadedAt },
    { key: "extracted", label: "AI Extracted", done: !!lastAttempt, at: lastAttempt?.at },
    { key: "requested", label: "Verification Requested", done: !!lastAttempt, at: lastAttempt?.at },
    { key: "verified", label: status === "verified" ? "Verified" : status === "failed" ? "Verification Failed" : "Verified", done: status === "verified" || status === "failed", failed: status === "failed", at: lastAttempt?.at },
    { key: "anchored", label: "Hash Anchored", done: false, at: null },
  ]

  return (
    <div>
      {!eligible && (
        <div style={{ fontSize: 12, color: T.ink3, background: T.slate2, borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
          No verification provider exists yet for "{DOC_TYPE_META[doc.doc_type]?.label || doc.doc_type}" documents — this stops at Uploaded until a provider is added (see the Trust Provider directory).
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {steps.map((s, i) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 74 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, flexShrink: 0,
                background: s.failed ? T.red2 : s.done ? T.green2 : "#F4F4F0",
                color: s.failed ? T.red : s.done ? T.green : T.ink3,
                border: `1.5px solid ${s.failed ? T.red : s.done ? T.green : T.border}`,
              }}>
                {s.failed ? "✕" : s.done ? "✓" : i + 1}
              </div>
              <div style={{ fontSize: 10.5, color: s.done || s.failed ? T.ink2 : T.ink3, fontWeight: s.done || s.failed ? 700 : 500, textAlign: "center", marginTop: 6, lineHeight: 1.3, maxWidth: 78 }}>{s.label}</div>
              {s.at && <div style={{ fontSize: 9.5, color: T.ink3, marginTop: 2 }}>{fmtDate(s.at)}</div>}
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: s.done ? T.green : T.border, margin: "0 2px", marginTop: -18 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Document Detail Drawer
// ═══════════════════════════════════════════════════════════════════════════

function DetailDrawer({ doc, status, lastAttempt, onClose, onDownload, onRequestVerification, verifying }) {
  const meta = DOC_TYPE_META[doc.doc_type] || DOC_TYPE_META.other
  const eligible = !!PROVIDER_FOR_DOC_TYPE[doc.doc_type]
  const providerId = PROVIDER_FOR_DOC_TYPE[doc.doc_type]
  const [claimName, setClaimName] = useState(doc.file_name.replace(/\.[^.]+$/, ""))
  const [claimIssuer, setClaimIssuer] = useState("")
  const [showRequestForm, setShowRequestForm] = useState(false)

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.5)" }} />
      <div style={{ position: "relative", width: "min(480px, 100vw)", height: "100%", background: T.cream, boxShadow: "-12px 0 40px rgba(0,0,0,0.15)", overflowY: "auto", padding: "24px 24px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#fff", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{meta.icon}</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.ink, wordBreak: "break-word" }}>{doc.file_name}</div>
              <div style={{ fontSize: 12, color: T.ink3, marginTop: 2 }}>{meta.label} · {formatBytes(doc.file_size)}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, color: T.ink3, cursor: "pointer", lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {/* Verification Status */}
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: T.shadow }}>
          <SectionTitle>Verification Status</SectionTitle>
          <StatusBadge status={status} />
          <p style={{ fontSize: 12.5, color: T.ink3, marginTop: 10, lineHeight: 1.5 }}>
            {status === "verified" && "This document's claim was checked by a verification provider and confirmed to match."}
            {status === "failed" && (lastAttempt?.reason || "The most recent verification attempt did not confirm this document's claim.")}
            {status === "self_claimed" && "Not yet checked by a verification provider. The person who uploaded this is the only source for its accuracy."}
            {status === "pending" && "A verification request is in progress."}
            {status === "unsupported" && "No verification provider exists for this document type yet — see the Trust Provider directory."}
          </p>
        </div>

        {/* Verification Method */}
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: T.shadow }}>
          <SectionTitle>Verification Method</SectionTitle>
          {eligible ? (
            <div style={{ fontSize: 12.5, color: T.ink2, lineHeight: 1.6 }}>
              <div><strong>Provider:</strong> Certificate OCR Match</div>
              <div><strong>Capability:</strong> manual_review — text-extraction + LLM match, not a cryptographic or issuer-API check</div>
              <div><strong>Confidence threshold:</strong> ≥ 60% match required to pass</div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: T.ink3 }}>No provider assigned to "{meta.label}" documents yet.</div>
          )}
        </div>

        {/* Verification Timeline */}
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 12px 20px", marginBottom: 16, boxShadow: T.shadow }}>
          <div style={{ padding: "0 4px" }}><SectionTitle>Verification Timeline</SectionTitle></div>
          <VerificationTimeline doc={doc} status={status} lastAttempt={lastAttempt} />
        </div>

        {/* Evidence Information */}
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: T.shadow }}>
          <SectionTitle>Evidence Information</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: 12.5 }}>
            <div><span style={{ color: T.ink3 }}>Type</span><div style={{ color: T.ink2, fontWeight: 600 }}>{meta.label}</div></div>
            <div><span style={{ color: T.ink3 }}>MIME type</span><div style={{ color: T.ink2, fontWeight: 600 }}>{doc.mime_type || "—"}</div></div>
            <div><span style={{ color: T.ink3 }}>Uploaded</span><div style={{ color: T.ink2, fontWeight: 600 }}>{fmtDateTime(doc.created_at)}</div></div>
            <div><span style={{ color: T.ink3 }}>Visibility</span><div style={{ color: T.ink2, fontWeight: 600 }}>{doc.is_private ? "Private" : "Visible to you"}</div></div>
          </div>
          {(doc.tags || []).length > 0 && (
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 10 }}>
              {doc.tags.map((t, i) => <span key={i} style={{ fontSize: 10.5, background: "#F4F4F0", color: T.ink3, padding: "2px 7px", borderRadius: 99 }}>{t}</span>)}
            </div>
          )}
        </div>

        {/* Hash / Audit Information */}
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, marginBottom: 16, boxShadow: T.shadow }}>
          <SectionTitle>Hash &amp; Audit Information</SectionTitle>
          {lastAttempt?.auditEntry ? (
            <div style={{ fontSize: 12, color: T.ink2, fontFamily: "'DM Mono', monospace", lineHeight: 1.7, wordBreak: "break-all" }}>
              <div><span style={{ color: T.ink3 }}>Audit entry ID: </span>{lastAttempt.auditEntry.id}</div>
              <div><span style={{ color: T.ink3 }}>Sequence: </span>#{lastAttempt.auditEntry.seq}</div>
              <div><span style={{ color: T.ink3 }}>Entry hash: </span>{lastAttempt.auditEntry.entry_hash?.slice(0, 24)}…</div>
              {lastAttempt.auditEntry.document_hash && <div><span style={{ color: T.ink3 }}>Document hash: </span>{lastAttempt.auditEntry.document_hash?.slice(0, 24)}…</div>}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: T.ink3 }}>No hash-chain entry yet — this document hasn't been run through the verification pipeline. Once it is, every attempt (pass or fail) is recorded permanently here.</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {eligible && !showRequestForm && (
            <button onClick={() => setShowRequestForm(true)} style={{ padding: "12px", background: T.indigo, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Request Verification
            </button>
          )}
          {eligible && showRequestForm && (
            <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: T.ink3, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>Confirm what to check this document against</div>
              <label style={{ fontSize: 11, color: T.ink3, fontWeight: 600 }}>Certificate / credential name</label>
              <input value={claimName} onChange={e => setClaimName(e.target.value)} style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, marginTop: 4, marginBottom: 8, boxSizing: "border-box" }} />
              <label style={{ fontSize: 11, color: T.ink3, fontWeight: 600 }}>Issuer (optional)</label>
              <input value={claimIssuer} onChange={e => setClaimIssuer(e.target.value)} placeholder="e.g. AWS, Coursera" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, marginTop: 4, marginBottom: 12, boxSizing: "border-box" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setShowRequestForm(false)} style={{ flex: 1, padding: "10px", background: "#FAF7F2", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 12.5, color: T.ink3, cursor: "pointer" }}>Cancel</button>
                <button
                  onClick={() => onRequestVerification(doc, providerId, { name: claimName, issuer: claimIssuer || undefined })}
                  disabled={verifying || !claimName.trim()}
                  style={{ flex: 2, padding: "10px", background: T.indigo, border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer", opacity: verifying || !claimName.trim() ? 0.6 : 1 }}
                >
                  {verifying ? "Checking…" : "Run Verification"}
                </button>
              </div>
              <div style={{ fontSize: 10.5, color: T.ink3, marginTop: 8, lineHeight: 1.4 }}>
                This re-downloads the file and runs it through the real Certificate OCR Match provider. Result is shown below — persisting it onto this document is a Step 2 backend change, not yet wired.
              </div>
            </div>
          )}
          <button onClick={() => onDownload(doc.id, doc.file_name)} style={{ padding: "12px", background: T.indigo2, border: "none", borderRadius: 10, color: T.indigo, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            Download Document
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Upload Modal (unchanged behavior from VaultManager, same real endpoint)
// ═══════════════════════════════════════════════════════════════════════════

function UploadModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null)
  const [docType, setDocType] = useState("resume")
  const [tagInput, setTagInput] = useState("")
  const [tags, setTags] = useState([])
  const [isPrivate, setIsPrivate] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileRef = useRef()

  async function handleUpload() {
    if (!file) return
    setUploading(true); setProgress(30)
    try {
      setProgress(60)
      const { document: doc } = await vaultApi.upload(file, docType, tags, isPrivate)
      setProgress(100)
      setTimeout(() => onUploaded(doc), 300)
    } catch (e) { alert(e.message); setUploading(false); setProgress(0) }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(17,24,39,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "28px 32px", maxWidth: 500, width: "100%" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.ink, marginBottom: 20, fontFamily: "'DM Sans',serif" }}>Upload to Vault</div>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = T.indigo }}
          onDragLeave={e => { e.currentTarget.style.borderColor = T.border }}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); e.currentTarget.style.borderColor = T.border }}
          style={{ border: `2px dashed ${file ? T.green : T.border}`, borderRadius: 12, padding: "28px 16px", textAlign: "center", cursor: "pointer", marginBottom: 16, background: file ? T.green2 : "#FAFAF8", transition: "all .15s" }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>{file ? '✅' : '📁'}</div>
          {file
            ? <div style={{ fontSize: 14, color: T.green, fontWeight: 600 }}>{file.name}<br /><span style={{ fontSize: 12, color: T.ink3 }}>{formatBytes(file.size)}</span></div>
            : <div style={{ fontSize: 13, color: T.ink3 }}>Click to browse or drag &amp; drop<br /><span style={{ fontSize: 11 }}>PDF, DOC, DOCX, JPG, PNG — max 20MB</span></div>}
          <input ref={fileRef} type="file" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.ink3, marginBottom: 6 }}>Document type</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
            {DOC_TYPES.map(dt => (
              <button key={dt.id} onClick={() => setDocType(dt.id)} style={{ padding: "8px 4px", background: docType === dt.id ? T.indigo2 : "#FAF7F2", border: `1px solid ${docType === dt.id ? T.indigo : T.border}`, borderRadius: 8, cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 16 }}>{dt.icon}</div>
                <div style={{ fontSize: 10, color: docType === dt.id ? T.indigo : T.ink3, marginTop: 2 }}>{dt.label}</div>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.ink3, marginBottom: 6 }}>Tags (optional)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
            {tags.map((t, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", background: T.indigo2, color: T.indigo, borderRadius: 99, fontSize: 11 }}>
                {t}<button onClick={() => setTags(ts => ts.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: T.indigo, padding: 0 }}>×</button>
              </span>
            ))}
          </div>
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && tagInput.trim()) { setTags(t => [...t, tagInput.trim()]); setTagInput("") } }}
            placeholder="Add tag, press Enter"
            style={{ width: "100%", padding: "8px 12px", border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 16 }}>
          <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
          <span style={{ fontSize: 13, color: T.ink2 }}>🔒 Mark as private (only accessible by you)</span>
        </label>
        {uploading && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 4, borderRadius: 4, background: "#E8E3DA", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: T.indigo, transition: "width .3s ease" }} />
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "11px", background: "#FAF7F2", border: `1px solid ${T.border}`, borderRadius: 10, cursor: "pointer", fontSize: 13, color: T.ink3 }}>Cancel</button>
          <button onClick={handleUpload} disabled={!file || uploading} style={{ flex: 2, padding: "11px", background: T.indigo, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: !file || uploading ? 0.6 : 1 }}>
            {uploading ? "Uploading…" : "Upload to Vault"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Trust Provider directory (real data — GET /api/verification/providers)
// ═══════════════════════════════════════════════════════════════════════════

const CAPABILITY_META = {
  api: { label: "API", color: T.green, bg: T.green2, desc: "Confirmed directly against the issuer's own API." },
  manual_review: { label: "Manual Review", color: T.amber, bg: T.amber2, desc: "Text-extraction + AI match — real signal, not a cryptographic guarantee." },
  unsupported: { label: "Unsupported", color: T.slate, bg: T.slate2, desc: "Declared honestly — no real integration exists yet." },
}

function ProvidersSection({ providers, loading }) {
  if (loading) return <div style={{ fontSize: 13, color: T.ink3 }}>Loading trust providers…</div>
  return (
    <div>
      <div style={{ fontSize: 12.5, color: T.ink3, marginBottom: 16, lineHeight: 1.5, maxWidth: 640 }}>
        Trust Providers are the sources Capabilio checks evidence against — issuer APIs, document-matching services, and future integrations. Status is shown honestly: nothing here is marked available unless it genuinely is.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {providers.map(p => {
          const cap = CAPABILITY_META[p.capability] || CAPABILITY_META.unsupported
          return (
            <div key={p.id} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 14, padding: 16, boxShadow: T.shadow }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{p.name}</div>
                <span style={{ fontSize: 10.5, fontWeight: 700, background: cap.bg, color: cap.color, padding: "2px 8px", borderRadius: 99 }}>{cap.label}</span>
              </div>
              <div style={{ fontSize: 12, color: T.ink3, lineHeight: 1.5 }}>{p.note || cap.desc}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Global verification audit log (real data — GET /api/verification/audit/mine)
// ═══════════════════════════════════════════════════════════════════════════

function AuditLogSection({ entries, loading }) {
  if (loading) return <div style={{ fontSize: 13, color: T.ink3 }}>Loading verification log…</div>
  if (!entries.length) {
    return (
      <div style={{ textAlign: "center", padding: 48, background: "#FAFAF8", borderRadius: 16, border: `1.5px dashed ${T.border}` }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🔗</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 6 }}>No verification history yet</div>
        <div style={{ fontSize: 13, color: T.ink3 }}>Every verification attempt — pass or fail — is hash-chained and appears here permanently once you run one.</div>
      </div>
    )
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.slice().reverse().map(e => {
        const st = e.result === "verified" ? "verified" : e.result === "rejected" || e.result === "error" ? "failed" : "pending"
        return (
          <div key={e.id} style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: T.shadow }}>
            <StatusBadge status={st} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{e.provider_id}</div>
              <div style={{ fontSize: 11, color: T.ink3 }}>#{e.seq} · {fmtDateTime(e.created_at)} · confidence {e.confidence ?? "—"}</div>
            </div>
            <div style={{ fontSize: 10.5, color: T.ink3, fontFamily: "'DM Mono', monospace" }}>{e.entry_hash?.slice(0, 12)}…</div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

export default function VaultTrustCenter({ user }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [filter, setFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [tab, setTab] = useState("documents")

  const [providers, setProviders] = useState([])
  const [providersLoading, setProvidersLoading] = useState(true)
  const [auditEntries, setAuditEntries] = useState([])
  const [auditLoading, setAuditLoading] = useState(true)

  // per-document last verification attempt made in this session (see the
  // HONESTY NOTE at the top of the file for why this isn't persisted yet)
  const [attempts, setAttempts] = useState({})
  const [verifying, setVerifying] = useState(false)

  async function loadDocs() {
    setLoading(true)
    try { setDocs(await vaultApi.list()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }
  async function loadProviders() {
    setProvidersLoading(true)
    try { setProviders((await verificationApi.providers()).providers || []) }
    catch (e) { console.error(e) }
    finally { setProvidersLoading(false) }
  }
  async function loadAudit() {
    setAuditLoading(true)
    try { setAuditEntries((await verificationApi.auditMine()).entries || []) }
    catch (e) { console.error(e) }
    finally { setAuditLoading(false) }
  }

  useEffect(() => { loadDocs(); loadProviders(); loadAudit() }, [])

  async function handleDelete(id) {
    if (!confirm("Delete this document? This cannot be undone.")) return
    try {
      await vaultApi.remove(id)
      setDocs(d => d.filter(x => x.id !== id))
      if (selectedDoc?.id === id) setSelectedDoc(null)
    } catch (e) { alert(e.message) }
  }
  function handleUploaded(doc) { setDocs(d => [doc, ...d]); setShowUpload(false) }
  async function handleDownload(id, name) {
    const { url } = await vaultApi.getUrl(id)
    if (name) { const a = document.createElement("a"); a.href = url; a.download = name; a.click(); return }
    return { url }
  }

  async function handleRequestVerification(doc, providerId, claim) {
    setVerifying(true)
    try {
      const { url } = await vaultApi.getUrl(doc.id)
      const blob = await fetch(url).then(r => r.blob())
      const file = new File([blob], doc.file_name, { type: doc.mime_type })
      // documentId lets the backend create-or-reuse this doc's proof_object
      // and persist the result onto it — not just a one-off in-memory check.
      const result = await verificationApi.verify(providerId, { file, claim, documentId: doc.id })
      setAttempts(a => ({ ...a, [doc.id]: { ...result, at: new Date().toISOString() } }))
      loadAudit()
      loadDocs() // pick up the newly-linked proof_object_id / trust_level
    } catch (e) {
      alert(`Verification check failed: ${e.message}`)
    } finally {
      setVerifying(false)
    }
  }

  const docsWithStatus = useMemo(() =>
    docs.map(d => ({ doc: d, status: computeDocStatus(d, attempts[d.id]) })),
    [docs, attempts])

  const stats = useMemo(() => {
    const counts = { total: docs.length, verified: 0, pending: 0, self_claimed: 0, failed: 0, unsupported: 0 }
    docsWithStatus.forEach(({ status }) => { counts[status] = (counts[status] || 0) + 1 })
    return counts
  }, [docsWithStatus])

  const filtered = docsWithStatus.filter(({ doc, status }) => {
    if (filter !== "all" && doc.doc_type !== filter) return false
    if (statusFilter !== "all" && status !== statusFilter) return false
    if (search && !doc.file_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const selected = selectedDoc ? docsWithStatus.find(x => x.doc.id === selectedDoc.id) : null

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${T.indigo}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin .7s linear infinite", display: "inline-block" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ fontFamily: "DM Sans,sans-serif" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.ink, fontFamily: "'DM Sans',serif" }}>Vault Trust Center</div>
          <div style={{ fontSize: 13, color: T.ink3, marginTop: 2 }}>Your documents, their verification status, and the full audit trail behind them.</div>
        </div>
        <button onClick={() => setShowUpload(true)} style={{ padding: "9px 18px", background: T.indigo, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Upload Document</button>
      </div>

      {/* Overview cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 24 }}>
        <StatCard label="Total Documents" value={stats.total} color={T.ink} />
        <StatCard label="Verified" value={stats.verified} color={T.green} />
        <StatCard label="Pending" value={stats.pending} color={T.amber} />
        <StatCard label="Self-Claimed" value={stats.self_claimed} color={T.blue} />
        <StatCard label="Unsupported" value={stats.unsupported} color={T.slate} />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "documents", label: "Documents", count: docs.length },
          { id: "providers", label: "Trust Providers", count: providers.length },
          { id: "audit", label: "Verification Log", count: auditEntries.length },
        ]}
      />

      {tab === "documents" && (
        <>
          {/* Verification queue / status filter chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {["all", "verified", "pending", "self_claimed", "failed", "unsupported"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                background: statusFilter === s ? T.indigo : "#FAF7F2",
                color: statusFilter === s ? "#fff" : T.ink3,
                border: `1px solid ${statusFilter === s ? T.indigo : T.border}`,
                fontWeight: statusFilter === s ? 700 : 400,
              }}>
                {s === "all" ? "All" : STATUS_META[s].label}
              </button>
            ))}
          </div>

          {/* Search + type filter */}
          <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents…"
              style={{ flex: 1, minWidth: 200, padding: "9px 14px", border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, outline: "none" }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["all", ...DOC_TYPES.map(d => d.id)].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 12px", background: filter === f ? T.indigo : "#FAF7F2", border: `1px solid ${filter === f ? T.indigo : T.border}`, borderRadius: 8, color: filter === f ? "#fff" : T.ink3, fontSize: 12, fontWeight: filter === f ? 700 : 400, cursor: "pointer" }}>
                  {f === "all" ? "All types" : DOC_TYPE_META[f]?.label || f}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, background: "#FAFAF8", borderRadius: 16, border: `1.5px dashed ${T.border}` }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🗄️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.ink, marginBottom: 6 }}>{search || filter !== "all" || statusFilter !== "all" ? "No matching documents" : "Your vault is empty"}</div>
              <div style={{ fontSize: 13, color: T.ink3, marginBottom: 20 }}>Upload resumes, offer letters, certifications, and other career documents.</div>
              <button onClick={() => setShowUpload(true)} style={{ padding: "10px 20px", background: T.indigo, border: "none", borderRadius: 10, color: "#fff", fontWeight: 700, cursor: "pointer" }}>Upload First Document</button>
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {filtered.map(({ doc, status }) => (
              <DocCard key={doc.id} doc={doc} status={status} onOpen={setSelectedDoc} onDelete={handleDelete} onDownload={handleDownload} />
            ))}
          </div>
        </>
      )}

      {tab === "providers" && <ProvidersSection providers={providers} loading={providersLoading} />}
      {tab === "audit" && <AuditLogSection entries={auditEntries} loading={auditLoading} />}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUploaded={handleUploaded} />}
      {selected && (
        <DetailDrawer
          doc={selected.doc}
          status={selected.status}
          lastAttempt={attempts[selected.doc.id]}
          onClose={() => setSelectedDoc(null)}
          onDownload={handleDownload}
          onRequestVerification={handleRequestVerification}
          verifying={verifying}
        />
      )}
    </div>
  )
}
