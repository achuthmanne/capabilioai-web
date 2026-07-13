/**
 * roleConfig.js — Capabilio Centralized Role Configuration System
 *
 * THE SINGLE SOURCE OF TRUTH for all role-related data.
 *
 * Replaces:
 *  - normalizeDomain()     in Aura.jsx
 *  - resolveDomainKey()    in SkillStudio.jsx
 *  - resolveDomainKey()    in useDomainChallengeSlots.js
 *  - resolveDomain()       in useArenaMissions.js
 *
 * Usage:
 *   import { getRoleConfig } from "../config/roleConfig"
 *   const role = getRoleConfig(userData?.keyword)
 *   role.arenaKey        → maps to ARENA_DOMAINS key
 *   role.label           → human-readable name  ("Embedded Engineer")
 *   role.auraSkills      → skill list for Aura radar
 *   role.assessmentSkills→ MCQ generation topics
 *   role.streamCategories→ engineering challenge bank filter keys
 *   role.pulseTopics     → feed topic filters
 *   role.launchpadTags   → job search keywords
 *   role.interviewFocus  → AI interview focus areas
 */

// ─── Role Registry ────────────────────────────────────────────────────────────
// Each entry: { id, label, slug, stream, arenaKey, keywords[], auraSkills[],
//              assessmentSkills[], streamCategories[], launchpadTags[],
//              pulseTopics[], interviewFocus[], color }

const ROLE_REGISTRY = [

  // ── IT / Software ─────────────────────────────────────────────────────────

  {
    id: "frontend",
    label: "Frontend Developer",
    slug: "frontend-developer",
    stream: "IT",
    arenaKey: "frontend",
    challengeKey: "frontend",
    color: "#F59E0B",
    keywords: ["frontend","react developer","ui developer","angular developer","vue developer","ui engineer","react engineer","next.js developer","web developer","html css"],
    auraSkills: ["React","JavaScript","TypeScript","CSS/Tailwind","HTML5","Next.js","State Management","REST APIs","Testing (Jest/RTL)","Performance Optimization","Accessibility","Build Tools (Webpack/Vite)"],
    assessmentSkills: ["React Hooks & State","Component Design Patterns","JavaScript ES6+","TypeScript Generics","CSS Flexbox/Grid","Next.js SSR/SSG","REST API Integration","Testing with Jest/RTL","Web Performance (Core Web Vitals)","Accessibility (WCAG)","Browser APIs","Build Tooling"],
    streamCategories: [],
    launchpadTags: ["frontend developer","react developer","ui engineer","web developer"],
    pulseTopics: ["React","JavaScript","TypeScript","CSS","Next.js","Vite","Web Performance","Frontend"],
    interviewFocus: ["component lifecycle","hooks","state management","performance","accessibility","browser rendering"],
  },

  {
    id: "backend",
    label: "Backend Developer",
    slug: "backend-developer",
    stream: "IT",
    arenaKey: "backend",
    color: "#10B981",
    keywords: ["backend","node.js developer","django developer","spring boot","backend engineer","server-side","api developer","express developer","fastapi"],
    auraSkills: ["Node.js / Express","REST API Design","Database Design","Authentication & JWT","Caching (Redis)","Message Queues","Microservices","Docker","SQL / PostgreSQL","System Design","Error Handling","API Security"],
    assessmentSkills: ["REST API Design","Node.js / Express","SQL & Databases","Authentication & JWT","Caching Strategies","Microservices Architecture","Message Queues (Kafka/RabbitMQ)","Docker & Containerization","System Design","Error Handling & Logging","API Rate Limiting","Database Indexing"],
    streamCategories: [],
    launchpadTags: ["backend developer","node.js engineer","api developer","server-side engineer"],
    pulseTopics: ["Node.js","Python","APIs","Databases","Microservices","Backend","Docker","PostgreSQL"],
    interviewFocus: ["API design","database optimization","scalability","caching","authentication","system design"],
  },

  {
    id: "fullstack",
    label: "Full Stack Developer",
    slug: "fullstack-developer",
    stream: "IT",
    arenaKey: "fullstack",
    color: "#8B5CF6",
    keywords: ["full stack","fullstack","mern","mean","full-stack","react node","frontend backend"],
    auraSkills: ["React / Next.js","Node.js / Express","PostgreSQL / MongoDB","REST & GraphQL APIs","Authentication","Docker / CI-CD","TypeScript","System Design","Testing","Cloud Deployment","State Management","Database Design"],
    assessmentSkills: ["React + Node.js Integration","REST & GraphQL APIs","Database Design","Authentication Flows","Docker & Deployment","TypeScript Full-Stack","System Design","Testing (Frontend + Backend)","State Management","Cloud Platforms","CI/CD Pipelines","Performance Optimization"],
    streamCategories: [],
    launchpadTags: ["full stack developer","mern stack","mean stack","react node developer"],
    pulseTopics: ["React","Node.js","MongoDB","PostgreSQL","Full Stack","APIs","TypeScript"],
    interviewFocus: ["full-stack architecture","database design","API design","deployment","performance"],
  },

  {
    id: "swe",
    label: "Software Engineer",
    slug: "software-engineer",
    stream: "IT",
    arenaKey: "swe",
    color: "#6366F1",
    keywords: ["software engineer","software developer","sde","sde-1","sde-2","sde1","sde2","programmer","application developer","java developer","python developer","golang","rust developer"],
    auraSkills: ["Data Structures & Algorithms","System Design","OOP Principles","Design Patterns","Concurrency","Databases","Testing","Version Control (Git)","Code Reviews","API Design","Performance","Problem Solving"],
    assessmentSkills: ["Data Structures (Arrays/Trees/Graphs)","Algorithm Complexity","System Design","OOP & SOLID Principles","Design Patterns","Concurrency & Multithreading","Database Fundamentals","Unit Testing","Git Workflow","API Design","Performance Optimization","Problem-Solving (LeetCode style)"],
    streamCategories: [],
    launchpadTags: ["software engineer","software developer","sde","java developer","python developer"],
    pulseTopics: ["DSA","System Design","OOP","Java","Python","Algorithms","Software Engineering"],
    interviewFocus: ["algorithms","data structures","system design","object-oriented design","problem solving"],
  },

  {
    id: "data",
    label: "Data Analyst",
    slug: "data-analyst",
    stream: "IT",
    arenaKey: "data",
    color: "#D97706",
    keywords: ["data analyst","data analysis","analytics","business analyst","data reporting","excel analyst","power bi","tableau analyst","analytics engineer"],
    auraSkills: ["SQL (Advanced)","Python (Pandas/NumPy)","Power BI / Tableau","Excel / Spreadsheets","Statistical Analysis","Data Cleaning","Dashboard Design","KPI Definition","A/B Testing","Data Storytelling","ETL Concepts","Business Acumen"],
    assessmentSkills: ["Advanced SQL (CTEs/Window Functions)","Python Pandas","Power BI / Tableau","Excel Pivot Tables","Statistical Analysis","Data Cleaning Techniques","Dashboard Design","KPI Metrics","A/B Testing","Data Visualization","ETL Pipelines","Business Intelligence"],
    streamCategories: [],
    launchpadTags: ["data analyst","business analyst","sql analyst","power bi developer","tableau developer"],
    pulseTopics: ["SQL","Python","Power BI","Tableau","Data Analysis","Statistics","Excel"],
    interviewFocus: ["SQL queries","data cleaning","visualization","business metrics","statistical thinking"],
  },

  {
    id: "data_engineer",
    label: "Data Engineer",
    slug: "data-engineer",
    stream: "IT",
    arenaKey: "data_engineer",
    color: "#059669",
    keywords: ["data engineer","etl developer","pipeline engineer","spark developer","kafka engineer","dbt developer","data platform","warehouse engineer","lakehouse"],
    auraSkills: ["Apache Spark","Kafka / Streaming","dbt (Data Build Tool)","Airflow / Orchestration","SQL Warehousing","Python (PySpark)","Data Modeling","Cloud (AWS/GCP/Azure)","ETL Pipeline Design","Schema Design","Data Quality","Monitoring & SLAs"],
    assessmentSkills: ["Apache Spark Architecture","Kafka Streams","dbt Core & Cloud","Airflow DAGs","Data Warehousing (Snowflake/BigQuery)","PySpark","Dimensional Modeling","Cloud Data Services","ETL vs ELT","Schema Design","Data Quality Checks","Pipeline Monitoring"],
    streamCategories: [],
    launchpadTags: ["data engineer","etl developer","spark developer","data pipeline","dbt developer"],
    pulseTopics: ["Spark","Kafka","dbt","Airflow","Data Engineering","SQL","Data Pipelines"],
    interviewFocus: ["pipeline design","spark optimization","data modeling","streaming","warehouse architecture"],
  },

  {
    id: "bi_analyst",
    label: "BI Analyst",
    slug: "bi-analyst",
    stream: "IT",
    arenaKey: "bi_analyst",
    color: "#8B5CF6",
    keywords: ["bi analyst","business intelligence","bi developer","power bi developer","looker developer","tableau developer","data visualization engineer","reporting analyst"],
    auraSkills: ["Power BI (DAX/Power Query)","Tableau","Looker / LookML","SQL for BI","Star Schema / Dimensional Modeling","KPI Design","ETL for Reporting","Data Storytelling","Executive Dashboards","Self-Service BI","Data Governance","Excel Advanced"],
    assessmentSkills: ["Power BI DAX Formulas","Tableau Calculated Fields","SQL for BI Reporting","Star Schema Design","KPI Frameworks","Power Query / ETL","Looker LookML","Dashboard UX Design","Data Storytelling","Self-Service Analytics","Data Governance","Excel Power Tools"],
    streamCategories: [],
    launchpadTags: ["bi analyst","power bi developer","tableau developer","data visualization","reporting analyst"],
    pulseTopics: ["Power BI","Tableau","Looker","SQL","Business Intelligence","Data Visualization"],
    interviewFocus: ["dashboard design","DAX","data modeling","stakeholder reporting","KPI definition"],
  },

  {
    id: "dba",
    label: "Database Administrator",
    slug: "database-administrator",
    stream: "IT",
    arenaKey: "dba",
    color: "#06B6D4",
    keywords: ["database administrator","dba","sql developer","database engineer","oracle dba","mysql dba","postgresql dba","database developer","db admin"],
    auraSkills: ["SQL (Expert)","Database Design & Normalization","Indexing & Query Optimization","Backup & Recovery","Replication & HA","PostgreSQL / MySQL / Oracle","Performance Tuning","Security & Access Control","Stored Procedures","Partitioning","Monitoring","Cloud Databases (RDS/Cloud SQL)"],
    assessmentSkills: ["Advanced SQL","Database Normalization","Indexing Strategies","Backup & Recovery","Replication Setup","Query Optimization","PostgreSQL Internals","Performance Tuning","Security Hardening","Stored Procedures & Triggers","Partitioning Strategies","Cloud Managed DBs"],
    streamCategories: [],
    launchpadTags: ["database administrator","dba","sql developer","database engineer"],
    pulseTopics: ["SQL","PostgreSQL","MySQL","Oracle","Database","Performance Tuning"],
    interviewFocus: ["query optimization","indexing","backup recovery","replication","schema design"],
  },

  {
    id: "cyber",
    label: "Cybersecurity Engineer",
    slug: "cybersecurity-engineer",
    stream: "IT",
    arenaKey: "cyber",
    color: "#EF4444",
    keywords: ["cybersecurity","cyber security","security engineer","penetration tester","ethical hacker","red team","blue team","infosec","information security","appsec","devsecops"],
    auraSkills: ["Network Security","OWASP Top 10","Penetration Testing","SIEM Tools","Threat Modeling","Vulnerability Assessment","Incident Response","Cryptography","Firewall & IDS/IPS","Cloud Security","Secure Coding","Compliance (ISO/NIST)"],
    assessmentSkills: ["Network Security Fundamentals","OWASP Top 10 Vulnerabilities","Penetration Testing Methodology","SIEM & Log Analysis","Threat Modeling (STRIDE)","Vulnerability Scanning","Incident Response Playbooks","Cryptography Basics","Firewall Rules & IDS","Cloud Security (AWS/Azure)","Secure SDLC","Compliance Frameworks"],
    streamCategories: [],
    launchpadTags: ["cybersecurity engineer","security engineer","penetration tester","ethical hacker","infosec analyst"],
    pulseTopics: ["Cybersecurity","Penetration Testing","OWASP","Network Security","Threat Intelligence","Incident Response"],
    interviewFocus: ["threat modeling","OWASP","penetration testing","incident response","network security"],
  },

  {
    id: "devops",
    label: "DevOps Engineer",
    slug: "devops-engineer",
    stream: "IT",
    arenaKey: "devops",
    color: "#F97316",
    keywords: ["devops","site reliability","platform engineer","kubernetes","docker","jenkins","ci cd","cicd","ci/cd","infrastructure engineer","gitops","helm","terraform"],
    auraSkills: ["Docker & Kubernetes","CI/CD Pipelines (Jenkins/GitHub Actions)","Terraform / IaC","Linux Administration","Monitoring (Prometheus/Grafana)","Git & GitOps","Bash Scripting","Cloud Platforms","Ansible / Chef / Puppet","Log Management (ELK)","Security (DevSecOps)","Incident Management"],
    assessmentSkills: ["Docker Containerization","Kubernetes Orchestration","CI/CD Design","Terraform IaC","Linux Administration","Prometheus & Grafana","GitOps Workflows","Bash/Python Scripting","Cloud Infrastructure (AWS/GCP)","Ansible Automation","ELK Stack","SRE Principles"],
    streamCategories: [],
    launchpadTags: ["devops engineer","site reliability engineer","kubernetes engineer","platform engineer","infrastructure engineer"],
    pulseTopics: ["DevOps","Kubernetes","Docker","Terraform","CI/CD","GitOps","SRE","Platform Engineering"],
    interviewFocus: ["CI/CD pipeline design","Kubernetes","infrastructure as code","monitoring","incident management"],
  },

  {
    id: "sre",
    label: "SRE / Platform Engineer",
    slug: "sre-platform-engineer",
    stream: "IT",
    arenaKey: "sre",
    color: "#0EA5E9",
    keywords: ["sre","site reliability engineer","platform engineer","reliability engineer","production engineer","infrastructure sre"],
    auraSkills: ["SLI/SLO/SLA Design","Incident Management","Chaos Engineering","Kubernetes (Production)","Observability Stack","Capacity Planning","Toil Reduction","On-Call Engineering","Runbooks & Playbooks","Error Budgets","Distributed Systems","Post-Mortems"],
    assessmentSkills: ["SLI/SLO/SLA Fundamentals","Incident Response & Post-Mortems","Chaos Engineering","Production Kubernetes","Observability (Metrics/Logs/Traces)","Capacity Planning","Error Budget Policy","On-Call Best Practices","Runbook Authoring","Distributed Systems Reliability","Toil Automation","Reliability Patterns"],
    streamCategories: [],
    launchpadTags: ["site reliability engineer","sre","platform engineer","production engineer"],
    pulseTopics: ["SRE","Observability","Kubernetes","Incident Management","Chaos Engineering","Platform Engineering"],
    interviewFocus: ["SLOs","incident response","chaos engineering","observability","reliability patterns"],
  },

  {
    id: "aws",
    label: "AWS Cloud Engineer",
    slug: "aws-cloud-engineer",
    stream: "IT",
    arenaKey: "aws",
    color: "#F59E0B",
    keywords: ["aws","amazon web services","cloud engineer","cloud architect","aws developer","aws solutions architect","cloud practitioner","aws devops"],
    auraSkills: ["EC2 / VPC / IAM","S3 & Storage Services","Lambda & Serverless","RDS & DynamoDB","CloudFormation / CDK","EKS / ECS","CloudWatch & X-Ray","Route 53 & CloudFront","Security (KMS/Secrets Manager)","Cost Optimization","Well-Architected Framework","Migration Strategies"],
    assessmentSkills: ["EC2 & VPC Networking","IAM Roles & Policies","S3 Storage & Lifecycle","Lambda Serverless Design","RDS vs DynamoDB","CloudFormation / Terraform on AWS","EKS / ECS Patterns","CloudWatch Monitoring","Route 53 DNS","Cost Optimization","AWS Well-Architected","Migration to AWS"],
    streamCategories: [],
    launchpadTags: ["aws engineer","cloud engineer","aws architect","aws developer","cloud practitioner"],
    pulseTopics: ["AWS","Cloud","Serverless","Lambda","Kubernetes","Cloud Architecture"],
    interviewFocus: ["AWS services","architecture design","IAM","cost optimization","serverless"],
  },

  {
    id: "azure",
    label: "Azure Cloud Engineer",
    slug: "azure-cloud-engineer",
    stream: "IT",
    arenaKey: "azure",
    color: "#0EA5E9",
    keywords: ["azure","azure engineer","azure developer","azure architect","microsoft cloud","azure devops","azure solutions architect"],
    auraSkills: ["Azure VMs & VNets","Azure AD & RBAC","Azure Functions (Serverless)","Azure SQL & Cosmos DB","ARM Templates / Bicep","AKS (Kubernetes)","Azure Monitor & Log Analytics","Azure DevOps Pipelines","Key Vault & Security","Azure Storage","Cost Management","Well-Architected (Azure)"],
    assessmentSkills: ["Azure Networking (VNet/NSG)","Azure AD & RBAC","Azure Functions","Azure SQL vs Cosmos DB","ARM / Bicep IaC","AKS Orchestration","Azure Monitor & Alerts","Azure DevOps Pipelines","Key Vault Secrets","Azure Blob Storage","Cost Management","Azure Well-Architected"],
    streamCategories: [],
    launchpadTags: ["azure engineer","azure developer","azure architect","microsoft cloud engineer"],
    pulseTopics: ["Azure","Microsoft Cloud","Azure DevOps","Kubernetes","Serverless","Cloud Architecture"],
    interviewFocus: ["Azure services","ARM templates","networking","security","cost optimization"],
  },

  {
    id: "soc",
    label: "SOC Analyst",
    slug: "soc-analyst",
    stream: "IT",
    arenaKey: "soc",
    color: "#DC2626",
    keywords: ["soc analyst","security operations","incident responder","threat hunter","dfir","digital forensics","malware analyst","threat intelligence"],
    auraSkills: ["SIEM (Splunk/QRadar)","Log Analysis","Threat Hunting","Malware Analysis","DFIR","Network Traffic Analysis","IOC/IOA Detection","Phishing Analysis","Vulnerability Triage","Threat Intelligence","MITRE ATT&CK","Playbook Execution"],
    assessmentSkills: ["SIEM Log Correlation","Threat Hunting Techniques","Malware Triage","Digital Forensics Basics","Network Traffic Analysis (Wireshark)","IOC Detection","Phishing Email Analysis","Vulnerability Severity Triage","MITRE ATT&CK Framework","Threat Intelligence Sources","Incident Playbooks","SOC Tier 1/2 Workflow"],
    streamCategories: [],
    launchpadTags: ["soc analyst","security operations analyst","threat hunter","incident responder","dfir analyst"],
    pulseTopics: ["SOC","Threat Hunting","SIEM","Incident Response","Malware Analysis","Cybersecurity"],
    interviewFocus: ["SIEM queries","threat hunting","malware analysis","MITRE ATT&CK","incident workflow"],
  },

  {
    id: "qa",
    label: "QA / Test Automation Engineer",
    slug: "qa-engineer",
    stream: "IT",
    arenaKey: "qa",
    color: "#7C3AED",
    keywords: ["qa engineer","test automation","quality assurance","selenium","cypress","playwright","sdet","performance testing","api testing","qa analyst","software tester"],
    auraSkills: ["Test Automation (Selenium/Playwright)","API Testing (Postman/RestAssured)","CI Integration","Test Strategy & Planning","BDD (Cucumber/Gherkin)","Performance Testing (JMeter)","Mobile Testing","SQL for QA","Bug Reporting","ISTQB Concepts","Risk-Based Testing","Accessibility Testing"],
    assessmentSkills: ["Selenium / Playwright Automation","API Testing with Postman","Cypress Test Design","BDD with Cucumber","Performance Testing (JMeter)","CI/CD Integration for Tests","Test Strategy Design","Mobile App Testing","SQL Data Validation","Risk-Based Testing","Accessibility Testing","Test Reporting & Metrics"],
    streamCategories: [],
    launchpadTags: ["qa engineer","test automation engineer","sdet","quality assurance engineer","selenium developer"],
    pulseTopics: ["QA","Test Automation","Selenium","Playwright","API Testing","Performance Testing","CI/CD"],
    interviewFocus: ["test strategy","automation framework design","API testing","CI integration","risk-based testing"],
  },

  {
    id: "ba_product",
    label: "BA / Product Analyst",
    slug: "ba-product-analyst",
    stream: "IT",
    arenaKey: "ba_product",
    color: "#D97706",
    keywords: ["business analyst","product analyst","product manager","ba analyst","requirements analyst","scrum master","product owner","agile analyst","functional analyst"],
    auraSkills: ["Requirements Gathering","User Story Writing","Process Mapping (BPMN)","Stakeholder Management","Agile / Scrum","SQL for Analysis","Wireframing (Figma/Balsamiq)","UAT Coordination","KPI Metrics","Data Analysis","Presentation Skills","Jira / Confluence"],
    assessmentSkills: ["Requirements Elicitation Techniques","User Story & Acceptance Criteria","BPMN Process Flows","Stakeholder Analysis","Agile Ceremonies","SQL Business Queries","Wireframing & Prototyping","UAT Planning","KPI Definition","Business Case Writing","Jira Workflow","Gap Analysis"],
    streamCategories: [],
    launchpadTags: ["business analyst","product analyst","product manager","scrum master","product owner"],
    pulseTopics: ["Product Management","Business Analysis","Agile","Scrum","User Stories","Jira","Stakeholder Management"],
    interviewFocus: ["requirements gathering","user stories","process mapping","stakeholder communication","metrics"],
  },

  {
    id: "medical",
    label: "Medical Coding Specialist",
    slug: "medical-coding-specialist",
    stream: "Medical",
    arenaKey: "medical",
    color: "#EC4899",
    keywords: ["medical coder","medical coding","medical billing","clinical coder","health information","icd coder","cpt coder","drg coder","hcc coder","healthcare coding"],
    auraSkills: ["ICD-10-CM/PCS Coding","CPT Procedure Coding","Medical Terminology","Anatomy & Physiology","HCPCS Level II","DRG Assignment","HCC Risk Adjustment","Medical Record Review","Payer Guidelines","Compliance (HIPAA)","EHR Systems","Coding Audits"],
    assessmentSkills: ["ICD-10-CM Diagnosis Coding","ICD-10-PCS Procedure Coding","CPT / E&M Coding","HCPCS Level II Codes","Medical Terminology","Anatomy for Coders","DRG Grouping","HCC Risk Adjustment","HIPAA Compliance","Payer-Specific Guidelines","EHR Navigation","Coding Audit Techniques"],
    streamCategories: [],
    launchpadTags: ["medical coder","medical billing","clinical coder","health information specialist","icd coder"],
    pulseTopics: ["Medical Coding","ICD-10","CPT","Healthcare","Medical Billing","HIPAA","HCC"],
    interviewFocus: ["ICD-10 coding","CPT codes","medical terminology","compliance","audit"],
  },

  // ── ECE Sub-roles ──────────────────────────────────────────────────────────

  {
    id: "embedded",
    label: "Embedded Engineer",
    slug: "embedded-engineer",
    stream: "ECE",
    arenaKey: "ece",
    color: "#84CC16",
    keywords: ["embedded","embedded engineer","embedded systems","firmware","firmware engineer","embedded software","bare metal","rtos","microcontroller","arm cortex","stm32","esp32","embedded developer","embedded c"],
    auraSkills: ["ARM Cortex Architecture","Embedded C / Bare-Metal","RTOS (FreeRTOS / Zephyr)","Device Drivers & HAL","Interrupt Handling","Memory Management (MMU/MPU)","Bootloader & Startup Code","SPI / I2C / UART Protocols","CAN & LIN Bus","Debugging (JTAG/OpenOCD)","Low-Power Design","FOTA (Firmware OTA)"],
    assessmentSkills: ["ARM Cortex Architecture","Embedded C / Bare-Metal","RTOS (FreeRTOS / Zephyr)","Device Drivers & HAL","Interrupt Handling","Memory Management (MMU / MPU)","Bootloader & Startup Code","SPI / I2C / UART Protocols","CAN & LIN Bus","Debugging (JTAG / OpenOCD)","Low-Power Design","Firmware Over-the-Air (FOTA)"],
    streamCategories: ["ECE"],
    launchpadTags: ["embedded engineer","firmware engineer","embedded systems engineer","embedded c developer","rtos engineer"],
    pulseTopics: ["Embedded Systems","RTOS","ARM","Firmware","IoT","Microcontrollers","C Programming"],
    interviewFocus: ["RTOS concepts","memory management","interrupt handling","protocol debugging","low-power design"],
  },

  {
    id: "vlsi",
    label: "VLSI Engineer",
    slug: "vlsi-engineer",
    stream: "ECE",
    arenaKey: "ece",
    color: "#84CC16",
    keywords: ["vlsi","vlsi engineer","chip design","asic","rtl","rtl design","verilog","systemverilog","vhdl","fpga","chip verification","physical design","vlsi verification","dv engineer","design verification"],
    auraSkills: ["Digital Logic Design","Verilog / SystemVerilog","VHDL","RTL Design & Synthesis","Static Timing Analysis","Floorplanning & Placement","Clock Tree Synthesis","DRC / LVS / ERC","UVM Verification","ASIC Design Flow","FPGA Implementation","Low-Power VLSI Techniques"],
    assessmentSkills: ["Digital Logic Design","Verilog / SystemVerilog","VHDL","RTL Design & Synthesis","Static Timing Analysis","Floorplanning & Placement","Clock Tree Synthesis","DRC / LVS / ERC","UVM Verification","ASIC Design Flow","FPGA Implementation","Low-Power VLSI Techniques"],
    streamCategories: ["ECE"],
    launchpadTags: ["vlsi engineer","asic design engineer","rtl engineer","fpga engineer","chip design engineer","dv engineer"],
    pulseTopics: ["VLSI","ASIC","Verilog","SystemVerilog","FPGA","RTL","Chip Design","EDA Tools"],
    interviewFocus: ["RTL coding","timing analysis","verification methodology","ASIC flow","UVM"],
  },

  {
    id: "analog_layout",
    label: "Analog Layout Engineer",
    slug: "analog-layout-engineer",
    stream: "ECE",
    arenaKey: "ece",
    color: "#84CC16",
    keywords: ["analog layout","analog design engineer","analog engineer","layout engineer","ic layout","custom ic","mixed signal layout","analog ic","cadence layout","virtuoso","full custom","analog mixed signal","ams","analog layout engineer"],
    auraSkills: ["Full-Custom IC Layout","Cadence Virtuoso","Analog Circuit Understanding","Device Matching Techniques","DRC / LVS / ERC","Guard Rings & Shielding","Parasitic Extraction (PEX)","Floorplanning Analog Blocks","Electromigration Rules","ESD Protection Layout","Mixed-Signal Interface","Multi-Vt Device Layout"],
    assessmentSkills: ["Full-Custom IC Layout Principles","Cadence Virtuoso Tools","Analog Circuit Analysis","Device Matching & Interdigitation","DRC / LVS / ERC Rules","Guard Rings & Shielding","Parasitic Extraction (PEX)","Analog Block Floorplanning","Electromigration Design Rules","ESD Protection Structures","Mixed-Signal Integration","Low-Noise Layout Techniques"],
    streamCategories: ["ECE"],
    launchpadTags: ["analog layout engineer","ic layout engineer","full custom layout","analog design engineer","cadence virtuoso engineer"],
    pulseTopics: ["Analog IC","Layout Design","Cadence Virtuoso","VLSI","Mixed Signal","IC Design","EDA"],
    interviewFocus: ["layout techniques","device matching","DRC/LVS","parasitic extraction","analog fundamentals"],
  },

  {
    id: "rf_engineer",
    label: "RF Engineer",
    slug: "rf-engineer",
    stream: "ECE",
    arenaKey: "ece",
    color: "#84CC16",
    keywords: ["rf engineer","rf design","radio frequency","rf circuit","antenna engineer","microwave engineer","rf systems","wireless engineer","5g engineer","rf hardware"],
    auraSkills: ["RF Circuit Design","Antenna Design & Simulation","S-Parameters & Smith Chart","Impedance Matching","RF Amplifiers (LNA / PA)","Filters (BPF / LPF)","Noise Figure Analysis","ADS / HFSS / CST Tools","PCB RF Layout","RF Testing (VNA / Spectrum Analyzer)","5G/LTE Standards","EMC/EMI Compliance"],
    assessmentSkills: ["RF Circuit Design Fundamentals","Antenna Design & Simulation","S-Parameters & Smith Chart","Impedance Matching Networks","LNA & PA Design","RF Filter Design","Noise Figure Calculation","EDA Tools (ADS / HFSS)","RF PCB Layout Rules","VNA Measurements","5G NR / LTE Standards","EMC/EMI Guidelines"],
    streamCategories: ["ECE"],
    launchpadTags: ["rf engineer","rf design engineer","antenna engineer","microwave engineer","wireless hardware engineer"],
    pulseTopics: ["RF Engineering","5G","Antenna Design","Wireless","Microwave","RF Circuits","EMC"],
    interviewFocus: ["S-parameters","impedance matching","amplifier design","antenna fundamentals","RF measurements"],
  },

  {
    id: "iot_engineer",
    label: "IoT Engineer",
    slug: "iot-engineer",
    stream: "ECE",
    arenaKey: "ece",
    color: "#84CC16",
    keywords: ["iot","iot engineer","internet of things","iot developer","iot systems","mqtt","iot architect","edge computing","iot firmware","smart devices","iot solutions"],
    auraSkills: ["IoT Protocols (MQTT / CoAP / HTTP)","Edge Computing","Embedded C / Python","Cloud IoT Platforms (AWS IoT / Azure IoT Hub)","Sensor Interfacing","Microcontrollers (ESP32 / Arduino / Raspberry Pi)","BLE / Zigbee / LoRaWAN","Data Pipeline for IoT","Security for IoT Devices","OTA Updates","Digital Twins","Power Management"],
    assessmentSkills: ["IoT Communication Protocols (MQTT/CoAP)","Edge Computing Concepts","Embedded C / MicroPython","AWS IoT Core / Azure IoT Hub","Sensor & Actuator Interfacing","ESP32 / Arduino / RPi","BLE & LoRaWAN","IoT Data Pipelines","IoT Security Best Practices","OTA Firmware Updates","Digital Twin Architecture","Low-Power IoT Design"],
    streamCategories: ["ECE", "IoT"],
    launchpadTags: ["iot engineer","iot developer","edge computing engineer","embedded iot engineer","smart devices engineer"],
    pulseTopics: ["IoT","MQTT","Edge Computing","AWS IoT","Embedded Systems","Smart Devices","LoRaWAN"],
    interviewFocus: ["MQTT protocol","edge vs cloud","security","sensor integration","OTA updates"],
  },

  {
    id: "telecom_engineer",
    label: "Telecom Engineer",
    slug: "telecom-engineer",
    stream: "ECE",
    arenaKey: "ece",
    color: "#84CC16",
    keywords: ["telecom engineer","telecommunications","5g engineer","4g lte","network engineer ece","wireless networks","3gpp","core network","ran engineer","telecom systems","nsa sa 5g"],
    auraSkills: ["5G NR Architecture (SA/NSA)","LTE / 4G RAN","3GPP Standards","Core Network (EPC / 5GC)","Protocol Stacks (PHY/MAC/RLC/PDCP)","RF Planning & Optimization","Network Management (OMC/NMS)","OSS/BSS Systems","VoLTE / VoNR","MIMO & Beamforming","Network Slicing","IoT-NTN Connectivity"],
    assessmentSkills: ["5G NR Architecture","LTE RAN Design","3GPP Release Standards","5G Core (5GC) vs EPC","PHY/MAC/RLC Protocol Layers","RF Network Planning","OMC/NMS Network Management","OSS/BSS Concepts","VoLTE Design","MIMO & Beamforming","Network Slicing","IoT on 5G Networks"],
    streamCategories: ["ECE"],
    launchpadTags: ["telecom engineer","5g engineer","rf planning engineer","network engineer","wireless engineer"],
    pulseTopics: ["5G","Telecom","LTE","3GPP","Network Engineering","RAN","Core Network","Wireless"],
    interviewFocus: ["5G architecture","protocol stacks","RF planning","core network","3GPP standards"],
  },

  {
    id: "hardware_engineer",
    label: "Hardware Engineer",
    slug: "hardware-engineer",
    stream: "ECE",
    arenaKey: "ece",
    color: "#84CC16",
    keywords: ["hardware engineer","pcb design","circuit design","pcb engineer","electronics engineer","schematic design","altium","kicad","hardware design","board bring-up","signal integrity"],
    auraSkills: ["Schematic Design (Altium/KiCad)","PCB Layout & Routing","Signal Integrity Analysis","Power Electronics Design","Analog Circuit Design","Digital Logic Design","Component Selection & Sourcing","Board Bring-Up & Debug","EMC/EMI Testing","DFM & DFT","Hardware Testing (Oscilloscope/Logic Analyzer)","BOM Management"],
    assessmentSkills: ["Schematic Design Principles","PCB Layout Rules","Signal Integrity (SI/PI)","Power Supply Design","Analog Circuit Fundamentals","Digital Logic on PCB","Component Datasheets & Selection","Board Bring-Up Techniques","EMC/EMI Compliance","Design for Manufacturing (DFM)","Hardware Debug Tools","BOM & Revision Control"],
    streamCategories: ["ECE"],
    launchpadTags: ["hardware engineer","pcb design engineer","electronics engineer","circuit design engineer","board design engineer"],
    pulseTopics: ["PCB Design","Hardware Engineering","Altium","Signal Integrity","Electronics","Embedded Hardware"],
    interviewFocus: ["PCB design rules","signal integrity","power design","schematic review","bring-up debugging"],
  },

  // ── EEE Sub-roles ──────────────────────────────────────────────────────────

  {
    id: "power_engineer",
    label: "Power Systems Engineer",
    slug: "power-systems-engineer",
    stream: "EEE",
    arenaKey: "ece",
    color: "#EAB308",
    keywords: ["power engineer","power systems","electrical power","power electronics","power grid","smart grid","transmission","distribution engineer","substation","eee power","power systems engineer"],
    auraSkills: ["Power System Analysis (Load Flow / Fault)","Protection Relays & Coordination","SCADA & Energy Management","Transmission & Distribution Design","Power Electronics (Converters)","Renewable Energy Integration","Switchgear & Circuit Breakers","Power Quality Analysis","Transformer Design","Smart Grid Technologies","ETAP / PowerWorld","Grid Codes & Standards"],
    assessmentSkills: ["Load Flow Analysis (Newton-Raphson)","Fault Analysis (Symmetrical/Unsymmetrical)","Protection Relaying Coordination","SCADA & DMS Systems","Power System Stability","Transmission Line Design","Distribution System Design","Power Electronics (AC-DC/DC-DC)","Renewable Energy (Solar/Wind)","Switchgear & Busbar Design","Power Quality (Harmonics/Flicker)","Smart Grid & AMI"],
    streamCategories: ["EEE"],
    launchpadTags: ["power systems engineer","power engineer","electrical engineer","grid engineer","power electronics engineer"],
    pulseTopics: ["Power Systems","Smart Grid","Renewable Energy","Power Electronics","Substation","SCADA","Electrical Engineering"],
    interviewFocus: ["load flow","fault analysis","protection coordination","power quality","renewable integration"],
  },

  {
    id: "electrical_machines",
    label: "Electrical Machines Engineer",
    slug: "electrical-machines-engineer",
    stream: "EEE",
    arenaKey: "ece",
    color: "#EAB308",
    keywords: ["electrical machines","motor drives","variable frequency drive","vfd","electric motor","generator","transformer engineer","drive engineer","servo drives","brushless motor","eee machines"],
    auraSkills: ["DC / AC Machine Analysis","Transformer Design & Testing","Induction Motor Characteristics","Variable Frequency Drives (VFD)","Servo & Stepper Motor Control","BLDC Motor Design","Field-Oriented Control (FOC)","Power Electronics for Drives","Motor Testing Standards","Thermal Management of Machines","Simulation (MATLAB/Simulink)","IEC/IS Standards for Machines"],
    assessmentSkills: ["DC Machine Analysis","Induction Motor Equivalent Circuit","Transformer Testing (OC/SC)","VFD Operation & Control","Servo Motor Selection","BLDC Motor Control","Field-Oriented Control","Space Vector PWM","Motor Thermal Analysis","Standards (IEC 60034)","MATLAB Motor Simulation","Drive-Motor Integration"],
    streamCategories: ["EEE"],
    launchpadTags: ["electrical machines engineer","motor drives engineer","vfd engineer","drive systems engineer","electric motor design engineer"],
    pulseTopics: ["Electrical Machines","Motor Drives","VFD","Electric Vehicles","BLDC","Power Electronics","Automation"],
    interviewFocus: ["induction motor control","VFD design","FOC","transformer analysis","machine testing"],
  },

  {
    id: "control_engineer",
    label: "Control Systems Engineer",
    slug: "control-systems-engineer",
    stream: "EEE",
    arenaKey: "ece",
    color: "#EAB308",
    keywords: ["control systems","control engineer","pid controller","automation engineer","plc engineer","scada engineer","process control","industrial automation","control theory","feedback control","eee control"],
    auraSkills: ["Control System Theory (Transfer Functions)","PID Controller Design","Root Locus & Bode Plots","State-Space Representation","Digital Control Systems","PLC Programming (Ladder/FBD)","SCADA Design","DCS Systems","Sensor Integration","Actuator Selection","MATLAB/Simulink Control","Real-Time Control Platforms"],
    assessmentSkills: ["Transfer Functions & Block Diagrams","PID Tuning Methods","Root Locus Analysis","Bode Plot Stability","State-Space & Observability","Z-Transform (Digital Control)","PLC Ladder / FBD / ST Programming","SCADA & HMI Design","DCS Architecture","Sensor Calibration & Integration","MATLAB/Simulink Simulation","Real-Time Controllers (dSPACE)"],
    streamCategories: ["EEE"],
    launchpadTags: ["control systems engineer","automation engineer","plc programmer","scada engineer","process control engineer"],
    pulseTopics: ["Control Systems","PLC","SCADA","Automation","PID Control","Industrial Automation","Process Control"],
    interviewFocus: ["PID tuning","stability analysis","PLC programming","SCADA design","control theory"],
  },

  {
    id: "power_electronics",
    label: "Power Electronics Engineer",
    slug: "power-electronics-engineer",
    stream: "EEE",
    arenaKey: "ece",
    color: "#EAB308",
    keywords: ["power electronics","inverter design","converter design","ev engineer","ev charging","battery management","ups design","smps engineer","pwm inverter","solar inverter","motor controller eee pe"],
    auraSkills: ["DC-DC Converters (Buck/Boost/Flyback)","DC-AC Inverters (Full-Bridge/H-Bridge)","Gate Driver Design","MOSFET / IGBT / SiC / GaN Devices","PWM Techniques (SPWM / SVPWM)","Battery Management Systems (BMS)","EV Charging Standards (CCS / CHAdeMO)","Thermal Management of Power Devices","EMI/EMC in Power Electronics","Protection Circuits (OCP/OVP)","SMPS Design","Simulation (PSIM / LTspice)"],
    assessmentSkills: ["DC-DC Converter Topologies","Inverter Design Techniques","MOSFET/IGBT/SiC/GaN Selection","PWM Control (SPWM/SVPWM)","BMS Architecture","EV Charging Protocols","Gate Driver Design","Thermal Resistance Calculation","EMI Filtering in SMPS","Protection Circuit Design","SMPS Magnetics Design","PSIM / LTspice Simulation"],
    streamCategories: ["EEE"],
    launchpadTags: ["power electronics engineer","inverter design engineer","ev engineer","bms engineer","smps design engineer"],
    pulseTopics: ["Power Electronics","EV Charging","BMS","Inverters","SiC/GaN","SMPS","Electric Vehicles"],
    interviewFocus: ["converter topologies","PWM strategies","thermal design","BMS architecture","EV standards"],
  },

  {
    id: "instrumentation_engineer",
    label: "Instrumentation Engineer",
    slug: "instrumentation-engineer",
    stream: "EEE",
    arenaKey: "ece",
    color: "#EAB308",
    keywords: ["instrumentation engineer","instrumentation","process instrumentation","instrument technician","calibration engineer","smart instruments","flow measurement","pressure measurement","temperature sensors","pid calibration","eee instrumentation"],
    auraSkills: ["Sensor Types & Selection (Pressure/Flow/Temperature/Level)","Signal Conditioning & Amplifiers","4-20mA & HART Protocols","Field Instruments (Transmitters/Valves)","PLC & DCS Integration","Calibration Techniques","P&ID Reading","Safety Instrumented Systems (SIS)","Fieldbus Protocols (PROFIBUS / Foundation Fieldbus)","Data Acquisition Systems","Loop Diagrams","ISA Standards"],
    assessmentSkills: ["Sensor Selection Criteria","Signal Conditioning Circuits","4-20mA Current Loops","HART Protocol Communication","Transmitter Calibration","Control Valve Sizing","PLC/DCS I/O Wiring","SIS & SIL Level Assessment","Fieldbus (PROFIBUS / FF)","P&ID Interpretation","Data Acquisition (DAQ)","ISA-5.1 & ISA-84 Standards"],
    streamCategories: ["EEE"],
    launchpadTags: ["instrumentation engineer","process instrumentation engineer","calibration engineer","automation instrumentation engineer","field instruments engineer"],
    pulseTopics: ["Instrumentation","Process Control","Sensors","HART Protocol","Calibration","PLC","DCS","Industrial IoT"],
    interviewFocus: ["sensor selection","calibration","HART/fieldbus","P&ID reading","SIS design"],
  },

  // ── Mechanical Sub-roles ───────────────────────────────────────────────────

  {
    id: "mechanical_design",
    label: "Mechanical Design Engineer",
    slug: "mechanical-design-engineer",
    stream: "Mechanical",
    arenaKey: "swe",
    color: "#64748B",
    keywords: ["mechanical design","mechanical engineer","cad engineer","catia","solidworks","nx engineer","product design","machine design","mechanical product","design engineer mechanical"],
    auraSkills: ["CAD (SolidWorks / CATIA / NX)","GD&T (Geometric Dimensioning & Tolerancing)","Engineering Drawing Standards","FEA (ANSYS / Abaqus)","Material Selection","Mechanism Design","DFM & DFA","Prototyping & Testing","Product Lifecycle Management (PLM)","Tolerance Stack-Up Analysis","Injection Moulding Design","Sheet Metal Design"],
    assessmentSkills: ["SolidWorks / CATIA / NX Proficiency","GD&T Application","Engineering Drawing Interpretation","FEA Simulation Setup","Material Properties & Selection","Mechanism Kinematics","DFM / DFA Principles","Prototype Testing Methods","PLM Systems","Tolerance Analysis","Plastic Part Design","Sheet Metal Forming Design"],
    streamCategories: ["Mechanical"],
    launchpadTags: ["mechanical design engineer","cad engineer","product design engineer","solidworks engineer","mechanical engineer"],
    pulseTopics: ["CAD","SolidWorks","CATIA","GD&T","Mechanical Design","FEA","Product Design","PLM"],
    interviewFocus: ["GD&T","CAD modeling","FEA interpretation","material selection","DFM principles"],
  },

  {
    id: "thermal_engineer",
    label: "Thermal / Mechanical Engineer",
    slug: "thermal-engineer",
    stream: "Mechanical",
    arenaKey: "swe",
    color: "#64748B",
    keywords: ["thermal engineer","heat transfer","hvac engineer","thermal design","mechanical thermal","fluid dynamics","cfd engineer","cooling engineer","refrigeration engineer","mech thermal"],
    auraSkills: ["Heat Transfer (Conduction/Convection/Radiation)","Fins & Extended Surfaces","Heat Exchangers (LMTD/NTU)","Boilers & Steam Power Plants","Gas Turbine Cycles (Brayton)","Refrigeration & HVAC (VCR)","CFD Simulation (ANSYS Fluent)","Thermodynamic Property Tables","Combustion & Fuels","Energy Audit & Conservation","Thermal Insulation Design","Numerical Methods in Heat Transfer"],
    assessmentSkills: ["Heat Transfer Modes (Conduction / Convection / Radiation)","Fins & Extended Surfaces","Heat Exchangers (LMTD / NTU)","Boilers & Steam Power Plants","Gas Turbine Cycles (Brayton)","Refrigeration Cycles (VCR)","HVAC System Design","Thermodynamic Property Tables","Combustion & Fuels","Numerical Methods in Heat Transfer","Thermal Insulation Design","Energy Audit & Conservation"],
    streamCategories: ["Mechanical"],
    launchpadTags: ["thermal engineer","hvac engineer","cfd engineer","heat transfer engineer","mechanical thermal engineer"],
    pulseTopics: ["Thermal Engineering","CFD","HVAC","Heat Transfer","Thermodynamics","Energy","Refrigeration"],
    interviewFocus: ["heat exchanger design","CFD setup","refrigeration cycles","energy audit","thermodynamics"],
  },

  {
    id: "manufacturing_engineer",
    label: "Manufacturing Engineer",
    slug: "manufacturing-engineer",
    stream: "Mechanical",
    arenaKey: "swe",
    color: "#64748B",
    keywords: ["manufacturing engineer","production engineer","process engineer","cnc engineer","lean engineer","quality engineer","industrial engineer","tooling engineer","mfg engineer","mech manufacturing"],
    auraSkills: ["Manufacturing Processes (Machining/Casting/Welding)","CNC Programming (G-Code/M-Code)","Lean Manufacturing & Kaizen","Statistical Process Control (SPC)","FMEA & Control Plans","Jigs & Fixture Design","Production Planning","Quality Systems (ISO 9001)","Work Study & Time-Motion","CAM Software (Mastercam)","Tolerance & GD&T","Overall Equipment Effectiveness (OEE)"],
    assessmentSkills: ["Manufacturing Process Selection","CNC G-Code & M-Code","Lean Six Sigma Concepts","Statistical Process Control (SPC)","FMEA Methodology","Jig & Fixture Design","Production Planning & Scheduling","ISO 9001 Quality Systems","Work Measurement Techniques","CAM Software Workflow","GD&T for Manufacturing","OEE Calculation & Improvement"],
    streamCategories: ["Mechanical"],
    launchpadTags: ["manufacturing engineer","process engineer","cnc engineer","lean manufacturing engineer","production engineer"],
    pulseTopics: ["Manufacturing","Lean","Six Sigma","CNC","Quality Engineering","Industry 4.0","Production"],
    interviewFocus: ["manufacturing processes","lean principles","SPC","FMEA","jig design"],
  },

  {
    id: "fluid_mechanics_engineer",
    label: "Fluid Mechanics / Hydraulic Engineer",
    slug: "fluid-mechanics-engineer",
    stream: "Mechanical",
    arenaKey: "swe",
    color: "#64748B",
    keywords: ["fluid mechanics","hydraulic engineer","fluid engineer","turbomachinery","pumps","compressor engineer","hydraulics","piping engineer","pipeline engineer","mech fluid"],
    auraSkills: ["Fluid Statics & Dynamics","Bernoulli & Continuity Equations","Pipe Flow & Head Loss (Darcy-Weisbach)","Pumps & Turbines Characteristics","Boundary Layer Theory","Turbulence & Reynolds Number","Hydraulic Machines (Pelton/Francis/Kaplan)","CFD (ANSYS Fluent / OpenFOAM)","Pipe Network Analysis","Hydraulic Transients (Water Hammer)","Two-Phase Flow","Fluid System Design"],
    assessmentSkills: ["Fluid Statics (Pressure/Buoyancy)","Bernoulli & Energy Equation","Pipe Flow (Darcy-Weisbach/Hazen-Williams)","Pump Affinity Laws","Boundary Layer Concepts","Turbulence Modeling","Hydraulic Turbine Selection","CFD Meshing & Solver Setup","Pipe Network Simulation","Water Hammer Analysis","Two-Phase Flow Fundamentals","Fluid System Sizing"],
    streamCategories: ["Mechanical"],
    launchpadTags: ["fluid mechanics engineer","hydraulic engineer","piping engineer","cfd engineer","turbomachinery engineer"],
    pulseTopics: ["Fluid Mechanics","CFD","Hydraulics","Turbomachinery","Piping Design","Energy"],
    interviewFocus: ["Bernoulli equation","pump selection","CFD setup","pipe sizing","hydraulic transients"],
  },

  // ── Civil Sub-roles ────────────────────────────────────────────────────────

  {
    id: "structural_engineer",
    label: "Structural Engineer",
    slug: "structural-engineer",
    stream: "Civil",
    arenaKey: "swe",
    color: "#78716C",
    keywords: ["structural engineer","civil structural","rcc design","steel design","building structure","structural analysis","bridge engineer","structural design","concrete design","structural civil"],
    auraSkills: ["Structural Analysis (Indeterminate)","RC Design (IS 456)","Steel Design (IS 800)","Pre-stressed Concrete","Matrix Methods & Stiffness","Finite Element Analysis (SAP2000/ETABS)","Load Calculations (IS 875)","Seismic Design (IS 1893)","Foundation Design","Yield Line Theory","Plate Girder & Connection Design","Structural Audit & Retrofitting"],
    assessmentSkills: ["Structural Analysis (Indeterminate)","RC Design (IS 456)","Steel Design (IS 800)","Pre-stressed Concrete","Matrix Methods & Stiffness","Finite Element Basics","Load Calculations (IS 875)","Seismic Design (IS 1893)","Yield Line Theory","Plate Girder Design","Connection Design (Bolted / Welded)","Structural Audit & Retrofitting"],
    streamCategories: ["Civil"],
    launchpadTags: ["structural engineer","civil structural engineer","rcc design engineer","steel design engineer","bridge engineer"],
    pulseTopics: ["Structural Engineering","RCC Design","Steel Structures","Seismic Design","ETABS","Foundation Design","IS Codes"],
    interviewFocus: ["RCC beam design","IS 456","seismic design","structural analysis","connection design"],
  },

  {
    id: "geotechnical_engineer",
    label: "Geotechnical Engineer",
    slug: "geotechnical-engineer",
    stream: "Civil",
    arenaKey: "swe",
    color: "#78716C",
    keywords: ["geotechnical engineer","soil mechanics","foundation engineer","geotechnical","earthworks","ground improvement","piling engineer","retaining wall","slope stability","soil testing","civil geo"],
    auraSkills: ["Soil Classification & Index Properties","Shear Strength (Mohr-Coulomb)","Compressibility & Settlement Analysis","Foundation Types (Shallow/Deep)","Pile Design & Load Test","Retaining Wall Design","Slope Stability Analysis (Bishop)","Ground Improvement Techniques","Seismic Site Classification","Soil Testing (SPT/CPT/Plate Load)","Geotechnical Report Writing","GeoStudio / PLAXIS"],
    assessmentSkills: ["Soil Classification (IS 1498)","Shear Strength Parameters","Terzaghi Settlement Theory","Bearing Capacity (Terzaghi/Meyerhof)","Pile Design Methods","Retaining Wall Earth Pressure (Rankine/Coulomb)","Bishop Slope Stability","Ground Improvement Methods","Liquefaction Assessment","SPT / CPT Interpretation","Geotechnical Investigation","PLAXIS / GeoStudio Modeling"],
    streamCategories: ["Civil"],
    launchpadTags: ["geotechnical engineer","foundation engineer","soil engineer","piling engineer","ground improvement engineer"],
    pulseTopics: ["Geotechnical Engineering","Soil Mechanics","Foundation Design","Ground Improvement","Piling","Slope Stability"],
    interviewFocus: ["bearing capacity","settlement","pile design","slope stability","soil testing"],
  },

  {
    id: "transportation_engineer",
    label: "Transportation Engineer",
    slug: "transportation-engineer",
    stream: "Civil",
    arenaKey: "swe",
    color: "#78716C",
    keywords: ["transportation engineer","highway engineer","road design","traffic engineer","pavement engineer","road engineer","urban transport","transport planning","civil transport","highway design"],
    auraSkills: ["Highway Geometric Design (IRC)","Pavement Design (Flexible / Rigid)","Traffic Engineering & Studies","Traffic Signal Design","Road Safety Audit","Horizontal & Vertical Alignment","Grade Separator & Interchange Design","Urban Transportation Planning","Travel Demand Modeling","Public Transport Planning","AutoCAD Civil 3D","IRC Standards (IRC:73, IRC:37)"],
    assessmentSkills: ["Horizontal Alignment Design","Vertical Alignment & Grade","IRC Geometric Design Standards","Flexible Pavement Design (IRC:37)","Rigid Pavement Design (IRC:58)","Traffic Volume Studies","PCU & LOS Analysis","Sight Distance Calculations","Intersection Design","Road Safety Audit","Civil 3D Alignment","VISSIM Traffic Simulation"],
    streamCategories: ["Civil"],
    launchpadTags: ["transportation engineer","highway engineer","road design engineer","traffic engineer","pavement engineer"],
    pulseTopics: ["Transportation Engineering","Highway Design","Traffic Engineering","Pavement","Urban Mobility","IRC Codes"],
    interviewFocus: ["geometric design","pavement design","traffic analysis","IRC standards","sight distance"],
  },

  {
    id: "water_resources_engineer",
    label: "Water Resources Engineer",
    slug: "water-resources-engineer",
    stream: "Civil",
    arenaKey: "swe",
    color: "#78716C",
    keywords: ["water resources","hydraulic engineer civil","irrigation engineer","hydrology","dam engineer","flood control","water supply","drainage engineer","canal design","civil water"],
    auraSkills: ["Hydrology (Rainfall-Runoff Analysis)","Open Channel Flow","Canal Design & Lining","Dam & Spillway Design","Flood Routing & Estimation","Irrigation Systems","Water Supply Network Design","Drainage System Design","Groundwater Hydrology","Watershed Management","HEC-RAS / SWMM","IS / IRC Water Standards"],
    assessmentSkills: ["Rainfall-Runoff Methods (SCS / Rational)","Manning's Equation for Open Channels","Canal Design (IS 7112)","Dam Types & Spillway Design","Flood Frequency Analysis","Irrigation Water Requirements","Water Supply Distribution (Hardy-Cross)","Storm Drain Design","Groundwater Well Design","Unit Hydrograph","HEC-RAS 1D/2D Modeling","Drought Management"],
    streamCategories: ["Civil"],
    launchpadTags: ["water resources engineer","hydraulic engineer","irrigation engineer","hydrology engineer","dam engineer"],
    pulseTopics: ["Water Resources","Hydrology","Hydraulics","Irrigation","Flood Management","Open Channel Flow","Water Supply"],
    interviewFocus: ["Manning's equation","flood routing","canal design","groundwater","water supply network"],
  },

  {
    id: "construction_engineer",
    label: "Construction Engineer / Site Engineer",
    slug: "construction-engineer",
    stream: "Civil",
    arenaKey: "swe",
    color: "#78716C",
    keywords: ["construction engineer","site engineer","project engineer civil","building construction","construction management","quantity surveyor","civil site engineer","construction supervisor","estimation engineer","civil construction","site civil"],
    auraSkills: ["Construction Sequence & Method Statements","Bar Bending Schedule (BBS)","Quantity Estimation & BOQ","Project Scheduling (CPM/PERT)","Construction Materials Testing","Quality Control (IS / ASTM)","Safety at Site (IS 4014)","Contract Management (FIDIC/PWD)","Equipment Selection","Concrete Mix Design","Auto-CAD for Site Drawings","ERP Systems (Primavera / MS Project)"],
    assessmentSkills: ["Construction Sequence Planning","Bar Bending Schedule (BBS)","BOQ Preparation","CPM / PERT Network Analysis","Concrete & Steel Testing Standards","Site Quality Control Checks","Safety Regulations (IS 4014)","FIDIC Contract Terms","Equipment Productivity Calculation","Mix Design (IS 10262)","Reading Working Drawings","Primavera / MS Project Scheduling"],
    streamCategories: ["Civil"],
    launchpadTags: ["construction engineer","site engineer","project engineer","civil engineer","quantity surveyor"],
    pulseTopics: ["Construction Management","Site Engineering","Project Planning","Quality Control","Building Materials","BOQ","Safety"],
    interviewFocus: ["BBS preparation","BOQ estimation","CPM scheduling","quality control","site safety"],
  },

  {
    id: "civil_general",
    label: "Civil Engineer",
    slug: "civil-engineer",
    stream: "Civil",
    arenaKey: "swe",
    color: "#78716C",
    keywords: ["civil engineer","civil engineering","civil graduate","municipal engineer","environmental engineer","infrastructure engineer"],
    auraSkills: ["Structural Analysis","Soil Mechanics","Fluid Mechanics / Hydraulics","Transportation Engineering","Construction Technology","Surveying & Geomatics","Engineering Materials","Environmental Engineering","Project Management","AutoCAD","IS Codes Fundamentals","Estimation & Costing"],
    assessmentSkills: ["Structural Analysis Basics","Soil Mechanics Fundamentals","Fluid Mechanics & Hydraulics","Highway Engineering","Construction Materials","Surveying Methods","Environmental Engineering","Estimation & Costing","AutoCAD Basics","IS Code References","Project Planning Basics","Site Management"],
    streamCategories: ["Civil"],
    launchpadTags: ["civil engineer","infrastructure engineer","municipal engineer","civil engineering graduate"],
    pulseTopics: ["Civil Engineering","Structural","Geotechnical","Transportation","Hydraulics","Construction","IS Codes"],
    interviewFocus: ["structural fundamentals","soil mechanics","fluid flow","highway design","construction methods"],
  },
]

// ─── Challenge bank key mapping ───────────────────────────────────────────────
// Maps role id → key used by getDomainChallenges() in domainChallenges.js
// These are distinct from arenaKey (which maps to arenaDomains.js display config)
const _CHALLENGE_KEYS = {
  // IT / Software
  frontend:               "frontend",
  backend:                "backend",
  fullstack:              "fullstack",
  swe:                    "swe",
  data:                   "data",
  data_engineer:          "data_engineer",
  bi_analyst:             "bi_analyst",
  dba:                    "dba",
  cyber:                  "cyber",
  devops:                 "devops",
  sre:                    "sre",
  aws:                    "aws",
  azure:                  "azure",
  soc:                    "soc",
  qa:                     "qa",
  ba_product:             "ba_product",
  medical:                "medical",
  // ECE sub-roles
  embedded:               "ece_embedded",
  vlsi:                   "ece_vlsi",
  analog_layout:          "ece_interactive",
  rf_engineer:            "ece_rf",
  iot_engineer:           "ece_iot",
  telecom_engineer:       "ece_telecom",
  hardware_engineer:      "ece",
  // EEE sub-roles
  power_engineer:         "eee_power",
  electrical_machines:    "eee_machines",
  control_engineer:       "eee_control",
  power_electronics:      "eee_pe",
  instrumentation_engineer: "eee_instrumentation",
  // Mechanical sub-roles
  mechanical_design:      "mech_design",
  thermal_engineer:       "mech_thermal",
  manufacturing_engineer: "mech_manufacturing",
  fluid_mechanics_engineer: "mech_fluid",
  // Civil sub-roles
  structural_engineer:    "civil_structural",
  geotechnical_engineer:  "civil_geotechnical",
  transportation_engineer:"civil_transportation",
  water_resources_engineer: "civil_water",
  construction_engineer:  "civil_construction",
  civil_general:          "civil",
}

// ─── Build lookup maps ────────────────────────────────────────────────────────

// Augment each role with its challengeKey
const _AUGMENTED_REGISTRY = ROLE_REGISTRY.map(r => ({
  ...r,
  challengeKey: _CHALLENGE_KEYS[r.id] || r.arenaKey,
}))

const _byId  = new Map(_AUGMENTED_REGISTRY.map(r => [r.id, r]))
const _bySlug = new Map(_AUGMENTED_REGISTRY.map(r => [r.slug, r]))

// keyword → role (sorted longest keyword first so "analog layout engineer" beats "engineer")
const _kwEntries = _AUGMENTED_REGISTRY.flatMap(role =>
  role.keywords.map(kw => ({ kw: kw.toLowerCase(), role }))
).sort((a, b) => b.kw.length - a.kw.length)

// ─── Default / fallback role ──────────────────────────────────────────────────
const DEFAULT_ROLE = _byId.get("swe")

// ─── Main Resolver ────────────────────────────────────────────────────────────
/**
 * getRoleConfig(keyword | userData | slug)
 *
 * Accepts:
 *  - a raw keyword string  ("Embedded Engineer", "vlsi", "ECE")
 *  - a userData object     ({ keyword, career_track_slug, branch, domain, arenaKey, domain_key })
 *  - a slug string         ("embedded-engineer")
 *
 * Returns the matching RoleConfig object. Never throws. Falls back to SWE.
 */
export function getRoleConfig(input) {
  if (!input) return DEFAULT_ROLE

  // ── If it's a userData object ──────────────────────────────────────────────
  if (typeof input === "object" && !Array.isArray(input)) {
    // 1. Explicit arena overrides (set programmatically)
    const explicit = input.domain || input.arenaKey || input.domain_key
    if (explicit) {
      const byId = _byId.get(explicit.toLowerCase())
      if (byId) return byId
    }
    // 2. career_track_slug
    if (input.career_track_slug) {
      const bySlug = _bySlug.get(input.career_track_slug.toLowerCase())
      if (bySlug) return bySlug
    }
    // 3. keyword (primary role signal)
    const kw = input.keyword || input.job_role || input.target_role
    if (kw) return getRoleConfig(kw)
    // 4. branch fallback
    if (input.branch) return _resolveByBranch(input.branch)
    return DEFAULT_ROLE
  }

  // ── String input ────────────────────────────────────────────────────────────
  const raw = String(input).trim()
  if (!raw) return DEFAULT_ROLE

  // 1. Exact id match
  const lower = raw.toLowerCase()
  const byId = _byId.get(lower)
  if (byId) return byId

  // 2. Exact slug match
  const bySlug = _bySlug.get(lower)
  if (bySlug) return bySlug

  // 3. Keyword substring match (longest first → most specific wins)
  for (const { kw, role } of _kwEntries) {
    if (lower.includes(kw)) return role
  }

  // 4. Branch/stream fallback
  const branchRole = _resolveByBranch(raw)
  if (branchRole !== DEFAULT_ROLE) return branchRole

  return DEFAULT_ROLE
}

function _resolveByBranch(branch) {
  const b = String(branch).toLowerCase()
  if (b === "ece" || b.includes("electronics")) return _byId.get("embedded")
  if (b === "eee" || b.includes("electrical")) return _byId.get("power_engineer")
  if (b === "civil") return _byId.get("civil_general")
  if (b === "mechanical" || b === "mech") return _byId.get("mechanical_design")
  if (b === "iot") return _byId.get("iot_engineer")
  if (b === "cse" || b === "it" || b.includes("computer")) return _byId.get("swe")
  if (b === "data science" || b.includes("data science")) return _byId.get("data")
  return DEFAULT_ROLE
}

// ─── Arena domain key helper ──────────────────────────────────────────────────
/** Returns the arenaDomains.js key (e.g. "ece", "swe", "frontend") */
export function resolveArenaKey(input) {
  return getRoleConfig(input).arenaKey
}

/** Returns the human-readable label (replaces normalizeDomain in Aura) */
export function resolveRoleLabel(input) {
  return getRoleConfig(input).label
}

/** Returns assessment skill list for MCQ generation */
export function resolveAssessmentSkills(input) {
  return getRoleConfig(input).assessmentSkills
}

/** Returns Aura radar skill list */
export function resolveAuraSkills(input) {
  return getRoleConfig(input).auraSkills
}

/** Returns engineering challenge bank category keys */
export function resolveStreamCategories(input) {
  return getRoleConfig(input).streamCategories
}

/** Returns challenge bank key for getDomainChallenges() (replaces SLUG_MAP+DOMAIN_MAP in useDomainChallengeSlots) */
export function resolveChallengeKey(input) {
  return getRoleConfig(input).challengeKey
}

/** Export full registry for pages that need to enumerate all roles */
export { ROLE_REGISTRY, _AUGMENTED_REGISTRY as AUGMENTED_ROLE_REGISTRY }
