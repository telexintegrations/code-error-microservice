/**
 * Local version
 */
import * as zmq from "zeromq";
import axios from "axios";
import { ProcessedError } from "../controllers/errorController.js";
import { ENV_CONFIG } from "../utils/envConfig.js";
import { categorizeError } from "../services/categorizationService.js"; // Importing for fallback severity computation
import { v4 as uuidv4 } from 'uuid';

// Define an interface for the error object structure
interface ErrorObject {
  message?: string;
  stack?: string;
  readableMessage?: string;
}

const webhookUrl = "https://ping.telex.im/v1/webhooks";
const ZERO_MQ_BIND_HOST = "0.0.0.0";

/**
 * Determines the overall severity based on the errors of the report.
 */
function computeOverallSeverity(errors: ErrorObject[]): string {
  return errors
    .map((err) => categorizeError(err.message || ""))
    .reduce(
      (prev, current) =>
        current === "High"
          ? current
          : prev === "High"
          ? prev
          : current === "Medium"
          ? current
          : prev,
      "Low"
    );
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
    const zeroMqBindPortPublish = basePort + 1;
    const zeroMqBindPortReply = basePort + 2;

    await replySocket.bind(`tcp://${ZERO_MQ_BIND_HOST}:${zeroMqBindPortReply}`);
    await publishSocket.bind(`tcp://${ZERO_MQ_BIND_HOST}:${zeroMqBindPortPublish}`);
    console.log(
      `ZeroMQ server bound to ports ${zeroMqBindPortReply} (Reply) and ${zeroMqBindPortPublish} (Publish)`
    );

    const serverPublish = async (message: string) => {
      try {
        await publishSocket.send(["update", message]);
        const parsedMessage = JSON.parse(message);
        
        let formattedMessage;
        
        if (parsedMessage.type === 'error_analysis_response') {
          // Format Mastra's analysis response
          formattedMessage = `🔍 *Error Analysis*\n\n` +
            `${parsedMessage.analysis}\n\n` +
            `💡 **Suggested Fix:**\n${parsedMessage.message.text}`;
        } else {
          // Default error report format
          const errorSummary = parsedMessage.errors?.map((err: ErrorObject, index: number) => {
            const message = err.message || "N/A";
            return `  ${index + 1}. ${message}`;
          }).join("\n");

          formattedMessage = `🎉 *Error Report Accepted!* 🎉\n\n` +
            `------------------------------------------\n` +
            `Type            : ${parsedMessage.type}\n` +
            `Time            : ${parsedMessage.timestamp}\n` +
            `Overall Severity: ${parsedMessage.priority || computeOverallSeverity(parsedMessage.errors)}\n` +
            `------------------------------------------\n` +
            `Errors:\n${errorSummary}\n` +
            `------------------------------------------\n` +
            `Analysis:\n${parsedMessage.analysis || 'No analysis available'}\n` +
            `------------------------------------------`;
        }

        const telexPayload = {
          event_name: "Code Error Monitor Agent",
          message: formattedMessage,
          status: "success",
          username: "Code Error Agent",
        };

        const webhookResponse = await axios.post(
          `${webhookUrl}/${parsedMessage.channelId}`,
          telexPayload,
          {
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Code Error Agent/1.0.0",
            },
          }
        );

        return { status: "success", data: webhookResponse.data };
      } catch (error) {
        console.error("Failed to publish or send webhook:", error);
        throw error;
      }
    };

    for await (const [msg] of replySocket) {
      let parsedMessage: ProcessedError | any;
      const rawMsg = msg.toString();
      // console.log("===============");
      // console.log("Received:", rawMsg);
      // console.log("===============");

      try {
        parsedMessage = JSON.parse(rawMsg);
        if (!parsedMessage.errors && parsedMessage.message !== undefined) {
          parsedMessage = {
            id: uuidv4(), // Add the required id field
            channelId: parsedMessage.channelId,
            type: parsedMessage.type,
            errors: [{
              message: parsedMessage.message,
              stack: parsedMessage.stack,
              readableMessage: parsedMessage.readableMessage
            }],
            timestamp: parsedMessage.timestamp,
          } as ProcessedError;
        }
      } catch (parseError) {
        console.error("Failed to parse message:", parseError);
        await replySocket.send(
          JSON.stringify({ status: "error", message: "Invalid message format" })
        );
        continue;
      }

      if (!parsedMessage || !parsedMessage.channelId || !parsedMessage.errors) {
        console.warn("Invalid message format");
        await replySocket.send(
          JSON.stringify({ status: "error", message: "Invalid message format" })
        );
        continue;
      }

      await serverPublish(JSON.stringify(parsedMessage));
      await replySocket.send(JSON.stringify({ status: "success" }));
    }

    return { serverPublish };
  } catch (error) {
    console.error("ZeroMQ server error:", error);
    throw error;
  }
}

export const zeromqClient = initializeServer();
