/**
 * Represents the severity level for an error.
 * "High" errors are critical and might crash the application.
 * "Medium" errors indicate runtime issues that may cause unexpected behavior.
 * "Low" errors are less severe and often related to minor glitches.
 */
export type ErrorCategory = "High" | "Medium" | "Low";

/**
 * Categorizes an error message into a severity level.
 * 
 * This function attempts to cover most types of runtime errors by performing
 * a series of case-insensitive checks against known error types. It is designed
 * to align with the grouping strategies used in platforms like Sentry.
 *
 * - "High": Critical errors such as ReferenceError, SyntaxError, InternalError.
 * - "Medium": Recoverable or non-critical runtime errors like TypeError, RangeError, 
 *             EvalError, URIError, AggregateError, DOMException, NetworkError, Timeout errors.
 * - "Low": All other errors that do not fall under the above categories.
 *
 * @param errorMessage - The error message to be categorized.
 * @returns The determined error category.
 */
export const categorizeError = (errorMessage: string): ErrorCategory => {
  const message = errorMessage.toLowerCase();

  // High severity errors indicate faults that likely break application execution.
  if (
    message.includes("referenceerror") ||
    message.includes("syntaxerror") ||
    message.includes("internalerror")
  ) {
    return "High";
  }

  // Medium severity errors are indicative of issues that affect functionality
  // but might be recoverable or less critical.
  if (
    message.includes("typeerror") ||
    message.includes("rangeerror") ||
    message.includes("evalerror") ||
    message.includes("urierror") ||
    message.includes("aggregateerror") ||
    message.includes("domexception") ||
    message.includes("networkerror") ||
    message.includes("timeout")
  ) {
    return "Medium";
  }

  // All other errors are considered low severity.
  return "Low";
};