import { Router, Request, Response } from "express";
import axios from "axios";
import { getLastProcessedError, ProcessedError } from "../controllers/errorController";

const router = Router();

const webhookUrl = "https://ping.telex.im/v1/webhooks"

router.post("/tick", async (req: Request, res: Response) => {
  let payload: any;
  try {
    res.status(202).json({ status: "accepted" });

    payload = req.body;

    /**
     * {
     * channel_id: "string",
     * message: "string",
     * "settings": object[]
     * }
     */

    if (!payload.channel_id) {
      throw new Error("Channel ID is required");
    }

    // Retrieve the last processed error
    const refinedError: ProcessedError | null = getLastProcessedError();
    if (!refinedError) {
      console.warn("No processed error available for reporting.");
      return;
    }


const message = `
Error Report Details:
Message: ${refinedError.message}
Type: ${refinedError.type}
Priority: ${refinedError.priority}
Timestamp: ${refinedError.extra?.timestamp}
Reported By: Code Error Agent
Event: Processed Error Report
Status: ${refinedError.priority === "High" ? "error" : "info"}
Processing Time: ${new Date().toISOString()}
Performed By: your-username
Source: error processing
Full Error Details: ${JSON.stringify(refinedError, null, 2)}
`.trim();


    const telexPayload = {
"event_name": "Code Error Monitor Agent",
  "message": message,
  "status": "success",
  "username": "Agent Sapa"
    }

    
    console.log(telexPayload.message);
    const response = await axios.post(`${webhookUrl}/${payload.channel_id}`, telexPayload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Code Error Agent/1.0.0",
      },
    });

    if (response.status !== 200 && response.status !== 202) {
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