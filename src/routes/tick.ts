import { Router, Request, Response } from "express";
import { getLastProcessedError } from "../controllers/errorController.js";

const router = Router();

router.post("/tick", async (req: Request, res: Response) => {
  try {
    // Just acknowledge the request
    res.status(202).json({
      status: "accepted",
      message:
        "Tick received but forwarding is disabled - using ZeroMQ instead",
    });

    // Log for debugging
    console.log("[Tick] Request received:", {
      timestamp: new Date().toISOString(),
      body: req.body,
    });
  } catch (error: any) {
    console.error(
      `[${new Date().toISOString()}] Error in tick endpoint:`,
      error
    );
    // Don't forward the error, just log it
  }
});

export default router;
