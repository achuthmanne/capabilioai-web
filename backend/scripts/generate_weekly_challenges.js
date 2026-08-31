import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, 
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

const branches = [
  { name: 'CSE', focus: 'Algorithms, Data Structures, System Design, Web Development' },
  { name: 'ECE', focus: 'Embedded Systems, Microcontrollers, Digital Logic, IoT' },
  { name: 'MECH', focus: 'Thermodynamics, Kinematics, CAD, Material Science' },
  { name: 'CIVIL', focus: 'Structural Engineering, Fluid Mechanics, Geotechnical' },
  { name: 'BBA', focus: 'Financial Analysis, Marketing Strategy, Data Analytics' },
];

async function generateWithAnthropicFetch(prompt) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5", // EXACTLY AS IN DAILY MISSION
        max_tokens: 4000,
        system: "You are an API that strictly returns only JSON objects. No markdown formatting, no explanation.",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textBlock = data.content && data.content.find ? data.content.find(b => b.type === "text") : null;
    let text = textBlock ? textBlock.text : "";
    
    if (!text) {
        throw new Error("No text content returned from Anthropic");
    }
    
    return text;
}

async function generateForBranch(branch) {
  console.log(`\n⏳ Generating challenges for ${branch.name} using claude-sonnet-5...`);
  
  const prompt = `You are an expert curriculum designer for ${branch.name} engineering/management students.
The focus areas for this branch are: ${branch.focus}.

Generate exactly 15 practical, industry-relevant tasks for this week's challenges:
- 5 EASY tasks (Focus: Fundamentals, Points: 50)
- 5 MEDIUM tasks (Focus: Integration & Logic, Points: 70)
- 5 HARD tasks (Focus: System Design / Optimization, Points: 100)

Workspace Mapping Rules:
- General Coding / Algorithms / Logic -> workspace_type: "ide"
- Data Analysis / Machine Learning -> workspace_type: "jupyter"
- SQL / Backend API / Scenario Design -> workspace_type: "arena"
- Hardware / Circuits -> workspace_type: "hardware_hdl"
- CAD / Design -> workspace_type: "autocad"

Output a valid JSON object with a single key "tasks" which is an array of objects.
Each object in the array MUST have: title (string), description (string), difficulty (Easy/Medium/Hard), workspace_type (string), points (number), and test_cases (array of objects with 'input' and 'expected_output').
DO NOT output any markdown blocks, explanations, or text outside the JSON. Output ONLY the raw JSON object.`;

  let jsonStr = "";
  
  try {
    jsonStr = await generateWithAnthropicFetch(prompt);

    jsonStr = jsonStr.trim();
    const jsonMatch = jsonStr.match(/```json\n([\s\S]*?)\n```/) || jsonStr.match(/{[\s\S]*}/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1] || jsonMatch[0];
    }
    
    let tasks;
    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        tasks = parsed;
      } else if (parsed.tasks && Array.isArray(parsed.tasks)) {
        tasks = parsed.tasks;
      } else {
        throw new Error("JSON structure is not an array");
      }
    } catch(e) {
      console.error("Parse error, raw response:", jsonStr);
      throw e;
    }

    // Get current Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    const weekStartDate = monday.toISOString().split('T')[0];

    const records = tasks.map(task => ({
      branch: branch.name,
      week_start_date: weekStartDate,
      title: task.title,
      description: task.description,
      difficulty: task.difficulty,
      workspace_type: task.workspace_type,
      points: task.points,
      test_cases: task.test_cases || []
    }));

    const { error } = await supabase.from('challenge_questions').insert(records);
    if (error) throw error;
    
    console.log(`✅ Successfully stored 15 challenges for ${branch.name} (Generated via claude-sonnet-5).`);
  } catch (err) {
    console.error(`❌ Failed to generate for ${branch.name}:`, err.message || err);
  }
}

async function run() {
  console.log("🚀 Starting Weekly Challenge AI Generation (Anthropic EXACT MATCH)...");
  for (const branch of branches) {
    await generateForBranch(branch);
  }
  console.log("🎉 All branches generated successfully!");
}

run();
