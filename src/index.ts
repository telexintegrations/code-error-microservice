import app from "./app.js";
import "./services/zeromqService.js";
import { ENV_CONFIG } from "./utils/envConfig.js";
import { mastra } from "./mastra/config.js";

async function startServer() {
  try {
    // Verify Mastra configuration
    const agents = mastra.getAgents();
    if (!agents || !agents.errorAnalysisAgent) {
      throw new Error('Mastra agents not properly configured');
    }

    console.log('Mastra configured with:', {
      agents: Object.keys(agents),
      tools: Object.keys(Object.values(agents).reduce((acc, agent) => ({ ...acc, ...agent.tools }), {})),
      telemetry: mastra.getTelemetry()
    });
    
    app.listen(ENV_CONFIG.PORT, () => {
      console.log(`Microservice running on http://localhost:${ENV_CONFIG.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
