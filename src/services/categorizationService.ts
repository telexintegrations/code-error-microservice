
export type ErrorCategory = "High" | "Medium" | "Low";

export const categorizeError = (errorMessage: string): ErrorCategory => {
  if (
    errorMessage.includes("ReferenceError") ||
    errorMessage.includes("SyntaxError")
  ) {
    return "High";
  } else if (errorMessage.includes("TypeError")) {
    return "Medium";
  } else {
    return "Low";
  }
};
