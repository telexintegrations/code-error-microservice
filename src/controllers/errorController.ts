/** 
 * local version
 * */

// import { Request, Response, NextFunction } from "express";
// import { categorizeError } from "../services/categorizationService";

// export interface ProcessedError {
//   channelId: string;
//   type: string;
//   errors: ErrorItem[];
//   timestamp: string;
//   priority?: string;
// }

// export interface ErrorItem {
//   message: string;
//   stack: string;
//   // A simplified, user-friendly description of the error.
//   readableMessage?: string;
// }

// let lastProcessedError: ProcessedError | null = null;

// /**
//  * Handles incoming error reports by:
//  * - Validating the payload.
//  * - Categorizing each error using the updated categorization service.
//  * - Enriching errors with a user-friendly message that omits the verbose stack trace.
//  * - Constructing a neat summary report with emojis and essential details.
//  *
//  * If the payload is invalid (missing channelId, type, or errors array),
//  * responds with a 400 status and an explanatory message.
//  */
// export const handleIncomingError = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ): void => {
//   try {
//     const { channelId, type, errors, timestamp } = req.body;

//     if (!channelId || !type || !Array.isArray(errors) || errors.length === 0) {
//       res.status(400).json({
//         error:
//           "🚫 Invalid error report format. Ensure that 'channelId', 'type', and a non-empty 'errors' array are provided.",
//       });
//       return;
//     }

//     // Enrich each error with a more friendly message (removing detailed stack traces).
//     const enrichedErrors: ErrorItem[] = errors.map((err: ErrorItem) => {
//       const severity = categorizeError(err.message);
//       let emoji: string;
//       switch (severity) {
//         case "High":
//           emoji = "🚨";
//           break;
//         case "Medium":
//           emoji = "🔔";
//           break;
//         default:
//           emoji = "ℹ️";
//           break;
//       }
//       return {
//         ...err,
        
//         readableMessage: `${emoji} ${severity} severity error: ${err.message}`,
//       };
//     });

//     // Determine the highest severity among reported errors.
//     const highestSeverity = enrichedErrors
//       .map((err) => categorizeError(err.message))
//       .reduce(
//         (prev, current) =>
//           current === "High"
//             ? current
//             : prev === "High"
//             ? prev
//             : current === "Medium"
//             ? current
//             : prev,
//         "Low"
//       );

//     // Format timestamp to a more readable local date and time string.
//     const formattedTimestamp = timestamp
//       ? new Date(timestamp).toLocaleString()
//       : new Date().toLocaleString();

//     lastProcessedError = {
//       channelId,
//       type,
//       errors: enrichedErrors,
//       timestamp: formattedTimestamp,
//       priority: highestSeverity,
//     };

//     // Build a simplified user-friendly error report message.
//     let reportMessage = `✅ Error Report Accepted:
// Channel: ${channelId}
// Type: ${type}
// Time: ${formattedTimestamp}
// Overall Severity: ${highestSeverity}

// Detailed Errors:
// `;
//     enrichedErrors.forEach((err, idx) => {
//       reportMessage += `Error ${idx + 1}: ${err.readableMessage}\n`;
//     });

//     res.status(202).json({
//       status: "accepted",
//       message: reportMessage,
//     });
//   } catch (error) {
//     next(error);
//   }
// };

// /**
//  * Returns the last processed error report.
//  */
// export const getLastProcessedError = (): ProcessedError | null => {
//   return lastProcessedError;
// };


/**
 * live version
 */
import { Request, Response, NextFunction } from "express";
import { categorizeError } from "../services/categorizationService.js";

export interface ProcessedError {
  type: string;
  errors: ErrorItem[];
  timestamp: string;
  priority?: string;
}

export interface ErrorItem {
  message: string;
  stack: string;
  // A simplified, user-friendly description of the error.
  readableMessage?: string;
}

let lastProcessedError: ProcessedError | null = null;

/**
 * Handles incoming error reports by:
 * - Validating the payload.
 * - Categorizing each error using the updated categorization service.
 * - Enriching errors with a user-friendly message that omits the verbose stack trace.
 *
 * If the payload is invalid (missing type or errors array),
 * responds with a 400 status and an explanatory message.
 */
export const handleIncomingError = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { type, errors, timestamp } = req.body;

    if (!type || !Array.isArray(errors) || errors.length === 0) {
      res.status(400).json({
        error:
          "🚫 Invalid error report format. Ensure that 'type' and a non-empty 'errors' array are provided.",
      });
      return;
    }

    // Enrich each error with a more friendly message (removing detailed stack traces).
    const enrichedErrors: ErrorItem[] = errors.map((err: ErrorItem) => {
      const severity = categorizeError(err.message);
      let emoji: string;
      switch (severity) {
        case "High":
          emoji = "🚨";
          break;
        case "Medium":
          emoji = "🔔";
          break;
        default:
          emoji = "ℹ️";
          break;
      }
      return {
        ...err,
        readableMessage: `${emoji} ${severity} severity error: ${err.message}`,
      };
    });

    // Determine the highest severity among reported errors.
    const highestSeverity = enrichedErrors
      .map((err) => categorizeError(err.message))
      .reduce(
        (prev, current) =>
          current === "High"
            ? current
            : prev === "High"
            ? prev
            : current === "Medium"
            ? current
            : prev,
        "Low"
      );

    // Format timestamp to a more readable local date and time string.
    const formattedTimestamp = timestamp
      ? new Date(timestamp).toLocaleString()
      : new Date().toLocaleString();
    
    lastProcessedError = {
      type,
      errors: enrichedErrors,
      timestamp: formattedTimestamp,
      priority: highestSeverity,
    };

    res.status(202).json({
      status: "accepted",
      severity: highestSeverity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Returns the last processed error report.
 */
export const getLastProcessedError = (): ProcessedError | null => {
  return lastProcessedError;
};