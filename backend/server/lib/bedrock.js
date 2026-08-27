import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const config = {
  region: process.env.AWS_REGION || "us-east-1"
};

// Only explicitly set credentials if they exist in env,
// otherwise let AWS SDK automatically resolve them from system/profiles
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const client = new BedrockRuntimeClient(config);

export async function generateRealCompanyTask(role, elo = 400) {
  // Check if credentials exist at all (fast fail)
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE) {
    console.warn("AWS Credentials missing. Falling back to dummy data...");
    throw new Error("AWS_ACCESS_KEY_ID is missing");
  }

  let levelStr = "Junior/Beginner";
  if (elo >= 800 && elo < 1500) levelStr = "Mid-level";
  if (elo >= 1500) levelStr = "Senior/Expert";

  const prompt = `You are a Senior Engineering Manager at a top tech company in India (e.g., Swiggy, Zomato, Razorpay, Flipkart, Cred).
Generate a highly realistic, technical daily task for a ${levelStr} ${role}.
The candidate's current ELO skill rating is ${elo}. Adjust the complexity of the task precisely to this difficulty level.
The task must be a real-world bug fix, feature implementation, or architecture refactor.
DO NOT use dummy data like "foo bar". Use realistic context.

Return the response STRICTLY as a JSON object with this structure:
{
  "company": "Company Name",
  "title": "Short punchy task title (e.g., React Cart State Bug)",
  "context": "Brief context of the problem in the company's product (max 3 sentences).",
  "eloReward": 25,
  "targetedSkill": "Primary technical skill tested (e.g., React State Management)",
  "taskDescription": "Detailed technical description of what needs to be fixed or implemented.",
  "startingCode": "Boilerplate or buggy code for them to start with as a string.",
  "expectedOutcome": "What the final working code should achieve."
}`;

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt
          }
        ]
      }
    ],
    temperature: 0.7,
    top_p: 0.9,
  };

  try {
    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-sonnet-5",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload),
    });

    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    let text = responseBody.content[0].text;
    
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/{[\s\S]*}/);
    if (jsonMatch) {
        text = jsonMatch[1] || jsonMatch[0];
    }
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Bedrock AI Error:", error.message);
    throw new Error("Failed to generate task from AWS Bedrock");
  }
}
