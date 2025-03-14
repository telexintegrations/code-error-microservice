import * as zmq from "zeromq";
import {
  getLastProcessedError,
  ProcessedError,
} from "../controllers/errorController";
import axios from "axios";

const webhookUrl = "https://ping.telex.im/v1/webhooks";

// Initialize ZeroMQ sockets for server
async function initializeServer() {
  const replySocket = new zmq.Reply();
  const publishSocket = new zmq.Publisher();

  try {
    // Bind both sockets to different ports
    await replySocket.bind("tcp://0.0.0.0:3030");
    await publishSocket.bind("tcp://0.0.0.0:3031");
    console.log("ZeroMQ server bound to ports 3030 (Reply) and 3031 (Publish)");

    // Function to publish messages from server
    const serverPublish = async (message: string) => {
      await publishSocket.send(["update", message]); // 'update' is the topic
      console.log("Server published:", message);
    };

    // Handle incoming messages
    for await (const [msg] of replySocket) {
      let parsedMessage;
      console.log("Received:", msg.toString());

      try {
        parsedMessage = JSON.parse(msg.toString()) as unknown as ProcessedError;
      } catch (error) {
        parsedMessage = msg.toString() as unknown as ProcessedError;
      }

      const refinedError: ProcessedError | null = parsedMessage;
      if (!refinedError) {
        console.warn("No processed error available for reporting.");
        continue;
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
        event_name: "Code Error Monitor Agent",
        message: message,
        status: "success",
        username: "Agent Sapa",
      };

      const response = await axios.post(
        `${webhookUrl}/${refinedError.channelId}`,
        telexPayload,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Code Error Agent/1.0.0",
          },
        }
      );

      console.log('response data', response?.data);

      // send a success response to the client
    await replySocket.send(JSON.stringify({ status: "success" }));
    }

    return { serverPublish };
  } catch (error) {
    console.error("ZeroMQ server error:", error);
    throw error;
  }
}
export const zeromqClient = initializeServer();
