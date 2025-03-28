import { Router, Request, Response } from "express";
import { mastra } from "../mastra/config.js";
import { zeromqClient } from "../services/zeromqService.js";
import { getLastProcessedError } from "../controllers/errorController.js";
import { errorStore } from "../services/errorStore.js";
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get("/integration-json", (req: Request, res: Response) => {
  // Get the host from the request headers
  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;

  const integrationData = {
    data: {
      date: {
        created_at: "2025-02-20 22:25:37",
        updated_at: "2025-02-20 22:25:37",
      },
      descriptions: {
        app_description:
          "Analyzes your codebase for static errors and reports them to Telex channels with prioritized error classification.",
        app_logo: "https://example.com/path-to-code-error-agent-logo.png",
        app_name: "Code Error Agent",
        app_url: baseUrl,
        background_color: "#FF4444",
      },
      integration_category: "AI & Machine Learning",
      integration_type: "interval",
      is_active: true,
      output: [
        {
          label: "error_notifications",
          value: true,
        },
      ],
      key_features: [
        "Static code error detection using ESLint",
        "Prioritized error classification (High, Medium, Low)",
        "Automated error reporting to Telex channels",
        "Configurable analysis intervals",
        "Integration with development pipelines",
      ],
      settings: [
        {
          label: "codeBasePath",
          type: "text",
          required: true,
          default: process.env.CODE_BASE_PATH || "./src",
        },
        {
          label: "errorThreshold",
          type: "text",
          required: true,
          default: "1",
        },
        {
          label: "interval",
          type: "text",
          required: true,
          default: "*/15 * * * *",
        },
      ],
      // Use the ngrok URL for these endpoints
      tick_url: `${baseUrl}/code-error-integration/tick`,
      target_url: `${baseUrl}/code-error-integration/webhook`,
    },
  };

  res.json(integrationData);
});

// Add webhook handler
router.post("/webhook", async (req: Request, res: Response): Promise<void> => {
  const { message, channel_id, thread_id, error_data } = req.body;
  
  try {
    // Handle user message in thread - this is when we should send Mastra's analysis
    if (message && thread_id && !error_data) {
      const errorInfo = errorStore.getErrorByThreadId(thread_id);
      
      if (errorInfo) {
        // Generate response using Mastra
        const response = await mastra.getAgent('errorAnalysisAgent').generate([{
          role: 'user',
          content: JSON.stringify({
            error: errorInfo,
            userMessage: message,
            context: {
              channelId: channel_id,
              threadId: thread_id
            }
          })
        }]);

        // Send Mastra's analysis to Telex
        const client = await zeromqClient;
        await client.serverPublish(JSON.stringify({
          channelId: channel_id,
          threadId: thread_id,
          type: 'error_analysis_response',
          message: response,
          errorId: errorInfo.error.id,
          analysis: response.text // Include Mastra's analysis
        }));

        res.status(200).json({
          status: "success",
          message: "Analysis generated and sent"
        });
        return;
      }
    }

    // Handle initial error submission - just report the error, no analysis yet
    if (error_data) {
      const errorId = uuidv4();
      
      // Store error for later analysis
      errorStore.setLastProcessedError({
        id: errorId,
        ...error_data
      }, channel_id);

      // Send initial error report to Telex
      const client = await zeromqClient;
      await client.serverPublish(JSON.stringify({
        channelId: channel_id,
        type: 'error_report',
        errorId,
        errors: [{
          message: error_data.message,
          stack: error_data.stack
        }],
        priority: error_data.priority || 'Medium'
      }));

      res.status(200).json({ 
        status: "success",
        errorId
      });
      return;
    }

    res.status(400).json({
      status: "error",
      message: "Unhandled request type"
    });

  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ 
      status: "error", 
      message: "Failed to process webhook" 
    });
  }
});

export default router;
