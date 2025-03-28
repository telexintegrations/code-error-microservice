import { Mastra, Agent, createLogger } from "@mastra/core";
import { weatherAgent } from "./agents";
import { errorAnalysisAgent } from "./agents/errorAnalysisAgent";

// Create logger configuration
const loggerConfig = {
  name: "Mastra",
  level: "info",
};

export const mastra = new Mastra({
  agents: { weatherAgent, errorAnalysisAgent },
  logger: createLogger({
    name: "Mastra",
    level: "info" as const,
  }),
});
