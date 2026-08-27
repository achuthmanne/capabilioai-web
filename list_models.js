import { BedrockClient, ListFoundationModelsCommand } from "@aws-sdk/client-bedrock";

const client = new BedrockClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

async function run() {
  try {
    const cmd = new ListFoundationModelsCommand({});
    const res = await client.send(cmd);
    const active = res.modelSummaries.filter(m => m.modelLifecycle.status === 'ACTIVE' && m.providerName === 'Anthropic');
    console.log("Active Anthropic Models:");
    active.forEach(m => console.log(m.modelId));
  } catch (e) {
    console.error(e);
  }
}

run();
