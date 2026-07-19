/**
 * verification/providers/certificateOcr.js — Trust & Verification Center, Phase 1
 * ---------------------------------------------------------------------------
 * The one provider that already did real work before this framework existed
 * (routes/verify.js's certification-file route) — formalized here as the
 * first provider in the new registry. capability='manual_review' is
 * deliberate: this OCRs an uploaded file and asks an LLM whether the text
 * plausibly matches the claimed name/issuer. That is genuinely useful
 * signal, but it is NOT a cryptographic or issuer-API confirmation — it
 * cannot tell a well-made fake from a real certificate, only whether the
 * text on the page matches the claim. Never relabel this 'api' or
 * 'public_lookup'; those imply a stronger guarantee this provider can't make.
 */
import { createRequire } from "module"
import { groq, GROQ_FAST } from "../../groq.js"
import { geminiExtractImage } from "../../gemini.js"

let _pdfParse = null
async function parsePdf(buffer) {
  if (!_pdfParse) _pdfParse = createRequire(import.meta.url)("pdf-parse/lib/pdf-parse.js")
  return _pdfParse(buffer)
}
const hasGemini = () => process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_key_here"

/**
 * @param {{file:{buffer:Buffer, mimetype:string}, claim:{name:string, issuer?:string}}} input
 * @returns {Promise<{status:'verified'|'rejected'|'error', confidence:number, details:object}>}
 */
export async function verify({ file, claim }) {
  if (!file?.buffer) return { status: "error", confidence: 0, details: { reason: "No file provided" } }
  if (!claim?.name) return { status: "error", confidence: 0, details: { reason: "No claimed certificate name to match against" } }

  const mime = file.mimetype || ""
  let extractedText = ""

  if (mime === "application/pdf") {
    try { const r = await parsePdf(file.buffer); extractedText = r.text || "" }
    catch (e) { console.warn("[certificateOcr] pdf-parse failed:", e.message) }
  }
  if (extractedText.trim().length < 10 && mime.startsWith("image/") && hasGemini()) {
    try {
      const base64 = file.buffer.toString("base64")
      const r = await geminiExtractImage(base64, mime,
        "Extract ALL visible text from this certificate image, verbatim. Return ONLY the raw text, no commentary.")
      extractedText = (typeof r === "string" ? r : (r?.raw || r?.text || JSON.stringify(r || {}))) || ""
    } catch (e) { console.warn("[certificateOcr] Gemini image extract failed:", e.message) }
  }

  if (extractedText.trim().length < 10) {
    return { status: "error", confidence: 0, details: { reason: "Could not read this file — try a clearer PDF or image." } }
  }

  let match = { match: false, confidence: 0, reason: "" }
  try {
    const raw = await groq([
      { role: "system", content: "You verify certificates. Return ONLY valid JSON, no markdown." },
      { role: "user", content:
        `A user claims to hold this certificate:\nName: ${claim.name}\nIssuer: ${claim.issuer || "(not specified)"}\n\n` +
        `Here is the text extracted from the certificate file they uploaded:\n"""${extractedText.slice(0, 3000)}"""\n\n` +
        `Does the extracted text plausibly confirm this specific certificate and issuer (allow for reasonable naming/formatting differences, but the credential and issuer must genuinely match — do not pass a vague or unrelated document)? ` +
        `Return JSON: {"match":true|false,"confidence":0-100,"reason":"one short sentence"}` },
    ], { model: GROQ_FAST, max_tokens: 300, json: true, temperature: 0.2 })
    match = JSON.parse(raw)
  } catch (e) {
    console.warn("[certificateOcr] match check failed:", e.message)
    return { status: "error", confidence: 0, details: { reason: "Verification check failed — try again." } }
  }

  if (!match.match || (match.confidence || 0) < 60) {
    return {
      status: "rejected",
      confidence: match.confidence || 0,
      details: { reason: match.reason || "The uploaded file doesn't clearly match the claimed certificate." },
    }
  }

  return { status: "verified", confidence: match.confidence, details: { reason: match.reason } }
}

export default {
  id: "certificate_ocr",
  name: "Certificate OCR Match",
  capability: "manual_review",
  verify,
}
