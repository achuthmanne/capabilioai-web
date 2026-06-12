// Route: POST /api/github/analyze
import { Router } from "express"
import { groq, GROQ_FAST } from "../lib/groq.js"

const router = Router()

router.post("/analyze", async (req, res) => {
  const { githubUrl="", keyword="Developer" } = req.body
  const username = githubUrl.replace(/.*github\.com\//, "").replace(/\/.*/, "").trim()
  if (!username) return res.status(400).json({ error: "Invalid GitHub URL" })
  try {
    const ghh = { Accept:"application/vnd.github.v3+json", ...(process.env.GITHUB_TOKEN?{Authorization:`token ${process.env.GITHUB_TOKEN}`}:{}) }
    const [ur, rr] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers: ghh }),
      fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=20`, { headers: ghh }),
    ])
    if (!ur.ok) return res.status(404).json({ error: "GitHub user not found" })
    const user  = await ur.json()
    const repos = rr.ok ? await rr.json() : []
    const lc    = {}; repos.forEach(r => { if (r.language) lc[r.language] = (lc[r.language]||0)+1 })
    const tot   = Object.values(lc).reduce((a,b)=>a+b,0)||1
    const langs = Object.entries(lc).map(([name,count])=>({name,pct:Math.round((count/tot)*100)})).sort((a,b)=>b.pct-a.pct).slice(0,8)
    const topR  = repos.sort((a,b)=>(b.stargazers_count||0)-(a.stargazers_count||0)).slice(0,5).map(r=>({name:r.name,description:r.description,stars:r.stargazers_count,forks:r.forks_count,language:r.language,url:r.html_url}))
    const stars = repos.reduce((s,r)=>s+(r.stargazers_count||0),0)
    const forks = repos.reduce((s,r)=>s+(r.forks_count||0),0)
    const aiRaw = await groq([{ role:"user", content:`Analyse GitHub profile for ${keyword} developer. Return ONLY valid JSON.\nUser: ${user.login} | Repos: ${user.public_repos} | Stars: ${stars}\nLangs: ${langs.map(l=>`${l.name}(${l.pct}%)`).join(", ")}\nRepos: ${topR.map(r=>r.name).join(", ")}\n\nReturn JSON: {"codeDNA":{"primaryLanguage":"...","style":"...","specialty":"...","commitPattern":"..."},"strengths":["..."],"suggestions":["..."],"score":<0-100>,"eloBonus":<0-50>}` }], { model: GROQ_FAST, max_tokens: 500, json: true })
    let ai = {}; try { ai = JSON.parse(aiRaw) } catch {}
    return res.json({ username:user.login, publicRepos:user.public_repos, followers:user.followers, totalStars:stars, totalForks:forks, topLanguage:langs[0]?.name||"—", languages:langs, topRepos:topR, bio:user.bio, location:user.location, company:user.company, ...ai })
  } catch (e) { console.error("[github/analyze]", e.message); res.status(500).json({ error: e.message }) }
})

export default router
