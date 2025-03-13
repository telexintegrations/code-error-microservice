import { Router, Request, Response } from "express";
import axios from "axios";
import { getLastProcessedError, ProcessedError } from "../controllers/errorController";

const router = Router();

router.post("/tick", async (req: Request, res: Response) => {
  let payload: any;
  try {
    res.status(202).json({ status: "accepted" });

    payload = req.body;

    // Retrieve the last processed error
    const refinedError: ProcessedError | null = getLastProcessedError();
    if (!refinedError) {
      console.warn("No processed error available for reporting.");
      return;
    }

    const telexPayload = {
      message: `Error Report: ${refinedError.message}`,
      errorType: refinedError.type,
      errorPriority: refinedError.priority,
      errorMessage: refinedError.message,
      errorTimestamp: refinedError.extra?.timestamp,
      username: "Code Error Agent",
      event_name: "Processed Error Report",
      status: refinedError.priority === "High" ? "error" : "info",
      timestamp: new Date().toISOString(),
      performed_by: "your-username",
      metadata: {
        source: "error processing",
        fullError: refinedError,
      },
    };

    const returnUrl: string | undefined = payload.return_url;
    if (!returnUrl) {
      throw new Error("Missing return_url in request payload");
    }

    const response = await axios.post(returnUrl, telexPayload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Code Error Agent/1.0.0",
      },
    });

    if (response.status !== 200) {
      throw new Error(`Failed to forward error to Telex: ${response.statusText}`);
    }
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Error in tick endpoint:`, error);
    if (payload?.return_url) {
      try {
        await axios.post(payload.return_url, {
          message: `❌ Error processing error event: ${error.message}`,
          username: "Code Error Agent",
          event_name: "Error Processing Failure",
          status: "error",
          timestamp: new Date().toISOString(),
          performed_by: "your-username",
          metadata: {
            error: error.message,
          },
        });
      } catch (notifyError) {
        console.error(
          `[${new Date().toISOString()}] Failed to notify Telex about error:`,
          notifyError
        );
      }
    }
  }
});

export default router;
