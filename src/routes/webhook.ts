import { Router } from "express";
import { TelexService } from "../services/telexService.js";
import { CommandParser } from "../utils/commandParser.js";

const router = Router();
const telexService = new TelexService();
const commandParser = new CommandParser();

router.post("/webhook", async (req, res) => {
  const { message, channel_id, thread_id } = req.body;

  try {
    const command = commandParser.parse(message);

    switch (command.type) {
      case "FIX": {
        // For now, just acknowledge the command
        await telexService.sendResponse({
          channelId: channel_id,
          threadId: thread_id,
          message: `Received fix command for error ${command.errorId}. Solution: ${command.solution || "No solution provided"}`,
        });
        break;
      }

      case "VERIFY": {
        // For now, just acknowledge the command
        await telexService.sendResponse({
          channelId: channel_id,
          threadId: thread_id,
          message: `Received verification request for error ${command.errorId}`,
        });
        break;
      }
    }

    res.status(200).json({ status: "success" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
