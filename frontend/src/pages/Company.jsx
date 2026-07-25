/**
 * Company.jsx — Company Module (Career OS Workstream 5, scoped pass).
 *
 * Real, working page — not a stub. Owns its own LOCAL tab state (per the
 * now-enforced no-shared/global-tab-state rule; see WeeklyCareerCheck.jsx /
 * Skills.jsx for the same pattern). This scoped build ships one real tab
 * ("Overview"); the fuller sub-tab list from the design proposal (My Team,
 * Manager, Projects, etc.) is future work — not faked in as empty
 * placeholders here.
 *
 * Two real states:
 *   - Not linked: search-and-link flow (search box -> results -> "this is my
 *     employer") plus an honest "you're not linked yet" message. No fake
 *     dashboard, no placeholder numbers.
 *   - Linked: real company overview fetched from the backend, the raw
 *     company_link_state enum translated into a plain-language sentence
 *     (backend already computes this in company_link_state_sentence — this
 *     page never renders the raw enum value), and a visibility toggle wired
 *     to PATCH /api/pro/v1/company/me/visibility.
 *
 * Defense in depth: FLAGS.career_os_company gates both the nav item
 * (App.jsx) AND this page's own data-fetching — even if something reaches
 * this component while the flag is off, it renders an honest "not
 * available" message instead of firing requests the backend will 404 anyway.
 */
import { useEffect, useState, useCallback } from "react"
import { companyApi } from "../lib/api"
import { FLAGS } from "../config/featureFlags"
import { SectionErrorBoundary, T } from "../components/careeros/CareerOSUI.jsx"

function Spinner({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 160, color: T.mut, fontFamily: T.body, fontSize: 13 }}>
      <div style={{ width: 22, height: 22, border: `3px solid ${T.purple}22`, borderTopColor: T.purple, borderRadius: "50%", animation: "company-spin 0.8s linear infinite" }} />
      <style>{`@keyframes company-spin { to { transform: rotate(360deg) } }`}</style>
      {label || "Loading…"}
    </div>
  )
}

function Card({ children }) {
  return (
    <div style={{ background: T.surf, border: `1px solid ${T.bdr}`, borderRadius: 16, padding: "20px 22px" }}>
      {children}
    </div>
  )
}

// ── "None of these match" create form ─────────────────────────────────────
// Shown from LinkFlow when a search returns zero results, or the user
// explicitly says none of the results are their employer. Creates a new
// `companies` row and links the caller to it in one request. The backend
// re-checks for a normalized-name duplicate server-side (never trusts the
// client's "there's no match" judgment) — a 409 there means someone else's
// concurrent search/import beat this exact submission, and the UI offers to
// link to that existing row instead of a raw error.
function CreateCompanyForm({ prefillName, onLinked, onCancel }) {
  const [name, setName]       = useState(prefillName || "")
  const [domain, setDomain]   = useState("")
  const [sector, setSector]   = useState("")
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState("")
  const [suggestion, setSuggestion] = useState(null) // existing company returned by a 409
  const [linkingSuggestion, setLinkingSuggestion] = useState(false)

  async function handleCreate(e) {
    e.preventDefault()
    if (!name.trim()) { setError("Company name is required."); return }
    setSaving(true)
    setError("")
    setSuggestion(null)
    try {
      const res = await companyApi.create({ name: name.trim(), domain: domain.trim() || undefined, sector: sector.trim() || undefined })
      onLinked(res)
    } catch (e) {
      if (e.status === 409 && e.data?.company) {
        setSuggestion(e.data.company)
      } else {
        setError(e.message || "Couldn't create that company — try again.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function linkToSuggestion() {
    if (!suggestion) return
    setLinkingSuggestion(true)
    setError("")
    try {
      const res = await companyApi.link(suggestion.id)
      onLinked(res)
    } catch (e) {
      setError(e.message || "Couldn't link that company — try again.")
    } finally {
      setLinkingSuggestion(false)
    }
  }

  const inputStyle = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 10,
    border: `1px solid ${T.bdr}`, fontFamily: T.body, fontSize: 13, outline: "none",
  }

  if (suggestion) {
    return (
      <div style={{ marginTop: 14, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: "12px 14px", background: T.cell }}>
        <div style={{ fontSize: 13, fontFamily: T.body, color: T.ink, marginBottom: 10 }}>
          Did you mean <strong>{suggestion.name}</strong>? A company with that name already exists.
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={linkToSuggestion}
            disabled={linkingSuggestion}
            style={{
              border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontFamily: T.mono,
              fontWeight: 700, textTransform: "uppercase", cursor: linkingSuggestion ? "default" : "pointer",
              background: T.purple, color: "#fff", opacity: linkingSuggestion ? 0.6 : 1,
            }}
          >
            {linkingSuggestion ? "Linking…" : "Link to this instead"}
          </button>
          <button
            onClick={() => setSuggestion(null)}
            style={{
              border: `1px solid ${T.bdr}`, background: T.surf, cursor: "pointer", fontFamily: T.mono,
              fontWeight: 700, borderRadius: 8, padding: "6px 12px", fontSize: 11, textTransform: "uppercase", color: T.ink2,
            }}
          >
            No, that&apos;s not it
          </button>
        </div>
        {error && <div style={{ marginTop: 8, fontSize: 11, color: T.bad, fontFamily: T.body }}>{error}</div>}
      </div>
    )
  }

  return (
    <form onSubmit={handleCreate} style={{ marginTop: 14, border: `1px solid ${T.bdr}`, borderRadius: 10, padding: "14px" }}>
      <div style={{ fontSize: 12, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 0.5, color: T.mut, marginBottom: 10 }}>
        Add your company
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Company name (required)" style={inputStyle} />
        <input value={domain} onChange={e => setDomain(e.target.value)} placeholder="Domain (optional, e.g. acme.com)" style={inputStyle} />
        <input value={sector} onChange={e => setSector(e.target.value)} placeholder="Sector (optional)" style={inputStyle} />
      </div>

      {error && <div style={{ marginTop: 8, fontSize: 11, color: T.bad, fontFamily: T.body }}>{error}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 11, fontFamily: T.mono,
            fontWeight: 700, textTransform: "uppercase", cursor: saving ? "default" : "pointer",
            background: T.purple, color: "#fff", opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Creating…" : "Create & link"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            border: `1px solid ${T.bdr}`, background: T.surf, cursor: "pointer", fontFamily: T.mono,
            fontWeight: 700, borderRadius: 8, padding: "7px 14px", fontSize: 11, textTransform: "uppercase", color: T.ink2,
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Search-and-link flow (shown when the caller has no company_id yet) ────
function LinkFlow({ onLinked }) {
  const [query, setQuery]       = useState("")
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [linkingId, setLinkingId] = useState(null)
  const [error, setError]       = useState("")
  const [showCreate, setShowCreate] = useState(false)

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    setError("")
    try {
      const res = await companyApi.search(q.trim())
      setResults(res.companies || [])
    } catch (e) {
      setError(e.message || "Search failed")
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 300) // debounce
    return () => clearTimeout(timer)
  }, [query, runSearch])

  async function handleLink(company) {
    setLinkingId(company.id)
    setError("")
    try {
      const res = await companyApi.link(company.id)
      onLinked(res)
    } catch (e) {
      setError(e.message || "Couldn't link that company — try again.")
    } finally {
      setLinkingId(null)
    }
  }

  return (
    <Card>
      <div style={{ fontSize: 12, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 0.5, color: T.mut, marginBottom: 6 }}>
        Company
      </div>
      <div style={{ fontSize: 16, fontFamily: T.serif, fontWeight: 700, color: T.ink, marginBottom: 4 }}>
        You&apos;re not linked to a company yet
      </div>
      <div style={{ fontSize: 13, fontFamily: T.body, color: T.ink2, marginBottom: 18 }}>
        Search for your employer below and link yourself to it. This doesn&apos;t verify employment — that&apos;s a
        separate, future step — it just connects your profile to the company record.
      </div>

      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search for your company…"
        style={{
          width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10,
          border: `1px solid ${T.bdr}`, fontFamily: T.body, fontSize: 14, outline: "none",
        }}
      />

      {searching && <div style={{ marginTop: 12 }}><Spinner label="Searching…" /></div>}

      {!searching && error && (
        <div style={{ marginTop: 12, fontSize: 12, color: T.bad, fontFamily: T.body }}>{error}</div>
      )}

      {!searching && query.trim() && results.length === 0 && !error && !showCreate && (
        <div style={{ marginTop: 12, fontSize: 12, color: T.mut, fontFamily: T.body }}>
          No companies matched &ldquo;{query}&rdquo;.{" "}
          <button
            onClick={() => setShowCreate(true)}
            style={{ border: "none", background: "none", color: T.purple, fontFamily: T.body, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}
          >
            Add it as a new company
          </button>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {results.map(c => (
            <div key={c.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              border: `1px solid ${T.bdr}`, borderRadius: 10, padding: "10px 14px", background: T.cell,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {c.logo_url
                  ? <img src={c.logo_url} alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: "cover" }} />
                  : <div style={{ width: 24, height: 24, borderRadius: 6, background: T.bdr }} />}
                <span style={{ fontSize: 13, fontFamily: T.body, color: T.ink }}>{c.name}</span>
              </div>
              <button
                onClick={() => handleLink(c)}
                disabled={linkingId === c.id}
                style={{
                  border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, fontFamily: T.mono,
                  fontWeight: 700, textTransform: "uppercase", cursor: linkingId === c.id ? "default" : "pointer",
                  background: T.purple, color: "#fff", opacity: linkingId === c.id ? 0.6 : 1,
                }}
              >
                {linkingId === c.id ? "Linking…" : "This is my employer"}
              </button>
            </div>
          ))}
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                alignSelf: "flex-start", border: "none", background: "none", color: T.mut, fontFamily: T.body,
                fontSize: 12, cursor: "pointer", padding: "4px 0", textDecoration: "underline",
              }}
            >
              None of these match — this is a new company
            </button>
          )}
        </div>
      )}

      {showCreate && (
        <CreateCompanyForm
          prefillName={query.trim()}
          onLinked={onLinked}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </Card>
  )
}

// ── Visibility toggle ───────────────────────────────────────────────────
function VisibilityToggle({ value, onChange }) {
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState("")

  async function toggle() {
    const next = !value
    setSaving(true)
    setError("")
    try {
      const res = await companyApi.setVisibility(next)
      onChange(res.company_visibility_public)
    } catch (e) {
      setError(e.message || "Couldn't update visibility")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.bdr}` }}>
      <div>
        <div style={{ fontSize: 13, fontFamily: T.body, color: T.ink, fontWeight: 600 }}>Show my company publicly</div>
        <div style={{ fontSize: 12, fontFamily: T.body, color: T.mut, marginTop: 2 }}>
          Off by default. When off, employers and other members can&apos;t see which company you&apos;re linked to.
        </div>
        {error && <div style={{ fontSize: 11, color: T.bad, marginTop: 4 }}>{error}</div>}
      </div>
      <button
        onClick={toggle}
        disabled={saving}
        aria-pressed={value}
        style={{
          width: 44, height: 24, borderRadius: 999, border: "none", cursor: saving ? "default" : "pointer",
          background: value ? T.purple : T.bdr, position: "relative", flexShrink: 0, opacity: saving ? 0.6 : 1,
        }}
      >
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3,
          left: value ? 23 : 3, transition: "left 150ms ease",
        }} />
      </button>
    </div>
  )
}

// ── Overview (linked state) ────────────────────────────────────────────
function OverviewTab({ me, onVisibilityChange }) {
  const { company, company_link_state_sentence, company_visibility_public } = me
  return (
    <Card>
      <div style={{ fontSize: 12, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: 0.5, color: T.mut, marginBottom: 6 }}>
        Company
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        {company?.logo_url
          ? <img src={company.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
          : <div style={{ width: 40, height: 40, borderRadius: 10, background: T.bdr }} />}
        <div>
          <div style={{ fontSize: 18, fontFamily: T.serif, fontWeight: 700, color: T.ink }}>{company?.name || "Unknown company"}</div>
          {company?.domain && <div style={{ fontSize: 12, fontFamily: T.mono, color: T.mut }}>{company.domain}</div>}
        </div>
      </div>

      <div style={{ fontSize: 13, fontFamily: T.body, color: T.ink2, marginBottom: 14 }}>
        {company_link_state_sentence}
      </div>

      <div style={{ display: "flex", gap: 20, fontSize: 12, fontFamily: T.body, color: T.ink2 }}>
        <div>
          <div style={{ color: T.mut, marginBottom: 2 }}>Industry</div>
          <div>{company?.industry || "Not listed"}</div>
        </div>
        <div>
          <div style={{ color: T.mut, marginBottom: 2 }}>Size</div>
          <div>{company?.size_band || "Not listed"}</div>
        </div>
      </div>

      <VisibilityToggle value={company_visibility_public} onChange={onVisibilityChange} />
    </Card>
  )
}

const TABS = [{ id: "overview", label: "Overview" }]
// Future tabs (My Team, Manager, Projects, etc. — design proposal §…) are
// intentionally NOT listed here yet: this scoped build ships Overview real
// and working rather than faking additional tabs as empty placeholders.

export default function Company({ user }) {
  const [activeTab, setActiveTab] = useState("overview") // LOCAL state only — no shared/global tab state
  const [state, setState]   = useState(FLAGS.career_os_company ? "loading" : "flag_off") // loading | ready | error | flag_off
  const [me, setMe]         = useState(null)
  const [error, setError]   = useState("")

  const load = useCallback(async () => {
    if (!FLAGS.career_os_company) { setState("flag_off"); return }
    setState("loading")
    try {
      const res = await companyApi.me()
      setMe(res)
      setState("ready")
    } catch (e) {
      setError(e.message || "Couldn't load your company info")
      setState("error")
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (state === "flag_off") {
    // Defense in depth — App.jsx already hides the nav item behind this same
    // flag, so reaching this render path means something linked here
    // directly; still render an honest message, not a blank page.
    return (
      <div style={{ padding: 40, textAlign: "center", color: T.mut, fontFamily: T.body, fontSize: 13 }}>
        The Company module isn&apos;t available yet.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: `1px solid ${T.bdr}` }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              border: "none", background: "none", cursor: "pointer", padding: "10px 4px", marginRight: 18,
              fontFamily: T.mono, fontSize: 12, fontWeight: 700, textTransform: "uppercase",
              color: activeTab === tab.id ? T.ink : T.mut,
              borderBottom: activeTab === tab.id ? `2px solid ${T.purple}` : "2px solid transparent",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <SectionErrorBoundary name="company-overview">
        {state === "loading" && <Spinner label="Loading your company info…" />}
        {state === "error" && (
          <Card>
            <div style={{ fontSize: 13, color: T.bad, fontFamily: T.body, marginBottom: 10 }}>{error}</div>
            <button onClick={load} style={{
              border: `1px solid ${T.bdr}`, background: T.surf, cursor: "pointer", fontFamily: T.mono,
              fontWeight: 700, borderRadius: 10, padding: "7px 12px", fontSize: 10, textTransform: "uppercase", color: T.ink2,
            }}>Retry</button>
          </Card>
        )}
        {state === "ready" && activeTab === "overview" && (
          me?.company_id
            ? <OverviewTab me={me} onVisibilityChange={(v) => setMe(prev => ({ ...prev, company_visibility_public: v }))} />
            : <LinkFlow onLinked={load} />
        )}
      </SectionErrorBoundary>
    </div>
  )
}
