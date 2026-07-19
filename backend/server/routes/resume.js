// Routes: POST /api/extract-pdf, POST /api/extract-linkedin
//
// extract-pdf:      Gemini multimodal → Groq fallback
// extract-linkedin: ProxyCurl → Gemini normalize → Groq fallback

import { Router }        from "express"
import multer            from "multer"
import { createRequire } from "module"
import { groq, GROQ_FAST }            from "../lib/groq.js"
import { gemini, geminiExtractImage } from "../lib/gemini.js"

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

let _pdfParse = null
async function parsePdf(buffer) {
  if (!_pdfParse) _pdfParse = createRequire(import.meta.url)("pdf-parse/lib/pdf-parse.js")
  return _pdfParse(buffer)
}

const SCHEMA = `{"name":"","email":"","phone":"","title":"","summary":"","skills":[""],"experience":[{"company":"","role":"","startDate":"","endDate":"","current":false,"description":""}],"education":[{"institution":"","degree":"","field":"","year":""}],"certifications":[""],"keywords":[""]}`

const hasGemini = () => process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_key_here"

// ─── 1. PDF Extraction ────────────────────────────────────────────────────────
router.post("/extract-pdf", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" })
    const buffer = req.file.buffer
    const mime   = req.file.mimetype || "application/pdf"

    // Path A: pdf-parse → Groq (fast ~3s for text-based PDFs — always try first)
    let text = ""
    try { const r = await parsePdf(buffer); text = r.text || "" }
    catch (e) { console.warn("[extract-pdf] pdf-parse failed:", e.message) }

    if (text.trim().length >= 30) {
      const raw = await groq([
        { role:"system", content:"Resume parser. Return ONLY valid JSON, no markdown." },
        { role:"user",   content:`Parse this resume. Return JSON: ${SCHEMA}\n\nResume:\n${text.slice(0,12000)}` },
      ], { model:GROQ_FAST, max_tokens:2000, json:true })

      let p = {}
      try { p = JSON.parse(raw) } catch {}
      return res.json({ _source:"groq", text, name:p.name||"", email:p.email||"", phone:p.phone||"",
        title:p.title||"", summary:p.summary||"", skills:p.skills||[], experience:p.experience||[],
        education:p.education||[], certifications:p.certifications||[], keywords:p.keywords||[] })
    }

    // Path B: Gemini multimodal — only for image-only / scanned PDFs (text < 30 chars)
    if (hasGemini()) {
      try {
        const base64 = buffer.toString("base64")
        const prompt = `You are a resume parser. Extract ALL information from this resume PDF.
Return ONLY valid JSON matching this schema exactly — no markdown, no extra text:
${SCHEMA}

Rules:
- Extract every skill mentioned anywhere in the document
- For current roles: endDate="" and current=true
- keywords = 15-20 job-relevant technical terms from the whole document
- Empty string or [] for missing fields`

        const extracted = await geminiExtractImage(base64, mime, prompt)
        const p = (extracted && !extracted.raw) ? extracted : {}
        if (p.name || p.skills?.length || p.experience?.length) {
          const synthText = [p.name, p.title, p.summary, ...(p.skills||[])].filter(Boolean).join(" ")
          return res.json({ _source:"gemini",
            text: synthText.length > 50 ? synthText : synthText + " ".repeat(60),
            name:p.name||"", email:p.email||"", phone:p.phone||"",
            title:p.title||"", summary:p.summary||"", skills:p.skills||[], experience:p.experience||[],
            education:p.education||[], certifications:p.certifications||[], keywords:p.keywords||[] })
        }
      } catch (e) { console.warn("[extract-pdf] Gemini failed:", e.message, e.status || "") }
    }

    // Fallback: image-only PDF with no Gemini key — return partial so frontend doesn't hard-fail
    return res.json({ _source:"pdf-empty", text:"", name:"", email:"", phone:"",
      title:"", summary:"", skills:[], experience:[], education:[], certifications:[], keywords:[] })

  } catch (e) { console.error("[extract-pdf]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── 2. Professional Resume Parse (Orbit dashboard "Import Resume" modal) ────
// Same fast extraction as /extract-pdf but returns the shape ResumeModal expects:
// { experiences, skills, projects, certifications, summary }
const PROF_SCHEMA = `{"name":"","title":"","summary":"","skills":[""],"experience":[{"company":"","role":"","startDate":"","endDate":"","current":false,"description":"","responsibilities":[""],"roleSkills":[""]}],"projects":[{"title":"","description":"","techStack":[""],"url":""}],"education":[{"institution":"","degree":"","field":"","year":""}],"certifications":[""],"keywords":[""]}`

router.post("/professional/parse-resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" })
    const buffer = req.file.buffer
    const mime   = req.file.mimetype || "application/pdf"

    // Path A: pdf-parse → Groq (fast ~3s for text PDFs)
    let text = ""
    try { const r = await parsePdf(buffer); text = r.text || "" }
    catch (e) { console.warn("[parse-resume] pdf-parse failed:", e.message) }

    let raw = null
    if (text.trim().length >= 30) {
      raw = await groq([
        { role:"system", content:`Resume parser. Return ONLY valid JSON matching the schema exactly, no markdown, no extra text.

CRITICAL RULES FOR roleSkills:
- For each experience entry, the "roleSkills" array must contain ONLY skills, tools, or technologies that are explicitly mentioned or directly demonstrated in THAT SPECIFIC role's own description or responsibilities.
- Do NOT copy skills from the top-level "skills" array or other sections into roleSkills.
- Do NOT add skills that are not written in that specific role's description.
- Maximum 6 items in roleSkills per experience. If fewer are explicitly mentioned, use fewer.
- The top-level "skills" array is for GLOBAL/OVERALL skills found in the document (skills section, top skills, etc.).` },
        // BUG FIX (2026-07-20): this was slice(0,4000) — ~800-1000 tokens, well under
        // llama-3.1-8b-instant's 128K context window. A one-page resume's raw pdf-parse
        // text (with all its whitespace/newline bloat) routinely exceeds 4000 chars, and
        // Education is often the LAST section on fresher/student resumes — so it was
        // silently getting cut off before the AI ever saw it, while sections earlier in
        // the document (skills, certifications) still parsed fine. That's why certs came
        // through from a resume upload but education didn't.
        { role:"user",   content:`Parse this professional resume. Include separate projects array for any project entries. Return JSON: ${PROF_SCHEMA}\n\nResume:\n${text.slice(0,12000)}` },
      ], { model:GROQ_FAST, max_tokens:2500, json:true })
    }

    // Path B: Gemini multimodal for image-only PDFs
    if (!raw && hasGemini()) {
      try {
        const base64 = buffer.toString("base64")
        const extracted = await geminiExtractImage(base64, mime,
          `You are a resume parser. Extract ALL information from this resume.
Return ONLY valid JSON: ${PROF_SCHEMA}. No markdown.

CRITICAL: For each experience, "roleSkills" must ONLY contain skills explicitly mentioned in THAT role's own description (max 6). Do NOT copy global skills into roleSkills.`)
        if (extracted && !extracted.raw && (extracted.name || extracted.skills?.length || extracted.experience?.length)) {
          const p = extracted
          return res.json({
            experiences: (p.experience||[]).filter(e => !_isProject(e)).map((e,i) => _toExp(e, i)),
            skills: p.skills || [],
            projects: [...(p.projects||[]), ...(p.experience||[]).filter(_isProject).map(e => ({
              title: e.role||e.title||"Project", description: e.description||"",
              techStack: e.skills||[], url: ""
            }))],
            education: (p.education||[]).map(_toEdu),
            certifications: p.certifications || [],
            summary: p.summary || "",
            name: p.name || "", _source: "gemini",
          })
        }
      } catch (e) { console.warn("[parse-resume] Gemini failed:", e.message) }
    }

    // Parse the Groq output
    let p = {}
    if (raw) try { p = JSON.parse(raw) } catch {}

    // Separate project entries from experience entries
    const allExp = p.experience || []
    const expEntries = allExp.filter(e => !_isProject(e))
    const projFromExp = allExp.filter(_isProject).map(e => ({
      title: e.role||e.title||"Project", description: e.description||"",
      techStack: e.skills||[], url: ""
    }))

    return res.json({
      experiences: expEntries.map((e, i) => _toExp(e, i)),
      skills: p.skills || [],
      projects: [...(p.projects||[]), ...projFromExp],
      education: (p.education||[]).map(_toEdu),
      certifications: p.certifications || [],
      summary: p.summary || "",
      name: p.name || "", _source: text.trim().length >= 30 ? "groq" : "pdf-empty",
    })

  } catch (e) { console.error("[parse-resume]", e.message); res.status(500).json({ error: e.message }) }
})

// Helpers for parse-resume
function _isProject(e) {
  const co = (e.company || "").toLowerCase().trim()
  const title = (e.role || e.title || "").toLowerCase()

  // No company → almost certainly a personal/academic project
  if (!co || co === "unknown" || co === "self" || co === "personal" || co === "n/a") return true

  // Company name looks like an academic institution
  if (/university|college|institute|school|iit|nit|iim|iiit|academy|polytechnic|dept\.|department/.test(co)) return true

  // Title explicitly describes a project type — NOT professional employment
  if (/\bproject\b|mini[\s-]?project|main[\s-]?project|college[\s-]?project|academic[\s-]?project|personal[\s-]?project|side[\s-]?project|capstone|thesis|dissertation|final[\s-]?year|hackathon|open[\s-]?source|freelance[\s-]?project/.test(title)) return true

  // Company name itself suggests it's a project label, not an employer
  if (/\bproject\b|mini[\s-]?project|main[\s-]?project|college[\s-]?project|academic/.test(co)) return true

  // Title has no recognizable professional job-title words AND has no dates → likely a project
  const hasJobTitle = /engineer|developer|analyst|manager|intern|lead|head|consultant|architect|designer|officer|specialist|director|associate|executive|trainee|apprentice|researcher|scientist/.test(title)
  if (!hasJobTitle && !e.startDate && !e.endDate) return true

  return false
}
function _toExp(e, i) {
  const isCurrent = !!e.current || (!e.endDate && i === 0)
  const description = Array.isArray(e.responsibilities)
    ? e.responsibilities.join("\n")
    : (e.description || "")
  // Use roleSkills (role-specific), falling back to skills only if roleSkills is absent.
  // Cap at 6 to prevent AI from dumping the global skill list into every entry.
  const rawSkills = Array.isArray(e.roleSkills) ? e.roleSkills
    : Array.isArray(e.skills) ? e.skills
    : []
  const skills = rawSkills.filter(Boolean).slice(0, 6)
  return {
    id: `exp-${i}-${Date.now()}`,
    company: e.company || "Previous Company",
    role: e.role || e.title || "Professional",
    startDate: e.startDate || "",
    endDate: isCurrent ? "" : (e.endDate || ""),
    isCurrent,
    description, outcomes: "",
    location: e.location || "",
    industry: "Technology",
    skills,
    verificationStatus: "self-claimed",
    _source: "resume",
  }
}

function _toEdu(e, i) {
  return {
    id: `edu-${i}-${Date.now()}`,
    institution: e.institution || e.school || "",
    degree: e.degree || "",
    field: e.field || e.fieldOfStudy || "",
    year: e.year || e.endYear || "",
    _source: "resume",
  }
}

// ─── 3. LinkedIn URL Extraction ───────────────────────────────────────────────
router.post("/extract-linkedin", async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: "url is required" })

  const match    = url.match(/linkedin\.com\/in\/([\w%-]+)/i)
  const cleanUrl = match ? `https://www.linkedin.com/in/${match[1]}`
    : url.startsWith("http") ? url : `https://www.linkedin.com/in/${url}`

  const LINKEDIN_SCHEMA = `{"name":"","title":"","summary":"","location":"","connections":null,"skills":[""],"experience":[{"company":"","role":"","startDate":"","endDate":"","current":false,"description":""}],"education":[{"institution":"","degree":"","field":"","year":""}],"certifications":[""],"keywords":[""]}`

  // Option A: ProxyCurl
  if (process.env.PROXYCURL_API_KEY) {
    try {
      const pcRes = await fetch(
        `https://nubela.co/proxycurl/api/v2/linkedin?url=${encodeURIComponent(cleanUrl)}&skills=include&education=include&experiences=include`,
        { headers: { Authorization: `Bearer ${process.env.PROXYCURL_API_KEY}` } }
      )
      console.log("[extract-linkedin] ProxyCurl status:", pcRes.status)
      if (pcRes.ok) {
        const d = await pcRes.json()
        const rawStr = JSON.stringify(d).slice(0, 3000)

        // Gemini to normalize ProxyCurl's raw JSON into clean schema
        if (hasGemini()) {
          try {
            const result = await gemini(
              `Normalize this LinkedIn profile data into clean structured JSON.
Raw ProxyCurl data: ${rawStr}
Return ONLY this JSON schema: ${LINKEDIN_SCHEMA}`,
              { json:true }
            )
            const p = typeof result === "string" ? JSON.parse(result) : result
            if (p.name || p.skills?.length) return res.json({ ...p, _source:"proxycurl+gemini", rawText:rawStr })
          } catch (e) { console.warn("[extract-linkedin] Gemini normalize:", e.message) }
        }

        // Manual mapping fallback
        return res.json({
          _source:"proxycurl",
          name:    [d.first_name, d.last_name].filter(Boolean).join(" "),
          title:   d.headline || "", summary: d.summary || "", location: d.city || "",
          connections: d.connections || null,
          skills:  (d.skills||[]).map(s=>s.name||s),
          experience: (d.experiences||[]).map(e=>({
            company:e.company||"", role:e.title||"", current:!e.ends_at,
            startDate: e.starts_at?`${e.starts_at.year}-${String(e.starts_at.month||1).padStart(2,"0")}` : "",
            endDate:   e.ends_at  ?`${e.ends_at.year}-${String(e.ends_at.month||1).padStart(2,"0")}` : "",
            description: e.description||"",
          })),
          education: (d.education||[]).map(e=>({ institution:e.school||"", degree:e.degree_name||"", field:e.field_of_study||"", year:e.ends_at?.year?.toString()||"" })),
          certifications: (d.certifications||[]).map(c=>c.name||c),
          rawText: rawStr,
        })
      }
    } catch (e) { console.warn("[extract-linkedin] ProxyCurl:", e.message) }
  }

  // Option B: Scrape HTML → Gemini or Groq
  try {
    const pageRes = await fetch(cleanUrl, {
      headers: { "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36", "Accept-Language":"en-US,en;q=0.9" },
      signal: AbortSignal.timeout(8000),
    })
    const html   = await pageRes.text()
    const isWall = html.includes("authwall") || (html.includes("login") && html.includes("Join LinkedIn"))

    if (isWall) {
      // Extract every scrap of data available without login
      const nameMatch  = html.match(/<title>([^|<]+)/i)
      const descMatch  = html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)
      const ogTitle    = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)
      const ogDesc     = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
      const rawName    = (nameMatch?.[1] || ogTitle?.[1] || "").trim().replace(/ [|-].*LinkedIn.*/i, "").trim()
      const rawDesc    = (descMatch?.[1] || ogDesc?.[1] || "").trim()
      // LinkedIn og:description often starts with "title at company. summary..."
      const titleMatch = rawDesc.match(/^([^.]+)\s+at\s+([^.]+)/i)
      const extractedTitle = titleMatch ? titleMatch[1].trim() : rawDesc.split(".")?.[0]?.trim() || ""

      // Try Gemini/Groq on what little HTML we have even through the wall
      let aiData = {}
      if (hasGemini() && rawName) {
        try {
          const miniPrompt = `From this partial LinkedIn page data, extract what you can.
Name: ${rawName}
Description: ${rawDesc}
Return JSON with fields: name, title, summary, skills (array), experience (array).
Only include fields you can confidently extract. Return {} for unknown fields.`
          const r = await gemini(miniPrompt, { json: true })
          aiData = typeof r === "string" ? JSON.parse(r) : r
        } catch {}
      }

      return res.json({
        partial: true,
        name:    aiData.name    || rawName,
        title:   aiData.title   || extractedTitle,
        summary: aiData.summary || rawDesc,
        skills:  aiData.skills  || [],
        experience: aiData.experience || [],
        education: [], certifications: [], rawText: rawDesc,
        message: "LinkedIn requires login for full data. Upload your LinkedIn PDF export as the resume for better results.",
      })
    }

    const clean = html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"")
      .replace(/<[^>]+>/g," ").replace(/\s{3,}/g,"\n").slice(0,4000)

    const parsePrompt = `Parse this LinkedIn page HTML and extract profile data.
Return ONLY this JSON: ${LINKEDIN_SCHEMA}
Page content:\n${clean}`

    let p = {}
    if (hasGemini()) {
      try { const r = await gemini(parsePrompt, { json:true }); p = typeof r==="string"?JSON.parse(r):r } catch {}
    }
    if (!p.name) {
      const raw = await groq(
        [{ role:"system",content:"LinkedIn profile parser. Return ONLY valid JSON." },{ role:"user",content:parsePrompt }],
        { model:GROQ_FAST, max_tokens:1500, json:true }
      )
      try { p = JSON.parse(raw) } catch {}
    }

    return res.json({ _source:"scrape", name:p.name||"", title:p.title||"", summary:p.summary||"",
      location:p.location||"", skills:p.skills||[], experience:p.experience||[],
      education:p.education||[], certifications:p.certifications||[], rawText:clean.slice(0,2000) })

  } catch (e) {
    console.error("[extract-linkedin]", e.message)
    return res.status(500).json({ error:"Could not extract LinkedIn profile. Try uploading your resume instead." })
  }
})

export default router
