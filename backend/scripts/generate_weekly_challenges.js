import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const BRANCH_FOCUS = {
  "CSE": "Algorithms, Data Structures, System Design, Web Development",
  "IT": "Networking, Cloud Computing, Database Administration, Web Development",
  "MCA": "Advanced Software Engineering, Database Management, Application Development",
  "AI_DS": "Machine Learning, Data Mining, Statistics, Python, Deep Learning",
  "AI_ML": "Neural Networks, Natural Language Processing, Computer Vision",
  "ECE": "Embedded Systems, Microcontrollers, Digital Logic, Signal Processing",
  "EEE": "Power Systems, Control Systems, Circuit Analysis, Electrical Machines",
  "Mechanical": "Thermodynamics, Fluid Mechanics, Kinematics, CAD/CAM",
  "Civil": "Structural Analysis, Concrete Technology, Transportation, Geotech",
  "IoT": "Sensors, Actuators, Microcontrollers, Network Protocols",
  "Pharmacy": "Pharmacology, Pharmaceutics, Medicinal Chemistry, Clinical Trials",
  "MBA": "Marketing, Financial Accounting, Business Strategy, Operations Management",
  "Other": "General logical reasoning, basic computer literacy, project management"
};

async function getActiveBranches() {
  const { data, error } = await supabase.from('profiles').select('branch, stream');
  if (error) {
    console.error("Error fetching profiles:", error);
    return ['CSE'];
  }
  
  const activeBranches = new Set();
  for (const row of data) {
    if (row.branch) activeBranches.add(row.branch);
    if (row.stream) activeBranches.add(row.stream);
  }
  
  if (activeBranches.size === 0) activeBranches.add('CSE');
  
  return Array.from(activeBranches);
}

async function generateQuestions(branchName) {
  console.log(`Generating AI questions for active branch: ${branchName}`);
  const focus = BRANCH_FOCUS[branchName] || "General problem solving";
  
  const prompt = `You are an expert technical interviewer. Generate 15 distinct, engaging weekly challenge tasks for students in the ${branchName} branch. 
The focus should be on: ${focus}.

Distribute them as: 5 Easy (50-80 pts), 5 Medium (80-120 pts), 5 Hard (120-150 pts).
Workspace type MUST be one of: 'code', 'sql', 'terminal', 'design', 'jupyter'.

Return ONLY a valid JSON array of objects with keys: title, difficulty, points, workspace_type, test_cases.
The test_cases should be an array of { input, expected_output }. If not a coding task, provide an empty array for test_cases.
Do not wrap in markdown tags like \`\`\`json.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5', 
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    let content = data.content[0].text.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json/, '').replace(/```$/, '').trim();
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to generate for ${branchName}:`, error);
    return [];
  }
}

async function run() {
  console.log("Starting Capabilio Smart AI Challenge Generation...");
  const activeBranches = await getActiveBranches();
  console.log(`Found ${activeBranches.length} active branches with users:`, activeBranches);
  
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(today.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  for (const branchName of activeBranches) {
    const questions = await generateQuestions(branchName);
    
    for (const q of questions) {
      const { error } = await supabase.from('challenge_questions').insert({
        title: q.title,
        branch: branchName,
        difficulty: q.difficulty,
        points: q.points,
        workspace_type: q.workspace_type,
        test_cases: q.test_cases || [],
        week_start_date: weekStartStr
      });
      if (error) console.error(`Error saving ${q.title}:`, error);
    }
    console.log(`Successfully generated and saved ${questions.length} questions for ${branchName}`);
  }
  
  console.log("Weekly generation complete!");
}

run();
