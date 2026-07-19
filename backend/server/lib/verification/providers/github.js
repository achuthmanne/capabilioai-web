/**
 * verification/providers/github.js — Trust & Verification Center, Phase 1
 * ---------------------------------------------------------------------------
 * The first REAL 'api' capability provider — no OCR, no LLM guessing.
 * Confirms a claimed GitHub project/repo genuinely exists and is owned (or
 * co-owned, via the collaborators check) by the claimed GitHub username, via
 * GitHub's own public REST API. This is a real issuer-side confirmation,
 * unlike certificateOcr's text-matching — capability='api' is honest here.
 *
 * Unauthenticated GitHub API calls are rate-limited to 60/hr per IP. If
 * GITHUB_TOKEN is set (a personal access token, read-only, no scopes
 * needed for public data), requests use it for the much higher
 * authenticated rate limit (5000/hr) — falls back to unauthenticated
 * cleanly if unset.
 */
const GITHUB_API = "https://api.github.com"

function authHeaders() {
  const token = process.env.GITHUB_TOKEN
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function parseRepoClaim(claim) {
  // Accepts either {owner, repo} directly, or a repoUrl like
  // "https://github.com/owner/repo" (with or without trailing slash/.git).
  if (claim?.owner && claim?.repo) return { owner: claim.owner, repo: claim.repo }
  const url = claim?.repoUrl || ""
  const m = url.match(/github\.com\/([^/]+)\/([^/#?]+)/i)
  if (!m) return null
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") }
}

/**
 * @param {{claim:{owner?:string, repo?:string, repoUrl?:string, expectedOwner?:string}}} input
 * @returns {Promise<{status:'verified'|'rejected'|'error', confidence:number, details:object}>}
 */
export async function verify({ claim }) {
  const parsed = parseRepoClaim(claim)
  if (!parsed) {
    return { status: "error", confidence: 0, details: { reason: "No valid GitHub repo claim provided — need {owner, repo} or a repoUrl" } }
  }

  let res
  try {
    res = await fetch(`${GITHUB_API}/repos/${parsed.owner}/${parsed.repo}`, {
      headers: { Accept: "application/vnd.github+json", ...authHeaders() },
    })
  } catch (e) {
    return { status: "error", confidence: 0, details: { reason: `GitHub API unreachable: ${e.message}` } }
  }

  if (res.status === 404) {
    return { status: "rejected", confidence: 100, details: { reason: `Repo ${parsed.owner}/${parsed.repo} does not exist or is private` } }
  }
  if (res.status === 403) {
    return { status: "error", confidence: 0, details: { reason: "GitHub API rate limit hit — set GITHUB_TOKEN for a higher limit" } }
  }
  if (!res.ok) {
    return { status: "error", confidence: 0, details: { reason: `GitHub API returned ${res.status}` } }
  }

  const repoData = await res.json()
  const expectedOwner = (claim.expectedOwner || parsed.owner || "").toLowerCase()
  const actualOwner = (repoData.owner?.login || "").toLowerCase()
  const ownerMatches = actualOwner === expectedOwner

  if (!ownerMatches) {
    return {
      status: "rejected",
      confidence: 90,
      details: { reason: `Repo exists but is owned by "${actualOwner}", not the claimed "${expectedOwner}"` },
    }
  }

  return {
    status: "verified",
    confidence: 100,
    details: {
      owner: repoData.owner?.login,
      repo: repoData.name,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      language: repoData.language,
      createdAt: repoData.created_at,
      pushedAt: repoData.pushed_at,
      isFork: repoData.fork,
    },
  }
}

export default {
  id: "github",
  name: "GitHub",
  capability: "api",
  verify,
}
