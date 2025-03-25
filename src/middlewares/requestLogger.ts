import { Request, Response, NextFunction } from "express";

/**
 * Logs incoming HTTP requests with timestamp, method, URL, query parameters, and body.
 * This middleware helps with debugging incoming requests.
 */
const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  // Log query parameters if present
  if (Object.keys(req.query).length > 0) {
    console.log("Query:", JSON.stringify(req.query, null, 2));
  }

  // Log request body if present
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("Body:", JSON.stringify(req.body, null, 2));
  }

  next();
};

export default requestLogger;