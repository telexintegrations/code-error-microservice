/**
 * Local version
 */
import * as zmq from "zeromq";
import axios from "axios";
import { ProcessedError } from "../controllers/errorController";
import { ENV_CONFIG } from "../utils/envConfig";
import { categorizeError } from "../services/categorizationService";
import { mastra } from "../mastra"; // Import mastra instance

// Define an interface for the error object structure
interface ErrorObject {
  message?: string;
  stack?: string;
  readableMessage?: string;
}

// Add type safety for webhook payload
interface WebhookPayload {
  event_name: string;
  message: string;
  status: "error" | "success";
  username: string;
}

const webhookUrl = "https://ping.telex.im/v1/webhooks";
const ZERO_MQ_BIND_HOST = "0.0.0.0";

/**
 * Determines the overall severity based on the errors of the report.
 * It uses the same categorization logic as in errorController.
 */
function computeOverallSeverity(errors: ErrorObject[]): string {
  // Count error frequencies
  const errorCounts = errors.reduce(
    (acc, err) => {
      const severity = categorizeError(err.message || "");
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Calculate severity score
  const totalErrors = errors.length;
  const severityScore =
    ((errorCounts["High"] || 0) * 100 +
      (errorCounts["Medium"] || 0) * 50 +
      (errorCounts["Low"] || 0) * 25) /
    totalErrors;

  // Determine overall severity based on score
  if (errorCounts["High"] && errorCounts["High"] / totalErrors >= 0.3) {
    return "High"; // If 30% or more errors are High
  } else if (severityScore >= 75) {
    return "High";
  } else if (severityScore >= 40) {
    return "Medium";
  }
  return "Low";
}

async function sendToWebhook(
  channelId: string,
  payload: WebhookPayload // Updated to use the interface
): Promise<boolean> {
  try {
    const response = await axios.post(`${webhookUrl}/${channelId}`, payload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Code Error Agent/1.0.0",
      },
    });
    console.log("Webhook response data:", response?.data);
    return true;
  } catch (error) {
    console.error("Failed to send to webhook:", error);
    return false;
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to create error summary
function createErrorSummary(errors: ErrorObject[]): string {
  return errors
    .map((err: ErrorObject, index: number) => {
      const message = err.readableMessage || err.message || "N/A";
      return `  ${index + 1}. ${message}`;
    })
    .join("\n");
}

// Helper function to format timestamp
function formatTimestamp(timestamp?: string): string {
  return timestamp
    ? new Date(timestamp).toLocaleString()
    : new Date().toLocaleString();
}

/**
 * Initializes the ZeroMQ server with a Reply socket for receiving error payloads
 * and a Publisher socket for broadcasting updates.
 */
async function initializeServer() {
  const replySocket = new zmq.Reply();
  const publishSocket = new zmq.Publisher();

  try {
    const basePort = ENV_CONFIG.PORT;
    const zeroMqBindPortPublish = Number(basePort) + 1;
    const zeroMqBindPortReply = Number(basePort) + 2;

    await replySocket.bind(`tcp://${ZERO_MQ_BIND_HOST}:${zeroMqBindPortReply}`);
    await publishSocket.bind(
      `tcp://${ZERO_MQ_BIND_HOST}:${zeroMqBindPortPublish}`
    );
    console.log(
      `ZeroMQ server bound to ports ${zeroMqBindPortReply} (Reply) and ${zeroMqBindPortPublish} (Publish)`
    );

    const serverPublish = async (message: string) => {
      try {
        await publishSocket.send(["update", message]);
        console.log("Server published:", message);
      } catch (pubError) {
        console.error("Failed to publish message:", pubError);
      }
    };

    // Process incoming messages on the Reply socket.
    for await (const [msg] of replySocket) {
      let parsedMessage: ProcessedError | any;
      const rawMsg = msg.toString();
      console.log("===============");
      console.log("Received:", rawMsg);
      console.log("===============");

      try {
        parsedMessage = JSON.parse(rawMsg);

        if (
          !parsedMessage ||
          !parsedMessage.channelId ||
          !parsedMessage.errors
        ) {
          console.warn("Invalid message format");
          await replySocket.send(
            JSON.stringify({
              status: "error",
              message: "Invalid message format",
            })
          );
          continue;
        }

        const errorSummary = createErrorSummary(parsedMessage.errors);
        const formattedTime = formatTimestamp(parsedMessage.timestamp);
        const overallSeverity =
          parsedMessage.priority ||
          computeOverallSeverity(parsedMessage.errors);

        // Helper function to get severity emoji
        const getSeverityEmoji = (severity: string): string => {
          switch (severity.toLowerCase()) {
            case "high":
              return "🚨";
            case "medium":
              return "⚠️";
            case "low":
              return "ℹ️";
            default:
              return "⚠️";
          }
        };

        const severityEmoji = getSeverityEmoji(overallSeverity);

        // Send initial error report first and wait for confirmation
        const initialMessage = `🚨 New Error Report

Type: ${parsedMessage.type}
Time: ${formattedTime}
Overall Severity: ${overallSeverity} ${severityEmoji}

Errors:
${errorSummary}`;

        const initialPayload: WebhookPayload = {
          event_name: "Code Error Monitor Agent",
          message: initialMessage,
          status: "error",
          username: "Code Error Agent",
        };

        const initialSent = await sendToWebhook(
          parsedMessage.channelId,
          initialPayload
        );

        if (!initialSent) {
          throw new Error("Failed to send initial error report");
        }

        await delay(1000);

        // Then proceed with AI analysis
        let aiAnalysis = "No analysis available";
        try {
          const analysisPrompt = {
            messages: [
              {
                role: "user",
                content: `Analyze these errors:
Type: ${parsedMessage.type}
Timestamp: ${parsedMessage.timestamp}
Errors: ${JSON.stringify(parsedMessage.errors, null, 2)}

Provide analysis including:
1. Error patterns
2. Root cause
3. Suggested fixes
4. Prevention tips`,
              },
            ],
          };

          const aiResponse = await axios.post(
            `${ENV_CONFIG.AI_SERVER_URL}/api/agents/errorAnalysisAgent/generate`,
            analysisPrompt,
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          // Clean up the AI response by removing markdown and adding emojis
          aiAnalysis = aiResponse.data.text || aiAnalysis;
          aiAnalysis = aiAnalysis
            .replace(/^#+ /gm, "") // Remove markdown headers
            .replace(/\*\*/g, "") // Remove bold syntax
            .replace(/\n{3,}/g, "\n\n") // Replace multiple newlines
            .replace(/Error Pattern/gi, "📊 Error Pattern")
            .replace(/Occurrence Count/gi, "🔢 Occurrence Count")
            .replace(/Root Cause/gi, "🔍 Root Cause")
            .replace(/Suggested Fix/gi, "🔧 Suggested Fix")
            .replace(/Prevention Tips/gi, "🛡️ Prevention Tips")
            .replace(/General Notes/gi, "📋 General Notes") // Added general notes emoji
            .replace(/High severity/gi, "High severity 🚨")
            .replace(/Medium severity/gi, "Medium severity ⚠️")
            .replace(/Low severity/gi, "Low severity ℹ️")
            .trim();

          console.log("🤖 AI Analysis:", aiResponse.data);

          await delay(500);

          const followUpMessage = `🤖 Error Analysis Report

Type: ${parsedMessage.type}
Time: ${formattedTime}
Overall Severity: ${overallSeverity} ${severityEmoji}

Errors:
${errorSummary}

AI Analysis:
${aiAnalysis}`;

          const followUpPayload: WebhookPayload = {
            event_name: "Code Error Monitor Agent",
            message: followUpMessage,
            status: "success",
            username: "Code Error Agent",
          };

          const analysisSent = await sendToWebhook(
            parsedMessage.channelId,
            followUpPayload
          );

          if (!analysisSent) {
            throw new Error("Failed to send analysis report");
          }

          await replySocket.send(JSON.stringify({ status: "success" }));
        } catch (aiError) {
          console.error("Failed to get AI analysis:", aiError);
          await replySocket.send(
            JSON.stringify({
              status: "error",
              message: "Failed to get AI analysis",
            })
          );
        }
      } catch (parseError) {
        console.error("Failed to parse message:", parseError);
        await replySocket.send(
          JSON.stringify({ status: "error", message: "Invalid message format" })
        );
      }
    }

    return { serverPublish };
  } catch (error) {
    console.error("ZeroMQ server error:", error);
    throw error;
  }
}

export const zeromqClient = initializeServer();
