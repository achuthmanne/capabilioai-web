# Arena V2 Content Spec — 02. Skills & Capability Registry

Package 2 of 10. See `00-conventions-and-versioning.md` for shared versioning rules.

## Skill catalog (by Common Challenge category — full template detail in `08-challenge-templates-and-payload.md`)

DSA/Programming, SQL, Python, Java, JavaScript, C++, React, Backend/API Design, DevOps, Cloud (AWS/Azure/GCP), Cybersecurity, Linux, Git, Networking, Statistics, Excel, Power BI, Pandas, Machine Learning, Testing/QA, System Design. These 21 categories are shared across roles — which subset a given role actually uses is declared per-role below.

## Capability Registry (your addition — blueprint §1.1)

New backend module (`capability-registry/`, blueprint §1) holding one record per role: which workstations, validators, and UI modules that role is permitted to use. The Challenge Payload Validator (blueprint §1, §1.1) checks every payload's `workstation` and `validator.type` against the payload's `role` entry here, and rejects the payload if either isn't registered — in addition to, not instead of, the existing schema-shape gate.

**Why this exists:** without it, a bug in Challenge Engine template selection could hand a Data Analyst a `register_match` validator (embedded-systems only) with nothing catching it until a student hit a broken challenge. With it, that's an authoring-time or Challenge-Engine-time rejection, logged as its own Analytics event (`09-analytics.md`).

### Worked examples

**Frontend Developer**
```json
{
  "role": "Frontend Developer",
  "careerFamily": "IT",
  "capabilities": {
    "workstations": ["react_frontend", "code", "api"],
    "validators": ["live_render_probe", "test_case_judge", "http_assertion"],
    "uiModules": ["code_editor", "file_explorer", "browser_live_preview", "console_output", "api_client"]
  }
}
```

**Data Analyst**
```json
{
  "role": "Data Analyst",
  "careerFamily": "IT",
  "capabilities": {
    "workstations": ["sql", "notebook", "dashboard", "excel", "report"],
    "validators": ["ground_truth_compare", "published_result_compare", "kpi_compare", "formula_result_check", "rubric_review"],
    "uiModules": ["sql_editor", "notebook_cell", "dashboard_builder", "excel_grid", "report_editor", "console_output"]
  }
}
```

**DevOps Engineer**
```json
{
  "role": "DevOps Engineer",
  "careerFamily": "IT",
  "capabilities": {
    "workstations": ["terminal", "code"],
    "validators": ["command_output_match", "test_case_judge"],
    "uiModules": ["terminal", "code_editor", "console_output", "file_explorer"]
  }
}
```

**Embedded/IoT Software Engineer**
```json
{
  "role": "Embedded/IoT Software Engineer",
  "careerFamily": "IT",
  "capabilities": {
    "workstations": ["embedded", "code"],
    "validators": ["register_match", "test_case_judge"],
    "uiModules": ["code_editor", "register_serial_panel", "console_output"]
  }
}
```

The remaining 36 roles each get one registry record authored the same way, following the pattern above (workstation set from `04-workstations.md`, validator set from `05-validators.md`, both scoped to what that role's Domain + Common Challenges actually require). Full authoring of all 40 records is a Phase 2/3 content-authoring task, not an architecture decision — the schema and enforcement point are what's being signed off here.

### Why this is Content, not Engine (blueprint §1.2)

The registry itself is role-specific data, authored the same way Skill Graphs (`03-learning-paths.md`) and Scenario Packs (`06-scenario-packs-and-datasets.md`) are. The Engine only knows "check payload against this role's registry entry" — never "Frontend Developer gets react_frontend." That's what makes adding a new role, or a new Career Family (`01-roles.md` §"Career Family scoping"), a content-authoring task instead of an engine code change.

## Sign-off

- [ ] Skill catalog (21 categories) — approved, or amend
- [ ] Capability Registry schema + enforcement point — approved, or amend
- [ ] Worked examples (4 roles shown) — approved as the pattern for authoring the remaining 36

Cross-references: `01-roles.md` (role list), `04-workstations.md` (workstation IDs), `05-validators.md` (validator type IDs), `08-challenge-templates-and-payload.md` (Challenge Payload Validator rejection behavior).
