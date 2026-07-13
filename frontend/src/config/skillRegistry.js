/**
 * skillRegistry.js — Capabilio Skill Layer
 *
 * Architecture:
 *   ROLE_REGISTRY → SKILL_REGISTRY → MISSION_REGISTRY → WORKBENCH_REGISTRY → Renderer
 *
 * Skills are the competency units that Arena teaches.
 * A Role requires a set of Skills.
 * A Mission exercises one or more Skills.
 * A Workbench provides the environment for a Mission.
 *
 * This is the missing layer between "what career path the student is on"
 * and "what exercise they are doing right now."
 */

// ─────────────────────────────────────────────────────────────────────────────
// SKILL REGISTRY
// One entry per competency unit. Skills are reused across roles where applicable.
// ─────────────────────────────────────────────────────────────────────────────
export const SKILL_REGISTRY = {

  // ── Software Engineering ──────────────────────────────────────────────────
  algo_ds:              { id: "algo_ds",              label: "Algorithms & Data Structures",  domain: "swe",       icon: "🧠" },
  system_design:        { id: "system_design",         label: "System Design",                 domain: "swe",       icon: "🏛️" },
  api_design:           { id: "api_design",            label: "API Design & REST",             domain: "swe",       icon: "🔌" },
  clean_code:           { id: "clean_code",            label: "Clean Code & Refactoring",      domain: "swe",       icon: "✨" },
  testing:              { id: "testing",               label: "Testing & TDD",                 domain: "swe",       icon: "🧪" },

  // ── Frontend ──────────────────────────────────────────────────────────────
  react_fundamentals:   { id: "react_fundamentals",   label: "React Fundamentals",             domain: "frontend",  icon: "⚛️" },
  state_management:     { id: "state_management",     label: "State Management",               domain: "frontend",  icon: "🗂️" },
  css_layout:           { id: "css_layout",           label: "CSS Layout & Responsive Design", domain: "frontend",  icon: "🎨" },
  web_performance:      { id: "web_performance",      label: "Web Performance",                domain: "frontend",  icon: "⚡" },
  accessibility:        { id: "accessibility",        label: "Accessibility (WCAG)",           domain: "frontend",  icon: "♿" },

  // ── Backend ───────────────────────────────────────────────────────────────
  database_design:      { id: "database_design",      label: "Database Design",                domain: "backend",   icon: "🗄️" },
  auth_security:        { id: "auth_security",        label: "Auth & Security",                domain: "backend",   icon: "🔐" },
  distributed_systems:  { id: "distributed_systems",  label: "Distributed Systems",            domain: "backend",   icon: "🌐" },
  caching:              { id: "caching",              label: "Caching Strategies",             domain: "backend",   icon: "⚡" },
  microservices:        { id: "microservices",        label: "Microservices Architecture",     domain: "backend",   icon: "🏗️" },

  // ── Data / ML ─────────────────────────────────────────────────────────────
  sql_fundamentals:     { id: "sql_fundamentals",     label: "SQL Fundamentals",               domain: "data",      icon: "🗄️" },
  data_wrangling:       { id: "data_wrangling",       label: "Data Wrangling (Pandas)",        domain: "data",      icon: "🐼" },
  data_visualization:   { id: "data_visualization",  label: "Data Visualization",             domain: "data",      icon: "📊" },
  statistics:           { id: "statistics",           label: "Statistics & Probability",       domain: "data",      icon: "📈" },
  ml_fundamentals:      { id: "ml_fundamentals",      label: "ML Fundamentals",                domain: "ml",        icon: "🤖" },
  model_evaluation:     { id: "model_evaluation",     label: "Model Evaluation",               domain: "ml",        icon: "✅" },
  feature_engineering:  { id: "feature_engineering",  label: "Feature Engineering",            domain: "ml",        icon: "🔧" },
  deep_learning:        { id: "deep_learning",        label: "Deep Learning & NNs",            domain: "ml",        icon: "🧠" },
  mlops:                { id: "mlops",                label: "MLOps & Deployment",             domain: "ml",        icon: "🚀" },

  // ── DevOps / Cloud ────────────────────────────────────────────────────────
  containerization:     { id: "containerization",     label: "Docker & Containers",            domain: "devops",    icon: "🐳" },
  kubernetes:           { id: "kubernetes",           label: "Kubernetes & Orchestration",     domain: "devops",    icon: "☸️" },
  ci_cd:                { id: "ci_cd",                label: "CI/CD Pipelines",                domain: "devops",    icon: "🔄" },
  infrastructure_code:  { id: "infrastructure_code",  label: "Infrastructure as Code",         domain: "devops",    icon: "📝" },
  observability:        { id: "observability",        label: "Observability & Monitoring",     domain: "devops",    icon: "👁️" },

  // ── Embedded / Firmware ───────────────────────────────────────────────────
  embedded_c:           { id: "embedded_c",           label: "Embedded C Programming",         domain: "embedded",  icon: "💻" },
  gpio_peripherals:     { id: "gpio_peripherals",     label: "GPIO & Peripheral Control",      domain: "embedded",  icon: "🔌" },
  serial_protocols:     { id: "serial_protocols",     label: "Serial Protocols (UART/SPI/I²C)",domain: "embedded",  icon: "📡" },
  rtos_design:          { id: "rtos_design",          label: "RTOS & Real-Time Design",        domain: "embedded",  icon: "⏱️" },
  power_management:     { id: "power_management",     label: "Power Management",               domain: "embedded",  icon: "🔋" },
  interrupt_handling:   { id: "interrupt_handling",   label: "Interrupt Handling",             domain: "embedded",  icon: "⚡" },
  bus_protocols:        { id: "bus_protocols",        label: "CAN / LIN / Ethernet",           domain: "embedded",  icon: "🚌" },
  debug_techniques:     { id: "debug_techniques",     label: "Embedded Debugging",             domain: "embedded",  icon: "🔍" },

  // ── VLSI / IC Design ─────────────────────────────────────────────────────
  hdl_design:           { id: "hdl_design",           label: "RTL Design (Verilog/VHDL)",      domain: "vlsi",      icon: "🔬" },
  functional_verify:    { id: "functional_verify",    label: "Functional Verification / UVM",  domain: "vlsi",      icon: "✅" },
  timing_analysis:      { id: "timing_analysis",      label: "Static Timing Analysis",         domain: "vlsi",      icon: "⏱️" },
  physical_design:      { id: "physical_design",      label: "Physical Design & P&R",          domain: "vlsi",      icon: "🗺️" },
  synthesis_flow:       { id: "synthesis_flow",       label: "Logic Synthesis Flow",           domain: "vlsi",      icon: "🔨" },

  // ── Analog / IC Design ───────────────────────────────────────────────────
  spice_simulation:     { id: "spice_simulation",     label: "SPICE Simulation",               domain: "analog_ic", icon: "⚡" },
  opamp_circuits:       { id: "opamp_circuits",       label: "Op-Amp Circuit Design",          domain: "analog_ic", icon: "🔌" },
  layout_skills:        { id: "layout_skills",        label: "IC Layout & DRC/LVS",           domain: "analog_ic", icon: "🔧" },
  noise_matching:       { id: "noise_matching",       label: "Noise & Impedance Matching",     domain: "analog_ic", icon: "〰️" },

  // ── EEE / Electrical ─────────────────────────────────────────────────────
  power_systems:        { id: "power_systems",        label: "Power Systems Analysis",         domain: "eee",       icon: "⚡" },
  electrical_machines:  { id: "electrical_machines",  label: "Electrical Machines",            domain: "eee",       icon: "⚙️" },
  power_electronics:    { id: "power_electronics",    label: "Power Electronics",              domain: "eee",       icon: "🔋" },
  control_systems:      { id: "control_systems",      label: "Control Systems",                domain: "eee",       icon: "🎛️" },
  plc_programming:      { id: "plc_programming",      label: "PLC & SCADA",                    domain: "eee",       icon: "🏭" },

  // ── Mechanical Engineering ────────────────────────────────────────────────
  thermodynamics:       { id: "thermodynamics",       label: "Thermodynamics",                 domain: "mechanical",icon: "🌡️" },
  fluid_mechanics:      { id: "fluid_mechanics",      label: "Fluid Mechanics",                domain: "mechanical",icon: "💧" },
  solid_mechanics:      { id: "solid_mechanics",      label: "Solid Mechanics & FEA",          domain: "mechanical",icon: "🏗️" },
  manufacturing:        { id: "manufacturing",        label: "Manufacturing Processes",        domain: "mechanical",icon: "🔨" },
  cad_modeling:         { id: "cad_modeling",         label: "CAD Modeling (SolidWorks/CATIA)",domain: "mechanical",icon: "📐" },

  // ── Civil Engineering ─────────────────────────────────────────────────────
  structural_analysis:  { id: "structural_analysis",  label: "Structural Analysis",            domain: "civil",     icon: "🏗️" },
  geotechnical:         { id: "geotechnical",         label: "Geotechnical Engineering",       domain: "civil",     icon: "🌍" },
  hydraulics:           { id: "hydraulics",           label: "Hydraulics & Water Resources",   domain: "civil",     icon: "💧" },
  transportation:       { id: "transportation",       label: "Transportation Engineering",     domain: "civil",     icon: "🛣️" },
  construction_mgmt:    { id: "construction_mgmt",    label: "Construction Management",        domain: "civil",     icon: "🏗️" },
  bim:                  { id: "bim",                  label: "BIM & AutoCAD",                  domain: "civil",     icon: "🖥️" },

  // ── Android / iOS ─────────────────────────────────────────────────────────
  kotlin_basics:        { id: "kotlin_basics",        label: "Kotlin & Jetpack",               domain: "android",   icon: "🤖" },
  compose_ui:           { id: "compose_ui",           label: "Jetpack Compose UI",             domain: "android",   icon: "🎨" },
  android_arch:         { id: "android_arch",         label: "Android Architecture (MVVM/MVI)",domain: "android",   icon: "🏛️" },
  swift_basics:         { id: "swift_basics",         label: "Swift & Xcode",                  domain: "ios",       icon: "🍎" },
  swiftui:              { id: "swiftui",              label: "SwiftUI",                        domain: "ios",       icon: "🎨" },
  ios_arch:             { id: "ios_arch",             label: "iOS Architecture (MVVM/TCA)",    domain: "ios",       icon: "🏛️" },
  mobile_performance:   { id: "mobile_performance",  label: "Mobile Performance",             domain: "mobile",    icon: "⚡" },

  // ── Pharmacy ──────────────────────────────────────────────────────────────
  pharmacology:         { id: "pharmacology",         label: "Clinical Pharmacology",          domain: "pharmacy",  icon: "💊" },
  drug_calculations:    { id: "drug_calculations",    label: "Drug Dose Calculations",         domain: "pharmacy",  icon: "🧮" },
  regulatory_affairs:   { id: "regulatory_affairs",   label: "Regulatory Affairs",             domain: "pharmacy",  icon: "📋" },
  pharmacovigilance:    { id: "pharmacovigilance",    label: "Pharmacovigilance & ADR",        domain: "pharmacy",  icon: "🔍" },

  // ── MBA / Business ────────────────────────────────────────────────────────
  financial_modelling:  { id: "financial_modelling",  label: "Financial Modelling",            domain: "mba",       icon: "📊" },
  business_strategy:    { id: "business_strategy",    label: "Business Strategy",              domain: "mba",       icon: "♟️" },
  operations_mgmt:      { id: "operations_mgmt",      label: "Operations Management",          domain: "mba",       icon: "⚙️" },
  marketing:            { id: "marketing",            label: "Marketing & Brand Strategy",     domain: "mba",       icon: "📢" },
  data_for_business:    { id: "data_for_business",    label: "Data Analysis for Business",     domain: "mba",       icon: "📈" },
}


// ─────────────────────────────────────────────────────────────────────────────
// ROLE → SKILLS MAP
// Maps arena domain keys (from roleConfig.arenaKey) to ordered skill progression.
// Skills are ordered from foundational → advanced.
// ─────────────────────────────────────────────────────────────────────────────
export const ROLE_SKILL_MAP = {
  swe:        ["algo_ds","system_design","api_design","clean_code","testing","distributed_systems","microservices"],
  frontend:   ["react_fundamentals","css_layout","state_management","web_performance","accessibility","testing"],
  backend:    ["api_design","database_design","auth_security","caching","distributed_systems","microservices","testing"],
  fullstack:  ["react_fundamentals","api_design","database_design","auth_security","system_design","clean_code"],
  data:       ["sql_fundamentals","data_wrangling","statistics","data_visualization","database_design"],
  ml:         ["ml_fundamentals","data_wrangling","feature_engineering","model_evaluation","deep_learning","mlops"],
  devops:     ["containerization","kubernetes","ci_cd","infrastructure_code","observability","auth_security"],
  dba:        ["sql_fundamentals","database_design","distributed_systems","caching","observability"],
  cybersec:   ["auth_security","distributed_systems","testing","observability"],
  embedded:   ["embedded_c","gpio_peripherals","serial_protocols","interrupt_handling","rtos_design","power_management","bus_protocols","debug_techniques"],
  vlsi:       ["hdl_design","functional_verify","timing_analysis","synthesis_flow","physical_design"],
  analog_ic:  ["spice_simulation","opamp_circuits","noise_matching","layout_skills"],
  eee:        ["power_systems","electrical_machines","power_electronics","control_systems","plc_programming"],
  mechanical: ["thermodynamics","fluid_mechanics","solid_mechanics","manufacturing","cad_modeling"],
  civil:      ["structural_analysis","geotechnical","hydraulics","transportation","construction_mgmt","bim"],
  android:    ["kotlin_basics","compose_ui","android_arch","mobile_performance","testing"],
  ios:        ["swift_basics","swiftui","ios_arch","mobile_performance","testing"],
  pharmacy:   ["pharmacology","drug_calculations","regulatory_affairs","pharmacovigilance"],
  mba:        ["business_strategy","financial_modelling","operations_mgmt","marketing","data_for_business"],
}


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get ordered skills for an arena domain key.
 * Returns full skill objects, not just IDs.
 */
export function getSkillsForRole(arenaKey) {
  const ids = ROLE_SKILL_MAP[arenaKey] || []
  return ids.map(id => SKILL_REGISTRY[id]).filter(Boolean)
}

/**
 * Get all skill IDs for an arena domain key.
 */
export function getSkillIdsForRole(arenaKey) {
  return ROLE_SKILL_MAP[arenaKey] || []
}

/**
 * Find which roles share a given skill.
 */
export function getRolesForSkill(skillId) {
  return Object.entries(ROLE_SKILL_MAP)
    .filter(([, skills]) => skills.includes(skillId))
    .map(([role]) => role)
}

/**
 * Get a skill by id (safe — returns null if not found).
 */
export function getSkill(id) {
  return SKILL_REGISTRY[id] || null
}
