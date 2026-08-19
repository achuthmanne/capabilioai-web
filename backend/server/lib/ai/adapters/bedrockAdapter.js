/**
 * bedrockAdapter.js — Phase 2.7 (Enterprise AI Engine).
 *
 * Built interface-complete against AWS Bedrock's unified Converse API
 * (the modern, model-agnostic inference API — same shape regardless of
 * which foundation model is hosted behind it), so switching AI_PROVIDER
 * to "bedrock" requires zero further code changes once real AWS
 * credentials exist.
 *
 * IMPORTANT — UNTESTED: no AWS credentials or prior AWS SDK usage exist
 * anywhere in this environment (confirmed before writing this file). This
 * adapter cannot be verified against a live Bedrock endpoint here. It is
 * NOT the active provider (AI_PROVIDER stays "groq" — see
 * providerManager.js). Before ever setting AI_PROVIDER=bedrock in a real
 * deployment: set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY (or an
 * equivalent AWS credential provider) and AWS_REGION, pick a real,
 * enabled Bedrock model ID for that account/region (BEDROCK_MODEL_ID
 * below has no safe universal default — Bedrock model access is opt-in
 * per AWS account), and do a real smoke test — the same verification
 * rigor every other adapter in this migration got, which this one
 * structurally cannot get today.
 *
 * Capabilities: generateText only. Bedrock's Converse API does support
 * vision/tool-use for some hosted models, but implementing those now
 * would be guessing at a shape with no real call site or live endpoint
 * to verify against — deferred until this adapter is actually enabled
 * and a real need appears.
 */
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime"

function assertConfigured() {
  if (!process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_PROFILE && !process.env.AWS_ROLE_ARN) {
    throw new Error(
      "AWS Bedrock is not configured — no AWS_ACCESS_KEY_ID/AWS_PROFILE/AWS_ROLE_ARN found. " +
      "This adapter is interface-complete but was built with no AWS credentials available to test against; " +
      "see this file's header comment before enabling AI_PROVIDER=bedrock."
    )
  }
  if (!process.env.BEDROCK_MODEL_ID) {
    throw new Error("BEDROCK_MODEL_ID is not set — Bedrock model access is opt-in per AWS account/region, there is no safe default to fall back to.")
  }
}

let client = null
function getClient() {
  if (!client) client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" })
  return client
}

export const bedrockAdapter = {
  name: "bedrock",

  async generateText(messages, { maxTokens = 1024, temperature = 0.7 } = {}) {
    assertConfigured()

    const systemMsgs = messages.filter(m => m.role === "system")
    const otherMsgs = messages.filter(m => m.role !== "system")
    const system = systemMsgs.length ? systemMsgs.map(m => ({ text: m.content })) : undefined

    const command = new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID,
      messages: otherMsgs.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: [{ text: m.content }],
      })),
      system,
      inferenceConfig: { maxTokens, temperature },
    })

    const response = await getClient().send(command)
    const text = response.output?.message?.content?.filter(b => b.text).map(b => b.text).join("") || ""
    return {
      text,
      model: process.env.BEDROCK_MODEL_ID,
      inputTokens: response.usage?.inputTokens ?? null,
      outputTokens: response.usage?.outputTokens ?? null,
    }
  },

  async extractFromImage() {
    throw new Error("bedrock provider does not implement extractFromImage yet — deferred until this adapter is actually enabled and a real need appears.")
  },

  async callWithTools() {
    throw new Error("bedrock provider does not implement callWithTools yet — deferred until this adapter is actually enabled and a real need appears.")
  },
}
