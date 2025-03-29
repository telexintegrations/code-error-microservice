import { Mastra } from "@mastra/core";
import { createLogger } from "@mastra/core/logger";
import { errorAnalysisAgent } from "./agents/errorAnalysisAgent";

export const mastra = new Mastra({
  agents: { errorAnalysisAgent },
  logger: createLogger({
    name: "Mastra",
    level: "info" as const,
  }),
});
