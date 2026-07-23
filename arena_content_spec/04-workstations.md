# Arena V2 Content Spec — 04. Workstations

Package 4 of 10. See `00-conventions-and-versioning.md` for shared versioning rules (`workstationVersion`).

Canonical, from blueprint §3: workstations are UI-module compositions, not monolithic components. Adding a panel to one workstation never means writing a new workstation from scratch.

## UI Modules (atomic, reusable)

| UI Module | Renders |
|---|---|
| Code Editor | Monaco-style editor, language-aware, multi-file |
| SQL Editor | Query input + result grid (sql.js WASM) |
| Notebook Cell | Python execution (Pyodide) + inline output |
| Excel Grid | Spreadsheet grid, formulas, pivot |
| Dashboard Builder | KPI cards, chart builder |
| Browser / Live Preview | Sandboxed iframe live-render |
| Terminal | Shell/bash console |
| API Client | Request builder + response viewer |
| Report Editor | Rich text / markdown editor |
| Diagram Canvas | System-design / architecture canvas |
| Console / Output Panel | Captured stdout/stderr/console |
| File Explorer | Multi-file tab strip |
| Register / Serial Panel | Embedded register map + serial monitor |
| Answer Panel | Numeric or multiple-choice entry |

## Workstation compositions

| Workstation | Composed of | Validator type | Produces |
|---|---|---|---|
| Code Workstation | Code Editor + Console/Output + File Explorer | Test-case judge | code artifact |
| SQL Workstation | SQL Editor + Console/Output | Ground-truth compare | code artifact (query) |
| Notebook Workstation | Notebook Cell + Console/Output | Published-result compare | report artifact (analysis + charts) |
| React/Frontend Workstation | Code Editor + File Explorer + Browser/Live Preview + Console/Output | Live-render probe | code artifact |
| API Workstation | API Client + Console/Output | HTTP assertion | code artifact (endpoint spec/impl) |
| Terminal Workstation | Terminal + Console/Output | Command-output pattern match | code artifact (script/config) |
| Excel Workstation | Excel Grid | Formula-result check | dashboard artifact (workbook) |
| Dashboard Workstation | Dashboard Builder + SQL Editor | Published KPI/trend/breakdown compare | dashboard artifact |
| Report Workstation | Report Editor | Rubric review | report artifact |
| System Design Workstation | Diagram Canvas + Report Editor | Rubric review + structural checklist | diagram artifact |
| Embedded Workstation | Code Editor + Register/Serial Panel + Console/Output | Register/output value match | code artifact |
| Calculator Workstation | Answer Panel | Numeric-tolerance check | (no artifact — Common Challenges only) |
| Full Stack Workstation | Code Editor + Browser/Live Preview + API Client + SQL Editor | Combination, per sub-task | code artifact |

Every one of these 13 workstations is REUSE-flagged from the Arena V1 dependency audit — no new UI-module engineering work is required to launch either Common or Domain Challenges on Day 1 of Phase 2/3.

## Sign-off

- [ ] UI Module list — approved as listed, or amend
- [ ] Workstation compositions (13 total) — approved as listed, or amend

Cross-references: `02-skills-and-capabilities.md` (Capability Registry `workstations`/`uiModules` fields must resolve to entries here), `05-validators.md` (validator type per workstation).
