// lib/orgVerification.js — shared, single source of truth for institution/company
// verification level. Extracted out of InstitutionOS.jsx so InstitutionPublicProfile.jsx
// (which InstitutionOS.jsx itself imports) can use the exact same real signal instead
// of maintaining a second, disconnected notion of "verified" — see the trust-score
// rewrite that replaced InstitutionPublicProfile's hardcoded checklist.
//
// profiles.verificationStatus is PC-7-protected (server-side writes only, via
// POST /api/org/verify-email etc. — see backend/server/routes/orgVerification.js).
// This function only ever *reads* it.
export function verificationLevel(userData) {
  const vs = userData?.verificationStatus || userData?.verification_status || ""
  if (vs === "fully_verified" || vs === "verified") return 4
  if (vs === "document_submitted") return 3
  if (vs === "domain_verified") return 2
  if (vs === "email_verified") return 1
  return 0
}

export const VERIFICATION_LEVEL_LABEL = ["Unverified", "Email Verified", "Domain Verified", "Document Submitted", "Fully Verified"]
