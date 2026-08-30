import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const branches = [
  { name: 'CSE', focus: 'Algorithms, Data Structures, System Design, Web Development' },
  { name: 'ECE', focus: 'Embedded Systems, Microcontrollers, Digital Logic, IoT' },
  { name: 'MECH', focus: 'Thermodynamics, Kinematics, CAD, Material Science' },
  { name: 'CIVIL', focus: 'Structural Engineering, Fluid Mechanics, Geotechnical' },
  { name: 'BBA', focus: 'Financial Analysis, Marketing Strategy, Data Analytics' },
];

const schema = {
  type: SchemaType.ARRAY,
  description: "A list of exactly 30 challenge questions (10 Easy, 10 Medium, 10 Hard)",
  items: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING, description: "Short, catchy title of the task" },
      description: { type: SchemaType.STRING, description: "Detailed task description and requirements" },
      difficulty: { type: SchemaType.STRING, enum: ["Easy", "Medium", "Hard"] },
      workspace_type: { type: SchemaType.STRING, enum: ["ide", "jupyter", "arena", "hardware_hdl", "autocad"] },
      points: { type: SchemaType.INTEGER, description: "Points for this task (Easy=50, Med=70, Hard=100)" },
      test_cases: {
        type: SchemaType.ARRAY,
        description: "2-3 hidden test cases to evaluate correctness",
        items: {
          type: SchemaType.OBJECT,
          properties: {
            input: { type: SchemaType.STRING, description: "Input passed to the program via STDIN" },
            expected_output: { type: SchemaType.STRING, description: "Exact expected output string via STDOUT" }
          },
          required: ["input", "expected_output"]
        }
      }
    },
    required: ["title", "description", "difficulty", "workspace_type", "points", "test_cases"]
  }
};

async function generateForBranch(branch) {
  console.log(`\n⏳ Generating challenges for ${branch.name}...`);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const prompt = `You are an expert curriculum designer for ${branch.name} engineering/management students.
The focus areas for this branch are: ${branch.focus}.

Generate exactly 30 practical, industry-relevant tasks for this week's challenges:
- 10 EASY tasks (Focus: Fundamentals, Points: 50)
- 10 MEDIUM tasks (Focus: Integration & Logic, Points: 70)
- 10 HARD tasks (Focus: System Design / Optimization, Points: 100)

Workspace Mapping Rules:
- General Coding / Algorithms / Logic -> workspace_type: "ide"
- Data Analysis / Machine Learning -> workspace_type: "jupyter"
- SQL / Backend API / Scenario Design -> workspace_type: "arena"
- Hardware / Circuits -> workspace_type: "hardware_hdl"
- CAD / Design -> workspace_type: "autocad"

Ensure test_cases are realistic and robust. Return ONLY the JSON array.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const tasks = JSON.parse(responseText);

    // Get current Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
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
      test_cases: task.test_cases
    }));

    const { error } = await supabase.from('challenge_questions').insert(records);
    if (error) throw error;
    
    console.log(`✅ Successfully stored 30 challenges for ${branch.name}.`);
  } catch (err) {
    console.error(`❌ Failed to generate for ${branch.name}:`, err);
  }
}

async function run() {
  console.log("🚀 Starting Weekly Challenge AI Generation Cron...");
  for (const branch of branches) {
    await generateForBranch(branch);
  }
  console.log("🎉 All branches generated successfully!");
}

run();
