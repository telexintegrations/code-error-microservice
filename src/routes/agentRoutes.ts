import express from "express";
import { mastra } from "../mastra";

const router = express.Router();

// Route for the error analysis agent
router.post("/agents/errorAnalysisAgent/generate", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages) {
      return res
        .status(400)
        .json({ error: "Invalid request format. 'messages' is required." });
    }

    // Convert the messages to the format expected by the agent
    // The agent expects a string, not an array of messages
    let prompt = "";
    if (Array.isArray(messages)) {
      // Extract the content from the messages array
      prompt = messages.map((msg) => msg.content).join("\n");
    } else if (typeof messages === "string") {
      prompt = messages;
    } else if (messages.content) {
      prompt = messages.content;
    } else {
      return res.status(400).json({ error: "Invalid message format" });
    }

    try {
      // Generate the response using the agent
      const result = await mastra.agents.errorAnalysisAgent.generate(prompt);
      return res.json(result);
    } catch (error) {
      // Check if it's a rate limit error
      if (
        error.message &&
        error.message.includes("quota") &&
        error.message.includes("exceeded")
      ) {
        console.error("Rate limit exceeded:", error.message);
        return res.status(429).json({
          error: "Rate limit exceeded",
          details:
            "The AI service quota has been exceeded. Please try again later.",
          retryAfter: 3600, // Suggest retry after 1 hour
        });
      }

      // For other errors
      throw error;
    }
  } catch (error) {
    console.error("Error in agent route:", error);
    return res.status(500).json({
      error: "Failed to generate response",
      details: error.message,
    });
  }
});

export default router;
