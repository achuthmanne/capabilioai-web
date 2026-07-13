// Routes: POST /api/generate-mcq, /api/analyse-assessment, /api/analyse-professional-profile
//
// generate-mcq:                 Groq llama-3.3-70b-versatile (primary, no strict json mode)
//                               → llama-3.1-8b-instant on 429 (auto-fallback in groq.js)
// analyse-assessment:           Claude Haiku → Groq fallback  (user reads this feedback)
// analyse-professional-profile: Claude Sonnet → Groq fallback (career intelligence)

import { Router } from "express"
import { groq, GROQ_FAST } from "../lib/groq.js"
import { claude, CLAUDE_HAIKU, CLAUDE_SONNET } from "../lib/claude.js"

const router = Router()

const hasClaude = () => process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "your_anthropic_key_here"

// ─── Helper: try Claude, fall back to Groq ────────────────────────────────────
async function claudeOrGroq(messages, { model = CLAUDE_HAIKU, groqMaxTokens = 1000 } = {}) {
  if (hasClaude()) {
    try { return await claude(messages, { model, maxTokens: groqMaxTokens, json: true }) }
    catch (e) { console.warn("[assessment] Claude failed, falling back to Groq:", e.message) }
  }
  const raw = await groq(
    messages.map(m => ({ role: m.role, content: m.content })),
    { max_tokens: groqMaxTokens, json: true }
  )
  try { return JSON.parse(raw) } catch { return {} }
}

// ─── Domain skill map — mirrors Aura.jsx domainSkillsMap exactly ─────────────
// CRITICAL: category names in MCQs MUST match these exactly so radar aligns.
const DOMAIN_SKILLS = {
  // ── IT / CS domains ──────────────────────────────────────────────────────────
  "Data Analyst":     ["SQL","Python","Data Cleaning","Exploratory Data Analysis","Data Visualization","Statistical Analysis","A/B Testing","Business Intelligence","Funnel Analysis","KPI Reporting","Dashboard Design","Storytelling with Data"],
  "Full-Stack":       ["React","Node.js","TypeScript","SQL","REST APIs","Authentication","State Management","Testing","System Design","Performance","Deployment","CSS"],
  "Frontend":         ["React","TypeScript","JavaScript","CSS / Tailwind","HTML","State Management","Web Performance","Accessibility (WCAG)","Testing (Jest/RTL)","Design Systems","API Integration","Responsive Design"],
  "Backend":          ["Node.js / Express","REST API Design","Authentication (JWT/OAuth)","Caching (Redis)","Message Queues","Database Queries","Rate Limiting","Pagination","Microservices","Testing (Supertest)","Performance","Error Handling"],
  "DevOps":           ["Docker","Kubernetes","CI/CD Pipelines","Terraform / IaC","Linux & Bash","Monitoring (Prometheus/Grafana)","Helm Charts","SRE Practices","Incident Management","Cloud Platforms","Networking","Security & Secrets"],
  "DBA":              ["Query Optimisation","Index Strategy","Schema Design","Stored Procedures","Performance Tuning","Backup & Recovery","Replication","Schema Migration","EXPLAIN / Query Plans","PL/SQL / T-SQL","Data Integrity","High Availability"],
  "Software Developer":["Data Structures","Algorithms","OOP Concepts","System Design","Database Basics","REST APIs","Version Control (Git)","Testing","Problem Solving","Design Patterns","Time Complexity","Debugging"],
  "Machine Learning": ["Python","NumPy / Pandas","Scikit-learn","Model Evaluation","Feature Engineering","Neural Networks","Data Preprocessing","Statistics","Regression / Classification","Deep Learning Basics","Model Deployment","Experiment Tracking"],
  "Android Developer":["Kotlin","Java","Android SDK","Jetpack Compose","MVVM Architecture","Room Database","Retrofit","Coroutines","UI/UX Design","Testing","Push Notifications","Play Store Deployment"],
  "iOS Developer":    ["Swift","Xcode","UIKit","SwiftUI","Core Data","Networking (URLSession)","MVC/MVVM","Auto Layout","Push Notifications","App Store Deployment","Testing (XCTest)","Memory Management"],
  "Cybersecurity":    ["Network Security","Linux","Ethical Hacking Basics","OWASP Top 10","Cryptography","Firewalls & IDS","Penetration Testing","Vulnerability Assessment","Security Auditing","Incident Response","Compliance (ISO 27001)","SIEM Tools"],
  "Cloud Engineer":   ["AWS / Azure / GCP","IAM & Security","Compute (EC2/VMs)","Storage (S3/Blob)","Networking (VPC)","Containers (ECS/AKS)","Serverless","Monitoring (CloudWatch)","Infrastructure as Code","Cost Optimisation","Databases","CI/CD"],

  // ── ECE role-specific domains ─────────────────────────────────────────────────
  "ECE Embedded":    ["ARM Cortex Architecture","Embedded C / Bare-Metal","RTOS (FreeRTOS / Zephyr)","Device Drivers & HAL","Interrupt Handling","Memory Management (MMU / MPU)","Bootloader & Startup Code","SPI / I2C / UART Protocols","CAN & LIN Bus","Debugging (JTAG / OpenOCD)","Low-Power Design","Firmware Over-the-Air (FOTA)"],
  "ECE VLSI":        ["Digital Logic Design","Verilog / SystemVerilog","VHDL","RTL Design & Synthesis","Static Timing Analysis","Floorplanning & Placement","Clock Tree Synthesis","DRC / LVS / ERC","UVM Verification","ASIC Design Flow","FPGA Implementation","Low-Power VLSI Techniques"],
  "ECE RF":          ["RF Circuit Design","Transmission Line Theory","Antenna Design & Parameters","Microwave Amplifiers","Filter Design (RF)","S-Parameters & Smith Chart","Impedance Matching","Signal Propagation & Path Loss","Modulation Techniques (AM/FM/QAM)","RF System Link Budget","PCB Layout for RF","Spectrum Analyzer Usage"],
  "ECE IoT":         ["MQTT & CoAP Protocols","Arduino & Raspberry Pi","Sensor Integration & Calibration","BLE / Zigbee / LoRa","IoT Cloud Platforms (AWS IoT / Azure IoT)","Edge Computing","Embedded C for IoT","Python for IoT","Security in IoT","OTA Firmware Updates","Data Acquisition & Processing","Real-Time Operating Systems"],
  "ECE Telecom":     ["Digital Communication Systems","Modulation & Demodulation","5G NR Architecture","LTE / 4G Fundamentals","OFDM & Channel Coding","Network Protocols (TCP/IP)","Signal Processing (DSP)","Antenna Arrays & MIMO","RF Link Budget","Optical Fiber Communication","Error Detection & Correction","Wireless Network Planning"],
  "ECE":             ["Digital Electronics","Analog Circuits","Microcontrollers (ARM/AVR)","Embedded C","Signals & Systems","Communication Systems","RTOS Basics","PCB Design Fundamentals","FPGA & VHDL Basics","Sensors & Interfacing","Wireless Communication","IoT Protocols"],

  // ── EEE role-specific domains ─────────────────────────────────────────────────
  "EEE Power":       ["Power System Analysis","Load Flow Studies","Fault Analysis & Short Circuit","Protection Relays (IDMT / Differential)","SCADA & EMS","Transmission Line Parameters","Transformer Design & Testing","Switchgear & Circuit Breakers","Earthing & Grounding","Power System Stability","Renewable Integration (Solar / Wind)","Smart Grid Concepts"],
  "EEE Machines":    ["DC Machines (Motor & Generator)","Induction Motors (3-phase)","Synchronous Machines","Transformer Equivalent Circuit","Starting & Speed Control Methods","Losses & Efficiency","Insulation & Thermal Rating","Testing of Electrical Machines","Motor Drive Fundamentals","Generator Protection","Special Machines (BLDC / PMSM)","IE3 / IE4 Efficiency Standards"],
  "EEE Control":     ["Transfer Functions & Block Diagrams","Stability Analysis (Routh-Hurwitz / Nyquist)","PID Controller Tuning","State Space Representation","Root Locus Technique","Bode & Nyquist Plots","PLC Programming (Ladder / FBD)","Industrial Automation (SCADA / DCS)","Servo & Stepper Motor Control","Feedback Control Systems","Digital Control Systems","Process Control Loops"],
  "EEE PE":          ["Power Converters (AC-DC / DC-DC)","MOSFET & IGBT Switching","PWM Techniques","Buck / Boost / Buck-Boost Converters","Inverter Design","Motor Drives (VFD)","Battery Management Systems","Inductive Power Transfer","Power Factor Correction","Heat Sink & Thermal Design","EMI / EMC in Power Electronics","SiC / GaN Devices"],
  "EEE Instrumentation": ["Sensors & Transducers","Signal Conditioning","Data Acquisition Systems (DAQ)","PLC & SCADA Programming","Industrial Protocols (Modbus / Profibus)","Calibration Techniques","Process Control Instruments","Flow / Pressure / Temperature Measurement","Electrical Safety & Hazardous Area","RTD & Thermocouple Selection","Industrial IoT (IIoT)","Control Valve Sizing"],
  "EEE":             ["Circuit Analysis","Electrical Machines","Power Systems","Control Systems","Power Electronics","Transformers & Transmission","Protection Systems","Renewable Energy Systems","PLC & SCADA Basics","Instrumentation & Measurement","Three-Phase Systems","High Voltage Engineering"],

  // ── Civil role-specific domains ───────────────────────────────────────────────
  "Civil Structural": ["Structural Analysis (Indeterminate)","RC Design (IS 456)","Steel Design (IS 800)","Pre-stressed Concrete","Matrix Methods & Stiffness","Finite Element Basics","Load Calculations (IS 875)","Seismic Design (IS 1893)","Yield Line Theory","Plate Girder Design","Connection Design (Bolted / Welded)","Structural Audit & Retrofitting"],
  "Civil Geo":        ["Soil Classification & Index Properties","Shear Strength (Mohr-Coulomb)","Consolidation & Settlement","Slope Stability Analysis","Earth Pressure Theories","Foundation Types & Design","Ground Improvement Techniques","Pile Foundation Analysis","Permeability & Seepage","Field & Laboratory Testing","Retaining Wall Design","Liquefaction Assessment"],
  "Civil Transport":  ["Highway Geometric Design","Pavement Design (IRC)","Traffic Volume Studies","Traffic Signal Design","Intersection & Roundabout Design","Sight Distance Calculations","Pavement Materials & Testing","Transport Planning & Modelling","Road Safety Engineering","Railway Track Design","Urban Road Design","GIS in Transportation"],
  "Civil Water":      ["Open Channel Flow (Manning's Equation)","Pipe Flow & Hazen-Williams","Hydrology & Rainfall Analysis","Reservoir & Dam Design","Irrigation Systems & Canal Design","Groundwater Hydrology","Wastewater Treatment Design","Water Supply System Design","Flood Routing Methods","Pump Selection & Design","Water Quality Standards","Hydropower Basics"],
  "Civil Construction":["CPM & PERT Scheduling","Resource Levelling & Crashing","Construction Contracts (FIDIC / NEC)","Estimation & Bill of Quantities","Concrete Mix Design (IS 10262)","Formwork Design & Planning","Construction Equipment Selection","Quality Control on Site","Site Safety (IS 18001)","EHS Management","Building Information Modelling (BIM)","Construction Dispute Resolution"],
  "Civil":            ["Structural Analysis","Concrete Technology","Soil Mechanics & Foundation","Surveying","Fluid Mechanics (Civil)","Transportation Engineering","Environmental Engineering","Construction Management","Steel Structures","Hydrology & Irrigation","Building Materials","Estimation & Costing"],

  // ── Mechanical role-specific domains ─────────────────────────────────────────
  "Mech Thermal":     ["Heat Transfer Modes (Conduction / Convection / Radiation)","Fins & Extended Surfaces","Heat Exchangers (LMTD / NTU)","Boilers & Steam Power Plants","Gas Turbine Cycles (Brayton)","Refrigeration Cycles (VCR)","HVAC System Design","Thermodynamic Property Tables","Combustion & Fuels","Numerical Methods in Heat Transfer","Thermal Insulation Design","Energy Audit & Conservation"],
  "Mech Fluid":       ["Fluid Statics & Pressure","Continuity, Bernoulli & Momentum Equations","Viscous Flow & Boundary Layer","Pipe Flow & Head Losses","Pumps & Turbines (Selection & Curves)","Centrifugal & Axial Fans","Compressible Flow (Mach Number)","CFD Fundamentals (Pre/Post-Processing)","Flow Measurement Devices","Hydraulic Machines","Cavitation & Water Hammer","Piping System Design"],
  "Mech Manufacturing":["Casting & Solidification","Forging, Rolling & Extrusion","Welding Processes (MIG / TIG / Friction)","Machining (Turning / Milling / Drilling)","CNC Programming (G-Code / M-Code)","Tolerances & Surface Finish (GD&T)","Jig & Fixture Design","Metrology & Quality Control","Lean Manufacturing & Kaizen","SPC & Six Sigma","Injection Moulding","Sheet Metal Processes (Bending / Stamping)"],
  "Mech Design":      ["Stress & Strain Analysis","Fatigue & Fracture Mechanics","Shafts, Keys & Couplings","Bearings (Rolling & Sliding)","Gears (Spur / Helical / Bevel)","Springs & Clutches","Pressure Vessel Design (ASME)","CAD Modelling (SolidWorks / CATIA)","FEA Fundamentals","Tolerance Stack-Up Analysis","Product Design for Manufacturing (DFM)","Failure Mode & Effect Analysis (FMEA)"],
  "Mechanical":       ["Thermodynamics","Fluid Mechanics","Strength of Materials","Manufacturing Processes","Machine Design","Heat Transfer","CAD & Engineering Drawing","Kinematics & Dynamics","Industrial Engineering","Material Science","Quality Control & Metrology","Refrigeration & HVAC"],

  // ── Other domains ─────────────────────────────────────────────────────────────
  "IoT":        ["Embedded C / C++","Arduino & Raspberry Pi","MQTT & CoAP Protocols","Sensor Integration","IoT Cloud Platforms","Network Protocols (BLE, Zigbee, LoRa)","Edge Computing","PCB & Circuit Design","Python for IoT","Data Acquisition & Processing","Security in IoT","Real-Time Operating Systems"],
  "Pharmacy":   ["Pharmaceutics","Pharmacology","Medicinal Chemistry","Drug Design & Discovery","Clinical Pharmacy","Pharmacokinetics & Pharmacodynamics","Drug Regulatory Affairs","Quality Assurance & GMP","Biopharmaceutics","Hospital & Community Pharmacy","Industrial Pharmacy","Pharmaceutical Analysis"],
  "MBA":        ["Management Principles","Financial Accounting","Marketing Management","Business Strategy","Operations Management","Human Resource Management","Business Analytics","Financial Management","Entrepreneurship","Business Law & Ethics","Supply Chain Management","Organisational Behaviour"],
}

// ── Branch → domain key (branch-based fallback when jobTitle keyword misses) ──
const BRANCH_DOMAIN_KEY = {
  ECE: "ECE", EEE: "EEE", Mechanical: "Mechanical", Civil: "Civil",
  IoT: "IoT", Pharmacy: "Pharmacy", MBA: "MBA",
}

function getDomainSkills(jobTitle, branch = "") {
  const k = (jobTitle || "").toLowerCase()

  // ── IT / CS role detection ──────────────────────────────────────────────────
  if (k.includes("data analyst") || k.includes("analytics")) return DOMAIN_SKILLS["Data Analyst"]
  if (k.includes("machine learning") || k.includes("ml engineer") || k.includes("ai engineer") || k.includes("deep learning")) return DOMAIN_SKILLS["Machine Learning"]
  if (k.includes("frontend") || k.includes("front-end") || k.includes("react developer") || k.includes("ui developer")) return DOMAIN_SKILLS["Frontend"]
  if (k.includes("backend") || k.includes("back-end") || k.includes("api developer")) return DOMAIN_SKILLS["Backend"]
  if (k.includes("devops") || k.includes("sre") || k.includes("platform engineer") || k.includes("infrastructure")) return DOMAIN_SKILLS["DevOps"]
  if (k.includes("dba") || k.includes("database admin")) return DOMAIN_SKILLS["DBA"]
  if (k.includes("android")) return DOMAIN_SKILLS["Android Developer"]
  if (k.includes("ios") || k.includes("swift developer")) return DOMAIN_SKILLS["iOS Developer"]
  if (k.includes("cyber") || k.includes("security engineer") || k.includes("ethical hack") || k.includes("penetration")) return DOMAIN_SKILLS["Cybersecurity"]
  if (k.includes("cloud")) return DOMAIN_SKILLS["Cloud Engineer"]
  if ((k.includes("full") && k.includes("stack")) || k.includes("software engineer") || k.includes("software developer") || k.includes("swe")) return DOMAIN_SKILLS["Full-Stack"]

  // ── ECE sub-roles (most specific first) ──────────────────────────────────────
  if (k.includes("vlsi") || k.includes("asic") || k.includes("rtl") || k.includes("physical design") || k.includes("timing") || k.includes("verilog") || k.includes("vhdl") || k.includes("fpga designer")) return DOMAIN_SKILLS["ECE VLSI"]
  if (k.includes("embedded") || k.includes("firmware") || k.includes("rtos") || k.includes("bare-metal") || k.includes("device driver") || k.includes("bootloader") || k.includes("microcontroller")) return DOMAIN_SKILLS["ECE Embedded"]
  if (k.includes("rf engineer") || k.includes("rf design") || k.includes("antenna") || k.includes("microwave") || k.includes("radio frequency")) return DOMAIN_SKILLS["ECE RF"]
  if (k.includes("telecom") || k.includes("wireless engineer") || k.includes("5g") || k.includes("4g") || k.includes("lte") || k.includes("signal processing engineer")) return DOMAIN_SKILLS["ECE Telecom"]
  if (k.includes("iot") || k.includes("internet of things")) return DOMAIN_SKILLS["ECE IoT"]
  if (k.includes("electronics engineer") || k.includes("hardware engineer") || k.includes("pcb") || k.includes("circuit design") || k.includes("ece")) return DOMAIN_SKILLS["ECE"]

  // ── EEE sub-roles ────────────────────────────────────────────────────────────
  if (k.includes("power system") || k.includes("transmission") || k.includes("distribution engineer") || k.includes("protection engineer") || k.includes("smart grid")) return DOMAIN_SKILLS["EEE Power"]
  if (k.includes("electrical machine") || k.includes("motor design") || k.includes("transformer design")) return DOMAIN_SKILLS["EEE Machines"]
  if (k.includes("control system") || k.includes("automation engineer") || k.includes("plc") || k.includes("scada engineer") || k.includes("control engineer")) return DOMAIN_SKILLS["EEE Control"]
  if (k.includes("power electronics") || k.includes("drives engineer") || k.includes("inverter") || k.includes("vfd")) return DOMAIN_SKILLS["EEE PE"]
  if (k.includes("instrumentation") || k.includes("measurement engineer") || k.includes("calibration")) return DOMAIN_SKILLS["EEE Instrumentation"]
  if (k.includes("electrical engineer") || k.includes("eee")) return DOMAIN_SKILLS["EEE"]

  // ── Civil sub-roles ──────────────────────────────────────────────────────────
  if (k.includes("structural engineer") || k.includes("structural analyst") || k.includes("structural designer")) return DOMAIN_SKILLS["Civil Structural"]
  if (k.includes("geotechnical") || k.includes("foundation engineer") || k.includes("soil engineer")) return DOMAIN_SKILLS["Civil Geo"]
  if (k.includes("transport") || k.includes("highway") || k.includes("traffic engineer") || k.includes("pavement")) return DOMAIN_SKILLS["Civil Transport"]
  if (k.includes("water resource") || k.includes("hydraulic engineer") || k.includes("hydrology") || k.includes("irrigation engineer")) return DOMAIN_SKILLS["Civil Water"]
  if (k.includes("construction manager") || k.includes("site engineer") || k.includes("quantity surveyor") || k.includes("project engineer")) return DOMAIN_SKILLS["Civil Construction"]
  if (k.includes("civil engineer") || k.includes("civil")) return DOMAIN_SKILLS["Civil"]

  // ── Mechanical sub-roles ─────────────────────────────────────────────────────
  if (k.includes("thermal engineer") || k.includes("heat transfer") || k.includes("hvac") || k.includes("refrigeration engineer")) return DOMAIN_SKILLS["Mech Thermal"]
  if (k.includes("fluid") || k.includes("cfd") || k.includes("piping engineer") || k.includes("hydraulic engineer")) return DOMAIN_SKILLS["Mech Fluid"]
  if (k.includes("manufacturing") || k.includes("production engineer") || k.includes("cnc") || k.includes("tooling")) return DOMAIN_SKILLS["Mech Manufacturing"]
  if (k.includes("machine design") || k.includes("product design engineer") || k.includes("mechanical designer") || k.includes("cad engineer")) return DOMAIN_SKILLS["Mech Design"]
  if (k.includes("mechanical engineer") || k.includes("mechanical")) return DOMAIN_SKILLS["Mechanical"]

  // ── Other professional roles ──────────────────────────────────────────────────
  if (k.includes("pharmacist") || k.includes("pharmacy") || k.includes("drug formulation")) return DOMAIN_SKILLS["Pharmacy"]
  if (k.includes("mba") || k.includes("business manager") || k.includes("operations manager") || k.includes("hr manager") || k.includes("marketing manager")) return DOMAIN_SKILLS["MBA"]

  // ── Branch-based fallback — only when keyword is too generic (e.g. just "Engineer") ──
  if (branch && BRANCH_DOMAIN_KEY[branch]) return DOMAIN_SKILLS[BRANCH_DOMAIN_KEY[branch]]

  // ── Default: generic software developer ─────────────────────────────────────
  return DOMAIN_SKILLS["Software Developer"]
}

// ─── 3. Generate MCQ ── Groq (generation, not user-visible analysis) ──────────
router.post("/generate-mcq", async (req, res) => {
  const { jobTitle="Software Developer", branch="", count=25, skills=[], resumeContext="", resumeSummary="" } = req.body

  // Get the EXACT skills for this domain — these become mandatory question categories
  // branch is the student's enrolled branch (ECE/EEE/Mechanical/Civil/etc.) used as fallback
  // when the jobTitle keyword alone doesn't resolve to a known non-IT domain.
  const domainSkills = getDomainSkills(jobTitle, branch)
  // Ensure every domain skill gets at least 1-2 questions for full radar coverage
  const questionsPerSkill = Math.max(1, Math.floor(count / domainSkills.length))
  const extra = count - (questionsPerSkill * domainSkills.length)

  // For non-IT/engineering domains, swap code_output for numerical/diagram questions
  const isEngineeringBranch = branch && ["ECE","EEE","Mechanical","Civil","IoT","Pharmacy","MBA"].includes(branch)
  // Detect engineering domain by keyword match (not just branch) so sub-role maps work too
  const isEngineeringRole = isEngineeringBranch ||
    (domainSkills === DOMAIN_SKILLS["ECE Embedded"] || domainSkills === DOMAIN_SKILLS["ECE VLSI"] ||
     domainSkills === DOMAIN_SKILLS["ECE RF"]       || domainSkills === DOMAIN_SKILLS["ECE IoT"]  ||
     domainSkills === DOMAIN_SKILLS["ECE Telecom"]  || domainSkills === DOMAIN_SKILLS["EEE Power"] ||
     domainSkills === DOMAIN_SKILLS["EEE Machines"] || domainSkills === DOMAIN_SKILLS["EEE Control"] ||
     domainSkills === DOMAIN_SKILLS["EEE PE"]       || domainSkills === DOMAIN_SKILLS["EEE Instrumentation"] ||
     domainSkills === DOMAIN_SKILLS["Civil Structural"] || domainSkills === DOMAIN_SKILLS["Civil Geo"] ||
     domainSkills === DOMAIN_SKILLS["Civil Transport"]  || domainSkills === DOMAIN_SKILLS["Civil Water"] ||
     domainSkills === DOMAIN_SKILLS["Civil Construction"] || domainSkills === DOMAIN_SKILLS["Mech Thermal"] ||
     domainSkills === DOMAIN_SKILLS["Mech Fluid"]   || domainSkills === DOMAIN_SKILLS["Mech Manufacturing"] ||
     domainSkills === DOMAIN_SKILLS["Mech Design"])
  const mix = isEngineeringRole
    ? { mcq: Math.round(count * 0.40), numerical: Math.round(count * 0.25), problem_solving: Math.round(count * 0.20), scenario: Math.round(count * 0.10), fill_blank: Math.round(count * 0.05), code_output: 0 }
    : { mcq: Math.round(count * 0.30), code_output: Math.round(count * 0.25), problem_solving: Math.round(count * 0.20), scenario: Math.round(count * 0.15), fill_blank: Math.round(count * 0.10), numerical: 0 }

  const summaryLine = resumeSummary ? `Candidate background: ${resumeSummary.slice(0,250)}` : ""
  const contextLine = resumeContext ? `Extra context: ${resumeContext.slice(0,300)}` : ""

  // ── Parse raw LLM string → questions array (handles all wrapper formats) ───
  function parseQuestions(raw) {
    if (!raw || typeof raw !== "string") return []

    // 1. Strip markdown code fences if present
    let text = raw.trim()
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim()

    // 2. Try parsing as-is
    let d
    try { d = JSON.parse(text) } catch {
      // 3. Try to fix a truncated JSON by finding the last complete object
      try {
        const lastBrace = text.lastIndexOf("},")
        if (lastBrace > 0) {
          const fixed = text.slice(0, lastBrace + 1) + "]}"
          d = JSON.parse(fixed)
        }
      } catch {}
      if (!d) return []
    }

    // 4. Extract array from any wrapper key
    if (Array.isArray(d)) return d
    for (const key of ["questions", "data", "result", "items", "mcqs", "quiz", "list"]) {
      if (Array.isArray(d[key])) return d[key]
    }
    const firstArr = Object.values(d).find(v => Array.isArray(v))
    return firstArr || []
  }

  // ── Validate + repair one question object ─────────────────────────────────
  function repairQuestion(q, idx, skills) {
    if (!q || typeof q !== "object" || !q.question) return null

    // If options came back as an object ({"a":"...","b":"..."}) convert to array
    if (q.options && !Array.isArray(q.options) && typeof q.options === "object") {
      q.options = Object.values(q.options).map(String)
    }

    // Strip letter prefixes "A) " / "1. " from options (frontend adds its own)
    if (Array.isArray(q.options)) {
      q.options = q.options
        .map(o => String(o).replace(/^[A-Ea-e1-4][).:\-\s]+\s*/, "").trim())
        .filter(o => o.length > 0 && !/^[A-Ea-e]$/.test(o)) // drop empty + bare-letter artifacts, keep "0","1","null" etc
    }

    // If options still missing/short — skip this question rather than show placeholders
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return null // will be filtered out; Groq fallback batch fills the gap
    }

    // Clamp correct index
    if (typeof q.correct !== "number" || q.correct < 0 || q.correct >= q.options.length) {
      q.correct = 0
    }

    // Ensure category matches a known skill
    if (!skills.includes(q.category)) {
      q.category = skills[idx % skills.length]
    }

    q.id = idx + 1
    return q
  }

  // ── Groq primary (llama-3.3-70b-versatile → llama-3.1-8b-instant on 429) ──────
  // No json:true — strict JSON mode causes json_validate_failed on the small model.
  // parseQuestions() handles plain-text JSON, code-fenced JSON, and truncated JSON.
  try {
    // Detect if this is a non-IT/engineering domain so we can set the right context
    const nonItDomainKey = branch && BRANCH_DOMAIN_KEY[branch] ? BRANCH_DOMAIN_KEY[branch] : null
    const isEngineeringDomain = nonItDomainKey && ["ECE","EEE","Mechanical","Civil","IoT"].includes(nonItDomainKey)
    const isNonItDomain = !!nonItDomainKey

    const raw = await groq([
      {
        role: "system",
        content: `You are an MCQ generator for Indian fresher job-role assessments (campus placement / entry-level hiring level).
TARGET ROLE: "${jobTitle}" — ALL questions must test knowledge and skills REQUIRED FOR THIS SPECIFIC ROLE.
${isNonItDomain ? `This is an engineering/core domain role. Do NOT generate generic software/programming/CS questions unless the role explicitly requires them.` : ""}
STRICT OUTPUT RULES:
- Return ONLY a raw JSON object. No markdown, no code fences, no explanation text.
- Top-level key must be "questions" with an array of exactly ${count} question objects.
- Each question: {"id":1,"type":"mcq","category":"<exact skill>","question":"...","options":["a","b","c","d"],"correct":0,"explanation":"..."}
- "options" MUST be an array of exactly 4 plain strings. Never omit.
- "correct" is 0-based index of the right answer.
- "category" must be one of the exact skill names given.
- Do NOT prefix options with "A)", "1.", etc.`,
      },
      {
        role: "user",
        content: `Generate ${count} fresher-level MCQs for a "${jobTitle}" role assessment.

These questions must test ROLE-SPECIFIC knowledge — what a "${jobTitle}" actually does on the job, not generic academic theory.

Skills to cover (use EXACTLY as category):
${domainSkills.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Each skill needs at least ${Math.max(1, Math.floor(count / domainSkills.length))} question(s).
Type mix: mcq:${mix.mcq}, ${isEngineeringBranch ? `numerical:${mix.numerical}` : `code_output:${mix.code_output}`}, problem_solving:${mix.problem_solving}, scenario:${mix.scenario}, fill_blank:${mix.fill_blank}
${summaryLine}
${contextLine}

${isEngineeringBranch
  ? `For numerical questions: present a real engineering problem (formula application, circuit calculation, design check); options are 4 numerical values with units.`
  : `For code_output questions: show a short code snippet (≤6 lines) and ask "What is the output?" — options are 4 possible outputs.`}
For scenario questions: describe a realistic on-the-job situation for a "${jobTitle}" and ask what action/approach is correct.
For fill_blank: use "___" in question text, options are 4 completions.
Never start a question with "Write a..." or "Create a..." — those are open-ended, not MCQ.

Return JSON now:`,
      },
    ], { max_tokens: 3500 })
    // 3500 keeps total tokens (prompt ~412 + output) well under llama-3.1-8b-instant's
    // hard 6000 TPM cap. llama-3.3-70b-versatile handles this fine at higher limits.

    console.log(`[generate-mcq] Groq raw length: ${raw?.length} chars`)

    const questions = parseQuestions(raw)
      .map((q, i) => repairQuestion(q, i, domainSkills))
      .filter(Boolean)

    console.log(`[generate-mcq] Groq: ${questions.length} valid questions for "${jobTitle}"`)
    if (questions.length < 3) throw new Error(`Only ${questions.length} valid questions from Groq. Raw: ${raw?.slice(0, 300)}`)
    return res.json({ questions: questions.slice(0, count), domainSkills })
  } catch (e) {
    console.error("[generate-mcq] ERROR:", e.message)
    res.status(500).json({ error: e.message })
  }
})

// ─── 4. Analyse Assessment ── Claude Haiku (user reads this output) ────────────
router.post("/analyse-assessment", async (req, res) => {
  const { keyword="Software Developer", score=0, total=25, pct=0, radarData=[], resumeContext="" } = req.body

  // Build a detailed skill-by-skill performance summary for the AI
  const skillBreakdown = radarData.map(d => {
    const level = d.value >= 80 ? "Strong" : d.value >= 60 ? "Good" : d.value >= 40 ? "Developing" : "Weak"
    return `${d.label}: ${d.value}% (${level})`
  }).join("\n")

  const strongSkills = radarData.filter(d => d.value >= 70).map(d => d.label)
  const weakSkills   = radarData.filter(d => d.value < 50).map(d => d.label)
  const midSkills    = radarData.filter(d => d.value >= 50 && d.value < 70).map(d => d.label)

  try {
    const messages = [
      {
        role: "user",
        content: `You are a senior career coach giving DETAILED, GENUINE feedback to a fresher ${keyword} candidate in India.
This is their first assessment — be honest, specific, and actionable. Do NOT be vague.

ASSESSMENT RESULTS:
Overall score: ${score}/${total} (${pct}%)
Per-skill performance:
${skillBreakdown}

Strong skills (≥70%): ${strongSkills.join(", ") || "none yet"}
Developing skills (50-69%): ${midSkills.join(", ") || "none"}
Weak skills (<50%): ${weakSkills.join(", ") || "none"}
${resumeContext ? `\nCandidate context: ${resumeContext.slice(0,400)}` : ""}

RULES for your response:
- Strengths: Name each strong/good skill specifically. Explain WHY it matters for ${keyword} jobs. Be concrete.
- Weak areas: For EACH weak skill, say exactly what they got wrong conceptually and what to study.
- Do NOT write generic things like "Keep practicing" — every point must be skill-specific.
- Resources: Match each resource to a specific weak skill. Use real free resources (YouTube, official docs, freeCodeCamp, etc.)
- Summary must be 3-4 sentences: honest about gaps, encouraging about strengths, clear next step.

Return ONLY this JSON (no markdown):
{
  "jobReadiness": <0-100>,
  "eloRating": <400-1200>,
  "eloAdjustment": <-15 to 15>,
  "summary": "<3-4 sentence honest assessment mentioning specific skills by name>",
  "strengths": [
    "<Skill name>: specific observation about what they demonstrated and why it matters for ${keyword} roles",
    "<Skill name>: specific observation",
    "<Skill name>: specific observation"
  ],
  "weakAreas": [
    "<Skill name>: exactly what conceptual gap was revealed and what to study to fix it",
    "<Skill name>: exactly what conceptual gap was revealed and what to study to fix it",
    "<Skill name>: exactly what conceptual gap was revealed and what to study to fix it"
  ],
  "skillInsights": [
    {"skill": "<skill name>", "score": <0-100>, "verdict": "Strong|Good|Developing|Needs Work", "tip": "<1 specific actionable tip for this skill>"}
  ],
  "resources": [
    {"title": "<specific resource name>", "type": "Video|Article|Practice|Course", "skill": "<which weak skill this fixes>", "url_hint": "<platform like YouTube/freeCodeCamp/official docs>", "reason": "<exactly why this resource closes the gap>"},
    {"title": "<specific resource name>", "type": "Video|Article|Practice|Course", "skill": "<skill>", "url_hint": "<platform>", "reason": "<reason>"},
    {"title": "<specific resource name>", "type": "Video|Article|Practice|Course", "skill": "<skill>", "url_hint": "<platform>", "reason": "<reason>"}
  ],
  "quickWins": [
    "<Specific 1-week action for the weakest skill — what exactly to do, not just 'practice more'>",
    "<Specific 1-week action for the 2nd weakest skill>",
    "<Specific 1-week action combining a strength with a weak skill to build momentum>"
  ],
  "arenaRecommendation": "<which Arena challenge type to do first based on weakest skills>"
}`,
      },
    ]

    const result = await claudeOrGroq(messages, { model: CLAUDE_HAIKU, groqMaxTokens: 2000 })
    return res.json({ analysis: result })
  } catch (e) { console.error("[analyse-assessment]", e.message); res.status(500).json({ error: e.message }) }
})

// ─── 5. Analyse Professional Profile ── Claude Sonnet (career intelligence) ───
router.post("/analyse-professional-profile", async (req, res) => {
  const { extractedData={}, githubData=null, resumeText="", linkedinText="" } = req.body
  try {
    const messages = [
      {
        role: "user",
        content: `You are a senior career intelligence AI for the Indian tech market.
Analyse this professional profile and score it precisely.

PROFILE DATA:
Name:       ${extractedData.name || "Professional"}
Title:      ${extractedData.title || ""}
Summary:    ${(extractedData.summary || "").slice(0, 400)}
Skills (${(extractedData.skills||[]).length}): ${(extractedData.skills||[]).slice(0,15).join(", ")}
Experience: ${(extractedData.experience||[]).length} roles — ${(extractedData.experience||[]).map(e=>`${e.role} at ${e.company}`).slice(0,3).join("; ")}
Education:  ${(extractedData.education||[]).map(e=>`${e.degree} from ${e.institution}`).join(", ") || "not specified"}
GitHub:     ${githubData ? `${githubData.publicRepos} repos, ${githubData.totalStars} stars, top: ${githubData.topLanguage}` : "not connected"}

Return ONLY this JSON:
{
  "profileScore": {
    "completeness":       <0-20>,
    "experienceDepth":    <0-25>,
    "technicalBreadth":   <0-20>,
    "projectQuality":     <0-20>,
    "marketReadiness":    <0-15>,
    "total":              <sum of above>
  },
  "radarData": [
    {"label":"Problem Solving",   "value":<0-100>},
    {"label":"Technical Depth",   "value":<0-100>},
    {"label":"Communication",     "value":<0-100>},
    {"label":"Domain Expertise",  "value":<0-100>},
    {"label":"Leadership",        "value":<0-100>}
  ],
  "analysis": {
    "eloRating":        <800-1800>,
    "domain":           "<primary tech domain>",
    "jobReadiness":     <0-100>,
    "marketValue":      "<₹X–Y LPA range>",
    "summary":          "<3 sentence honest career assessment>",
    "strengths":        ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
    "criticalGaps":     ["<gap 1>", "<gap 2>"],
    "quickWins":        ["<1-week action 1>", "<1-week action 2>"],
    "recommendedTasks": [
      {"title":"<challenge name>","description":"<what to practice>","eloGain":<15-60>},
      {"title":"<challenge name>","description":"<what to practice>","eloGain":<15-60>}
    ]
  }
}`,
      },
    ]

    const result = await claudeOrGroq(messages, { model: CLAUDE_SONNET, groqMaxTokens: 1800 })
    return res.json({
      profileScore: result.profileScore || { completeness:10, experienceDepth:10, technicalBreadth:10, projectQuality:10, marketReadiness:10, total:50 },
      radarData:    result.radarData    || [],
      analysis:     result.analysis     || {},
    })
  } catch (e) { console.error("[analyse-professional-profile]", e.message); res.status(500).json({ error: e.message }) }
})

export default router
