import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { errorAnalysisAgent } from './agents/index.js';

const logger = createLogger({
  name: 'Mastra',
  level: 'info',
});

export const mastra = new Mastra({
  agents: { errorAnalysisAgent },
  logger,
  telemetry: {
    enabled: true,
    serviceName: 'code-error-service'
  }
});
