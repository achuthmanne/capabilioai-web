-- career_tracks: full table creation + all 11 rows (including medical-coding-specialist)
-- Run this in the production Supabase SQL editor (project: eybchcqwbizjmzyrviri)

CREATE TABLE IF NOT EXISTS career_tracks (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text        NOT NULL UNIQUE,
  name              text        NOT NULL,
  branch            text        NOT NULL,
  icon              text,
  description       text,
  problem_categories text[]     NOT NULL,
  recommended_tags  text[],
  difficulty_order  text[]      DEFAULT ARRAY['Easy','Medium','Hard'],
  sample_companies  text[],
  is_active         boolean     DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

INSERT INTO career_tracks (slug, name, branch, icon, description, problem_categories, recommended_tags, difficulty_order, sample_companies, is_active) VALUES

('it-software','IT / Software Engineer','Computer Science / Information Technology','💻',
 'Build your career in software development, systems design, and data engineering. Covers algorithms, data structures, databases, and system design challenges.',
 ARRAY['Aptitude','DSA','Logical','SQL','System Design'],
 ARRAY['arrays','graphs','dynamic-programming','trees','sql','system-design'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['Google India','Microsoft India','Amazon India','Flipkart','Zomato','Swiggy','Infosys','TCS','Wipro','HCL'],
 true),

('aiml-engineer','AI / ML Engineer','Artificial Intelligence & Machine Learning','🤖',
 'Build your career in machine learning, data science, and AI. Covers regression metrics, model evaluation, data structures, and statistical analysis challenges.',
 ARRAY['AI_ML','Aptitude','DSA','Logical','SQL'],
 ARRAY['regression','error-metrics','supervised-learning','statistics'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['Fractal Analytics','Mu Sigma','Tiger Analytics','Latent View','Sigmoid','Quantiphi','Google India','Microsoft India'],
 true),

('mca-professional','MCA Professional','Master of Computer Applications','🖥️',
 'Build your career in application development, databases, and enterprise software. Covers data structures, algorithms, SQL, and software engineering patterns.',
 ARRAY['Aptitude','DSA','Logical','SQL','System Design'],
 ARRAY['arrays','strings','graphs','sql','databases'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['Infosys','TCS','Wipro','HCL','Cognizant','Tech Mahindra','Capgemini'],
 true),

('ece-engineer','ECE Engineer','Electronics & Communication Engineering','📡',
 'Build your career in communications, embedded systems, VLSI, and signal processing. Covers analog/digital communication, DSP, and hardware design challenges.',
 ARRAY['AI_ML','Aptitude','DSA','ECE','IoT','Logical'],
 ARRAY['communication','signals','modulation','sampling','dsp','embedded'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['ISRO','DRDO','BEL','Qualcomm India','Texas Instruments India','MediaTek India','Samsung RD India','BSNL','Jio','Airtel'],
 true),

('eee-engineer','EEE Engineer','Electrical & Electronics Engineering','⚡',
 'Build your career in power systems, electrical machines, and energy. Covers 3-phase power, transformers, motors, and renewable energy challenges.',
 ARRAY['Aptitude','DSA','EEE','Logical'],
 ARRAY['power-systems','three-phase','ac-circuits','electrical-machines','batteries'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['NTPC','BHEL','PowerGrid','Tata Power','Adani Green Energy','Siemens India','Schneider India','L&T Electrical'],
 true),

('iot-engineer','IoT Engineer','Internet of Things / Embedded Systems','🌐',
 'Build your career in connected devices, edge computing, and embedded systems. Covers power management, duty cycles, sensor networks, and IoT protocol challenges.',
 ARRAY['Aptitude','DSA','ECE','IoT','Logical'],
 ARRAY['power-management','battery','duty-cycle','embedded-systems','iot-hardware'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['Bosch India','Honeywell India','ABB India','Schneider Electric India','Wipro IoT','HCL IoT','L&T Technology Services'],
 true),

('mechanical-engineer','Mechanical Engineer','Mechanical Engineering','⚙️',
 'Build your career in manufacturing, thermodynamics, and machine design. Covers Carnot cycles, gear trains, vibrations, and material stress challenges.',
 ARRAY['Aptitude','DSA','Logical','Mechanical'],
 ARRAY['thermodynamics','heat-engines','kinematics','gear-train','vibrations','mechanics-of-materials'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['TATA Motors','Mahindra','HAL','Bajaj Auto','L&T Heavy Engineering','DRDO','Indian Railways','BHEL'],
 true),

('civil-engineer','Civil Engineer','Civil Engineering','🏗️',
 'Build your career in construction, structural engineering, and infrastructure. Covers mix design, structural safety, surveying, and earthwork challenges.',
 ARRAY['Aptitude','Civil','DSA','Logical'],
 ARRAY['concrete','structural-engineering','surveying','earthwork','safety','construction-materials'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['L&T Construction','NHAI','Delhi Metro','RITES','NBCC','Shapoorji Pallonji','Gammon India','CPWD'],
 true),

('pharma-professional','Pharmaceutical Professional','Pharmacy / Pharmaceutical Sciences','💊',
 'Build your career in drug development, clinical pharmacy, and healthcare. Covers dosage calculations, pharmacokinetics, and drug formulation challenges.',
 ARRAY['AI_ML','Aptitude','DSA','Logical','Pharmacy'],
 ARRAY['pharmacology','dosage-calculation','pharmacokinetics','half-life','clinical','iv-therapy'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['Sun Pharma','Cipla','Dr Reddys Labs','Biocon','Lupin','Aurobindo Pharma','Zydus Cadila','Glenmark'],
 true),

('mba-professional','Business / Management Professional','MBA / Business Administration','📊',
 'Build your career in management consulting, finance, and operations. Covers break-even analysis, inventory management, financial metrics, and business analytics.',
 ARRAY['Aptitude','DSA','Logical','MBA','SQL'],
 ARRAY['cost-accounting','break-even','eoq','finance','cagr','operations-management','managerial-economics'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['McKinsey India','BCG India','Deloitte India','KPMG India','EY India','PwC India','Infosys BPO'],
 true),

('medical-coding-specialist','Medical Coding Specialist','Healthcare & Medical Coding','🏥',
 'Build your career in medical coding and health information management. Covers ICD-10-CM/PCS, CPT, HCPCS Level II, DRG assignment, HCC risk adjustment, and compliance with HIPAA and payer guidelines.',
 ARRAY['Aptitude','Logical','Pharmacy'],
 ARRAY['medical-coding','icd-10','cpt-codes','hcpcs','medical-billing','drg','hcc','hipaa','clinical-documentation','health-informatics'],
 ARRAY['Easy','Medium','Hard'],
 ARRAY['Apollo Hospitals','Fortis Healthcare','Manipal Hospitals','Max Healthcare','Narayana Health','HCL Healthcare','Optum India','Cognizant Health Sciences','Wipro Health BPO','Omega Healthcare'],
 true)

ON CONFLICT (slug) DO UPDATE SET
  name               = EXCLUDED.name,
  branch             = EXCLUDED.branch,
  icon               = EXCLUDED.icon,
  description        = EXCLUDED.description,
  problem_categories = EXCLUDED.problem_categories,
  recommended_tags   = EXCLUDED.recommended_tags,
  difficulty_order   = EXCLUDED.difficulty_order,
  sample_companies   = EXCLUDED.sample_companies,
  is_active          = EXCLUDED.is_active;

-- Verify
SELECT slug, name, is_active FROM career_tracks ORDER BY branch;
