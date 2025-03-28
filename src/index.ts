import app from "./app";
import "./services/zeromqService";
import { ENV_CONFIG } from "./utils/envConfig";
import { mastra } from "./mastra";

// Add this line to verify Mastra is initialized
console.log(
  "🤖 Mastra service status:",
  Object.keys(mastra.getAgents()).length > 0 ? "Ready" : "Not Ready"
);

app.listen(ENV_CONFIG.PORT, () => {
  console.log(`Microservice running on http://localhost:${ENV_CONFIG.PORT}`);
});
