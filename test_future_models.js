import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const models = [
  "anthropic.claude-sonnet-5",
  "anthropic.claude-sonnet-4-6",
  "anthropic.claude-sonnet-4-5-20250929-v1:0"
];

async function testModels() {
  for (const model of models) {
    console.log(`Testing model: ${model}`);
    try {
      const command = new InvokeModelCommand({
        modelId: model,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 10,
          messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }]
        }),
      });
      await client.send(command);
      console.log(`SUCCESS: ${model} works!`);
    } catch (e) {
      console.log(`FAILED: ${model} - ${e.message}`);
    }
  }
}

testModels();
