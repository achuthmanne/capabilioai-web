/**
 * lib/authbridgeEpfo.js — AuthBridge (TruthScreen) EPFO/Employment verification
 * ---------------------------------------------------------------------------
 * Replaces the previous two EPFO paths in this codebase:
 *   1. routes/verify.js's /epfo/init+/epfo/confirm — a full stub that
 *      fabricated "EPFO data" from the user's own resume and matched it
 *      against itself. Never called a real government/vendor API.
 *   2. supabase/functions/verify-uan — a real, correctly-built Eko
 *      integration, but confirmed by the user not to be working in
 *      practice. Left deployed (not deleted) but no longer called from any
 *      frontend flow — see Orbit.jsx.
 * Both Student (Aura.jsx) and Professional (Orbit.jsx) paths now share this
 * one real AuthBridge integration via routes/verify.js's /epfo/* routes.
 *
 * Source: AuthBridge/TruthScreen's public API doc (apidoc.authbridge.com /
 * truthscreen.com/apidoc#epfo_veri), "Employee PF Verification" — a
 * two-step flow, NOT a UAN/OTP consent model:
 *   STEP 1  POST /api/v2.2/employeecompany   — fuzzy company-name search,
 *           returns a list of EPFO-registered legal company names matching
 *           a free-text query (solves exactly the "Capabilio AI" (resume) vs
 *           "CAPABILIO VENTURES PRIVATE LIMITED" (legal) gap by giving a
 *           real EPFO-side legal-name candidate list to pick from).
 *   STEP 2  POST /api/v2.2/employmentsearch  — given an exact company name
 *           (from step 1) + a person's name (+ optional verification_year),
 *           returns whether that person is a known employee of that
 *           establishment.
 *
 * KNOWN GAP, flagged rather than guessed at: the doc's STEP-2 sample request
 * includes "tsTransactionID" and "secretToken" fields whose values look like
 * account-specific credentials, not generic placeholders — but this could
 * not be confirmed with AuthBridge support before this was built. Both are
 * sent ONLY if the corresponding env vars are set (AUTHBRIDGE_TS_TRANSACTION_ID
 * / AUTHBRIDGE_SECRET_TOKEN); omitted otherwise. If AuthBridge's API rejects
 * calls without them, that will show up as a clear error from callApi()
 * rather than a silent wrong-shaped request — check the error message and
 * confirm with AuthBridge support before assuming the integration is broken.
 *
 * Required env var: AUTHBRIDGE_USERNAME (the "username" header AuthBridge
 * provisions per client — mandatory on every call per their doc).
 */

const BASE_URL = "https://www.truthscreen.com/api/v2.2"
const DOC_TYPE_PF_VERIFICATION = 106

function username() {
  return process.env.AUTHBRIDGE_USERNAME || ""
}

function isConfigured() {
  return !!username()
}

async function callApi(path, body) {
  if (!isConfigured()) {
    const err = new Error("AuthBridge is not configured — set AUTHBRIDGE_USERNAME in the environment.")
    err.notConfigured = true
    throw err
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "username": username(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) }
  catch { throw new Error(`AuthBridge returned a non-JSON response (HTTP ${res.status}): ${text.slice(0, 300)}`) }

  if (!res.ok) {
    throw new Error(`AuthBridge HTTP ${res.status}: ${data?.msg || data?.message || text.slice(0, 300)}`)
  }
  // AuthBridge's own convention per the doc: status:1 = success, status:0 = failure
  const statusOk = data?.status === 1 || data?.status === "1"
  if (!statusOk) {
    const err = new Error(data?.msg || "AuthBridge reported an error for this request.")
    err.authbridgeResponse = data
    throw err
  }
  return data
}

/**
 * STEP 1 — fuzzy company-name search against AuthBridge's EPFO-registered
 * company index.
 * @param {string} companyQuery free-text company name (e.g. resume's brand name)
 * @returns {Promise<string[]>} candidate legal company names
 */
export async function searchCompany(companyQuery) {
  const transID = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const data = await callApi("/employeecompany", {
    transID,
    docType: DOC_TYPE_PF_VERIFICATION,
    companyName: companyQuery,
  })
  // Doc's sample response key is "CompanyName" (capital C, capital N) — an
  // inconsistency with every other field in this API being lowerCamelCase,
  // but matching the doc exactly rather than guessing at a "corrected" key.
  const candidates = Array.isArray(data.CompanyName) ? data.CompanyName : []
  return candidates
}

/**
 * STEP 2 — confirm whether a specific person is a known employee of a
 * specific (exact, EPFO-registered) company name.
 * @param {{companyName: string, personName: string, verificationYear?: string}} params
 * @returns {Promise<{matched: boolean, employeeNames: string[], employeesCount: number, employerName: string, establishmentId: string, raw: object}>}
 */
export async function employmentSearch({ companyName, personName, verificationYear }) {
  const transID = `cap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const body = {
    transID,
    docType: DOC_TYPE_PF_VERIFICATION,
    company_name: companyName,
    person_name: personName,
  }
  if (verificationYear) body.verification_year = String(verificationYear)
  // See KNOWN GAP in the file header — only sent if explicitly configured,
  // never fabricated.
  if (process.env.AUTHBRIDGE_TS_TRANSACTION_ID) body.tsTransactionID = process.env.AUTHBRIDGE_TS_TRANSACTION_ID
  if (process.env.AUTHBRIDGE_SECRET_TOKEN) body.secretToken = process.env.AUTHBRIDGE_SECRET_TOKEN

  const data = await callApi("/employmentsearch", body)
  const msg = data.msg || {}
  const employeeNames = Array.isArray(msg.employee_names) ? msg.employee_names : []

  return {
    matched: employeeNames.length > 0,
    employeeNames,
    employeesCount: Number(msg.employees_count) || 0,
    employerName: msg.employer_name || companyName,
    establishmentId: msg.establishment_id || null,
    raw: data,
  }
}

export { isConfigured as isAuthBridgeConfigured }
