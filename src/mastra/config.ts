import { Mastra } from '@mastra/core/mastra';
import { createLogger } from '@mastra/core/logger';
import { weatherAgent } from './agents/index.js';

const logger = createLogger({
  name: 'Mastra',
  level: 'info',
});

// Configure Mastra instance with minimal setup
export const mastra = new Mastra({
  agents: { weatherAgent },
  logger,
  telemetry: {
    enabled: true,
    serviceName: 'code-error-service'
  }
});

// Export initialization function
// export async function initializeMastra() {
//   try {
//     // Initialize the Mastra instance
//     await mastra.initialize();
//     logger.info('Mastra initialized successfully');
//     return mastra;
//   } catch (error) {
//     logger.error('Failed to initialize Mastra:', error);
//     throw error;
//   }
// }
