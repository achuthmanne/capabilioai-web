# Arena V2 Content Spec — 03. Learning Paths (Skill Dependency Graphs)

Package 3 of 10. See `00-conventions-and-versioning.md` for shared versioning rules (`skillGraphVersion`).

Notation: `A → B` means B unlocks once A has been attempted (not necessarily mastered). `A → {B, C}` means both B and C unlock once A is attempted, independently of each other. All 40 roles, matching `01-roles.md`'s list and grouping.

### Software Engineering

1. **Frontend Developer**: `HTML/CSS Fundamentals → React Components → State Management → {Accessibility, Web Performance} → Design Systems`
2. **Backend Developer**: `REST Conventions → Auth Patterns → DB Design → {Rate Limiting, Error Handling}`
3. **Full Stack Developer**: `Frontend Developer skills + Backend Developer skills → Feature Build (end-to-end) → Deployment`
4. **Software Engineer (DSA)**: `Data Structures → Algorithms → {Big-O Analysis, System Design} → Code Review`
5. **Java Developer**: `Java Syntax → Collections → Concurrency → Spring Basics`
6. **Python Developer**: `Python Syntax → OOP → {Async, Packaging}`
7. **C++ Developer**: `C++ Syntax → Memory Management → STL → Performance Profiling`
8. **Game Developer**: `C++/C# Syntax → Game Loop Design → Physics Basics → Collision Systems`

### Data & Analytics

9. **Data Analyst**: `Statistics → SQL → {Excel, Python} → Power BI → Business Cases`
10. **Business Intelligence Analyst**: `SQL → DAX/Power BI → KPI Design → Executive Reporting`
11. **Data Engineer**: `Python → SQL → ETL Concepts → {Airflow, dbt} → Pipeline Optimization`
12. **Database Administrator**: `SQL → Indexing → Query Optimization → {Backup/Recovery, Replication}`
13. **Data Scientist**: `Statistics → Python → Pandas → {Hypothesis Testing, Feature Engineering} → Model Evaluation`
14. **Machine Learning Engineer**: `Python → Statistics → Data Scientist skills → Model Serving → MLOps`

### Cloud, Platform & DevOps

15. **DevOps Engineer**: `Linux/Bash → Docker → CI/CD → Kubernetes → Infrastructure as Code`
16. **Site Reliability Engineer**: `Linux → Observability Basics → Incident Response → SLO Design → Postmortem Writing`
17. **Cloud Engineer (AWS)**: `IAM Basics → Serverless (Lambda) → {VPC/Networking, Cost Management} → IaC (CloudFormation/Terraform)`
18. **Cloud Engineer (Azure)**: `IAM Basics (RBAC) → Bicep/ARM → {Azure Networking, Cost Management}`
19. **Cloud Engineer (GCP)**: `IAM Basics → Cloud Functions → Terraform`
20. **Platform Engineer**: `DevOps Engineer skills → Internal Tooling Design → Service Catalog / Golden Paths`

### Security

21. **Cybersecurity Analyst**: `OWASP Top 10 → Secure Coding → Threat Modeling`
22. **SOC Analyst / Incident Response**: `Linux/Networking Basics → Log Analysis → Alert Triage → Incident Reporting`
23. **Penetration Tester**: `Networking Basics → Recon Techniques → Exploitation Basics → Reporting`
24. **Security Engineer**: `Cybersecurity Analyst skills → Auth Hardening → Secrets Management → AppSec Tooling`
25. **Network Engineer**: `Subnetting → Routing → Firewalls → VPN Design`

### QA & Testing

26. **QA / Test Automation Engineer**: `Test Design → {Selenium/Playwright, CI Integration} → Flaky Test Diagnosis`
27. **Manual QA Tester**: `Test Case Design → Bug Reporting → Exploratory Testing`
28. **API Test Engineer**: `HTTP/REST Basics → Contract Testing → Schema Validation`

### Mobile & Emerging Platforms

29. **Android Developer**: `Kotlin/Java Syntax → Lifecycle → Jetpack → Gradle/Build Config`
30. **iOS Developer**: `Swift Syntax → Lifecycle → SwiftUI/UIKit → Memory Management`
31. **Embedded/IoT Software Engineer**: `Embedded C → Sensors/Protocols → RTOS Basics → Driver Development`
32. **Blockchain Developer**: `JavaScript/Solidity Syntax → Smart Contract Basics → Gas Optimization`

### Business, Data-Adjacent & IT Support

33. **Business Analyst (Tech)**: `SQL Basics → Requirements Gathering → Process Mapping → Metric Definition`
34. **Product Analyst**: `SQL → Statistics → Funnel Analysis → {A/B Testing, Cohort Analysis}`
35. **IT Support / Helpdesk Engineer**: `Networking Basics → Troubleshooting Method → Ticketing/Diagnostics`
36. **System Administrator**: `Linux Admin → Scripting → {Patching, Backups} → Cron Automation`
37. **SAP Functional/Technical Consultant**: `SQL Basics → Module Config → ABAP Basics → Report Build`
38. **Technical Writer / Docs Engineer**: `Information Architecture → API Docs → Tutorial Writing`
39. **Technical Program/Project Manager**: `Planning Fundamentals → Tradeoff Analysis → Risk Management`
40. **UI/UX Engineer (Design Systems)**: `Frontend Developer skills → Design Tokens → Component API Design → Accessibility Audit`

## Unlock rule (unchanged from blueprint §5)

A skill unlocks once **all direct prerequisites have been attempted** (not mastered). This is what makes the graph a DAG rather than a linear path — a role like Full Stack Developer merges two independent prerequisite chains (#3 above) rather than forcing a single ordering.

## Sign-off

- [ ] Skill Dependency Graphs, all 40 roles — approved, or flag specific roles to redraw
- [ ] Unlock rule (attempted, not mastered) — approved, or amend

Cross-references: `01-roles.md` (role list/families), `00-conventions-and-versioning.md` (`skillGraphVersion` pin-on-unlock rule).
