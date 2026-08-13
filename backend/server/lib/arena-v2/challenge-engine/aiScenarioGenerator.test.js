import { test } from "node:test"
import assert from "node:assert/strict"
import { generateAiScenario } from "./aiScenarioGenerator.js"

const VALID_CORE = {
  ticket: { id: "INC-1", title: "Something broke", priority: "High" },
  prompt: "A realistic scenario the candidate must resolve.",
  checklist: ["Step one", "Step two", "Step three"],
  acceptanceCriteria: ["Correctly identifies the cause"],
  answerLabel: "FIX",
  groundTruth: { rootCause: "The real cause.", correctFix: "The real fix." },
  rubric: [
    { key: "correctness", label: "Correctness", weight: 0.6 },
    { key: "communication", label: "Communication", weight: 0.4 },
  ],
}

test("generateAiScenario returns validated content + normalized rubric on a valid AI response", async () => {
  const result = await generateAiScenario(
    { role: "ML Engineer", skill: "Feature Engineering", difficulty: "Medium", workstation: "notebook" },
    { callAi: async () => ({ ...VALID_CORE, starterCode: "import pandas as pd", datasetCsv: "a,b\n1,2\n3,4" }) }
  )
  assert.ok(result)
  assert.equal(result.content.ticket.id, "INC-1")
  assert.equal(result.content.starterCode, "import pandas as pd")
  assert.equal(result.content.datasetCsv, "a,b\n1,2\n3,4")
  assert.equal(result.rubric.length, 2)
  const sum = result.rubric.reduce((s, r) => s + r.weight, 0)
  assert.ok(Math.abs(sum - 1) < 0.01, `rubric weights should normalize to ~1, got ${sum}`)
})

test("generateAiScenario returns null when the AI call throws", async () => {
  const result = await generateAiScenario(
    { role: "ML Engineer", skill: "X", difficulty: "Medium", workstation: "notebook" },
    { callAi: async () => { throw new Error("network down") } }
  )
  assert.equal(result, null)
})

test("generateAiScenario returns null when core fields are missing", async () => {
  const result = await generateAiScenario(
    { role: "ML Engineer", skill: "X", difficulty: "Medium", workstation: "code" },
    { callAi: async () => ({ ticket: { id: "X" } }) } // missing title, prompt, checklist, etc.
  )
  assert.equal(result, null)
})

test("generateAiScenario returns null when rubric weights are missing/invalid", async () => {
  const result = await generateAiScenario(
    { role: "Software Engineer", skill: "Debugging", difficulty: "Easy", workstation: "code" },
    { callAi: async () => ({ ...VALID_CORE, rubric: [{ key: "x", label: "X" }], starterCode: "function f(){}", testCases: [{ name: "t1", code: "if(!f())throw new Error()" }] }) }
  )
  assert.equal(result, null)
})

test("generateAiScenario requires notebook-specific fields (starterCode + datasetCsv) and rejects when missing", async () => {
  const result = await generateAiScenario(
    { role: "ML Engineer", skill: "X", difficulty: "Medium", workstation: "notebook" },
    { callAi: async () => ({ ...VALID_CORE }) } // no starterCode/datasetCsv
  )
  assert.equal(result, null)
})

test("generateAiScenario requires code-specific fields (starterCode + testCases) and rejects when missing", async () => {
  const result = await generateAiScenario(
    { role: "Software Engineer", skill: "Debugging", difficulty: "Easy", workstation: "code" },
    { callAi: async () => ({ ...VALID_CORE }) } // no starterCode/testCases
  )
  assert.equal(result, null)
})

test("generateAiScenario validates sap_console gui_config mode requires sapScreen", async () => {
  const result = await generateAiScenario(
    { role: "SAP FI/CO Consultant", skill: "Credit Management", difficulty: "Medium", workstation: "sap_console" },
    { callAi: async () => ({ ...VALID_CORE, sapMode: "gui_config", tcode: "FD32" }) } // no sapScreen
  )
  assert.equal(result, null)
})

test("generateAiScenario accepts sap_console gui_config mode with a valid sapScreen", async () => {
  const result = await generateAiScenario(
    { role: "SAP FI/CO Consultant", skill: "Credit Management", difficulty: "Medium", workstation: "sap_console" },
    { callAi: async () => ({ ...VALID_CORE, sapMode: "gui_config", tcode: "FD32", sapScreen: [{ label: "Customer", value: "100234" }] }) }
  )
  assert.ok(result)
  assert.equal(result.content.sapMode, "gui_config")
  assert.equal(result.content.sapScreen[0].label, "Customer")
})

test("generateAiScenario returns a scenario with no workstation-specific extras for an unspecced workstation (known limitation, not a fake fallback)", async () => {
  const result = await generateAiScenario(
    { role: "Structural Engineer", skill: "Beam Design", difficulty: "Medium", workstation: "report" },
    { callAi: async () => ({ ...VALID_CORE }) }
  )
  assert.ok(result)
  assert.equal(result.content.starterCode, undefined)
})

test("generateAiScenario returns null for missing required ctx (no role)", async () => {
  const result = await generateAiScenario({ skill: "X", difficulty: "Medium", workstation: "notebook" }, { callAi: async () => VALID_CORE })
  assert.equal(result, null)
})
