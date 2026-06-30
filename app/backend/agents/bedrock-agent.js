const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { Readable } = require("stream");

const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Default to Claude Sonnet 4.5 if BEDROCK_MODEL_ID is not set
const MODEL_ID =
  process.env.BEDROCK_MODEL_ID ||
  "anthropic.claude-sonnet-4-20250514-v1:0";

if (!process.env.BEDROCK_MODEL_ID) {
  console.warn(
    "WARNING: BEDROCK_MODEL_ID is not set. Using fallback model ID:",
    MODEL_ID
  );
}

console.log(`Bedrock model ID: ${MODEL_ID}`);

async function streamToString(stream) {
  if (typeof stream === "string") return stream;
  if (Buffer.isBuffer(stream)) return stream.toString("utf8");
  if (stream instanceof Uint8Array)
    return Buffer.from(stream).toString("utf8");

  if (stream instanceof Readable) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  throw new Error("Unable to read Bedrock response body stream");
}

async function invokeBedrockAgent(prompt) {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  try {
    const response = await client.send(command);
    const responseText = await streamToString(response.body);
    const result = JSON.parse(responseText);

    return result?.content?.[0]?.text ?? JSON.stringify(result);
  } catch (err) {
    const details = err.message || JSON.stringify(err);
    console.error("Bedrock invoke failed:", details);

    const error = new Error(`Bedrock invoke failed: ${details}`);
    error.cause = err;
    throw error;
  }
}

module.exports = { invokeBedrockAgent };