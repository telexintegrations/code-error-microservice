import { config } from "dotenv";

config();

export const ENV_CONFIG = {
  PORT: Number(process.env.PORT || 4000),
  SERVER_URL: process.env.SERVER_URL || "http://localhost:4000",
};
