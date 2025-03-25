// /**
//  * Local version 
//  */
// import * as zmq from "zeromq";
// import axios from "axios";
// import { ProcessedError } from "../controllers/errorController";
// import { ENV_CONFIG } from "../utils/envConfig";
// import { categorizeError } from "../services/categorizationService"; // Importing for fallback severity computation

// // Define an interface for the error object structure
// interface ErrorObject {
//   message?: string;
//   stack?: string;
//   readableMessage?: string;
// }

// const webhookUrl = "https://ping.telex.im/v1/webhooks";

// // You can optionally use environment variables for host/port configuration
// const ZERO_MQ_BIND_HOST = "0.0.0.0";

// /**
//  * Determines the overall severity based on the errors of the report.
//  * It uses the same categorization logic as in errorController.
//  */
// function computeOverallSeverity(errors: ErrorObject[]): string {
//   return errors
//     .map((err) => categorizeError(err.message || ""))
//     .reduce((prev, current) =>
//       current === "High"
//         ? current
//         : prev === "High"
//         ? prev
//         : current === "Medium"
//         ? current
//         : prev,
//       "Low"
//     );
// }

// /**
//  * Initializes the ZeroMQ server with a Reply socket for receiving error payloads
//  * and a Publisher socket for broadcasting updates.
//  */
// async function initializeServer() {
//   const replySocket = new zmq.Reply();
//   const publishSocket = new zmq.Publisher();

//   try {
//     // Use ENV_CONFIG setting for base port if available, with fallback values
//     const basePort = ENV_CONFIG.PORT;
//     const zeroMqBindPortPublish = basePort + 1; // Or use: basePort + 1;
//     const zeroMqBindPortReply = basePort + 2;   // Or use: basePort + 2;
    
//     await replySocket.bind(`tcp://${ZERO_MQ_BIND_HOST}:${zeroMqBindPortReply}`);
//     await publishSocket.bind(`tcp://${ZERO_MQ_BIND_HOST}:${zeroMqBindPortPublish}`);
//     console.log(
//       `ZeroMQ server bound to ports ${zeroMqBindPortReply} (Reply) and ${zeroMqBindPortPublish} (Publish)`
//     );

//     const serverPublish = async (message: string) => {
//       try {
//         await publishSocket.send(["update", message]);
//         console.log("Server published:", message);
//       } catch (pubError) {
//         console.error("Failed to publish message:", pubError);
//       }
//     };

//     // Process incoming messages on the Reply socket.
//     for await (const [msg] of replySocket) {
//       let parsedMessage: ProcessedError | any;
//       const rawMsg = msg.toString();
//       console.log('===============')
//       console.log("Received:", rawMsg);
//       console.log('===============')

//       try {
//         parsedMessage = JSON.parse(rawMsg);

//         // If it's a single error message without an errors array, wrap it appropriately.
//         if (!parsedMessage.errors && parsedMessage.message !== undefined) {
//           parsedMessage = {
//             channelId: parsedMessage.channelId,
//             type: parsedMessage.type,
//             errors: [
//               {
//                 message: parsedMessage.message,
//                 stack: parsedMessage.stack,
//                 readableMessage: parsedMessage.readableMessage
//               },
//             ],
//             timestamp: parsedMessage.timestamp,
//           } as ProcessedError;
//         }
//       } catch (parseError) {
//         console.error("Failed to parse message:", parseError);
//         await replySocket.send(
//           JSON.stringify({ status: "error", message: "Invalid message format" })
//         );
//         continue;
//       }

//       if (!parsedMessage || !parsedMessage.channelId || !parsedMessage.errors) {
//         console.warn("Invalid message format");
//         await replySocket.send(
//           JSON.stringify({ status: "error", message: "Invalid message format" })
//         );
//         continue;
//       }

//       // Create a human-readable summary of errors using the enriched readableMessage.
//       const errorSummary = parsedMessage.errors
//         .map((err: ErrorObject, index: number) => {
//           // Prefer the enriched readableMessage, fall back to the original message.
//           const message = err.readableMessage || err.message || "N/A";
//           return `  ${index + 1}. ${message}`;
//         })
//         .join("\n");

//       // Format the current timestamp. If parsedMessage.timestamp exists, use it.
//       const formattedTime = parsedMessage.timestamp 
//         ? new Date(parsedMessage.timestamp).toLocaleString()
//         : new Date().toLocaleString();

//       // Compute overall severity using the incoming payload or fallback
//       const overallSeverity =
//         parsedMessage.priority || computeOverallSeverity(parsedMessage.errors);

//       // Build an aesthetically enhanced error report. (Channel name removed)
//       const formattedMessage = `🎉 *Error Report Accepted!* 🎉

// ------------------------------------------
// Type            : ${parsedMessage.type}
// Time            : ${formattedTime}
// Overall Severity: ${overallSeverity}
// ------------------------------------------
// Errors:
// ${errorSummary}
// ------------------------------------------`;

//       const telexPayload = {
//         event_name: "Code Error Monitor Agent",
//         message: formattedMessage,
//         status: "success",
//         username: "Code Error Agent",
//       };

//       try {
//         const response = await axios.post(
//           `${webhookUrl}/${parsedMessage.channelId}`,
//           telexPayload,
//           {
//             headers: {
//               "Content-Type": "application/json",
//               "User-Agent": "Code Error Agent/1.0.0",
//             },
//           }
//         );

//         console.log("Webhook response data:", response?.data);
//         await replySocket.send(JSON.stringify({ status: "success" }));
//       } catch (webhookError) {
//         console.error("Failed to send to webhook:", webhookError);
//         await replySocket.send(
//           JSON.stringify({
//             status: "error",
//             message: "Failed to send to webhook",
//           })
//         );
//       }
//     }

//     return { serverPublish };
//   } catch (error) {
//     console.error("ZeroMQ server error:", error);
//     throw error;
//   }
// }

// export const zeromqClient = initializeServer();

/**
 * live version
 */

import * as zmq from "zeromq";
import axios from "axios";
import { ProcessedError } from "../controllers/errorController";
import { ENV_CONFIG } from "../utils/envConfig";
import { categorizeError } from "../services/categorizationService"; // Importing for fallback severity computation

// Define an interface for the error object structure
interface ErrorObject {
  message?: string;
  stack?: string;
  readableMessage?: string;
}

const webhookUrl = "https://ping.telex.im/v1/webhooks";

/**
 * Determines the overall severity based on the errors of the report.
 * It uses the same categorization logic as in errorController.
 */
function computeOverallSeverity(errors: ErrorObject[]): string {
  return errors
    .map((err) => categorizeError(err.message || ""))
    .reduce((prev, current) =>
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
    // Use the port and configuration from the live version
    const zeroMqBindHost = "0.0.0.0";
    const zeroMqBindPortPublish = ENV_CONFIG.PORT + 1;
    const zeroMqBindPortReply = zeroMqBindPortPublish + 1;
    await replySocket.bind(`tcp://${zeroMqBindHost}:${zeroMqBindPortReply}`);
    await publishSocket.bind(
      `tcp://${zeroMqBindHost}:${zeroMqBindPortPublish}`
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
      console.log("Received:", rawMsg);

      try {
        parsedMessage = JSON.parse(rawMsg);
        // If it's a single error message without an errors array, wrap it appropriately.
        if (!parsedMessage.errors && parsedMessage.message !== undefined) {
          parsedMessage = {
            channelId: parsedMessage.channelId,
            type: parsedMessage.type,
            errors: [
              {
                message: parsedMessage.message,
                stack: parsedMessage.stack,
                readableMessage: parsedMessage.readableMessage
              },
            ],
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

      // Create a human-readable summary of errors using the enriched readableMessage.
      const errorSummary = parsedMessage.errors
        .map((err: ErrorObject, index: number) => {
          // Prefer the enriched readableMessage, fall back to the original message.
          const message = err.readableMessage || err.message || "N/A";
          return `  ${index + 1}. ${message}`;
        })
        .join("\n");

      // Format the current timestamp. If parsedMessage.timestamp exists, use it.
      const formattedTime = parsedMessage.timestamp 
        ? new Date(parsedMessage.timestamp).toLocaleString()
        : new Date().toLocaleString();

      // Compute overall severity using the incoming payload or fallback
      const overallSeverity =
        parsedMessage.priority || computeOverallSeverity(parsedMessage.errors);

      // Build an aesthetically enhanced error report. (Channel name removed)
      const formattedMessage = `🎉 *Error Report Accepted!* 🎉

------------------------------------------
Type            : ${parsedMessage.type}
Time            : ${formattedTime}
Overall Severity: ${overallSeverity}
------------------------------------------
Errors:
${errorSummary}
------------------------------------------`;

      const telexPayload = {
        event_name: "Code Error Monitor Agent",
        message: formattedMessage,
        status: "success",
        username: "Code Error Agent",
      };

      try {
        const response = await axios.post(
          `${webhookUrl}/${parsedMessage.channelId}`,
          telexPayload,
          {
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Code Error Agent/1.0.0",
            },
          }
        );

        console.log("Webhook response data:", response?.data);
        await replySocket.send(JSON.stringify({ status: "success" }));
      } catch (webhookError) {
        console.error("Failed to send to webhook:", webhookError);
        await replySocket.send(
          JSON.stringify({
            status: "error",
            message: "Failed to send to webhook",
          })
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
