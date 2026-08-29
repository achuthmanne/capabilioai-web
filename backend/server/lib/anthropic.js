export async function generateRealCompanyTask(role, elo = 400, requestedCompany = null) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.warn("ANTHROPIC_API_KEY is missing. Falling back to dummy data...");
    throw new Error("ANTHROPIC_API_KEY is missing");
  }

  let levelStr = "Junior/Beginner";
  if (elo >= 800 && elo < 1500) levelStr = "Mid-level";
  if (elo >= 1500) levelStr = "Senior/Expert";

  const companies = ["Google", "Netflix", "Uber", "Airbnb", "Stripe", "Discord", "Twitch", "Shopify", "Tesla", "Vercel", "OpenAI", "Meta", "Amazon", "Swiggy", "Zomato", "Razorpay", "Cred", "Spotify", "Robinhood", "Coinbase", "Notion", "Figma", "Linear", "Supabase"];
  const randomCompany = requestedCompany || companies[Math.floor(Math.random() * companies.length)];

  const variants = ['find_bug', 'complete_code', 'from_scratch'];
  const selectedVariant = variants[Math.floor(Math.random() * variants.length)];
  
  const prompt = `You are a Senior Engineering Manager at ${randomCompany}.
Generate a highly realistic, technical daily task for a ${levelStr} ${role} working at ${randomCompany}.
The candidate's current ELO skill rating is ${elo}. Adjust the complexity of the task precisely to this difficulty level.
The task must be a real-world problem specific to ${randomCompany}'s domain and the role of ${role}.
DO NOT use dummy data like "foo bar". Use realistic context.

CRITICAL INSTRUCTION - TASK FORMAT:
You MUST generate the task using the '${selectedVariant}' format:
- If 'find_bug': Provide a fully written but buggy code/configuration. The candidate must find and fix the subtle bug.
- If 'complete_code': Provide partial code/boilerplate (e.g. function signatures, basic imports) and leave the core logic blank for the candidate to fill in.
- If 'from_scratch': The startingCode MUST be completely empty or just contain a single comment instructing them to begin. The candidate must write the entire solution from scratch based on your detailed requirements.

CRITICAL INSTRUCTION - WORKSPACE BINDING:
There MUST be a perfect, logical bond between the Question context, the Starting Code, and the chosen workspaceType. For example, do not provide a SQL problem in a 'code' workspace, or a UI problem in a 'log_viewer' workspace. The tools and the task must match perfectly.

  CRITICAL WORKSPACE INSTRUCTIONS based on role ${role}:
  - If the role is Frontend or Web: Provide a buggy React Component (export default function App() { ... }) because the user will see a Live React Web Preview! Ensure the component renders a visual UI. The workspaceType MUST be "code".
  - If the role is Backend, App, or general Software: Provide buggy starting code (Node.js, Python, Java). The workspaceType MUST be "code".
  - If the role is Cybersecurity, DevOps, or Network: Provide terminal configurations, nmap logs, or bash scripts. The workspaceType MUST be "terminal".
  - If the role is Data, DBMS, or Analyst: Provide a SQL schema or broken query. The workspaceType MUST be "sql".
  - If the role is Hardware, Medical, Embedded, Civil, or Mechanical: Provide diagnostic logs, sensor data, or configuration parameters. The workspaceType MUST be "log_viewer".

Return the response STRICTLY as a JSON object with this exact structure:
{
  "company": "Company Name",
  "workspaceType": "code | terminal | sql | log_viewer",
  "title": "Short punchy task title",
  "context": "Brief context of the problem in the company's product (max 3 sentences).",
  "eloReward": "A dynamic integer STRICTLY chosen from [5, 8, 10, 12, 15] based on difficulty. DO NOT EXCEED 15.", 
  "targetedSkill": "Primary technical skill tested",
  "taskDescription": "Detailed technical description of what needs to be fixed or analyzed.",
  "startingCode": "Boilerplate, buggy code, broken SQL, or initial raw log data for them to start with as a string.",
  "expectedOutcome": "What the final working solution should achieve.",
  "learningGuide": {
    "concepts": ["Concept 1", "Concept 2"],
    "explanation": "Why this happens.",
    "approach": "How to approach the fix."
  },
  "upcomingMissions": [
    {
      "company": "Company Name (e.g. Stripe)",
      "title": "Short punchy task title (e.g. Payment Webhook Fix)",
      "eloReward": "Integer ELO reward (e.g. 5, 8, 10)"
    },
    {
      "company": "Company Name 2",
      "title": "Short punchy task title 2",
      "eloReward": "Integer ELO reward 2"
    }
  ]
}
YOU MUST ESCAPE ALL NEWLINES (\\n) AND QUOTES INSIDE STRINGS. DO NOT USE LITERAL NEWLINES IN JSON STRINGS.
  DO NOT wrap the JSON in Markdown or backticks. Return RAW JSON only.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
        body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 2000,
        system: "You are an API that strictly returns only JSON objects. No markdown formatting, no explanation.",
        messages: [
          { role: "user", content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API Error:", errorText);
      throw new Error(`Anthropic API Error: ${response.status}`);
    }

    const data = await response.json();
    const textBlock = data.content && data.content.find ? data.content.find(b => b.type === "text") : null;
    let text = textBlock ? textBlock.text : "";
    
    if (!text) {
        throw new Error("No text content returned from Anthropic");
    }
    
    // Parse JSON out of markdown block if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);
    if (jsonMatch) {
        text = jsonMatch[1] || jsonMatch[0];
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Direct Anthropic Error:", error.message);
    throw new Error("Failed to generate task from Anthropic API");
  }
}


export async function evaluateCode(taskData, code, language = 'javascript') {
  const prompt = `You are a Senior Engineer/Manager. A candidate has submitted a solution for the following task:

Task:
Company: ${taskData.company}
Title: ${taskData.title}
Context: ${taskData.context}
Description: ${taskData.taskDescription}

Original Boilerplate Given to Candidate:
\`\`\`
${taskData.startingCode || 'N/A'}
\`\`\`

Solution Submitted:
\`\`\`
${code}
\`\`\`

EVALUATION RULES:
1. STRICT PROCTORING CHECK: Compare the Solution Submitted against the Original Boilerplate. If the Original Boilerplate is not empty, the candidate MUST NOT have deleted, bypassed, or maliciously altered the core boilerplate structure, function signatures, or the intended constraints of the problem. (If the boilerplate was empty, they wrote from scratch, which is fine). If they cheated by bypassing the task, removing the constraints, or deleting required boilerplate, YOU MUST FAIL THEM IMMEDIATELY. Set "passed": false, and write in feedback: "[PROCTOR VIOLATION]: You are not allowed to bypass or delete the original boilerplate structure."
2. Did they solve the problem described in the task requirements? If it's code, check for logic flaws. If it's a terminal command, SQL query, or log analysis, verify it achieves the exact requested outcome.
3. If they didn't fulfill the requirements, they fail.

Return ONLY a valid JSON response in this exact structure. YOU MUST ESCAPE ALL NEWLINES (\\n) AND QUOTES INSIDE THE STRINGS.
DO NOT use <thinking> tags. DO NOT include any markdown or text outside the JSON:
{
  "passed": true,
  "feedback": "A concise review of their submission.",
  "consoleOutput": "Simulated output of running their solution (e.g. terminal output, compiler errors, or query results).",
  "testCases": [
    { "name": "Test Case 1", "passed": true, "details": "Expected output matches actual output." },
    { "name": "Test Case 2", "passed": false, "details": "Failed edge case." }
  ],
  "graphSkills": [
    { "domain": "Category", "skill": "Specific Micro-skill Learned" }
  ]
}
DO NOT wrap the JSON in Markdown or backticks. Return RAW JSON only.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 2000,
          messages: [{ role: "user", content: prompt }]
        })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic error:", errorText);
      throw new Error("Anthropic API Error");
    }

    const data = await response.json();
    let textObj = data.content.find(c => c.type === "text");
    let text = textObj ? textObj.text : "";
    
    // Extract JSON block from response
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);
    if (jsonMatch) {
        text = jsonMatch[1] || jsonMatch[0];
    }
    try {
        return JSON.parse(text);
    } catch (parseError) {
        console.error("JSON Parse Error on:", text);
        return {
            passed: false,
            feedback: "System couldn't parse the AI response properly. Here is the raw output: " + text,
            consoleOutput: "JSON Parse Error"
        };
    }
  } catch (err) {
    console.error("Evaluation error:", err);
    throw err;
  }
}