/**
 * workstationEngine.js
 * Real in-browser execution engine shared by Arena workstations.
 *
 *  ── SQL    : sql.js (SQLite compiled to WASM, lazy-loaded from CDN).
 *              Every mission gets a deterministic, seeded database so the
 *              data is realistic, reproducible, and validatable.
 *  ── Python : Pyodide (real CPython + pandas + matplotlib in WASM,
 *              lazy-loaded from CDN on first run).
 *  ── Truth  : ground-truth KPIs are computed from the same database the
 *              user queries, so "Validate Metrics" does a real comparison.
 *
 * Nothing in this module is mocked — queries genuinely execute and
 * Python genuinely runs.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Seeded RNG (deterministic per mission)
// ─────────────────────────────────────────────────────────────────────────────
function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario detection — drives what the dataset looks like
// ─────────────────────────────────────────────────────────────────────────────
const SCENARIOS = {
  ecom: {
    categories: ["Electronics", "Fashion", "Groceries", "Home & Kitchen", "Beauty"],
    products: {
      "Electronics":    [["Wireless Earbuds", 2499], ["Smartwatch", 5999], ["Bluetooth Speaker", 1899], ["Power Bank 20K", 1499], ["4K Action Cam", 12999]],
      "Fashion":        [["Denim Jacket", 2199], ["Running Shoes", 3499], ["Cotton Kurta", 899], ["Leather Belt", 699], ["Sunglasses", 1299]],
      "Groceries":      [["Organic Honey 1kg", 549], ["Premium Tea 500g", 425], ["Dry Fruits Combo", 1150], ["Olive Oil 2L", 999], ["Basmati Rice 5kg", 689]],
      "Home & Kitchen": [["Air Fryer", 4999], ["Mixer Grinder", 3299], ["Bedsheet Set", 1399], ["Non-stick Cookware", 2799], ["LED Desk Lamp", 849]],
      "Beauty":         [["Vitamin C Serum", 749], ["Hair Dryer", 1599], ["Perfume 100ml", 1899], ["Face Wash Pack", 449], ["Makeup Kit", 2299]],
    },
    statuses: [["Delivered", 0.78], ["Cancelled", 0.13], ["Returned", 0.09]],
  },
  fintech: {
    categories: ["UPI", "Card", "Netbanking", "Wallet", "EMI"],
    products: {
      "UPI":        [["UPI P2P Transfer", 850], ["UPI Merchant Pay", 1240], ["UPI Bill Pay", 1680], ["UPI Autopay", 599], ["UPI QR Pay", 920]],
      "Card":       [["Card Online Txn", 3450], ["Card POS Txn", 2150], ["Card Intl Txn", 8900], ["Card Subscription", 999], ["Card Fuel Txn", 1800]],
      "Netbanking": [["NB Utility Pay", 2400], ["NB Rent Pay", 18500], ["NB Insurance", 7200], ["NB Investment", 25000], ["NB Tax Pay", 12400]],
      "Wallet":     [["Wallet Recharge", 500], ["Wallet Transfer", 750], ["Wallet Shopping", 1320], ["Wallet Cashback Txn", 280], ["Wallet Travel", 2100]],
      "EMI":        [["EMI Electronics", 4999], ["EMI Furniture", 3500], ["EMI Mobile", 2750], ["EMI Appliance", 5400], ["EMI Travel", 6200]],
    },
    statuses: [["Delivered", 0.87], ["Cancelled", 0.08], ["Returned", 0.05]], // success / failed / refunded analog
  },
  saas: {
    categories: ["Enterprise", "Pro", "Team", "Starter", "Add-ons"],
    products: {
      "Enterprise": [["Enterprise Annual", 49999], ["Enterprise Monthly", 4999], ["Enterprise Seats Pack", 24999], ["SSO Module", 9999], ["Audit Logs", 7999]],
      "Pro":        [["Pro Annual", 11999], ["Pro Monthly", 1199], ["Pro Seats Pack", 5999], ["API Credits L", 3999], ["Priority Support", 2999]],
      "Team":       [["Team Annual", 5999], ["Team Monthly", 599], ["Team Seats Pack", 2999], ["API Credits M", 1999], ["Integrations Pack", 1499]],
      "Starter":    [["Starter Annual", 2399], ["Starter Monthly", 249], ["API Credits S", 999], ["Email Support", 499], ["Storage 100GB", 799]],
      "Add-ons":    [["Analytics Add-on", 1799], ["White-label", 8999], ["Custom Domain", 699], ["Backup Add-on", 1299], ["Training Session", 4999]],
    },
    statuses: [["Delivered", 0.85], ["Cancelled", 0.10], ["Returned", 0.05]],
  },
}

const CITIES = ["Bangalore", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad"]
const FIRST  = ["Aarav","Vivaan","Aditya","Ananya","Diya","Ishaan","Kavya","Rohan","Priya","Arjun","Sneha","Karan","Meera","Nikhil","Pooja","Rahul","Sanya","Varun","Tara","Yash"]
const LAST   = ["Sharma","Verma","Reddy","Iyer","Patel","Singh","Nair","Gupta","Das","Joshi","Kulkarni","Menon","Bose","Rao","Mehta"]

export function detectScenario(mission) {
  const text = `${mission?.title || ""} ${mission?.category || ""} ${mission?.description || ""}`.toLowerCase()
  if (/payment|razorpay|phonepe|upi|fintech|loan|transaction|bank/.test(text)) return "fintech"
  if (/mrr|saas|subscription|churn|plan|arr|signup/.test(text))                return "saas"
  return "ecom"
}

function missionKey(mission) {
  return String(mission?.id || mission?.title || "default-mission")
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic dataset generation
// ─────────────────────────────────────────────────────────────────────────────
// Six months ending in Q1 2024 — briefs reference "Q1 2024", so the data
// MUST contain it (challenge/dataset alignment, spec Contract A).
const MONTHS = [
  { label: "Oct", start: "2023-10", days: 31, lift: 0.95 },
  { label: "Nov", start: "2023-11", days: 30, lift: 1.05 },
  { label: "Dec", start: "2023-12", days: 31, lift: 1.35 }, // festive spike
  { label: "Jan", start: "2024-01", days: 31, lift: 0.98 },
  { label: "Feb", start: "2024-02", days: 29, lift: 1.10 },
  { label: "Mar", start: "2024-03", days: 31, lift: 1.22 },
]

export function buildDataset(mission) {
  const key      = missionKey(mission)
  const scenKey  = detectScenario(mission)
  const scen     = SCENARIOS[scenKey]
  const rand     = mulberry32(hashString(key))
  const pick     = arr => arr[Math.floor(rand() * arr.length)]

  // customers
  const customers = []
  for (let i = 1; i <= 180; i++) {
    customers.push({
      customer_id: 1000 + i,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      city: pick(CITIES),
      signup_date: `2023-0${1 + Math.floor(rand() * 9)}-${String(1 + Math.floor(rand() * 28)).padStart(2, "0")}`,
    })
  }

  // products
  const products = []
  let pid = 1
  for (const cat of scen.categories) {
    for (const [name, price] of scen.products[cat]) {
      products.push({ product_id: 200 + pid++, name, category: cat, price })
    }
  }

  // orders — volume scales with monthly lift so trends are real
  const orders = []
  let oid = 1
  const baseOrdersPerMonth = 130
  const statusFor = () => {
    const r = rand()
    let acc = 0
    for (const [s, p] of scen.statuses) { acc += p; if (r <= acc) return s }
    return scen.statuses[0][0]
  }
  for (const m of MONTHS) {
    const n = Math.round(baseOrdersPerMonth * m.lift + rand() * 14)
    for (let i = 0; i < n; i++) {
      const prod = pick(products)
      const cust = pick(customers)
      const qty  = 1 + (rand() < 0.22 ? 1 : 0) + (rand() < 0.06 ? 1 : 0)
      orders.push({
        order_id:    `ORD-${String(oid++).padStart(5, "0")}`,
        customer_id: cust.customer_id,
        product_id:  prod.product_id,
        order_date:  `${m.start}-${String(1 + Math.floor(rand() * m.days)).padStart(2, "0")}`,
        quantity:    qty,
        amount:      Math.round(prod.price * qty * (0.92 + rand() * 0.16)),
        category:    prod.category,
        status:      statusFor(),
        city:        cust.city,
      })
    }
  }
  orders.sort((a, b) => a.order_date.localeCompare(b.order_date))

  // Intentional, *real* data-quality issues users must notice
  const issueIdx = (n) => 5 + Math.floor(rand() * (orders.length - 10) / n)
  for (let k = 0; k < 4; k++) orders[issueIdx(4) + k * 37].amount = null        // NULLs
  orders[60].order_id = orders[40].order_id                                     // duplicate id
  orders[120].order_id = orders[90].order_id                                    // duplicate id
  for (let k = 0; k < 6; k++) {                                                 // casing issues
    const o = orders[30 + k * 55]
    if (o) o.city = o.city.toLowerCase()
  }

  return { scenKey, customers, products, orders }
}

// ─────────────────────────────────────────────────────────────────────────────
// sql.js loading + per-mission DB cache
// ─────────────────────────────────────────────────────────────────────────────
const SQLJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3"
let sqlJsPromise = null
const dbCache = new Map()

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      if (existing.dataset.loaded) return resolve()
      existing.addEventListener("load", resolve)
      existing.addEventListener("error", reject)
      return
    }
    const s = document.createElement("script")
    s.src = src
    s.onload = () => { s.dataset.loaded = "1"; resolve() }
    s.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(s)
  })
}

export function loadSqlJs() {
  if (!sqlJsPromise) {
    sqlJsPromise = injectScript(`${SQLJS_CDN}/sql-wasm.min.js`)
      .then(() => window.initSqlJs({ locateFile: f => `${SQLJS_CDN}/${f}` }))
      .catch(e => { sqlJsPromise = null; throw e })
  }
  return sqlJsPromise
}

export async function getMissionDb(mission) {
  const key = missionKey(mission)
  if (dbCache.has(key)) return dbCache.get(key)

  const SQL = await loadSqlJs()
  const ds  = buildDataset(mission)
  const db  = new SQL.Database()

  db.run(`
    CREATE TABLE customers (customer_id INTEGER PRIMARY KEY, name TEXT, city TEXT, signup_date TEXT);
    CREATE TABLE products  (product_id INTEGER PRIMARY KEY, name TEXT, category TEXT, price REAL);
    CREATE TABLE orders    (order_id TEXT, customer_id INTEGER, product_id INTEGER, order_date TEXT,
                            quantity INTEGER, amount REAL, category TEXT, status TEXT, city TEXT);
  `)

  const insC = db.prepare("INSERT INTO customers VALUES (?,?,?,?)")
  ds.customers.forEach(c => insC.run([c.customer_id, c.name, c.city, c.signup_date]))
  insC.free()

  const insP = db.prepare("INSERT INTO products VALUES (?,?,?,?)")
  ds.products.forEach(p => insP.run([p.product_id, p.name, p.category, p.price]))
  insP.free()

  const insO = db.prepare("INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?)")
  ds.orders.forEach(o => insO.run([o.order_id, o.customer_id, o.product_id, o.order_date, o.quantity, o.amount, o.category, o.status, o.city]))
  insO.free()

  const entry = { db, dataset: ds }
  dbCache.set(key, entry)
  return entry
}

// ─────────────────────────────────────────────────────────────────────────────
// Query execution + schema introspection
// ─────────────────────────────────────────────────────────────────────────────
const MAX_DISPLAY_ROWS = 500

export async function runQuery(mission, sql) {
  const { db } = await getMissionDb(mission)
  const t0 = performance.now()
  let raw
  try {
    raw = db.exec(sql)
  } catch (e) {
    const err = new Error(e.message || String(e))
    err.isSqlError = true
    throw err
  }
  const ms = Math.max(1, Math.round(performance.now() - t0))
  const resultSets = (raw || []).map(rs => ({
    columns: rs.columns,
    values: rs.values.slice(0, MAX_DISPLAY_ROWS),
    rowCount: rs.values.length,
    truncated: rs.values.length > MAX_DISPLAY_ROWS,
  }))
  return { resultSets, ms }
}

export async function getSchema(mission) {
  const { db } = await getMissionDb(mission)
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")[0]?.values.map(v => v[0]) || []
  return tables.map(t => {
    const cols = db.exec(`PRAGMA table_info(${t})`)[0]?.values.map(v => ({ name: v[1], type: v[2] })) || []
    const count = db.exec(`SELECT COUNT(*) FROM ${t}`)[0]?.values[0][0] ?? 0
    return { table: t, columns: cols, rowCount: count }
  })
}

export async function getDataQuality(mission) {
  const { db } = await getMissionDb(mission)
  const one = (sql) => db.exec(sql)[0]?.values[0][0] ?? 0
  const nulls  = one("SELECT COUNT(*) FROM orders WHERE amount IS NULL")
  const dups   = one("SELECT COUNT(*) FROM (SELECT order_id FROM orders GROUP BY order_id HAVING COUNT(*) > 1)")
  const casing = one("SELECT COUNT(*) FROM (SELECT LOWER(city) lc FROM orders GROUP BY lc HAVING COUNT(DISTINCT city) > 1)")
  const dMin   = one("SELECT MIN(order_date) FROM orders")
  const dMax   = one("SELECT MAX(order_date) FROM orders")
  return [
    { icon: "📅", label: `Data coverage: ${dMin} → ${dMax} — filter your queries to THIS window`, fixed: true },
    { icon: "⚠️", label: `${nulls} NULL values in amount column`, fixed: nulls === 0 },
    { icon: "⚠️", label: `${dups} duplicate order_id value${dups === 1 ? "" : "s"} detected`, fixed: dups === 0 },
    { icon: casing > 0 ? "⚠️" : "✅", label: casing > 0 ? `Inconsistent casing in ${casing} city name${casing === 1 ? "" : "s"} (e.g. 'bangalore' vs 'Bangalore')` : "City casing is consistent", fixed: casing === 0 },
    { icon: "✅", label: "Date format: all rows match YYYY-MM-DD", fixed: true },
    { icon: "✅", label: "No missing customer_id values", fixed: true },
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Ground truth — computed from the same DB the user queries
// ─────────────────────────────────────────────────────────────────────────────
export async function getGroundTruth(mission) {
  const { db } = await getMissionDb(mission)
  const q = (sql) => db.exec(sql)[0]?.values || []
  const one = (sql) => db.exec(sql)[0]?.values[0][0] ?? 0

  const totalOrdersAll    = one("SELECT COUNT(*) FROM orders")
  const totalOrdersValid  = one("SELECT COUNT(*) FROM orders WHERE status != 'Cancelled'")
  const revenueAll        = one("SELECT SUM(amount) FROM orders WHERE amount IS NOT NULL")
  const revenueValid      = one("SELECT SUM(amount) FROM orders WHERE amount IS NOT NULL AND status != 'Cancelled'")
  const revenueDelivered  = one("SELECT SUM(amount) FROM orders WHERE amount IS NOT NULL AND status = 'Delivered'")
  const aovAll            = one("SELECT AVG(amount) FROM orders WHERE amount IS NOT NULL")
  const aovValid          = one("SELECT AVG(amount) FROM orders WHERE amount IS NOT NULL AND status != 'Cancelled'")

  const monthly = q(`
    SELECT strftime('%Y-%m', order_date) ym, SUM(amount) revenue, COUNT(*) orders
    FROM orders WHERE amount IS NOT NULL
    GROUP BY ym ORDER BY ym
  `).map(([ym, revenue, orders]) => ({ ym, revenue, orders }))

  const monthlyValid = q(`
    SELECT strftime('%Y-%m', order_date) ym, SUM(amount) revenue, COUNT(*) orders
    FROM orders WHERE amount IS NOT NULL AND status != 'Cancelled'
    GROUP BY ym ORDER BY ym
  `).map(([ym, revenue, orders]) => ({ ym, revenue, orders }))

  const topProducts = q(`
    SELECT p.name, SUM(o.amount) revenue, SUM(o.quantity) units
    FROM orders o JOIN products p ON p.product_id = o.product_id
    WHERE o.amount IS NOT NULL
    GROUP BY p.name ORDER BY revenue DESC LIMIT 5
  `).map(([name, revenue, units]) => ({ name, revenue, units }))

  const byCategory = q(`
    SELECT category, SUM(amount) revenue FROM orders
    WHERE amount IS NOT NULL GROUP BY category ORDER BY revenue DESC
  `).map(([name, revenue]) => ({ name, revenue }))

  const last = monthly[monthly.length - 1], prev = monthly[monthly.length - 2]
  const momGrowth = prev ? ((last.revenue - prev.revenue) / prev.revenue) * 100 : 0

  return {
    totalOrders: { candidates: [totalOrdersAll, totalOrdersValid] },
    totalRevenue: { candidates: [revenueAll, revenueValid, revenueDelivered] },
    avgOrderValue: { candidates: [aovAll, aovValid] },
    momGrowth,
    monthly, monthlyValid, topProducts, byCategory,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric validation — compares the user's published results to ground truth
// ─────────────────────────────────────────────────────────────────────────────
function extractNumbers(resultSet) {
  const out = []
  if (!resultSet) return out
  for (const row of resultSet.values || []) {
    for (const cell of row) {
      if (cell === null || cell === undefined) continue
      const n = typeof cell === "number" ? cell : parseFloat(String(cell).replace(/[₹,%\s,]/g, ""))
      if (Number.isFinite(n)) out.push(n)
    }
  }
  return out
}

const within = (a, b, tolPct = 1.5) =>
  b !== 0 ? Math.abs(a - b) / Math.abs(b) <= tolPct / 100 : Math.abs(a) < 1e-6

function numbersContain(numbers, candidates, tolPct) {
  for (const c of candidates) {
    if (numbers.some(n => within(n, c, tolPct))) return c
  }
  return null
}

const fmt = (n) => (Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-IN") : (Math.round(n * 100) / 100).toString())

export async function validateMetrics(mission, published) {
  const gt = await getGroundTruth(mission)
  const results = []
  const kpiNums = extractNumbers(published?.kpi)

  const kpiChecks = [
    { metric: "Total Revenue",    candidates: gt.totalRevenue.candidates },
    { metric: "Total Orders",     candidates: gt.totalOrders.candidates },
    { metric: "Avg Order Value",  candidates: gt.avgOrderValue.candidates },
  ]
  for (const c of kpiChecks) {
    if (!published?.kpi) {
      results.push({ passed: false, input: c.metric, expected: fmt(c.candidates[0]), actual: "no KPI result published" })
      continue
    }
    const hit = numbersContain(kpiNums, c.candidates, 1.5)
    results.push({
      passed: hit !== null,
      input: c.metric,
      expected: fmt(c.candidates[0]),
      actual: hit !== null ? `found ${fmt(hit)} ✓` : "not found in your KPI result",
    })
  }

  // Trend: user's trend result should contain a numeric series matching monthly revenue or order counts
  if (!published?.trend) {
    results.push({ passed: false, input: "Monthly trend (6 points)", expected: "6 monthly values", actual: "no trend result published" })
  } else {
    const rs = published.trend
    const numericCols = []
    ;(rs.columns || []).forEach((col, ci) => {
      const vals = (rs.values || []).map(r => {
        const v = r[ci]
        const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[₹,%\s,]/g, ""))
        return Number.isFinite(n) ? n : null
      })
      if (vals.length && vals.every(v => v !== null)) numericCols.push(vals)
    })
    const truthSeries = [
      gt.monthly.map(m => m.revenue), gt.monthlyValid.map(m => m.revenue),
      gt.monthly.map(m => m.orders),  gt.monthlyValid.map(m => m.orders),
    ]
    const seriesMatch = numericCols.some(col =>
      truthSeries.some(ts => ts.length === col.length && ts.every((v, i) => within(col[i], v, 2)))
    )
    results.push({
      passed: seriesMatch,
      input: "Monthly trend (6 points)",
      expected: `revenue ${gt.monthly.map(m => fmt(m.revenue)).join(", ")}`,
      actual: seriesMatch ? "series matches ground truth ✓" : `${rs.rowCount} rows published — values don't match monthly aggregates`,
    })
  }

  // Breakdown: category names or segment labels should appear
  if (!published?.breakdown) {
    results.push({ passed: false, input: "Breakdown (category / segment)", expected: "grouped result", actual: "no breakdown result published" })
  } else {
    const text = JSON.stringify(published.breakdown.values || []).toLowerCase()
    const catHits = gt.byCategory.filter(c => text.includes(c.name.toLowerCase())).length
    const segHit  = /high|mid|low/.test(text)
    const passed  = catHits >= 3 || segHit
    results.push({
      passed,
      input: "Breakdown (category / segment)",
      expected: segHit ? "High / Mid / Low segments" : `categories: ${gt.byCategory.map(c => c.name).join(", ")}`,
      actual: passed ? "breakdown groups detected ✓" : "no recognizable groups in published result",
    })
  }

  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKSPACE BUS — the renderer ⇄ shell contract (spec §19.2, adapted to Vite).
// Workstations register handlers; the universal shell invokes them through
// the four-slot action bar. A workstation that registers nothing still works:
// the shell falls back to honest generic behaviour (completeness validator,
// code-based proof draft) and says so in the UI.
// ─────────────────────────────────────────────────────────────────────────────
let activeValidator = null   // () => Promise<[{passed,input,expected,actual}]>
let activeRunner    = null   // () => Promise<void>  (renderer renders its own effects)
let activeProof     = null   // () => ProofDraft

export function registerValidator(fn) {
  activeValidator = fn
  return () => { if (activeValidator === fn) activeValidator = null }
}
export function registerRunner(fn) {
  activeRunner = fn
  return () => { if (activeRunner === fn) activeRunner = null }
}
export function registerProofProvider(fn) {
  activeProof = fn
  return () => { if (activeProof === fn) activeProof = null }
}
export function hasActiveValidator() { return !!activeValidator }
export function hasActiveRunner()    { return !!activeRunner }

export async function runActiveValidator() {
  if (!activeValidator) return null   // shell falls back to generic validation
  return activeValidator()
}
export async function runActiveRunner() {
  if (!activeRunner) return null
  return activeRunner()
}

/**
 * ProofDraft = { headline, artifacts: [{type:'snapshot'|'code'|'report'|'narrative'|'image',
 *                label, content, lang?}] }
 * Falls back to a code artifact built from the live draft.
 */
export function buildProofDraft({ mission, code, validation }) {
  if (activeProof) {
    try {
      const d = activeProof()
      if (d && d.artifacts?.length) return d
    } catch { /* fall through to generic */ }
  }
  const artifacts = []
  if (code?.trim()) artifacts.push({ type: "code", label: "Your solution (work in progress)", content: code })
  if (validation?.length) {
    artifacts.push({
      type: "report", label: "Last validation",
      content: validation.map(v => `${v.passed ? "✅" : "❌"} ${v.input}${v.actual ? ` — ${v.actual}` : ""}`).join("\n"),
    })
  }
  return { headline: mission?.title || "Attempt", artifacts }
}

/**
 * Generic completeness validator — the honest fallback when a workstation has
 * no domain validator registered. Checks structure, not correctness, and its
 * labels say so.
 */
export function genericCompletenessChecks({ code, mission }) {
  const lines = (code || "").split("\n").map(l => l.trim()).filter(Boolean)
  const meaningful = lines.filter(l =>
    !l.startsWith("--") && !l.startsWith("#") && !l.startsWith("//") &&
    !l.startsWith("/*") && !l.startsWith("*"))
  const todos = lines.filter(l => /TODO|IMPLEMENT|FIXME/i.test(l)).length
  const steps = mission?.steps || []
  const text  = (code || "").toLowerCase()
  const stepHits = steps.filter(s => {
    const kws = String(s).toLowerCase().match(/[a-z_]{5,}/g) || []
    return kws.some(k => text.includes(k))
  }).length

  const results = [
    { passed: meaningful.length >= 5, input: "Substantive work present (structure check)",
      expected: "≥5 meaningful lines", actual: `${meaningful.length} lines written` },
    { passed: todos === 0, input: "No TODO / FIXME markers left (structure check)",
      expected: "0 markers", actual: `${todos} remaining` },
  ]
  if (steps.length) {
    results.push({
      passed: stepHits >= Math.ceil(steps.length / 2),
      input: `Brief steps addressed (keyword scan, ${steps.length} steps)`,
      expected: `≥${Math.ceil(steps.length / 2)} steps referenced`,
      actual: `${stepHits} referenced`,
    })
  }
  results.push({ passed: true, input: "Quality & correctness", expected: "scored at submission (AI rubric)", actual: "not checkable pre-submit", info: true })
  return results
}

// ─────────────────────────────────────────────────────────────────────────────
// Pyodide — real Python (pandas + matplotlib) in the browser
// ─────────────────────────────────────────────────────────────────────────────
const PYODIDE_CDN = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full"
let pyodidePromise = null
export function isPythonLoaded() { return !!pyodidePromise }

export function loadPython(onStatus) {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      onStatus?.("Downloading Python runtime (first run only)…")
      await injectScript(`${PYODIDE_CDN}/pyodide.js`)
      const py = await window.loadPyodide({ indexURL: `${PYODIDE_CDN}/` })
      onStatus?.("Loading pandas + matplotlib…")
      await py.loadPackage(["pandas", "matplotlib"])
      try { py.FS.mkdir("/data") } catch { /* exists */ }
      return py
    })().catch(e => { pyodidePromise = null; throw e })
  }
  return pyodidePromise
}

export function datasetToCsv(mission) {
  const ds = buildDataset(mission)
  const header = "order_id,customer_id,product_id,order_date,quantity,amount,category,status,city"
  const lines = ds.orders.map(o =>
    [o.order_id, o.customer_id, o.product_id, o.order_date, o.quantity, o.amount ?? "", o.category, o.status, o.city].join(",")
  )
  return `${header}\n${lines.join("\n")}`
}

const PY_RUNNER = `
import sys, io, json, base64, traceback
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import pandas as pd

plt.close('all')
__buf = io.StringIO()
__old_stdout = sys.stdout
sys.stdout = __buf
__error = None
try:
    df = pd.read_csv('/data/orders.csv', parse_dates=['order_date'])
    exec(compile(__USER_CODE, '<your code>', 'exec'), globals())
except Exception:
    __error = traceback.format_exc()
finally:
    sys.stdout = __old_stdout

__images = []
for __n in plt.get_fignums():
    __b = io.BytesIO()
    plt.figure(__n).savefig(__b, format='png', dpi=110, bbox_inches='tight')
    __images.append(base64.b64encode(__b.getvalue()).decode())
plt.close('all')

json.dumps({'stdout': __buf.getvalue(), 'error': __error, 'images': __images})
`

/**
 * Runs real Python. The mission's seeded dataset is mounted at
 * /data/orders.csv (also /data/raw.csv) and preloaded as `df`.
 * Returns { stdout, error, images: [base64Png…] }.
 */
export async function runPython(mission, code, onStatus) {
  const py = await loadPython(onStatus)
  onStatus?.("Running your code…")
  const csv = datasetToCsv(mission)
  py.FS.writeFile("/data/orders.csv", csv)
  py.FS.writeFile("/data/raw.csv", csv)
  py.globals.set("__USER_CODE", code)
  const raw = await py.runPythonAsync(PY_RUNNER)
  return JSON.parse(raw)
}

// ─────────────────────────────────────────────────────────────────────────────
// Display helpers shared by workstations
// ─────────────────────────────────────────────────────────────────────────────
export function formatCell(v) {
  if (v === null || v === undefined) return "NULL"
  if (typeof v === "number" && !Number.isInteger(v)) return (Math.round(v * 100) / 100).toLocaleString("en-IN")
  if (typeof v === "number") return v.toLocaleString("en-IN")
  return String(v)
}

export function formatMetric(value, columnName = "") {
  if (value === null || value === undefined) return "—"
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[₹,\s,]/g, ""))
  if (!Number.isFinite(n)) return String(value)
  const isMoney = /rev|amount|value|spend|mrr|price|gmv/i.test(columnName)
  const isPct   = /pct|percent|growth|rate/i.test(columnName)
  if (isPct)  return `${(Math.round(n * 10) / 10).toLocaleString("en-IN")}%`
  if (isMoney) {
    if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`
    if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
    return `₹${Math.round(n).toLocaleString("en-IN")}`
  }
  return Math.abs(n) >= 1000 ? Math.round(n).toLocaleString("en-IN") : (Math.round(n * 100) / 100).toString()
}
