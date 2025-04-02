import { config } from "dotenv";

config();

export const ENV_CONFIG = {
  PORT: process.env.PORT || 4000,
  SERVER_URL: process.env.SERVER_URL || "http://localhost:4000",
  AI_SERVER_URL: process.env.AI_SERVER_URL || "http://localhost:4111",
  MASTRA_PORT: process.env.MASTRA_PORT || 4111,
  WEBHOOK_URL: process.env.WEBHOOK_URL || "https://ping.telex.im/v1/webhooks",
  WEBHOOK_TARGET_URL:
    process.env.WEBHOOK_TARGET_URL ||
    "https://e72c-102-89-46-116.ngrok-free.app/webhook",
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
};
