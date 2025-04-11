import { config } from "dotenv";

config();

export const ENV_CONFIG = {
  PORT: process.env.PORT || 4000,
  SERVER_URL: process.env.SERVER_URL || "http://localhost:4000",
  WEBHOOK_URL: process.env.WEBHOOK_URL || "https://ping.telex.im/v1/webhooks",
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY || "",
};
