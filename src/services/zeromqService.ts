import * as zmq from "zeromq";
import {
  ProcessedError,
} from "../controllers/errorController";
import axios from "axios";

const webhookUrl = "https://ping.telex.im/v1/webhooks";

async function initializeServer() {
  const replySocket = new zmq.Reply();
  const publishSocket = new zmq.Publisher();

  try {
    await replySocket.bind("tcp://code-error-microservice.onrender.com:3030");
    await publishSocket.bind("tcp://code-error-microservice.onrender.com:3031");
    console.log("ZeroMQ server bound to ports 3030 (Reply) and 3031 (Publish)");

    const serverPublish = async (message: string) => {
      await publishSocket.send(["update", message]);
      console.log("Server published:", message);
    };

    for await (const [msg] of replySocket) {
      let parsedMessage;
      console.log("Received:", msg.toString());

      try {
        parsedMessage = JSON.parse(msg.toString()) as unknown as ProcessedError;
      } catch (error) {
        parsedMessage = msg.toString() as unknown as ProcessedError;
        console.error("Failed to parse message:", error);
        await replySocket.send(JSON.stringify({ status: "error", message: "Invalid message format" }));
        continue;
      }
      if (!parsedMessage || !parsedMessage.channelId || !parsedMessage.errors) {
        console.warn("Invalid message format");
        await replySocket.send(JSON.stringify({ status: "error", message: "Invalid message format" }));
        continue;
      }

      const errorSummary = parsedMessage.errors.map(err => ({
        message: err.message,
        stack: err.stack
      }));

      const message = `      
      Errors:
        ${errorSummary.map((err, index) => `
        Error ${index + 1}:
        Message: ${err.message}
        Stack: ${err.stack}
        `).join('\n')}
        `.trim();

      const telexPayload = {
        event_name: "Code Error Monitor Agent",
        message: message,
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

        console.log("response data", response?.data);
        await replySocket.send(JSON.stringify({ status: "success" }));
      } catch (error) {
        console.error("Failed to send to webhook:", error);
        await replySocket.send(JSON.stringify({ status: "error", message: "Failed to send to webhook" }));
      }
    }

    return { serverPublish };
  } catch (error) {
    console.error("ZeroMQ server error:", error);
    throw error;
  }      

}

export const zeromqClient = initializeServer();