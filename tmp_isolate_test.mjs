import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, ".env") })

console.log("env MENTOR_MARKETPLACE_V1 =", JSON.stringify(process.env.MENTOR_MARKETPLACE_V1))

import express from "express"
import mentorMarketplaceRoutes, { MENTOR_MARKETPLACE_V1_ENABLED } from "./backend/server/routes/mentorMarketplace.js"
console.log("MENTOR_MARKETPLACE_V1_ENABLED at import time =", MENTOR_MARKETPLACE_V1_ENABLED)

const app = express()
app.use(express.json())
app.use("/api/pro/v1/mentor", mentorMarketplaceRoutes)
app.listen(4111, () => console.log("isolated test server up on 4111"))
