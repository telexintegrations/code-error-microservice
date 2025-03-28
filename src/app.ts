import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import requestLogger from "./middlewares/requestLogger.js";
import errorRoutes from "./routes/errorRoutes.js";
import integrationRoutes from "./routes/integrations.js";
import tickRoute from "./routes/tick.js";
dotenv.config();

const app = express();
app.use(express.json());

app.use(requestLogger);

app.use(
  cors({
    origin: "https://telex.im",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(cors());
app.use("/api", errorRoutes);
app.use(integrationRoutes);
app.use("/code-error-integration",integrationRoutes)
app.use(tickRoute);

app.get("/health", (_req, res) => {
  res.json({ status: "running", timestamp: new Date().toISOString() });
});

export default app;