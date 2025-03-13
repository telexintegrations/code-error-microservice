import express from "express";
import dotenv from "dotenv";
import requestLogger from "./middlewares/requestLogger";
import errorRoutes from "./routes/errorRoutes";

dotenv.config();

const app = express();
app.use(express.json());

// Middleware
app.use(requestLogger);

// Routes
app.use("/api", errorRoutes);

// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "running", timestamp: new Date().toISOString() });
});

export default app;
