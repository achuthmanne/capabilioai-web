// Route: POST /api/github/analyze
//
// Returns the exact shape the Code DNA tab (frontend/src/pages/Aura.jsx,
// fetchGithubFingerprint) reads. Previously this route returned a
// {codeDNA:{...}} shape that didn't match what the UI expected
// (fingerprint.authenticityScore, languages[].lang, topRepos[].desc, etc.) —
// a real successful fetch silently rendered as a mostly-blank card. Fixed by
// matching the UI's real contract exactly (same shape the frontend's own
// demo-data generator already used, which IS correct against the UI).
//
// AI output here is a best-effort profile summary from public GitHub data —
// NOT an ownership/ authenticity verification. A separate, real per-repo
// ownership-verification pipeline already exists at
// backend/server/lib/verification/providers/github.js (writes to
// proof_objects/trust_level with a hash-chained audit log) — this route does
// not call it (that's a larger, separate integration). The "authenticityScore"
// here is therefore a confidence estimate from an LLM reading public repo
// metadata, not a verified fact, and is presented to the user as such.
import { Router } from "express"
import { groq, GROQ_FAST } from "../lib/groq.js"

const router = Router()

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

router.post("/analyze", async (req, res) => {
  const { githubUrl="", keyword="Developer" } = req.body
  const username = githubUrl.replace(/.*github\.com\//, "").replace(/\/.*/, "").trim()
  if (!username) return res.status(400).json({ error: "Invalid GitHub URL" })
  try {
    const ghh = { Accept:"application/vnd.github.v3+json", ...(process.env.GITHUB_TOKEN?{Authorization:`token ${process.env.GITHUB_TOKEN}`}:{}) }
    const [ur, rr] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers: ghh }),
      fetch(`https://api.github.com/users/${username}/repos?sort=pushed&per_page=30`, { headers: ghh }),
    ])
    if (ur.status === 404) return res.status(404).json({ error: "GitHub user not found" })
    if (!ur.ok) return res.status(ur.status === 403 ? 429 : 502).json({ error: ur.status === 403 ? "GitHub API rate limit reached — try again shortly" : "GitHub API error" })
    const user  = await ur.json()
    const repos = rr.ok ? await rr.json() : []

    const lc  = {}; repos.forEach(r => { if (r.language) lc[r.language] = (lc[r.language]||0)+1 })
    const tot = Object.values(lc).reduce((a,b)=>a+b,0) || 1
    const languages = Object.entries(lc)
      .map(([lang,count]) => ({ lang, pct: Math.round((count/tot)*100) }))
      .sort((a,b) => b.pct-a.pct).slice(0,8)

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
      .map(r => ({ name:r.name, desc:r.description||"", stars:r.stargazers_count||0, forks:r.forks_count||0, lang:r.language||null, updated:timeAgo(r.pushed_at), url:r.html_url }))

    const totalStars = repos.reduce((s,r)=>s+(r.stargazers_count||0),0)
    const totalForks  = repos.reduce((s,r)=>s+(r.forks_count||0),0)
    // GitHub's public REST API doesn't expose a total-commit count without
    // walking every repo's commit history (expensive, and rate-limit-costly
    // per repo) — this is a repo-count-scaled estimate, not a real count,
    // and is only ever surfaced as a rough "Commits" stat card, never as a
    // verified/authoritative figure.
    const estimatedCommits = Math.round((user.public_repos||0) * 18 + totalStars * 0.4)

    const recentPushDays = repos.length
      ? Math.min(...repos.map(r => r.pushed_at ? Math.floor((Date.now()-new Date(r.pushed_at).getTime())/86400000) : 9999))
      : 9999

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
      // profile metadata, it does not confirm repo ownership. Real ownership
      // verification is a separate pipeline (see file header comment).
      verificationStatus: confidenceScore>=80 ? "High reading confidence (unverified)" : confidenceScore>=55 ? "Moderate reading confidence (unverified)" : "Low reading confidence (unverified)",
      standoutFact: ai.standoutFact || "",
    }

    return res.json({
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
      languages,
      topRepos,
      fingerprint,
    })
  } catch (e) { console.error("[github/analyze]", e.message); res.status(500).json({ error: e.message }) }
})

export default router
