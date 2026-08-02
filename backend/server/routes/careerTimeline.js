/**
 * Career Timeline + Vault Routes
 *
 * Timeline:
 *   GET    /api/pro/timeline          — list all entries for auth user
 *   POST   /api/pro/timeline          — create entry
 *   PUT    /api/pro/timeline/:id      — update entry
 *   DELETE /api/pro/timeline/:id      — delete entry
 *   POST   /api/pro/timeline/:id/approve-change — approve pending field change
 *   POST   /api/pro/timeline/:id/reject-change  — reject pending field change
 *
 * Vault:
 *   GET    /api/pro/vault             — list vault documents
 *   POST   /api/pro/vault/upload      — upload document
 *   DELETE /api/pro/vault/:id         — delete document
 *   GET    /api/pro/vault/:id/url     — get signed download URL
 */
import { Router } from "express"
import multer      from "multer"
import { supabaseAdmin } from "../lib/supabase.js"
import { requireAuth } from "../lib/auth.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })


// ══════════════════════════════════════════
// CAREER TIMELINE
// ══════════════════════════════════════════

router.get("/pro/timeline", requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("career_timeline")
      .select("*")
      .eq("user_id", req.user.id)
      .order("start_date", { ascending: false })
    if (error) throw error
    res.json(data || [])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pro/timeline", requireAuth, async (req, res) => {
  try {
    const uid  = req.user.id
    const body = req.body
    if (!body.company || !body.role_title || !body.start_date)
      return res.status(400).json({ error: "company, role_title, start_date required" })

    const { data, error } = await supabaseAdmin
      .from("career_timeline")
      .insert({
        user_id:            uid,
        company:            body.company,
        company_logo:       body.company_logo || null,
        company_desc:       body.company_desc || null,
        role_title:         body.role_title,
        job_type:           body.job_type || "full-time",
        location:           body.location || null,
        work_mode:          body.work_mode || "office",
        start_date:         body.start_date,
        end_date:           body.end_date || null,
        is_current:         body.is_current || false,
        description:        body.description || null,
        achievements:       body.achievements || [],
        technologies:       body.technologies || [],
        skills_used:        body.skills_used || [],
        projects:           body.projects || [],
        verification_state: "unverified",
        source_tags:        body.source_tags || ["user_edit"],
        jd_summary:         body.jd_summary || null,
      })
      .select()
      .single()
    if (error) throw error

    // Update current_company / current_role on profiles if is_current
    if (body.is_current) {
      await supabaseAdmin.from("profiles").update({
        current_company:    body.company,
        current_role_title: body.role_title,
      }).eq("id", uid)
    }

    res.json({ success: true, entry: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put("/pro/timeline/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const uid     = req.user.id

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("career_timeline").select("user_id").eq("id", id).single()
    if (!existing || existing.user_id !== uid)
      return res.status(403).json({ error: "Forbidden" })

    const body = req.body
    // Store pending changes if verification would be affected
    const sensitiveFields = ["start_date","end_date","company","role_title"]
    const hasSensitiveChange = sensitiveFields.some(f => body[f] !== undefined)

    let updatePayload = { ...body, updated_at: new Date().toISOString() }

    if (hasSensitiveChange && existing.verification_state !== "unverified") {
      // Don't directly update — store as pending change for approval
      const pending = {}
      sensitiveFields.forEach(f => { if (body[f] !== undefined) pending[f] = body[f] })
      updatePayload = {
        pending_changes: pending,
        updated_at: new Date().toISOString(),
      }
    }

    const { data, error } = await supabaseAdmin
      .from("career_timeline").update(updatePayload).eq("id", id).select().single()
    if (error) throw error
    res.json({ success: true, entry: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete("/pro/timeline/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { data: existing } = await supabaseAdmin
      .from("career_timeline").select("user_id").eq("id", id).single()
    if (!existing || existing.user_id !== req.user.id)
      return res.status(403).json({ error: "Forbidden" })
    await supabaseAdmin.from("career_timeline").delete().eq("id", id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pro/timeline/:id/approve-change", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { data: entry } = await supabaseAdmin
      .from("career_timeline").select("*").eq("id", id).single()
    if (!entry || entry.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })
    const pending = entry.pending_changes || {}
    if (!Object.keys(pending).length) return res.json({ success: true, message: "No pending changes" })

    // Push current state to version history
    const history = entry.version_history || []
    history.push({ snapshot: { ...entry, pending_changes: {}, version_history: [] }, saved_at: new Date().toISOString() })

    const { data, error } = await supabaseAdmin.from("career_timeline").update({
      ...pending,
      pending_changes: {},
      version_history: history.slice(-10),
      updated_at: new Date().toISOString(),
    }).eq("id", id).select().single()
    if (error) throw error
    res.json({ success: true, entry: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pro/timeline/:id/reject-change", requireAuth, async (req, res) => {
  try {
    const { id } = req.params
    const { data: entry } = await supabaseAdmin
      .from("career_timeline").select("user_id").eq("id", id).single()
    if (!entry || entry.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })
    await supabaseAdmin.from("career_timeline").update({ pending_changes: {} }).eq("id", id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ══════════════════════════════════════════
// VAULT
// ══════════════════════════════════════════

const VAULT_BUCKET = "vault-documents"

router.get("/pro/vault", requireAuth, async (req, res) => {
  try {
    let q = supabaseAdmin
      .from("vault_documents")
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
    // Optional Startup Workspace scoping — additive, existing personal-vault
    // callers that don't pass startup_id keep seeing all their own documents.
    if (req.query.startup_id) q = q.eq("startup_id", req.query.startup_id)
    const { data, error } = await q
    if (error) throw error

    // Trust & Verification Center, Phase 2 Step 2 (2026-08-02) — enrich with
    // the linked proof_object's trust_level so the Vault UI can show a real
    // "Verified" badge instead of a heuristic. One batched query, not N+1.
    const docs = data || []
    const proofIds = [...new Set(docs.map(d => d.proof_object_id).filter(Boolean))]
    let trustById = {}
    if (proofIds.length) {
      const { data: proofs } = await supabaseAdmin
        .from("proof_objects").select("id, trust_level").in("id", proofIds)
      trustById = Object.fromEntries((proofs || []).map(p => [p.id, p.trust_level]))
    }
    res.json(docs.map(d => ({ ...d, trust_level: d.proof_object_id ? (trustById[d.proof_object_id] || null) : null })))
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post("/pro/vault/upload", requireAuth, upload.single("file"), async (req, res) => {
  try {
    const uid  = req.user.id
    const file = req.file
    if (!file) return res.status(400).json({ error: "No file" })

    const docType  = req.body.doc_type || "other"
    const tags     = req.body.tags ? JSON.parse(req.body.tags) : []
    const isPrivate = req.body.is_private === "true"
    // Optional Startup Workspace scoping — additive; existing personal-vault
    // callers that don't send these fields are unaffected (both columns
    // nullable, per the startup_workspace_sprint3 migration).
    const startupId = req.body.startup_id || null
    const folder     = req.body.folder || null
    const ext      = file.originalname.split(".").pop() || "bin"
    const path     = `${uid}/${docType}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`

    const { error: uploadErr } = await supabaseAdmin.storage
      .from(VAULT_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false })
    if (uploadErr) throw uploadErr

    const { data, error } = await supabaseAdmin
      .from("vault_documents")
      .insert({
        user_id:      uid,
        doc_type:     docType,
        file_name:    file.originalname,
        storage_path: path,
        file_size:    file.size,
        mime_type:    file.mimetype,
        tags,
        is_private:   isPrivate,
        startup_id:   startupId,
        folder,
        activity_log: [{ action: "uploaded", at: new Date().toISOString() }],
      })
      .select()
      .single()
    if (error) throw error

    res.json({ success: true, document: data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get("/pro/vault/:id/url", requireAuth, async (req, res) => {
  try {
    const { data: doc } = await supabaseAdmin
      .from("vault_documents").select("*").eq("id", req.params.id).single()
    if (!doc || doc.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })

    const { data, error } = await supabaseAdmin.storage
      .from(VAULT_BUCKET)
      .createSignedUrl(doc.storage_path, 3600) // 1 hour
    if (error) throw error

    // Log access
    const log = doc.activity_log || []
    log.push({ action: "downloaded", at: new Date().toISOString() })
    await supabaseAdmin.from("vault_documents")
      .update({ activity_log: log.slice(-50) }).eq("id", doc.id)

    res.json({ url: data.signedUrl, expires_in: 3600 })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete("/pro/vault/:id", requireAuth, async (req, res) => {
  try {
    const { data: doc } = await supabaseAdmin
      .from("vault_documents").select("*").eq("id", req.params.id).single()
    if (!doc || doc.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" })

    // Delete from storage
    await supabaseAdmin.storage.from(VAULT_BUCKET).remove([doc.storage_path])
    await supabaseAdmin.from("vault_documents").delete().eq("id", req.params.id)
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

export default router
