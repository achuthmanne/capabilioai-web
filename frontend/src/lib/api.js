/**
 * Capabilio API Client
 * Centralizes all API calls with auth token injection, error handling, and typed responses.
 */
import { supabase } from "./supabase"

const BASE = import.meta.env.VITE_API_URL || "https://capabilio-server.onrender.com"

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

async function request(method, path, body = null, opts = {}) {
  const token = await getToken()
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const config = { method, headers }
  if (body && method !== "GET") config.body = JSON.stringify(body)

  const url = path.startsWith("http") ? path : `${BASE}/api${path}`
  const res = await fetch(url, config)

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    const error = new Error(err.error || err.message || `Request failed: ${res.status}`)
    error.status = res.status
    error.data = err // full parsed error body (e.g. company/create's 409 { error, company }) for callers that need more than .message
    throw error
  }
  return res.json()
}

async function upload(path, formData) {
  const token = await getToken()
  const headers = {}
  if (token) headers["Authorization"] = `Bearer ${token}`
  const url = `${BASE}/api${path}`
  const res = await fetch(url, { method: "POST", headers, body: formData })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Upload failed: ${res.status}` }))
    throw new Error(err.error || `Upload failed: ${res.status}`)
  }
  return res.json()
}

// ══════════════════════════════════════════
// PROFESSIONAL PROFILE
// ══════════════════════════════════════════
export const profileApi = {
  get:         (uid) => request("GET", `/pro/profile/${uid}`),
  update:      (data) => request("POST", "/pro/profile", data),
  uploadPhoto: (file, type = "profile") => {
    const fd = new FormData(); fd.append("photo", file); fd.append("type", type)
    return upload("/pro/photo", fd)
  },
  setVisibility: (mode) => request("POST", "/pro/visibility", { mode }),
  recomputeElo:  ()     => request("POST", "/pro/elo/recompute"),
  generateSummary: () => request("POST", "/pro/profile/summary/generate"),
  saveSummary:     (summary) => request("POST", "/pro/profile/summary", { summary }),
}

// ══════════════════════════════════════════
// ORG / INSTITUTION OS — server-side writes to PC-7-protected profiles columns
// ══════════════════════════════════════════
export const orgApi = {
  verifyEmail: () => request("POST", "/org/verify-email"),

  // Self-serve student join links — share one link instead of inviting
  // hundreds of students one at a time via the "+ Invite" modal.
  createJoinLink: (opts = {}) => request("POST", "/org/join-links", opts),
  listJoinLinks:  ()          => request("GET",  "/org/join-links"),
  revokeJoinLink: (id)        => request("PATCH", `/org/join-links/${id}/revoke`),
  resolveJoinLink: (token)    => request("GET",  `/org/join/${token}`),
  claimJoinLink:  (token)     => request("POST", `/org/join/${token}`),

  // Talent Network <-> real company org account linkage + NDA workflow.
  inviteCompany:        (opts)  => request("POST", "/org/company-links", opts),
  listAllCompanyLinks:  ()      => request("GET",  "/org/company-links"),           // college's own full network, every status
  updateCompanyLink:    (id, opts) => request("PATCH", `/org/company-links/${id}`, opts),
  deleteCompanyLink:    (id)    => request("DELETE", `/org/company-links/${id}`),
  resendCompanyInvite:  (id)    => request("POST", `/org/company-links/${id}/resend`),
  listReceivedCompanyLinks: ()  => request("GET",  "/org/company-links/received"),
  getCompanyLinkStudents: (id)  => request("GET",  `/org/company-links/${id}/students`),
  // Token-based — works whether or not the company had a matched account at
  // invite time. Real consent always flows through these, never a college
  // self-activate shortcut.
  resolveCompanyInvite: (token) => request("GET",  `/org/company-invite/${token}`),
  acceptCompanyInvite:  (token) => request("POST", `/org/company-invite/${token}/accept`),
  declineCompanyInvite: (token) => request("POST", `/org/company-invite/${token}/decline`),
}

// ══════════════════════════════════════════
// EPFO VERIFICATION
// ══════════════════════════════════════════
export const epfoApi = {
  submit: (uan, employerList = []) => request("POST", "/pro/epfo/submit", { uan, employerList }),
  status: () => request("GET", "/pro/epfo/status"),
}

// ══════════════════════════════════════════
// CAREER TIMELINE
// ══════════════════════════════════════════
export const timelineApi = {
  list:          ()      => request("GET", "/pro/timeline"),
  create:        (data)  => request("POST", "/pro/timeline", data),
  update:        (id, d) => request("PUT", `/pro/timeline/${id}`, d),
  remove:        (id)    => request("DELETE", `/pro/timeline/${id}`),
  approveChange: (id)    => request("POST", `/pro/timeline/${id}/approve-change`),
  rejectChange:  (id)    => request("POST", `/pro/timeline/${id}/reject-change`),
}

// ══════════════════════════════════════════
// VAULT
// ══════════════════════════════════════════
export const vaultApi = {
  list:   (startupId) => request("GET", `/pro/vault${startupId ? `?startup_id=${startupId}` : ""}`),
  upload: (file, docType, tags = [], isPrivate = false, startupId = null, folder = null) => {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("doc_type", docType)
    fd.append("tags", JSON.stringify(tags))
    fd.append("is_private", String(isPrivate))
    if (startupId) fd.append("startup_id", startupId)
    if (folder) fd.append("folder", folder)
    return upload("/pro/vault/upload", fd)
  },
  getUrl:  (id) => request("GET", `/pro/vault/${id}/url`),
  remove:  (id) => request("DELETE", `/pro/vault/${id}`),
}

// ══════════════════════════════════════════
// SKILL GRAPH
// ══════════════════════════════════════════
export const skillsApi = {
  list:          () => request("GET", "/pro/skills"),
  add:           (data) => request("POST", "/pro/skills", data),
  bulkUpsert:    (skills, source = "resume") => request("POST", "/pro/skills/bulk", { skills, source }),
  update:        (id, data) => request("PUT", `/pro/skills/${id}`, data),
  remove:        (id) => request("DELETE", `/pro/skills/${id}`),
  submitProof:   (id, data) => request("POST", `/pro/skills/${id}/proof`, data),
  getGaps:       (targetRole) => request("GET", `/pro/skills/gaps${targetRole ? `?target_role=${encodeURIComponent(targetRole)}` : ""}`),
  enrichIcons:   () => request("POST", "/pro/skills/enrich-icons"),
}

// ══════════════════════════════════════════
// WEEKLY CAREER CHECK ("Weekly Refresh Engine")
// UI must never call this "assessment" — see weeklyPulse.js header.
// ══════════════════════════════════════════
export const weeklyCheckApi = {
  current:    ()               => request("GET", "/pro/weekly/current"),
  generate:   ()               => request("POST", "/pro/weekly/generate"),
  answer:     (pulseId, data)  => request("POST", `/pro/weekly/${pulseId}/answer`, data),
  complete:   (pulseId)        => request("POST", `/pro/weekly/${pulseId}/complete`),
  // Career OS Workstream 3 — coverage-gated v2 (15-question bank flow).
  // Always safe to call: server-side decides v1 vs v2 and falls back
  // automatically when coverage is insufficient — status() never writes.
  v2Status:   ()               => request("GET", "/pro/weekly/v2/status"),
  v2Generate: ()               => request("POST", "/pro/weekly/v2/generate"),
  v2DecayStates: ()            => request("GET", "/pro/weekly/v2/decay-states"),
  // Timer + anti-cheat (2026-07-26) — real, backend-persisted signals.
  flagSuspicious: (pulseId, type) => request("POST", `/pro/weekly/${pulseId}/flag-suspicious`, { type }),
  timeout:        (pulseId, questionId) => request("POST", `/pro/weekly/${pulseId}/timeout`, { question_id: questionId }),
  history:        (limit = 20) => request("GET", `/pro/weekly/history?limit=${limit}`),
}

// ══════════════════════════════════════════
// QUESTION BANK ADMIN (Career OS Tranche 4 — internal-only review UI)
// Every route requires requireAuth + requireAdmin server-side
// (backend/server/routes/questionBankAdmin.js) — this client has no
// separate admin check of its own; a non-admin calling any of these just
// gets a 403/401 from the API, same defense-in-depth pattern used
// throughout this codebase (real gate is always server-side).
// ══════════════════════════════════════════
export const questionBankAdminApi = {
  list:            (params = {}) => request("GET", `/admin/question-bank${toQuery(params)}`),
  coverage:        () => request("GET", "/admin/question-bank/coverage"),
  get:             (id) => request("GET", `/admin/question-bank/${id}`),
  submitForReview: (id) => request("POST", `/admin/question-bank/${id}/submit-for-review`),
  bulkSubmitForReview: (payload) => request("POST", `/admin/question-bank/bulk-submit-for-review`, payload),
  approve:         (id) => request("POST", `/admin/question-bank/${id}/approve`),
  reject:          (id, reason) => request("POST", `/admin/question-bank/${id}/reject`, { reason }),
}

// ══════════════════════════════════════════
// OPS DASHBOARD (Career OS Tranche 11 / Tranche D — /api/admin/ops/*)
// ══════════════════════════════════════════
export const opsDashboardApi = {
  get: () => request("GET", "/admin/ops/dashboard"),
}

function toQuery(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  if (!entries.length) return ""
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
}

// ══════════════════════════════════════════
// HOME (Career OS Workstream 1 — /pro/v1/home/*)
// ══════════════════════════════════════════
export const homeApi = {
  getPriority: () => request("GET", "/pro/v1/home/priority"),
}

// ══════════════════════════════════════════
// CAREER EVENTS — unified timeline (Career OS Workstream 2 — /pro/v1/career/*)
// The only endpoint Career Timeline / Career Replay may read from — never
// combine profiles/experiences/career_timeline directly in the frontend.
// ══════════════════════════════════════════
export const careerEventsApi = {
  getTimeline: ({ cursor, limit, eventType, visibility } = {}) => {
    const params = new URLSearchParams()
    if (cursor) params.set("cursor", cursor)
    if (limit) params.set("limit", String(limit))
    if (eventType) params.set("event_type", eventType)
    if (visibility) params.set("visibility", visibility)
    const qs = params.toString()
    return request("GET", `/pro/v1/career/timeline${qs ? `?${qs}` : ""}`)
  },
}

// ══════════════════════════════════════════
// FORGE
// ══════════════════════════════════════════
export const forgeApi = {
  init:           (tracks) => request("POST", "/pro/forge/init", { tracks }),
  list:           (track)  => request("GET", `/pro/forge${track ? `?track=${track}` : ""}`),
  update:         (id, data) => request("PUT", `/pro/forge/${id}`, data),
  submit:         (id, data) => request("POST", `/pro/forge/${id}/submit`, data),
  evaluate:       (id, submission_id) => request("POST", `/pro/forge/${id}/evaluate`, { submission_id }),
  getSubmissions: (id) => request("GET", `/pro/forge/${id}/submissions`),
}

// ══════════════════════════════════════════
// AI INTERVIEW
// ══════════════════════════════════════════
export const interviewApi = {
  start:    (data) => request("POST", "/pro/interview/start", data),
  getSession: (id) => request("GET", `/pro/interview/${id}`),
  answer:   (id, data) => request("POST", `/pro/interview/${id}/answer`, data),
  complete: (id)  => request("POST", `/pro/interview/${id}/complete`),
  history:  () => request("GET", "/pro/interview/history"),
}

// ══════════════════════════════════════════
// JOBS & APPLICATIONS
// ══════════════════════════════════════════
export const jobsApi = {
  list:         (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/jobs/list${qs ? `?${qs}` : ""}`)
  },
  getJob:       (id) => request("GET", `/jobs/${id}`),
  create:       (data) => request("POST", "/jobs", data),
  apply:        (jobId) => request("POST", `/jobs/${jobId}/apply`),
  applications: () => request("GET", "/jobs/applications"),
  saveJob:      (jobId, action = "save") => request("POST", "/jobs/save", { job_id: jobId, action }),
  savedJobs:    () => request("GET", "/jobs/saved"),
}

// ══════════════════════════════════════════
// RECRUITER COMMS
// ══════════════════════════════════════════
export const recruiterApi = {
  messages:       (box = "inbox") => request("GET", `/recruiter/messages?box=${box}`),
  sendMessage:    (data) => request("POST", "/recruiter/messages", data),
  scheduleInterview: (data) => request("POST", "/recruiter/schedule", data),
  schedules:      () => request("GET", "/recruiter/schedules"),
  updateSchedule: (id, data) => request("PUT", `/recruiter/schedule/${id}`, data),
}

export const offersApi = {
  send:    (data) => request("POST", "/offers", data),
  list:    (asRecruiter) => request("GET", `/offers${asRecruiter ? "?as=recruiter" : ""}`),
  respond: (id, response) => request("PUT", `/offers/${id}/respond`, { response }),
}

// ══════════════════════════════════════════
// MENTOR HUB
// ══════════════════════════════════════════
export const mentorApi = {
  listMentors:    (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/mentors${qs ? `?${qs}` : ""}`)
  },
  getMentor:      (id) => request("GET", `/mentors/${id}`),
  updateProfile:  (data) => request("POST", "/mentors/profile", data),
  createBooking:  (data) => request("POST", "/mentors/bookings", data),
  myBookings:     (asMentor) => request("GET", `/mentors/bookings/mine${asMentor ? "?as=mentor" : ""}`),
  updateBooking:  (id, data) => request("PUT", `/mentors/bookings/${id}`, data),
  payouts:        () => request("GET", "/mentors/payouts"),
  requestPayout:  () => request("POST", "/mentors/payouts/request"),
}

// ══════════════════════════════════════════
// PULSE (SOCIAL FEED)
// ══════════════════════════════════════════
export const pulseApi = {
  feed:          (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/pulse/feed${qs ? `?${qs}` : ""}`)
  },
  createPost:    (data) => request("POST", "/pulse/posts", data),
  updatePost:    (id, data) => request("PUT", `/pulse/posts/${id}`, data),
  deletePost:    (id) => request("DELETE", `/pulse/posts/${id}`),
  interact:      (postId, action) => request("POST", `/pulse/posts/${postId}/interact`, { action }),
  comments:      (postId) => request("GET", `/pulse/posts/${postId}/comments`),
  addComment:    (postId, content, parentId) => request("POST", `/pulse/posts/${postId}/comments`, { content, parent_id: parentId }),
  // New routes
  builders:      (domain = "", elo = 400, limit = 8) => {
    const qs = new URLSearchParams({ domain, elo, limit }).toString()
    return request("GET", `/pulse/builders?${qs}`)
  },
  mentors:       (domain = "", limit = 5) => {
    const qs = new URLSearchParams({ domain, limit }).toString()
    return request("GET", `/pulse/mentors?${qs}`)
  },
  followingFeed: (page = 1, sort = "created_at") => {
    const qs = new URLSearchParams({ page, limit: 15, sort }).toString()
    return request("GET", `/pulse/following-feed?${qs}`)
  },
  saved:         (page = 1) => {
    const qs = new URLSearchParams({ page, limit: 15 }).toString()
    return request("GET", `/pulse/saved?${qs}`)
  },
  // AI market insights + tech news via Gemini Search (server-cached 2hr per domain)
  marketInsights: (domain = "Tech", role = "Professional", skills = []) => {
    const params = { domain, role }
    if (skills?.length) params.skills = skills.slice(0, 8).join(",")
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/pulse/market-insights?${qs}`)
  },
  // Real tech-tag frequency from recent posts — replaces hardcoded hashtags.
  trendingTags: (limit = 8) => request("GET", `/pulse/trending-tags?limit=${limit}`),
  // Proof Posts — the current user's real, shareable achievements
  // (proof_objects / Professional ELO events / verified skills). Feeds the
  // "Share Proof" picker; every fact is re-verified server-side on create.
  proofCandidates: () => request("GET", "/pulse/proof-candidates"),
}

// ══════════════════════════════════════════
// NEXUS (NETWORK)
// ══════════════════════════════════════════
export const nexusApi = {
  search:      (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/nexus/search${qs ? `?${qs}` : ""}`)
  },
  getProfile:   (uid) => request("GET", `/nexus/profile/${uid}`),
  connect:      (uid, message) => request("POST", "/nexus/connect", { addressee_id: uid, message }),
  respond:      (id, status) => request("PUT", `/nexus/connect/${id}`, { status }),
  follow:       (uid) => request("POST", "/nexus/follow", { following_id: uid }),
  unfollow:     (uid) => request("DELETE", `/nexus/follow/${uid}`),
  connections:  () => request("GET", "/nexus/connections"),
  notifications: () => request("GET", "/nexus/notifications"),
  markRead:     (ids) => request("POST", "/nexus/notifications/read", { ids }),
}

// ══════════════════════════════════════════
// EXECUTIVE PATH — warm introduction requests (real, 2026-07-26)
// Distinct from nexusApi.connect() (generic connection ask): every intro
// request carries an explicit reason + message, replacing the previously
// unbuilt ExecutiveNetwork.jsx "Introductions" tab.
// ══════════════════════════════════════════
export const execIntroApi = {
  request:  (targetId, reason, message) => request("POST", "/exec/intro-requests", { target_id: targetId, reason, message }),
  list:     (direction = "incoming") => request("GET", `/exec/intro-requests?direction=${direction}`),
  respond:  (id, status) => request("PATCH", `/exec/intro-requests/${id}`, { status }),
}

// ══════════════════════════════════════════
// ORBIT PLANS
// ══════════════════════════════════════════
export const orbitApi = {
  plans:           () => request("GET", "/orbit/plans"),
  createOrder:     (plan_id, billing_cycle, coupon_code) => request("POST", "/orbit/order", { plan_id, billing_cycle, coupon_code }),
  verifyPayment:   (data) => request("POST", "/orbit/verify", data),
  status:          () => request("GET", "/orbit/status"),
  validateCoupon:  (code, plan_id) => request("POST", "/orbit/coupon/validate", { code, plan_id }),
}

// ══════════════════════════════════════════
// CAREER INTELLIGENCE
// ══════════════════════════════════════════
export const intelApi = {
  generateReport: (report_type) => request("POST", "/intel/report", { report_type }),
  listReports:    () => request("GET", "/intel/reports"),
  getReport:      (id) => request("GET", `/intel/reports/${id}`),
}

// ══════════════════════════════════════════
// HARDWARE CHALLENGES (ECE / IoT / Mech / Civil)
// ══════════════════════════════════════════
export const hardwareApi = {
  list:       (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request("GET", `/hardware/challenges${qs ? `?${qs}` : ""}`)
  },
  get:        (id) => request("GET", `/hardware/challenges/${id}`),
  attempt:    (id, answer) => request("POST", `/hardware/challenges/${id}/attempt`, { answer }),
  myAttempts: () => request("GET", "/hardware/my-attempts"),
  like:       (id) => request("POST", `/hardware/challenges/${id}/like`),
}

// ══════════════════════════════════════════
// RESUME PARSING (existing)
// ══════════════════════════════════════════
export const resumeApi = {
  parsePdf: (file) => {
    const fd = new FormData(); fd.append("resume", file)
    return upload("/extract-pdf", fd)
  },
  parseLinkedin: (url) => request("POST", "/extract-linkedin", { url }),
}

// ══════════════════════════════════════════
// COMPANY MODULE — Career OS Workstream 5 (scoped pass)
// Backend-gated by COMPANY_MODULE_V1_ENABLED (404 while off); frontend also
// gates whether these are ever called via FLAGS.career_os_company — see
// frontend/src/pages/Company.jsx.
// ══════════════════════════════════════════
function newIdempotencyKey() {
  // crypto.randomUUID is available in all evergreen browsers this app
  // targets; no extra dependency needed for a client-generated request id.
  return (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)
}

export const companyApi = {
  search:       (q) => request("GET", `/pro/v1/company/search?q=${encodeURIComponent(q || "")}`),
  me:           () => request("GET", "/pro/v1/company/me"),
  get:          (id) => request("GET", `/pro/v1/company/${id}`),
  link:         (companyId) => request("POST", "/pro/v1/company/me/link", { company_id: companyId }, { headers: { "Idempotency-Key": newIdempotencyKey() } }),
  create:       ({ name, domain, sector } = {}) => request("POST", "/pro/v1/company/create", { name, domain, sector }, { headers: { "Idempotency-Key": newIdempotencyKey() } }),
  setVisibility: (companyVisibilityPublic) => request("PATCH", "/pro/v1/company/me/visibility", { company_visibility_public: companyVisibilityPublic }),
}

// CAREER OS TRANCHE 6 / PRIORITY 6A: narrow, field-whitelisted portfolio
// lookup — replaces Portfolio.jsx's old direct client-side
// supabase.from("profiles").select("*") reads (see portfolioPublic.js for
// why: select("*") on a public/verified profile leaked email + uan_number).
export const portfolioApi = {
  lookup: (identifier) => request("GET", `/portfolio/lookup/${encodeURIComponent(identifier)}`),
}

// Professional ELO (product decision 2026-07-25) — real assessment-
// performance-driven rating track, separate from profile-completeness ELO.
export const professionalEloApi = {
  status: () => request("GET", "/pro/elo/professional"),
}

// Skill Rating v2 (2026-07-26) — verification-gated certification bonus.
export const certificationsApi = {
  list: () => request("GET", "/pro/certifications"),
  claim: (cert_name, cert_type, issuer) => request("POST", "/pro/certifications", { cert_name, cert_type, issuer }),
  upload: (id, file) => {
    const fd = new FormData(); fd.append("file", file)
    return upload(`/pro/certifications/${id}/upload`, fd)
  },
}
