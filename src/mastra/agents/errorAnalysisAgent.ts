import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Agent } from "@mastra/core"; // Changed from "@mastra/core/agent" to "@mastra/core"

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
const model = google("gemini-1.5-pro");

export const errorAnalysisAgent = new Agent({
  name: "Error Analysis Agent",
  instructions: `
    You are an expert at analyzing code errors and suggesting fixes.
    When analyzing error batches:
    1. Identify common patterns across errors
    2. Group similar errors together
    3. Provide root cause analysis
    4. Suggest specific code fixes
    5. Prioritize fixes based on error severity
    
    Format your response with:
    - Error Pattern Summary
    - Occurrence Count
    - Root Cause
    - Suggested Fix
    - Prevention Tips
  `,
  model: model,
});

console.log("🤖 Error Analysis Agent initialized");
