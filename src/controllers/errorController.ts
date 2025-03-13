import { Request, Response, NextFunction } from "express";
import { categorizeError } from "../services/categorizationService";

export interface ProcessedError {
  message: string;
  type: string;
  priority: string;
  extra?: {
    timestamp: string;
  };
}

let lastProcessedError: ProcessedError | null = null; // Store the last processed error

export const handleIncomingError = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { message, stack } = req.body;

    if (!message || !stack) {
      res.status(400).json({ error: "Invalid error report format." });
      return;
    }

    const severity = categorizeError(message);

    lastProcessedError = {
      message,
      type: "Error",
      priority: severity,
      extra: { timestamp: new Date().toISOString() },
    };

    console.log(`[Processed Error] Severity: ${severity}, Message: ${message}`);

    res.status(202).json({ status: "accepted" }); 

  } catch (error) {
    next(error); 
  }
};

export const getLastProcessedError = (): ProcessedError | null => {
  return lastProcessedError;
};
