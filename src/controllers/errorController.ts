import { Request, Response, NextFunction } from "express";
import { categorizeError } from "../services/categorizationService";

export interface ProcessedError {
  channelId: string;
  type: string;
  errors: ErrorItem[];
  timestamp: string;
  priority?: string;
}

export interface ErrorItem {
  message: string;
  stack: string;
}

let lastProcessedError: ProcessedError | null = null;

export const handleIncomingError = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const { channelId, type, errors, timestamp } = req.body;

    if (!channelId || !type || !Array.isArray(errors) || errors.length === 0) {
      res.status(400).json({ error: "Invalid error report format." });
      return;
    }

    const highestSeverity = errors
    .map(err => categorizeError(err.message))
    .reduce((prev, current) => 
      current === "High" ? current : 
      (prev === "High" ? prev : 
      (current === "Medium" ? current : prev)), 
      "Low"
    );

    lastProcessedError = {
      channelId,
      type,
      errors,
      timestamp: timestamp || new Date().toISOString(),
      priority: highestSeverity
    };

    res.status(202).json({ status: "accepted" });

  } catch (error) {
    next(error);
  }
};

export const getLastProcessedError = (): ProcessedError | null => {
  return lastProcessedError;
};