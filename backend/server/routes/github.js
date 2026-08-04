// Routes: POST /api/github/analyze, GET /api/github/verification-code,
// POST /api/github/verify-ownership
//
// Code DNA (Aura.jsx, activeTab==="fingerprint") — Phase 1.
//
// AI output here is a best-effort profile summary from public GitHub data —
// NOT an ownership/authenticity verification on its own. A separate, real
// per-repo ownership-verification pipeline already exists at
// backend/server/lib/verification/providers/github.js (repo-level, writes to
// proof_objects/trust_level with a hash-chained audit log). This file adds a
// lighter, profile-level verification suited to Code DNA: the user proves
// they control the GitHub account by temporarily adding a deterministic code
// to their public bio (the same pattern used by many "verify your domain/
// profile" flows) — no OAuth app registration required. Until that check
// passes, every score/summary here is presented as "(unverified)" — never
// as a fact.
import { Router } from "express"
import crypto from "crypto"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { requireAuth } from "../lib/auth.js"
import * as codeDnaRepo from "../lib/codeDna/repository.js"

const router = Router()
router.use(requireAuth)

// Same defensive JSON-extraction approach used by lib/claude.js (strip a
// ```json fence or grab the first {...} block) rather than groq.js callers'
// usual bare try/catch — an LLM occasionally wraps JSON in prose or a fence
// even when asked not to, and a bare JSON.parse would fail the whole request.
function extractJson(raw) {
  if (!raw) return {}
  const fenced = raw.match(/```json\s*([\s\S]*?)```/) || raw.match(/```\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : (raw.match(/(\{[\s\S]*\})/) || [])[1] || raw
  try { return JSON.parse(candidate) } catch { return {} }
}

function ghHeaders() {
  return { Accept:"application/vnd.github.v3+json", ...(process.env.GITHUB_TOKEN?{Authorization:`token ${process.env.GITHUB_TOKEN}`}:{}) }
}

function parseUsername(githubUrl="") {
  return githubUrl.replace(/.*github\.com\//, "").replace(/\/.*/, "").trim()
}

// Real, filename-presence-only technology detection — one root directory
// listing per repo, no file-content fetches. Deliberately conservative: only
// flags a technology when the file that conventionally proves it actually
// exists in that exact repo.
const TECH_SIGNALS = [
  { file: "package.json",        tag: "Node.js" },
  { file: "requirements.txt",    tag: "Python" },
  { file: "pyproject.toml",      tag: "Python" },
  { file: "Dockerfile",          tag: "Docker" },
  { file: "docker-compose.yml",  tag: "Docker Compose" },
  { file: "go.mod",              tag: "Go" },
  { file: "Cargo.toml",          tag: "Rust" },
  { file: "pom.xml",             tag: "Java (Maven)" },
  { file: "build.gradle",        tag: "Java/Kotlin (Gradle)" },
  { file: "Gemfile",             tag: "Ruby" },
  { file: "composer.json",       tag: "PHP" },
  { file: "tsconfig.json",       tag: "TypeScript" },
  { file: ".github",             tag: "CI/CD (GitHub Actions)" },
]

const README_NAMES = new Set(["readme.md","readme","readme.rst","readme.txt"])

// Returns { techStack, hasReadme, skipped } from ONE root-listing call —
// README detection piggybacks on the same response already fetched for tech
// detection, so it costs nothing extra. hasReadme is a real presence check,
// not a quality judgement (we don't fetch/score README content).
//
// BUG FIX (2026-08-04, real-world test): this used to silently return empty
// results on ANY failure, including a 403 rate-limit — which looks
// identical in the UI to "genuinely nothing detected" even when the repo
// clearly has a .github/workflows folder and a README. `skipped:true` lets
// the UI say "detection skipped — try again shortly" instead of implying
// the repo has no CI/README/stack when we simply couldn't check.
async function inspectRepoRoot(fullName) {
  if (!fullName) return { techStack: [], hasReadme: false, skipped: false }
  try {
    const r = await fetch(`https://api.github.com/repos/${fullName}/contents`, { headers: ghHeaders() })
    if (r.status === 403 || r.status === 429) return { techStack: [], hasReadme: false, skipped: true }
    if (!r.ok) return { techStack: [], hasReadme: false, skipped: false }
    const items = await r.json()
    if (!Array.isArray(items)) return { techStack: [], hasReadme: false, skipped: false }
    const names = new Set(items.map(i => i.name))
    const lowerNames = new Set(items.map(i => (i.name||"").toLowerCase()))
    return {
      techStack: TECH_SIGNALS.filter(sig => names.has(sig.file)).map(sig => sig.tag),
      hasReadme: [...lowerNames].some(n => README_NAMES.has(n)),
      skipped: false,
    }
  } catch { return { techStack: [], hasReadme: false, skipped: false } }
}

// BUG FIX (2026-08-04, real-world test): total commit count used to be a
// crude repo-count-scaled guess (public_repos*18 + stars*0.4) — for an
// account with one large, long-lived repo (303 real commits) that formula
// returned 18, off by 17x. GitHub's REST API doesn't return a total commit
// count directly, but there's a well-known real technique: request 1 commit
// per page and read the `Link` response header's `rel="last"` page number —
// that page number IS the total commit count. One extra call per repo,
// exact (not estimated), bounded to the same top-3 repos already being
// inspected above so it doesn't add a new cost category.
async function getRepoCommitCount(fullName) {
  if (!fullName) return null
  try {
    const r = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=1`, { headers: ghHeaders() })
    if (!r.ok) return null
    const link = r.headers.get("link") || ""
    const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/)
    if (match) return Number(match[1])
    // No Link header at all means there's only one page — i.e. exactly the
    // commits actually returned (0 or 1), not "unknown".
    const body = await r.json().catch(() => [])
    return Array.isArray(body) ? body.length : null
  } catch { return null }
}

// BUG FIX (2026-08-04, real-world test): language breakdown used to count
// ONE vote per repo for that repo's single GitHub-guessed "primary
// language" field — with one repo, that always collapses to 100% of
// whatever GitHub picked, ignoring the real byte-weighted mix GitHub's own
// repo page shows (e.g. a JS-primary repo can genuinely be 91% JS / 4%
// PLpgSQL / 2% TypeScript / 2% HTML by bytes). Real fix: fetch the actual
// per-repo language byte counts via /languages and aggregate real bytes,
// bounded to the same top-3 repos already being inspected.
async function getRepoLanguageBytes(fullName) {
  if (!fullName) return {}
  try {
    const r = await fetch(`https://api.github.com/repos/${fullName}/languages`, { headers: ghHeaders() })
    if (!r.ok) return {}
    const data = await r.json()
    return (data && typeof data === "object") ? data : {}
  } catch { return {} }
}

// Deterministic per-user code — no separate table/column needed to store it,
// it's re-derivable from userId at any time. Short enough to comfortably fit
// a GitHub bio (160 char limit) alongside other bio text.
function verificationCodeFor(userId) {
  return "capabilio-verify-" + crypto.createHash("sha256").update(String(userId)).digest("hex").slice(0, 10)
}

router.get("/verification-code", (req, res) => {
  res.json({ code: verificationCodeFor(req.user.id) })
})

router.post("/verify-ownership", async (req, res) => {
  const { githubUrl="" } = req.body
  const username = parseUsername(githubUrl)
  if (!username) return res.status(400).json({ error: "Invalid GitHub URL" })
  try {
    const ur = await fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders() })
    if (ur.status === 404) return res.status(404).json({ error: "GitHub user not found" })
    if (!ur.ok) return res.status(ur.status === 403 ? 429 : 502).json({ error: "GitHub API error" })
    const user = await ur.json()
    const code = verificationCodeFor(req.user.id)
    const verified = !!(user.bio && user.bio.includes(code))
    if (!verified) {
      return res.json({ verified: false, code, message: `Add "${code}" to your GitHub bio, save, then try again. You can remove it afterwards.` })
    }
    const row = await codeDnaRepo.markVerified(req.user.id)
    if (!row) return res.status(400).json({ error: "Analyze this profile at least once before verifying ownership." })
    return res.json({ verified: true })
  } catch (e) { console.error("[github/verify-ownership]", e.message); res.status(500).json({ error: e.message }) }
})

router.post("/analyze", async (req, res) => {
  const { githubUrl="", keyword="Developer" } = req.body
  const username = parseUsername(githubUrl)
  if (!username) return res.status(400).json({ error: "Invalid GitHub URL" })
  try {
    const [ur, rr] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers: ghHeaders() }),
      fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=30`, { headers: ghHeaders() }),
    ])
    if (ur.status === 404) return res.status(404).json({ error: "GitHub user not found" })
    if (!ur.ok) return res.status(ur.status === 403 ? 429 : 502).json({ error: ur.status === 403 ? "GitHub API rate limit reached — try again shortly" : "GitHub API error" })
    const user  = await ur.json()
    const repos = rr.ok ? await rr.json() : []

    // Coarse fallback (one vote per repo for GitHub's single "primary
    // language" guess) — used only for repos OUTSIDE the top 3 that get a
    // real byte-weighted breakdown below, so larger accounts still get some
    // signal from their long tail without an API call per repo.
    const lc  = {}; repos.forEach(r => { if (r.language) lc[r.language] = (lc[r.language]||0)+1 })

    const timeAgo = (iso) => {
      if (!iso) return "—"
      const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
      if (days < 1) return "today"
      if (days < 7) return `${days}d ago`
      if (days < 30) return `${Math.floor(days/7)}w ago`
      if (days < 365) return `${Math.floor(days/30)}mo ago`
      return `${Math.floor(days/365)}y ago`
    }
    const topRepos = [...repos]
      .sort((a,b) => (b.stargazers_count||0)-(a.stargazers_count||0))
      .slice(0,6)
      // topics: GitHub's own repo-topics field — already present on every
      // object returned by the repos-list call above, zero extra API cost,
      // just never surfaced before. Real data the owner tagged, not inferred.
      .map(r => ({ name:r.name, fullName:r.full_name, desc:r.description||"", stars:r.stargazers_count||0, forks:r.forks_count||0, lang:r.language||null, updated:timeAgo(r.pushed_at), url:r.html_url, topics:Array.isArray(r.topics)?r.topics.slice(0,5):[] }))

    // ── Real per-repo intelligence (Phase 2/3/4) ──────────────────────────
    // Only the top 3 repos (by stars) get this — each costs up to 3 extra
    // GitHub API calls (root listing, commit-count via Link header,
    // language bytes), so 3 is a deliberate ceiling to keep total
    // calls-per-analyze bounded given the unauthenticated 60-req/hr limit
    // shared across every user hitting this route when GITHUB_TOKEN isn't
    // set (strongly recommended to configure — see file header). Tech/
    // README detection is filename presence only; commit counts and
    // language bytes are exact real values from GitHub, not estimates.
    const topN = topRepos.slice(0,3)
    const langByteTotals = {}
    let verifiedCommitTotal = 0
    let anyVerifiedCommitCount = false
    await Promise.all(topN.map(async (r) => {
      const [rootInfo, commitCount, langBytes] = await Promise.all([
        inspectRepoRoot(r.fullName),
        getRepoCommitCount(r.fullName),
        getRepoLanguageBytes(r.fullName),
      ])
      r.techStack = rootInfo.techStack
      r.hasReadme = rootInfo.hasReadme
      r.detectionSkipped = rootInfo.skipped
      if (typeof commitCount === "number") { verifiedCommitTotal += commitCount; anyVerifiedCommitCount = true }
      for (const [lang, bytes] of Object.entries(langBytes)) langByteTotals[lang] = (langByteTotals[lang]||0) + bytes
    }))
    topRepos.forEach(r => { delete r.fullName })

    // Language breakdown: real byte-weighted mix from the top-3 repos
    // (accurate — matches what GitHub's own repo page shows) blended with
    // the coarse one-vote-per-repo fallback for everything outside the top
    // 3, weighted down so it can't dominate the accurate portion.
    let languages
    const langByteTotal = Object.values(langByteTotals).reduce((a,b)=>a+b,0)
    if (langByteTotal > 0) {
      const combined = { ...langByteTotals }
      const topNNames = new Set(topN.map(r=>r.name))
      const fallbackWeight = langByteTotal * 0.15 // remaining repos count for at most 15% of the mix
      const fallbackTotal = Object.entries(lc).reduce((s,[,c])=>s+c, 0) || 1
      repos.forEach(r => {
        if (r.language && !topNNames.has(r.name)) combined[r.language] = (combined[r.language]||0) + (fallbackWeight/fallbackTotal)
      })
      const combinedTotal = Object.values(combined).reduce((a,b)=>a+b,0) || 1
      languages = Object.entries(combined)
        .map(([lang,bytes]) => ({ lang, pct: Math.round((bytes/combinedTotal)*100) }))
        .filter(l => l.pct > 0)
        .sort((a,b) => b.pct-a.pct).slice(0,8)
    } else {
      // Real language-bytes call failed for all top-3 repos (e.g. rate
      // limited) — fall back entirely to the coarse per-repo method rather
      // than showing nothing.
      const fallbackTotal = Object.values(lc).reduce((a,b)=>a+b,0) || 1
      languages = Object.entries(lc)
        .map(([lang,count]) => ({ lang, pct: Math.round((count/fallbackTotal)*100) }))
        .sort((a,b) => b.pct-a.pct).slice(0,8)
    }

    const totalStars = repos.reduce((s,r)=>s+(r.stargazers_count||0),0)
    const totalForks  = repos.reduce((s,r)=>s+(r.forks_count||0),0)
    // Commits: exact counts for the top-3 repos (via the Link-header trick)
    // plus a scaled estimate for any remaining repos beyond those 3 — so an
    // account with all its activity in 1-3 repos (the common case) now
    // shows a real, correct number instead of the old wildly-off guess.
    const remainingRepoCount = Math.max(0, (user.public_repos||0) - topN.length)
    const estimatedRemainder = Math.round(remainingRepoCount * 18)
    const estimatedCommits = anyVerifiedCommitCount ? (verifiedCommitTotal + estimatedRemainder) : Math.round((user.public_repos||0) * 18 + totalStars * 0.4)
    const commitsAreExact = anyVerifiedCommitCount && remainingRepoCount === 0

    const recentPushDays = repos.length
      ? Math.min(...repos.map(r => r.pushed_at ? Math.floor((Date.now()-new Date(r.pushed_at).getTime())/86400000) : 9999))
      : 9999

    // ── Basic identity scores ────────────────────────────────────────────
    // Deliberately simple, deterministic heuristics computed ONLY from data
    // already fetched above (no extra API calls, no per-repo README fetch).
    // These are estimates, not verified facts — presented in the UI as such,
    // same discipline as the AI-derived fingerprint below. Full architecture/
    // commit-intelligence/behavior-pattern scoring is a larger, separate
    // build (deferred — see capabilio-coordination-layer memory note).
    // BUG FIX (2026-08-04, real-world test): documentation score used to be
    // description-presence-only across ALL repos, which showed 0 for an
    // account whose one repo has a real README (visibly linked in GitHub's
    // own sidebar) but no one-line repo description set. Now blends in the
    // real hasReadme signal from the top-3 repos we actually checked.
    const reposWithDesc = repos.filter(r => r.description && r.description.trim().length>0).length
    const descScore = repos.length ? (reposWithDesc/repos.length)*100 : 0
    const readmeChecked = topN.filter(r => !r.detectionSkipped)
    const readmeScore = readmeChecked.length ? (readmeChecked.filter(r=>r.hasReadme).length/readmeChecked.length)*100 : null
    const documentationScore = Math.round(readmeScore==null ? descScore : (descScore*0.6 + readmeScore*0.4))
    const builderScore = Math.max(0, Math.min(100, Math.round((user.public_repos||0)*2.5 + totalStars*0.6 + languages.length*5)))
    const activeWithin90 = repos.filter(r => r.pushed_at && (Date.now()-new Date(r.pushed_at).getTime())/86400000 <= 90).length
    const consistencyScore = Math.max(0, Math.min(100, Math.round((recentPushDays===9999?0:Math.max(0,100-recentPushDays))*0.6 + Math.min(activeWithin90,5)*8)))
    const scores = { builder: builderScore, documentation: documentationScore, consistency: consistencyScore }

    const aiRaw = await groq([{ role:"user", content:
`Analyse this public GitHub profile for a ${keyword} role. Base your answer only on the data given — do not invent facts. Return ONLY valid JSON, no prose.
User: ${user.login} | Public repos: ${user.public_repos} | Followers: ${user.followers} | Total stars: ${totalStars}
Top languages: ${languages.map(l=>`${l.lang}(${l.pct}%)`).join(", ") || "unknown"}
Repo names: ${topRepos.map(r=>r.name).join(", ") || "none"}
Most recent push: ${recentPushDays===9999?"unknown":`${recentPushDays} days ago`}

Return JSON exactly matching this schema:
{"fingerprintTitle":"<short role-flavoured title, e.g. 'Python Backend Practitioner'>","dna":"<2-3 sentence plain-language summary of what the public data suggests about this developer's focus and habits>","patterns":["<short observed pattern>","...", "up to 4"],"specialization":"<primary tech focus, 2-5 words>","codingStyle":"<short phrase>","standoutFact":"<one specific, data-grounded observation, or empty string if nothing stands out>","confidenceScore":<0-100, your confidence that this profile reflects genuine hands-on work, based only on repo count/diversity/recency/stars — NOT a verification, just a reading confidence>}` }], { model: GROQ_FAST, max_tokens: 500, json: true })
    const ai = extractJson(aiRaw)

    const confidenceScore = Math.max(0, Math.min(100, Number(ai.confidenceScore) || 50))
    const fingerprint = {
      authenticityScore: confidenceScore,
      fingerprintTitle: ai.fingerprintTitle || `${languages[0]?.lang || "Multi-language"} Developer`,
      dna: ai.dna || `Public profile with ${user.public_repos} repositories across ${languages.length} language(s).`,
      patterns: Array.isArray(ai.patterns) ? ai.patterns.slice(0,4) : [],
      specialization: ai.specialization || languages[0]?.lang || "General",
      codingStyle: ai.codingStyle || "—",
      // Deliberately never says "verified" — this route only reads public
      // profile metadata, it does not confirm repo ownership on its own.
      // Real ownership confirmation is the bio-code check above.
      verificationStatus: confidenceScore>=80 ? "High reading confidence (unverified)" : confidenceScore>=55 ? "Moderate reading confidence (unverified)" : "Low reading confidence (unverified)",
      standoutFact: ai.standoutFact || "",
    }

    const responseBody = {
      username: user.login,
      avatar: user.avatar_url,
      bio: user.bio || "",
      location: user.location || "",
      company: user.company || "",
      publicRepos: user.public_repos,
      followers: user.followers,
      totalStars,
      totalForks,
      totalCommits: estimatedCommits,
      commitsAreExact,
      languages,
      topRepos,
      fingerprint,
      scores,
    }

    // Persist as the user's current Code DNA snapshot. Never blocks or fails
    // the response — a persistence hiccup shouldn't stop the user seeing
    // their own analysis, it just means it won't be cached/recruiter-visible
    // until the next successful save.
    try {
      await codeDnaRepo.upsertProfile(req.user.id, { username: user.login, analysis: responseBody, scores })
    } catch (persistErr) {
      console.error("[github/analyze] proof_objects persist failed:", persistErr.message)
    }

    return res.json(responseBody)
  } catch (e) { console.error("[github/analyze]", e.message); res.status(500).json({ error: e.message }) }
})

export default router
