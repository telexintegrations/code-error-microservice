import app from "./app.js";
import "./services/zeromqService.js";
import { ENV_CONFIG } from "./utils/envConfig.js";
import { mastra } from "./mastra/config.js";

async function startServer() {
  try {
    // Log the Mastra configuration
    console.log('Mastra configured with:', {
      agents: Object.keys(mastra.getAgents?.() || {}),
      tools: Object.keys(Object.values(mastra.getAgents?.() || {}).reduce((acc, agent) => ({ ...acc, ...agent.tools }), {})),
      telemetry: mastra.getTelemetry?.()
    });
    
    // Start your Express server
    app.listen(ENV_CONFIG.PORT, () => {
      console.log(`Microservice running on http://localhost:${ENV_CONFIG.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
