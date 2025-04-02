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

// Helper function to access the error analysis agent
export async function generateErrorAnalysis(prompt: any) {
  // @ts-ignore - Access private property for backward compatibility
  return await mastra.agents.errorAnalysisAgent.generate(prompt);
}
