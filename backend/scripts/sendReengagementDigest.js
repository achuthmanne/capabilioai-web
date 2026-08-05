/**
 * scripts/sendReengagementDigest.js
 * ---------------------------------------------------------------------------
 * Run on a schedule (see .github/workflows/reengagement-digest.yml) — never
 * called from an HTTP route. Computes the three signals in
 * lib/reengagementSignals.js and writes real, deduped notifications for both
 * paths (student and professional; the signals themselves are inherently
 * path-scoped — streak risk applies to anyone with an Arena streak, ELO
 * decay risk only to professional_elo_state rows).
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and (optionally, for the
 * email side of the loop — fails soft without it) RESEND_API_KEY.
 */
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../.env") })
dotenv.config({ path: resolve(__dirname, "../../.env") })

import { runReengagementDigest } from "../server/lib/reengagementSignals.js"

runReengagementDigest()
  .then((summary) => {
    console.log("Re-engagement digest complete:", summary)
    process.exit(0)
  })
  .catch((err) => {
    console.error("Re-engagement digest failed:", err)
    process.exit(1)
  })
