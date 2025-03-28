import { ProcessedError, ErrorRequestBody } from '../controllers/errorController.js';

interface ErrorMapping {
  error: ProcessedError;
  threadIds: string[];
  channelId: string;
  timestamp: Date;
}

class ErrorStore {
  private errorMap: Map<string, ErrorMapping> = new Map();
  private threadToErrorMap: Map<string, string> = new Map(); // thread_id -> error_id
  
  setLastProcessedError(error: ProcessedError, channelId: string) {
    this.errorMap.set(error.id, {
      error,
      threadIds: [],
      channelId,
      timestamp: new Date()
    });
  }

  getErrorByThreadId(threadId: string) {
    const errorId = this.threadToErrorMap.get(threadId);
    return errorId ? this.errorMap.get(errorId) : null;
  }

  mapThreadToError(threadId: string, errorId: string, channelId: string) {
    this.threadToErrorMap.set(threadId, errorId);
    const errorMapping = this.errorMap.get(errorId);
    if (errorMapping) {
      errorMapping.threadIds.push(threadId);
    }
  }

  findRecentError(channelId: string) {
    const errors = Array.from(this.errorMap.entries())
      .filter(([_, mapping]) => mapping.channelId === channelId)
      .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());
    
    return errors.length > 0 ? errors[0][1].error : null;
  }

  // Add cleanup method to prevent memory leaks
  cleanup(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const now = new Date().getTime();
    for (const [errorId, mapping] of this.errorMap.entries()) {
      if (now - mapping.timestamp.getTime() > maxAge) {
        // Clean up thread mappings
        mapping.threadIds.forEach(threadId => {
          this.threadToErrorMap.delete(threadId);
        });
        // Clean up error mapping
        this.errorMap.delete(errorId);
      }
    }
  }
}

export const errorStore = new ErrorStore();

// Optional: Set up periodic cleanup
setInterval(() => {
  errorStore.cleanup();
}, 60 * 60 * 1000); // Run every hour
