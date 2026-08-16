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

const VALID_DASHBOARD_EXTRAS = {
  tables: [
    { name: "orders", rowCount: 2400000, columns: [{ name: "order_id", type: "int, primary key" }, { name: "customer_id", type: "int" }], indexes: [{ name: "orders_pkey", type: "btree, unique", columns: ["order_id"] }] },
    { name: "customers", rowCount: 180000, columns: [{ name: "customer_id", type: "int, primary key" }], indexes: [] },
  ],
  relationships: [{ from: { table: "orders" }, to: { table: "customers" } }],
  slowQuery: {
    sql: "SELECT * FROM orders WHERE customer_id = 1;",
    currentPlan: { planText: "Seq Scan on orders (actual time=812.4..812.6 rows=6)\nExecution Time: 814.2 ms", rowsScanned: 2400000, executionTimeMs: 814.2 },
  },
  candidateIndexes: [
    { id: "idx_a", ddl: "CREATE INDEX idx_orders_customer_id ON orders (customer_id);", table: "orders", columns: ["customer_id"], estimated: { planText: "Index Scan (actual time=4.2..48.9 rows=412)", rowsScanned: 412, executionTimeMs: 49.4 } },
  ],
}

test("generateAiScenario requires dashboard-specific fields (tables + slowQuery) and accepts a full valid response", async () => {
  const result = await generateAiScenario(
    { role: "Database Administrator", skill: "Query Optimization", difficulty: "Medium", workstation: "dashboard" },
    { callAi: async () => ({ ...VALID_CORE, ...VALID_DASHBOARD_EXTRAS }) }
  )
  assert.ok(result)
  assert.equal(result.content.tables.length, 2)
  assert.equal(result.content.tables[0].name, "orders")
  assert.equal(result.content.slowQuery.currentPlan.rowsScanned, 2400000)
  assert.equal(result.content.candidateIndexes.length, 1)
})

test("generateAiScenario rejects dashboard content missing tables", async () => {
  // eslint-disable-next-line no-unused-vars -- destructured only to exclude `tables` from `rest`
  const { tables, ...rest } = VALID_DASHBOARD_EXTRAS
  const result = await generateAiScenario(
    { role: "Database Administrator", skill: "Query Optimization", difficulty: "Medium", workstation: "dashboard" },
    { callAi: async () => ({ ...VALID_CORE, ...rest }) }
  )
  assert.equal(result, null)
})

test("generateAiScenario rejects dashboard content missing/zeroed slowQuery metrics", async () => {
  const result = await generateAiScenario(
    { role: "Database Administrator", skill: "Query Optimization", difficulty: "Medium", workstation: "dashboard" },
    { callAi: async () => ({ ...VALID_CORE, tables: VALID_DASHBOARD_EXTRAS.tables, slowQuery: { sql: "SELECT 1;", currentPlan: { planText: "x", rowsScanned: 0, executionTimeMs: 0 } } }) }
  )
  assert.equal(result, null)
})

test("generateAiScenario requires frontend_preview-specific fields (starterHtml + starterJs) and accepts a valid response", async () => {
  const result = await generateAiScenario(
    { role: "Frontend Developer", skill: "DOM Manipulation", difficulty: "Easy", workstation: "frontend_preview" },
    { callAi: async () => ({ ...VALID_CORE, starterHtml: "<button id=\"go\">Go</button>", starterCss: "button{color:red}", starterJs: "document.getElementById('go').onclick=()=>{}" }) }
  )
  assert.ok(result)
  assert.equal(result.content.starterHtml, "<button id=\"go\">Go</button>")
  assert.equal(result.content.starterJs, "document.getElementById('go').onclick=()=>{}")
})

test("generateAiScenario rejects frontend_preview content missing starterJs", async () => {
  const result = await generateAiScenario(
    { role: "Frontend Developer", skill: "DOM Manipulation", difficulty: "Easy", workstation: "frontend_preview" },
    { callAi: async () => ({ ...VALID_CORE, starterHtml: "<div></div>" }) }
  )
  assert.equal(result, null)
})

test("generateAiScenario returns null for missing required ctx (no role)", async () => {
  const result = await generateAiScenario({ skill: "X", difficulty: "Medium", workstation: "notebook" }, { callAi: async () => VALID_CORE })
  assert.equal(result, null)
})
