import { compileCircuitMission } from "./backend/server/lib/arena/missionCompiler.js"
const m = compileCircuitMission({ templateId:"voltage_divider", difficulty:"Easy", eloGain:12 })
console.log(JSON.stringify({ tasks:[m] }, null, 2))
