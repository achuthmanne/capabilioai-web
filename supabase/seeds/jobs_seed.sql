-- ─────────────────────────────────────────────────────────────────────────────
-- Capabilio Jobs Seed — 56 curated Indian jobs across all 8 streams
-- Run in Supabase SQL editor on production project (eybchcqwbizjmzyrviri)
-- Step 1: ensures all required columns exist (safe to re-run)
-- Step 2: inserts seed rows with ON CONFLICT DO NOTHING
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: ensure columns exist (production schema may differ from dev) ──────
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company          text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_logo     text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_desc     text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS title            text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS jd_full          text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS jd_summary       text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS required_skills  jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS essential_skills jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS good_to_have     jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS technologies     jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location         text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type         text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS work_mode        text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_min       numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_max       numeric;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS salary_currency  text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_min   integer;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS experience_max   integer;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_verified      boolean DEFAULT true;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_active        boolean DEFAULT true;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source           text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_url     text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS metadata         jsonb;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_at        timestamptz DEFAULT now();
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at       timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS created_at       timestamptz DEFAULT now();

-- ── Step 2: seed 56 jobs ──────────────────────────────────────────────────────
INSERT INTO jobs (
  id, company, title, jd_summary, essential_skills, technologies,
  location, job_type, work_mode, salary_min, salary_max, salary_currency,
  experience_min, experience_max, is_verified, is_active, source,
  external_url, posted_at, expires_at
) VALUES

-- ── IT / Frontend ─────────────────────────────────────────────────────────────
(gen_random_uuid(), 'Swiggy', 'Frontend Engineer — React',
 'Build high-performance, accessible web experiences for Swiggy''s consumer platform. Work with design systems, optimise Core Web Vitals, and own feature delivery end-to-end.',
 '["React","JavaScript","HTML/CSS","REST APIs","Git"]', '["React","Redux Toolkit","Vite","Storybook"]',
 'Bangalore', 'full-time', 'hybrid', 700000, 1400000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://careers.swiggy.com', now() - interval '2 days', now() + interval '28 days'),

(gen_random_uuid(), 'Zepto', 'UI Engineer — Next.js',
 'Own the frontend of Zepto''s high-traffic category and search pages. 10ms p99 rendering is the bar — you''ll A/B test, monitor, and iterate.',
 '["Next.js","TypeScript","CSS Modules","Performance Profiling"]', '["Next.js","TypeScript","Tailwind","Vercel"]',
 'Mumbai', 'full-time', 'office', 800000, 1600000, 'INR', 1, 3, true, true, 'Capabilio',
 'https://www.zepto.com/careers', now() - interval '1 day', now() + interval '30 days'),

(gen_random_uuid(), 'PhonePe', 'React Developer',
 'Develop fintech web components used by 500M+ users. Own the payments checkout flow, maintain design-system tokens, and ensure WCAG 2.1 AA compliance.',
 '["React","JavaScript","CSS-in-JS","Unit Testing","Accessibility"]', '["React","Jest","Emotion","Webpack"]',
 'Bangalore', 'full-time', 'hybrid', 900000, 1800000, 'INR', 1, 4, true, true, 'Capabilio',
 'https://phonepe.com/careers', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'Razorpay', 'Frontend Engineer (Intern)',
 'Contribute to Razorpay''s payment dashboard UI. Implement features under mentorship, write unit tests, and ship to production within your first 4 weeks.',
 '["HTML","CSS","JavaScript","React"]', '["React","Jest","Figma"]',
 'Bangalore', 'internship', 'hybrid', 30000, 60000, 'INR', 0, 0, true, true, 'Capabilio',
 'https://razorpay.com/jobs', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'Meesho', 'Angular Developer',
 'Build Meesho''s seller dashboard and order management UI. Work with a design system, own E2E test coverage, and collaborate directly with product and data teams.',
 '["Angular","TypeScript","RxJS","HTML/CSS","REST APIs"]', '["Angular","TypeScript","RxJS","Jasmine","Figma"]',
 'Bangalore', 'full-time', 'hybrid', 700000, 1400000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://meesho.io/jobs', now() - interval '5 days', now() + interval '25 days'),

-- ── IT / Backend ──────────────────────────────────────────────────────────────
(gen_random_uuid(), 'Flipkart', 'Backend Engineer — Java',
 'Design distributed microservices powering Flipkart''s catalog and inventory. Own service SLAs, write load tests, and participate in on-call rotation.',
 '["Java","Spring Boot","SQL","Microservices","Kafka"]', '["Java 17","Spring Boot","Kafka","MySQL","Docker"]',
 'Bangalore', 'full-time', 'office', 1000000, 2200000, 'INR', 1, 4, true, true, 'Capabilio',
 'https://www.flipkartcareers.com', now() - interval '2 days', now() + interval '28 days'),

(gen_random_uuid(), 'Ola', 'Node.js Backend Developer',
 'Build real-time ride-matching and surge-pricing APIs. Work with Postgres, Redis, and event-driven architectures at scale.',
 '["Node.js","Express","PostgreSQL","Redis","REST APIs"]', '["Node.js","PostgreSQL","Redis","RabbitMQ","AWS"]',
 'Bangalore', 'full-time', 'hybrid', 800000, 1600000, 'INR', 1, 3, true, true, 'Capabilio',
 'https://ola.com/careers', now() - interval '5 days', now() + interval '25 days'),

(gen_random_uuid(), 'CRED', 'Python Backend Engineer',
 'Work on CRED''s lending and credit-score stack. Design idempotent APIs, build data pipelines, and ensure regulatory compliance for financial data.',
 '["Python","FastAPI","PostgreSQL","Celery","Docker"]', '["Python","FastAPI","PostgreSQL","Celery","Redis"]',
 'Bangalore', 'full-time', 'hybrid', 1200000, 2500000, 'INR', 2, 5, true, true, 'Capabilio',
 'https://careers.cred.club', now() - interval '1 day', now() + interval '29 days'),

(gen_random_uuid(), 'Freshworks', 'Software Engineer — Backend',
 'Build multi-tenant SaaS features for Freshdesk. Own the API layer, write integration tests, and work with a globally distributed team.',
 '["Java / Go","REST APIs","SQL","Unit Testing"]', '["Java","Spring","MySQL","Kubernetes"]',
 'Chennai', 'full-time', 'hybrid', 800000, 1800000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://careers.freshworks.com', now() - interval '6 days', now() + interval '24 days'),

(gen_random_uuid(), 'Paytm', 'Go Backend Engineer',
 'Build high-throughput payment processing services in Go. Own API design, performance benchmarks, and incident response for Paytm''s core transaction flow.',
 '["Go","gRPC","PostgreSQL","Redis","Microservices"]', '["Go","gRPC","Kafka","PostgreSQL","Kubernetes"]',
 'Noida', 'full-time', 'hybrid', 900000, 2000000, 'INR', 1, 4, true, true, 'Capabilio',
 'https://paytm.com/careers', now() - interval '3 days', now() + interval '27 days'),

-- ── IT / Data / ML ────────────────────────────────────────────────────────────
(gen_random_uuid(), 'Meesho', 'Data Analyst',
 'Analyse seller and buyer funnel metrics, build dashboards in Metabase, and partner with product teams to design experiments.',
 '["SQL","Python","Data Visualisation","A/B Testing","Excel"]', '["SQL","Python","Metabase","Google Sheets"]',
 'Bangalore', 'full-time', 'hybrid', 600000, 1200000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://meesho.io/jobs', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'Groww', 'Data Engineer',
 'Build and maintain Groww''s investment analytics pipelines. Own dbt models, Airflow DAGs, and ensure data freshness SLAs across 10M+ daily active investors.',
 '["SQL","Python","Apache Spark","Airflow","dbt"]', '["Spark","Airflow","dbt","BigQuery","Python"]',
 'Bangalore', 'full-time', 'office', 1000000, 2000000, 'INR', 1, 4, true, true, 'Capabilio',
 'https://groww.in/careers', now() - interval '2 days', now() + interval '28 days'),

(gen_random_uuid(), 'Juspay', 'ML Engineer',
 'Build fraud-detection and recommendation models for Juspay''s payment network. Own model training pipelines and serve predictions at sub-10ms latency.',
 '["Python","Machine Learning","Scikit-learn","SQL","Feature Engineering"]', '["Python","XGBoost","MLflow","Kubernetes","Redis"]',
 'Bangalore', 'full-time', 'hybrid', 1400000, 2800000, 'INR', 2, 5, true, true, 'Capabilio',
 'https://juspay.in/careers', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'Tiger Analytics', 'Business Intelligence Analyst',
 'Develop Power BI dashboards and SQL reports for Fortune 500 clients. Translate business KPIs into data models and visual narratives.',
 '["SQL","Power BI / Tableau","Excel","Data Modelling","Stakeholder Communication"]', '["Power BI","SQL Server","Python","Excel"]',
 'Chennai', 'full-time', 'hybrid', 500000, 1000000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://www.tigeranalytics.com/careers', now() - interval '7 days', now() + interval '23 days'),

-- ── IT / DevOps / Cloud / SRE / Cyber / QA ───────────────────────────────────
(gen_random_uuid(), 'Infosys', 'DevOps Engineer — AWS',
 'Automate CI/CD pipelines, manage EKS clusters, and drive infrastructure-as-code adoption using Terraform.',
 '["Docker","Kubernetes","Terraform","CI/CD","AWS"]', '["AWS","Kubernetes","Terraform","Jenkins","Prometheus"]',
 'Hyderabad', 'full-time', 'hybrid', 700000, 1500000, 'INR', 1, 3, true, true, 'Capabilio',
 'https://www.infosys.com/careers', now() - interval '5 days', now() + interval '25 days'),

(gen_random_uuid(), 'HCL Technologies', 'Azure Cloud Engineer',
 'Migrate on-prem workloads to Azure, design VNet architectures, and manage Azure DevOps pipelines for enterprise clients.',
 '["Azure","Terraform","PowerShell","CI/CD","Networking"]', '["Azure","Azure DevOps","Terraform","ARM Templates"]',
 'Noida', 'full-time', 'hybrid', 800000, 1600000, 'INR', 1, 4, true, true, 'Capabilio',
 'https://www.hcltech.com/careers', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'Wipro', 'SOC Analyst — Tier 2',
 'Monitor SIEM alerts, investigate incidents, and perform threat hunting. Own playbooks for common attack patterns and mentor Tier 1 analysts.',
 '["SIEM","Threat Intelligence","Log Analysis","Incident Response","Networking"]', '["Splunk","CrowdStrike","Palo Alto","Wireshark"]',
 'Bangalore', 'full-time', 'office', 700000, 1400000, 'INR', 1, 3, true, true, 'Capabilio',
 'https://careers.wipro.com', now() - interval '6 days', now() + interval '24 days'),

(gen_random_uuid(), 'TCS', 'QA Automation Engineer',
 'Design Selenium/Playwright test frameworks, integrate them into CI pipelines, and own release-gate quality metrics for a banking client.',
 '["Selenium / Playwright","Java or Python","TestNG","CI/CD","API Testing"]', '["Playwright","Java","TestNG","Jenkins","Postman"]',
 'Pune', 'full-time', 'hybrid', 600000, 1200000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://www.tcs.com/careers', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'Zscaler', 'Site Reliability Engineer',
 'Own availability SLOs for Zscaler''s cloud security platform. Build alerting runbooks, drive post-mortem culture, and automate toil.',
 '["Linux","Python","Prometheus / Grafana","Kubernetes","Incident Management"]', '["Kubernetes","Prometheus","Python","Terraform","PagerDuty"]',
 'Bangalore', 'full-time', 'remote', 1800000, 3500000, 'INR', 3, 7, true, true, 'Capabilio',
 'https://www.zscaler.com/careers', now() - interval '1 day', now() + interval '29 days'),

(gen_random_uuid(), 'Cognizant', 'Business Analyst — IT',
 'Elicit requirements from enterprise banking clients, write BRDs/user stories, and bridge business and engineering teams through SDLC.',
 '["Requirements Gathering","BRD / User Stories","SQL","JIRA","Agile / Scrum"]', '["JIRA","Confluence","SQL","Excel","PowerPoint"]',
 'Chennai', 'full-time', 'hybrid', 600000, 1200000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://careers.cognizant.com', now() - interval '4 days', now() + interval '26 days'),

-- ── ECE / Embedded / VLSI / Mobile ───────────────────────────────────────────
(gen_random_uuid(), 'Qualcomm India', 'Embedded Software Engineer',
 'Develop and debug BSP drivers for Snapdragon SoCs in C/C++ on RTOS environments.',
 '["Embedded C","RTOS","ARM Cortex","Debugging (JTAG/GDB)","Device Drivers"]', '["C","FreeRTOS","ARM","JTAG","Linux BSP"]',
 'Hyderabad', 'full-time', 'office', 900000, 2000000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://qualcomm.com/company/careers', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'NXP Semiconductors', 'Firmware Engineer — MCU',
 'Write bare-metal and RTOS firmware for NXP''s automotive-grade LPC and i.MX product lines. Own CAN/LIN protocol stacks.',
 '["Embedded C","CAN/LIN Protocols","ARM Cortex-M","RTOS","Power Management"]', '["C","FreeRTOS","NXP MCUXpresso","CAN","AUTOSAR"]',
 'Noida', 'full-time', 'office', 800000, 1700000, 'INR', 1, 4, true, true, 'Capabilio',
 'https://nxp.com/careers', now() - interval '2 days', now() + interval '28 days'),

(gen_random_uuid(), 'Intel India', 'RTL Design Engineer — VLSI',
 'Design RTL blocks for Intel''s next-gen server processors. Write synthesisable Verilog, run lint/CDC checks, and work with physical design teams on timing closure.',
 '["Verilog","SystemVerilog","RTL Design","Synthesis","Timing Analysis"]', '["Verilog","Synopsys DC","Cadence","LINT","CDC"]',
 'Bangalore', 'full-time', 'office', 1200000, 2800000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://jobs.intel.com', now() - interval '5 days', now() + interval '25 days'),

(gen_random_uuid(), 'AMD India', 'VLSI Verification Engineer',
 'Develop UVM testbenches for AMD''s GPU compute units. Own functional coverage closure and debug DUT failures.',
 '["SystemVerilog","UVM","Functional Coverage","Debug","Regression Management"]', '["SystemVerilog","UVM","Cadence xcelium","Verdi","Python"]',
 'Hyderabad', 'full-time', 'office', 1000000, 2400000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://amd.com/en/corporate/careers', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'Texas Instruments India', 'Analog IC Design Engineer',
 'Design low-noise LDO regulators and DC-DC converters for TI''s power management portfolio. Own schematic, layout guidance, and characterisation.',
 '["Analog Circuit Design","SPICE Simulation","LDO / DCDC","Cadence Virtuoso","Characterisation"]', '["Cadence Virtuoso","HSPICE","Python","Oscilloscope"]',
 'Bangalore', 'full-time', 'office', 1100000, 2500000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://ti.com/careers', now() - interval '6 days', now() + interval '24 days'),

(gen_random_uuid(), 'Bosch India', 'Embedded Systems Engineer — Automotive',
 'Develop AUTOSAR-compliant software for Bosch''s ABS and ADAS ECUs. Own MCAL driver integration and HIL test setup.',
 '["AUTOSAR","Embedded C","CAN/FlexRay","HIL Testing","Calibration"]', '["AUTOSAR","ETAS INCA","CANoe","C","MATLAB Simulink"]',
 'Coimbatore', 'full-time', 'office', 700000, 1500000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://bosch.in/careers', now() - interval '7 days', now() + interval '23 days'),

(gen_random_uuid(), 'Samsung R&D India', 'Android Platform Engineer',
 'Work on Samsung''s OneUI Android platform. Optimise system services, write native C++ components, and collaborate with Qualcomm BSP teams.',
 '["Android SDK","Java/Kotlin","C/C++ (NDK)","AOSP","System Services"]', '["Android","Kotlin","C++","AOSP","Qualcomm BSP"]',
 'Noida', 'full-time', 'office', 900000, 2000000, 'INR', 1, 4, true, true, 'Capabilio',
 'https://research.samsung.com/sri-n/careers', now() - interval '2 days', now() + interval '28 days'),

(gen_random_uuid(), 'Apple India', 'iOS App Developer',
 'Build SwiftUI features for Apple''s iOS apps used by hundreds of millions globally. Work closely with design partners.',
 '["Swift","SwiftUI","Xcode","UIKit","Core Data"]', '["Swift","SwiftUI","Xcode","Instruments","TestFlight"]',
 'Hyderabad', 'full-time', 'office', 2000000, 4500000, 'INR', 2, 6, true, true, 'Capabilio',
 'https://jobs.apple.com', now() - interval '1 day', now() + interval '29 days'),

-- ── EEE / Electrical ──────────────────────────────────────────────────────────
(gen_random_uuid(), 'BHEL', 'Electrical Engineer — Power Systems',
 'Design HV substation layouts, perform load-flow studies in ETAP, and commission 220kV switchgear on government infrastructure projects.',
 '["Power Systems","ETAP","HV Switchgear","Protection Relays","IEC Standards"]', '["ETAP","AutoCAD Electrical","MATLAB","IEC 61850"]',
 'Delhi', 'full-time', 'office', 500000, 900000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://bhel.com/careers', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'Siemens India', 'Power Electronics Engineer',
 'Design and test motor drive inverters and UPS systems. Own gate-drive circuit design, thermal modelling, and EMC compliance testing.',
 '["Power Electronics","IGBT/MOSFET","MATLAB Simulink","PCB Design","EMC Testing"]', '["MATLAB","Altium Designer","LTspice","Oscilloscope","Power Analyser"]',
 'Mumbai', 'full-time', 'office', 700000, 1400000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://siemens.com/global/en/company/jobs.html', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'Tata Power', 'Solar Energy Engineer',
 'Commission utility-scale solar PV plants, perform energy yield simulations, and manage EPC contractor timelines for MW-scale projects.',
 '["Solar PV","PVSyst","Energy Yield Analysis","Commissioning","Project Management"]', '["PVSyst","AutoCAD","SCADA","SAP","MS Project"]',
 'Mumbai', 'full-time', 'field', 600000, 1200000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://tatapower.com/careers', now() - interval '5 days', now() + interval '25 days'),

(gen_random_uuid(), 'Havells India', 'Product Engineer — Switchgear',
 'Develop LV switchgear products (MCBs, ELCBs, ACBs) from concept to production. Own design validation and type-test compliance.',
 '["LV Switchgear","IEC 60947","PCB Design","FMEA","Product Testing"]', '["SolidWorks","AutoCAD","MATLAB","IEC Standards"]',
 'Noida', 'full-time', 'office', 500000, 1000000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://havells.com/careers', now() - interval '6 days', now() + interval '24 days'),

(gen_random_uuid(), 'Schneider Electric India', 'Automation & Instrumentation Engineer',
 'Commission PLC/DCS systems for oil & gas and manufacturing clients. Configure HMI/SCADA, tune PID loops, and write IEC 61511 SIS documentation.',
 '["PLC Programming","SCADA/HMI","Instrumentation","P&ID","IEC 61511"]', '["Schneider EcoStruxure","AVEVA SCADA","Modbus","HART","IEC 61131"]',
 'Hyderabad', 'full-time', 'hybrid', 600000, 1300000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://schneider-electric.com/careers', now() - interval '2 days', now() + interval '28 days'),

-- ── Mechanical Engineering ────────────────────────────────────────────────────
(gen_random_uuid(), 'Mahindra & Mahindra', 'Design Engineer — Vehicle Dynamics',
 'Design suspension linkages, perform ADAMS multi-body simulations, and support ride & handling sign-off tests for new SUV platforms.',
 '["SolidWorks / CATIA","ADAMS","Vehicle Dynamics","GD&T","FEA Basics"]', '["CATIA V5","ADAMS","MATLAB","HyperWorks"]',
 'Pune', 'full-time', 'office', 600000, 1200000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://careers.mahindra.com', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'Tata Motors', 'Thermal Engineering — EV Powertrain',
 'Design battery thermal management systems for Tata''s EV lineup. Own CFD simulations and define cooling loop architecture.',
 '["Thermal Analysis","CFD (ANSYS Fluent)","Battery Cooling","Heat Exchangers","NPI"]', '["ANSYS Fluent","SolidWorks","MATLAB","CATIA"]',
 'Pune', 'full-time', 'office', 700000, 1400000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://tatamotors.com/careers', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'L&T Heavy Engineering', 'Structural Design Engineer',
 'Design pressure vessels and heat exchangers to ASME Sec VIII Div 1/2. Use FEA for stress analysis and interface with fabrication teams.',
 '["ASME Codes","FEA (ANSYS)","Pressure Vessel Design","COMPRESS / PV Elite","AutoCAD"]', '["ANSYS","COMPRESS","AutoCAD","SolidWorks"]',
 'Mumbai', 'full-time', 'office', 550000, 1100000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://lntecc.com/careers', now() - interval '5 days', now() + interval '25 days'),

(gen_random_uuid(), 'GE Aerospace India', 'Manufacturing Engineer — Gas Turbines',
 'Develop manufacturing processes for compressor blades and turbine discs. Own DFM reviews, write process sheets, and support first-article inspections.',
 '["Manufacturing Processes","GD&T","CNC Programming","FMEA","Quality Systems"]', '["CATIA","SAP","CMM","CNC","Six Sigma"]',
 'Hyderabad', 'full-time', 'office', 800000, 1600000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://jobs.gecareers.com', now() - interval '2 days', now() + interval '28 days'),

-- ── Civil Engineering ─────────────────────────────────────────────────────────
(gen_random_uuid(), 'L&T Construction', 'Site Engineer — Civil',
 'Supervise RCC structural works on a metro rail project. Coordinate with consultants, manage daily labour scheduling, and maintain QA/QC records.',
 '["RCC Design","AutoCAD","Site Supervision","IS Codes","Project Scheduling"]', '["AutoCAD","MS Project","STAAD.Pro","IS 456","Primavera"]',
 'Mumbai', 'full-time', 'office', 450000, 800000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://lntecc.com/careers', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'Shapoorji Pallonji', 'Structural Engineer',
 'Design RC and steel frames for high-rise commercial buildings. Use ETABS and SAFE for analysis and review shop drawings.',
 '["ETABS","SAFE","IS 456","Steel Design","Structural Drawings"]', '["ETABS","SAFE","AutoCAD","STAAD.Pro","Revit"]',
 'Mumbai', 'full-time', 'office', 500000, 1000000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://shapoorji.in/careers', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'AECOM India', 'Geotechnical Engineer',
 'Conduct site investigations, analyse soil reports, and design pile foundations and retaining walls for infrastructure projects.',
 '["Geotechnical Investigation","Foundation Design","IS 1904","PLAXIS","Report Writing"]', '["PLAXIS","AutoCAD","GeoStudio","Excel","IS 6403"]',
 'Hyderabad', 'full-time', 'office', 600000, 1200000, 'INR', 0, 3, true, true, 'Capabilio',
 'https://aecom.com/careers', now() - interval '5 days', now() + interval '25 days'),

(gen_random_uuid(), 'NHAI', 'Highway Engineer',
 'Manage road pavement design, drainage design, and BOQ preparation for national highway projects.',
 '["Highway Design","Pavement Design","IRC Codes","AutoCAD","BOQ Preparation"]', '["AutoCAD","MS Excel","Civil 3D","IRC:37"]',
 'Delhi', 'full-time', 'office', 500000, 900000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://nhai.gov.in/recruitment', now() - interval '6 days', now() + interval '24 days'),

(gen_random_uuid(), 'Sterlite Power', 'Water Resources Engineer',
 'Design water supply networks, hydraulic models, and sewage treatment plants for smart city projects.',
 '["Water Supply Design","EPANET","STP Design","Hydraulics","Tender Documentation"]', '["EPANET","AutoCAD","WaterGEMS","IS 1172","MS Project"]',
 'Pune', 'full-time', 'office', 500000, 950000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://sterlitepower.com/careers', now() - interval '7 days', now() + interval '23 days'),

-- ── IoT ───────────────────────────────────────────────────────────────────────
(gen_random_uuid(), 'Honeywell India', 'IoT Platform Engineer',
 'Build IoT device management microservices on AWS IoT Core. Handle MQTT broker configuration, OTA update pipelines, and device shadow management.',
 '["IoT Protocols (MQTT/CoAP)","AWS IoT","Embedded C","Python","REST APIs"]', '["AWS IoT","MQTT","Python","FreeRTOS","Docker"]',
 'Hyderabad', 'full-time', 'hybrid', 900000, 1800000, 'INR', 1, 4, true, true, 'Capabilio',
 'https://careers.honeywell.com', now() - interval '2 days', now() + interval '28 days'),

(gen_random_uuid(), 'Jio Platforms', 'IoT Solutions Engineer',
 'Develop IoT solutions on Jio''s connectivity platforms. Prototype ESP32/RPi systems, integrate with cloud dashboards, and support B2B deployments.',
 '["ESP32 / Raspberry Pi","MQTT","Python","Cloud IoT","Sensors & Actuators"]', '["ESP32","AWS IoT","Python","MQTT","Node-RED"]',
 'Mumbai', 'full-time', 'hybrid', 700000, 1400000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://careers.jio.com', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'TCS', 'Edge AI Engineer — IoT',
 'Deploy TensorFlow Lite models on edge devices (Coral/Jetson Nano) for predictive maintenance in manufacturing IoT projects.',
 '["TensorFlow Lite","Python","Edge Devices","MQTT","Docker"]', '["TensorFlow Lite","Jetson Nano","MQTT","Python","Docker"]',
 'Pune', 'full-time', 'hybrid', 800000, 1600000, 'INR', 1, 3, true, true, 'Capabilio',
 'https://tcs.com/careers', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'Siemens EDA', 'Embedded Linux Engineer',
 'Develop and maintain Yocto-based Linux BSPs for Siemens industrial automation hardware. Own kernel configuration, device tree overlays, and board bring-up.',
 '["Embedded Linux","Yocto","Device Tree","Linux Kernel","C/Shell Scripting"]', '["Yocto","Linux","C","Git","JTAG"]',
 'Bangalore', 'full-time', 'office', 1000000, 2000000, 'INR', 1, 4, true, true, 'Capabilio',
 'https://eda.sw.siemens.com/careers', now() - interval '5 days', now() + interval '25 days'),

-- ── Pharmacy ──────────────────────────────────────────────────────────────────
(gen_random_uuid(), 'Sun Pharma', 'Quality Assurance Pharmacist',
 'Review batch manufacturing records, perform in-process QC checks, and ensure GMP compliance for oral solid dosage manufacturing lines.',
 '["GMP","Batch Record Review","In-process QC","Pharmaceutical Analysis","Documentation"]', '["HPLC","UV-Vis Spectrophotometer","Dissolution","GMP","SAP QM"]',
 'Vadodara', 'full-time', 'office', 350000, 650000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://sunpharma.com/careers', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'Dr. Reddys Laboratories', 'Regulatory Affairs Associate',
 'Prepare and submit ANDA dossiers to US FDA. Coordinate with manufacturing teams on CMC documentation and respond to agency queries.',
 '["Regulatory Affairs","ANDA Submissions","CTD Format","FDA Guidelines","Technical Writing"]', '["Veeva Vault","CTD","FDA eCTD","ICH Guidelines","MS Word"]',
 'Hyderabad', 'full-time', 'office', 450000, 900000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://drreddys.com/careers', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'Cipla', 'Clinical Pharmacist — Hospital',
 'Provide clinical pharmacy services in Cipla''s hospital network. Perform drug interaction checks, counsel patients, and lead antibiotic stewardship.',
 '["Clinical Pharmacy","Drug Interaction Screening","Patient Counselling","Pharmacovigilance","Hospital Formulary"]', '["Hospital Information System","Micromedex","Pharmacy LIMS","MS Excel"]',
 'Mumbai', 'full-time', 'office', 400000, 700000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://cipla.com/careers', now() - interval '5 days', now() + interval '25 days'),

-- ── MBA / Business ────────────────────────────────────────────────────────────
(gen_random_uuid(), 'McKinsey & Company India', 'Business Analyst',
 'Work alongside senior consultants on strategy and operations engagements for India''s top conglomerates. Own slide decks, financial models, and client interviews.',
 '["Business Strategy","Financial Modelling","Excel","PowerPoint","Stakeholder Communication"]', '["Excel","PowerPoint","SQL","Tableau","Python (basic)"]',
 'Mumbai', 'full-time', 'office', 1600000, 2200000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://mckinsey.com/careers', now() - interval '2 days', now() + interval '28 days'),

(gen_random_uuid(), 'Amazon India', 'Operations Manager — Fulfilment Centre',
 'Lead a 200-person team across inbound, stowing, and outbound operations. Own safety, productivity, and cost KPIs for a 500K sq ft FC.',
 '["Operations Management","Lean / Six Sigma","People Management","KPI Tracking","Supply Chain"]', '["SAP WMS","Excel","SQL (basic)","Lean","Kaizen"]',
 'Hyderabad', 'full-time', 'office', 900000, 1600000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://amazon.jobs', now() - interval '3 days', now() + interval '27 days'),

(gen_random_uuid(), 'Hindustan Unilever', 'Management Trainee — Marketing',
 'Join HUL''s coveted MT programme. Rotate across brand management, trade marketing, and consumer research in your first year.',
 '["Marketing Management","Consumer Research","Brand Strategy","P&L Management","Communication"]', '["Excel","PowerPoint","Nielsen","SPSS","Salesforce"]',
 'Mumbai', 'full-time', 'office', 1000000, 1600000, 'INR', 0, 0, true, true, 'Capabilio',
 'https://hul.co.in/planet-and-society/hul-careers', now() - interval '4 days', now() + interval '26 days'),

(gen_random_uuid(), 'Deloitte India', 'Strategy & Operations Consultant',
 'Deliver digital transformation and cost optimisation programmes for FSI and manufacturing clients.',
 '["Consulting","Financial Analysis","Process Improvement","Project Management","PowerPoint"]', '["Excel","Power BI","PowerPoint","SQL","Tableau"]',
 'Bangalore', 'full-time', 'hybrid', 1200000, 2000000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://deloitte.com/in/en/careers', now() - interval '5 days', now() + interval '25 days'),

(gen_random_uuid(), 'HDFC Bank', 'HR Business Partner',
 'Partner with business heads across retail banking to drive talent acquisition, performance management cycles, and L&D programmes.',
 '["HR Management","Talent Acquisition","Performance Management","L&D","HRIS"]', '["SAP SuccessFactors","Excel","PowerPoint","Naukri RMS"]',
 'Mumbai', 'full-time', 'office', 700000, 1400000, 'INR', 0, 2, true, true, 'Capabilio',
 'https://hdfcbank.com/careers', now() - interval '6 days', now() + interval '24 days')

ON CONFLICT (id) DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────────────────────
SELECT count(*) AS seeded_jobs, source FROM jobs WHERE source = 'Capabilio' GROUP BY source;
