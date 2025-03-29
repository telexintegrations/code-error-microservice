/**
 * live version
 */
import { Request, Response, NextFunction } from "express";
import { categorizeError } from "../services/categorizationService";
import axios from "axios";
import { ENV_CONFIG } from "../utils/envConfig";

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
export const handleIncomingError = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log("🎯 Entering handleIncomingError");
    console.log("📝 Request body:", JSON.stringify(req.body, null, 2));

    const { type, errors, timestamp } = req.body;

    if (!type || !Array.isArray(errors) || errors.length === 0) {
      console.log("❌ Invalid request format");
      res.status(400).json({
        error:
          "🚫 Invalid error report format. Ensure that 'type' and a non-empty 'errors' array are provided.",
      });
      return;
    }

    console.log("✅ Request validation passed");

    const reqMessage = `Analyze these errors:
Type: ${type}
Timestamp: ${timestamp}
Errors: ${JSON.stringify(errors, null, 2)}

Provide analysis including:
1. Error patterns
2. Root cause
3. Suggested fixes
4. Prevention tips`;

    const aiRequestMessage = {
      messages: [
        {
          role: "user",
          content: reqMessage,
        },
      ],
    };

    let aiAnalysis;
    try {
      const aiAnalysisResponse = await axios.post(
        `${ENV_CONFIG.SERVER_URL}/api/agents/errorAnalysisAgent/generate`,
        aiRequestMessage,
        {
          headers: {
            "Content-Type": "application/json", // Make sure this is set
          },
        }
      );

      console.log(
        "✨ AI Response:",
        JSON.stringify(aiAnalysisResponse.data, null, 2)
      );
      aiAnalysis = aiAnalysisResponse.data;
    } catch (aiError) {
      console.error(
        "🚨 AI Analysis failed:",
        aiError instanceof Error ? aiError.message : "Unknown AI error",
        aiError
      );
      aiAnalysis = { error: "AI analysis unavailable" };
    }

    // Ensure errors are in the correct format
    const normalizedErrors = errors.map((err: ErrorItem) => ({
      message: typeof err === "string" ? err : err.message,
      stack: err.stack || "",
      readableMessage: err.readableMessage || "",
    }));

    // Enrich each error with a more friendly message
    const enrichedErrors: ErrorItem[] = normalizedErrors.map(
      (err: ErrorItem, index: number) => {
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
          readableMessage: `${emoji} Test Error [${index + 1}]: ${err.message}`,
        };
      }
    );

    const processedError: ProcessedError = {
      type: type || "errorBatch",
      errors: enrichedErrors,
      timestamp: timestamp || new Date().toISOString(),
    };

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
      severity: highestSeverity,
      aiAnalysis: aiAnalysis,
    });
  } catch (error) {
    console.error(
      "❌ Error with AI analysis:",
      error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data: any } }).response?.data
          : "Unknown error"
    );
    console.error("🔍 Full error:", error);
    next(error);
  }
};

/**
 * Returns the last processed error report.
 */
export const getLastProcessedError = (): ProcessedError | null => {
  return lastProcessedError;
};
