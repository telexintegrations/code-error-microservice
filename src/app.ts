import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import requestLogger from "./middlewares/requestLogger";
import errorRoutes from "./routes/errorRoutes";
import integrationRoutes from "./routes/integrations";
import tickRoute from "./routes/tick";
dotenv.config();

const app = express();
app.use(express.json());

// Middleware
app.use(requestLogger);

app.use(
  cors({
    origin: "https://telex.im",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(cors());  // Allow all origins during testing
// Routes
app.use("/api", errorRoutes);
app.use(integrationRoutes);
app.use(tickRoute);

// Health Check
app.get("/health", (_req, res) => {
  res.json({ status: "running", timestamp: new Date().toISOString() });
});

export default app;
