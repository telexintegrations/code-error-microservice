import { Request, Response, NextFunction } from "express";
import { categorizeError } from "../services/categorizationService.js";
import { errorStore } from '../services/errorStore.js';
import { zeromqClient } from "../services/zeromqService.js";
import { v4 as uuidv4 } from 'uuid';

export interface ProcessedError {
  id: string;
  type: string;
  errors: ErrorItem[];
  timestamp: string;
  priority?: string;
  analysis?: any;
}

export interface ErrorItem {
  message: string;
  stack: string;
  readableMessage?: string;
}

export interface ErrorRequestBody {
  type: string;
  errors: {
    message: string;
    stack: string;
  }[];
  timestamp?: string;
}

const SEVERITY_EMOJIS: Record<string, string> = {
  High: "🚨",
  Medium: "🔔",
  Low: "ℹ️",
};

/**
 * Handles incoming error reports:
 * - Validates the payload.
 * - Categorizes and enriches each error.
 * - Determines the highest severity level.
 */
export const handleIncomingError = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log("🚀 handleIncomingError triggered with request:", req.body);
  
  try {
    
    const errorData: ErrorRequestBody = req.body;
    const channelId = req.body.channelId;
    
    errorStore.setLastProcessedError({
      id: uuidv4(),
      ...errorData,
      timestamp: errorData.timestamp || new Date().toLocaleString()
    }, channelId);

    const { type, errors, timestamp } = errorData;
    if (!type || !Array.isArray(errors) || errors.length === 0) {
      res.status(400).json({ error: "🚫 Invalid format. Provide 'type' and a non-empty 'errors' array." });
      return;
    }

    const enrichedErrors: ErrorItem[] = errors.map((err) => {
      const severity = categorizeError(err.message);
      return {
        ...err,
        readableMessage: `${SEVERITY_EMOJIS[severity] || "ℹ️"} ${severity} severity error: ${err.message}`,
      };
    });

    const highestSeverity = ["High", "Medium", "Low"].find((level) =>
      enrichedErrors.some((err) => categorizeError(err.message) === level)
    ) || "Low";

    const processedError: ProcessedError = {
      id: uuidv4(),
      type,
      errors: enrichedErrors,
      timestamp: timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString(),
      priority: highestSeverity,
    };

    try {
      const client = await zeromqClient;
      console.log("Client after awaiting:", client); // 🔥 Should log an object
      if (!client) {
        throw new Error("ZeroMQ client is null or undefined");
      }

       // Send the processed error through ZeroMQ and wait for response
    const response = await client.serverPublish(JSON.stringify({
      ...processedError,
      channelId
    }));

    console.log(`Here is the response ${response}`);
    } catch (error) {
      console.error("Error initializing ZeroMQ client:", error);
    }
    

   

    

    // The response from ZeroMQ/Telex webhook should contain the task_id
    
  } catch (error) {
    next(error);
  }
};

/** Returns the last processed error report. */
export const getLastProcessedError = (): ProcessedError | null => errorStore.findRecentError('default');

// New handler for thread replies
export const handleThreadReply = async (req: Request, res: Response): Promise<void> => {
  const { threadId, channelId } = req.body;

  // Check if thread is already mapped
  let errorInfo = errorStore.getErrorByThreadId(threadId);

  if (!errorInfo) {
    // New thread - try to find recent task
    const recentError = errorStore.findRecentError(channelId);
    const recentTaskId = recentError?.id;
    
    if (recentTaskId) {
      // Map this thread to the recent task
      errorStore.mapThreadToError(threadId, recentTaskId, channelId);
      errorInfo = errorStore.getErrorByThreadId(threadId);
    }
  }

  if (errorInfo) {
    res.json({
      status: "success",
      error: errorInfo.error
    });
  } else {
    res.status(404).json({
      status: "error",
      message: "No recent error found for this thread"
    });
  }
};
