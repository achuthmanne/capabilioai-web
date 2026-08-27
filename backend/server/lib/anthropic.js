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

  const prompt = `You are a Senior Engineering Manager at ${randomCompany}.
Generate a highly realistic, technical daily task for a ${levelStr} ${role} working at ${randomCompany}.
The candidate's current ELO skill rating is ${elo}. Adjust the complexity of the task precisely to this difficulty level.
The task must be a real-world bug fix, feature implementation, or architecture refactor specific to ${randomCompany}'s domain.
DO NOT use dummy data like "foo bar". Use realistic context.

Return the response STRICTLY as a JSON object with this structure:
{
  "company": "Company Name",
  "title": "Short punchy task title (e.g., React Cart State Bug)",
  "context": "Brief context of the problem in the company's product (max 3 sentences).",
  "eloReward": "A dynamic integer between 10 and 50 based strictly on how tough this specific question is. (10 for easy, 30 for medium, 50 for hard)", 
  "targetedSkill": "Primary technical skill tested (e.g., React State Management)",
  "taskDescription": "Detailed technical description of what needs to be fixed or implemented.",
  "startingCode": "Boilerplate or buggy code for them to start with as a string.",
  "expectedOutcome": "What the final working code should achieve.",
  "learningGuide": {
    "concepts": ["Concept 1", "Concept 2"],
    "explanation": "A high-quality, concise 2-3 sentence explanation of the core technical concept required to solve this task.",
    "approach": "A subtle hint on how an expert would approach this problem, without giving away the exact code solution."
  },
  "upcomingMissions": [
    {
      "company": "Company Name (e.g. Stripe)",
      "title": "Short punchy task title (e.g. Payment Webhook Fix)",
      "eloReward": "Integer ELO reward for this upcoming task (e.g. 35)"
    },
    {
      "company": "Company Name 2",
      "title": "Short punchy task title 2",
      "eloReward": "Integer ELO reward 2"
    }
  ]
}`;

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
  const prompt = `You are a Senior Engineer code reviewer. A junior engineer has submitted a solution for the following task:

Task:
Company: ${taskData.company}
Title: ${taskData.title}
Context: ${taskData.context}
Description: ${taskData.taskDescription}

Code Submitted:
\`\`\`
${code}
\`\`\`

Evaluate the code. Did they solve the problem described in the task requirements?
If there are syntax errors, logic flaws, or they didn't fulfill the requirements, they fail.

Return ONLY a valid JSON response in this exact structure. YOU MUST ESCAPE ALL NEWLINES (\\n) AND QUOTES INSIDE THE STRINGS.
DO NOT use <thinking> tags. DO NOT include any markdown or text outside the JSON:
{
  "passed": true,
  "feedback": "A concise code review from a senior engineer.",
  "consoleOutput": "Simulated output of running their code.",
  "testCases": [
    { "name": "Test Case 1 (e.g. Basic Input)", "passed": true, "details": "Expected output matches actual output." },
    { "name": "Test Case 2 (e.g. Edge Case)", "passed": false, "details": "Failed when processing null value." }
  ],
  "graphSkills": [
    { "domain": "Category (e.g. Frontend, Data Engineering, Civil, Electronics)", "skill": "Specific Micro-skill Learned (e.g. Rate Limiting)" }
  ]
}
Make sure to generate 3 to 4 realistic test cases relevant to the specific problem they solved. Extract 1 to 3 core concepts/skills they demonstrated into graphSkills.`;

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