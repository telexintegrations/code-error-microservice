import { Request, Response, NextFunction } from "express";

const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log("Body:", JSON.stringify(req.body, null, 2));
  next();
};

export default requestLogger;
