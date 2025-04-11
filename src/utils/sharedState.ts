import { ProcessedError } from "../controllers/errorController";

// Shared state to be used across modules
interface SharedState {
  lastProcessedError: ProcessedError | null;
}

// Initialize the shared state
const sharedState: SharedState = {
  lastProcessedError: null
};

// Export functions to get and set the last processed error
export const getLastProcessedError = (): ProcessedError | null => {
  return sharedState.lastProcessedError;
};

export const setLastProcessedError = (error: ProcessedError): void => {
  sharedState.lastProcessedError = error;
  console.log("Last processed error updated:", error.type);
};
