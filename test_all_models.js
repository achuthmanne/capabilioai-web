import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const client = new BedrockRuntimeClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const models = [
  "anthropic.claude-haiku-4-5-20251001-v1:0",
  "anthropic.claude-fable-5",
  "anthropic.claude-sonnet-4-6",
  "anthropic.claude-opus-4-6-v1",
  "anthropic.claude-opus-5",
  "anthropic.claude-opus-4-8",
  "anthropic.claude-opus-4-7",
  "anthropic.claude-sonnet-4-5-20250929-v1:0",
  "anthropic.claude-opus-4-5-20251101-v1:0",
  "meta.llama3-8b-instruct-v1:0",
  "amazon.titan-text-lite-v1"
];

async function testModels() {
  for (const model of models) {
    try {
      let body;
      if (model.includes("titan")) {
        body = JSON.stringify({
            inputText: "Hello",
            textGenerationConfig: { maxTokenCount: 10, temperature: 0.7 }
        });
      } else if (model.includes("llama")) {
        body = JSON.stringify({
            prompt: "Hello",
            max_gen_len: 10,
            temperature: 0.7
        });
      } else {
        body = JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 10,
          messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }]
        });
      }
      
      const command = new InvokeModelCommand({
        modelId: model,
        contentType: "application/json",
        accept: "application/json",
        body: body,
      });
      await client.send(command);
      console.log(`SUCCESS: ${model} works!`);
    } catch (e) {
      if (!e.message.includes("end of its life") && !e.message.includes("not available for this account")) {
          console.log(`FAILED: ${model} - ${e.message}`);
      }
    }
  }
  console.log("Finished testing.");
}

testModels();
