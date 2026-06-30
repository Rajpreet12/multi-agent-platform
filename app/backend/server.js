const express = require("express");
const client = require("prom-client");
const { invokeBedrockAgent } = require("./agents/bedrock-agent");

const app = express();
app.use(express.json());

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });

const requestCounter = new client.Counter({
  name: "backend_request_count",
  help: "Total HTTP requests handled by the backend",
  labelNames: ["method", "route", "status"],
});

const bedrockRequestCounter = new client.Counter({
  name: "bedrock_request_count",
  help: "Total Bedrock agent invocation attempts",
  labelNames: ["status"],
});

const bedrockLatency = new client.Histogram({
  name: "bedrock_request_duration_seconds",
  help: "Bedrock agent request latency in seconds",
  labelNames: ["status"],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

app.use((req, res, next) => {
  res.on("finish", () => {
    requestCounter.inc({ method: req.method, route: req.path, status: res.statusCode });
  });
  next();
});

app.get("/", (req, res) => {
  res.send("AI Multi-Agent DevOps Platform Backend Running");
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    console.error("Metrics error:", err);
    res.status(500).send("Failed to collect metrics");
  }
});

app.get("/agent/invoke", (req, res) => {
  res.status(405).json({ error: "Use POST /agent/invoke with a JSON body containing { prompt }." });
});

app.post("/agent/invoke", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt is required" });

  const endTimer = bedrockLatency.startTimer();
  try {
    const response = await invokeBedrockAgent(prompt);
    bedrockRequestCounter.inc({ status: "success" });
    endTimer({ status: "success" });
    res.json({ response });
  } catch (err) {
    bedrockRequestCounter.inc({ status: "failure" });
    endTimer({ status: "failure" });
    console.error("Bedrock error:", err);
    res.status(500).json({ error: "Failed to invoke Bedrock agent" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
app.post("/chat", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({
      error: "prompt is required"
    });
  }

  const endTimer = bedrockLatency.startTimer();

  try {
    const response = await invokeBedrockAgent(prompt);

    bedrockRequestCounter.inc({ status: "success" });
    endTimer({ status: "success" });

    res.json({
      agent: "DevOps AI Agent",
      model: "Amazon Bedrock Claude",
      response: response
    });

  } catch (err) {

    bedrockRequestCounter.inc({ status: "failure" });
    endTimer({ status: "failure" });

    console.error("Chat Bedrock error:", err);

    res.status(500).json({
      error: "Failed to invoke Bedrock agent"
    });
  }
});
