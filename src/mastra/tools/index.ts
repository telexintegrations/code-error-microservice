import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface ErrorContext {
  message: string;
  stack: string;
  readableMessage?: string;
  priority?: string;
}

export const errorAnalysisTool = createTool({
  id: 'analyze-error',
  description: 'Analyze and provide solutions for code errors',
  inputSchema: z.object({
    error: z.object({
      message: z.string().describe('Error message'),
      stack: z.string().describe('Error stack trace'),
      priority: z.string().optional().describe('Error priority level'),
    }),
    context: z.object({
      threadId: z.string().optional(),
      channelId: z.string(),
    }),
  }),
  outputSchema: z.object({
    analysis: z.string(),
    suggestedFix: z.string(),
    additionalContext: z.string().optional(),
    severity: z.enum(['High', 'Medium', 'Low']),
  }),
  execute: async ({ context }) => {
    return await analyzeError(context.error);
  },
});

const analyzeError = async (error: ErrorContext) => {
  // Analyze the error and provide solutions
  const analysis = await analyzeErrorMessage(error.message, error.stack);
  const fix = await generateErrorFix(analysis, error.stack);
  
  return {
    analysis: analysis.description,
    suggestedFix: fix.solution,
    additionalContext: fix.context,
    severity: error.priority as 'High' | 'Medium' | 'Low' || 'Medium'
  };
};

async function analyzeErrorMessage(message: string, stack: string) {
  // Implement error analysis logic here
  // This could include pattern matching, stack trace parsing, etc.
  return {
    description: `Analysis of error: ${message}\n` +
                 `Based on the stack trace, this appears to be...`,
    errorType: determineErrorType(message),
    relevantStackLines: extractRelevantStackInfo(stack)
  };
}

async function generateErrorFix(analysis: any, stack: string) {
  // Implement fix generation logic
  return {
    solution: `Suggested fix:\n` +
              `1. [Action steps to resolve the error]\n` +
              `2. [Additional recommendations]`,
    context: `Additional context:\n` +
             `- Root cause: [explanation]\n` +
             `- Prevention tips: [recommendations]`
  };
}

function determineErrorType(message: string): string {
  // Implement error type detection
  const errorPatterns = {
    syntax: /syntax error|unexpected token|unexpected identifier/i,
    reference: /is not defined|cannot access|reference error/i,
    type: /type error|cannot read property|is not a function/i,
    // Add more patterns as needed
  };

  for (const [type, pattern] of Object.entries(errorPatterns)) {
    if (pattern.test(message)) {
      return type;
    }
  }
  
  return 'unknown';
}

function extractRelevantStackInfo(stack: string): string[] {
  // Extract meaningful information from stack trace
  return stack
    .split('\n')
    .filter(line => !line.includes('node_modules'))
    .slice(0, 3); // Get first 3 relevant lines
}
