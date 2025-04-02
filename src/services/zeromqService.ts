import * as zmq from "zeromq";
import axios from "axios";
import { ProcessedError } from "../controllers/errorController";
import { ENV_CONFIG } from "../utils/envConfig";
import { categorizeError } from "../services/categorizationService";
import { setLastProcessedError } from "../utils/sharedState";
import { cleanMarkdown } from "../utils/markdownCleaner";
import { errorAnalysisAgent } from "../mastra/agents/errorAnalysisAgent";
import { CoreMessage } from "@mastra/core";

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
  payload: WebhookPayload
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
      // Use the readableMessage if available, otherwise create one
      if (!err.readableMessage) {
        const severity = categorizeError(err.message || "");
        let emoji = "️ℹ️";
        switch (severity.toLowerCase()) {
          case "high":
            emoji = "🚨";
            break;
          case "medium":
            emoji = "⚠️";
            break;
        }
        err.readableMessage = `${emoji} Test Error [${index + 1}]: ${err.message}`;
      }
      return `${index + 1}. ${err.readableMessage}`;
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

        // Normalize the errors
        parsedMessage.errors = parsedMessage.errors.map(
          (err: any, index: number) => {
            const errorObj = typeof err === "string" ? { message: err } : err;
            return {
              message: errorObj.message || "Unknown error",
              stack: errorObj.stack || "",
              readableMessage:
                errorObj.readableMessage ||
                `Test Error [${index + 1}]: ${errorObj.message}`,
            };
          }
        );

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

        // We're not generating AI analysis automatically anymore
        // Users can ask questions directly about the errors
        console.log("\n\n💬 Sending Error Report to channel");

        // Send a single message with both error information and interaction instructions
        const errorMessage = `🚨 Runtime Error Report

Type: ${parsedMessage.type || "errorBatch"}
Time: ${formattedTime}
Overall Severity: ${overallSeverity} ${severityEmoji}

Errors:
${errorSummary}

How to interact with me:

• Ask specific questions like "What's causing this error?" or "How do I fix it?"
• For general runtime error help: "@codeError How to handle promise rejections?"
• To scan your codebase for runtime errors: "@codeError scan my codebase"

I work best with direct, specific questions about errors!`;

        const errorPayload: WebhookPayload = {
          event_name: "Code Error Monitor Agent",
          message: cleanMarkdown(errorMessage),
          status: "error",
          username: "Code Error Agent",
        };

        // Make sure we're using the channel ID from the incoming message
        const channelId = parsedMessage.channelId;
        console.log(`Sending error report to channel ID: ${channelId}`);

        const sent = await sendToWebhook(channelId, errorPayload);

        if (!sent) {
          throw new Error("Failed to send error report");
        }

        // Store the error for the webhook handler to use
        const processedError: ProcessedError = {
          type: parsedMessage.type || "errorBatch",
          errors: parsedMessage.errors,
          timestamp: formattedTime,
          priority: overallSeverity,
        };

        // Update the shared state with the last processed error
        setLastProcessedError(processedError);

        await replySocket.send(JSON.stringify({ status: "success" }));
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
