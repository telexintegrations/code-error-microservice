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
app.use(requestLogger);

// Unified CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "development"
      ? ["http://localhost:3000"]
      : ["https://telex.im"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Length", "X-Requested-With"],
  credentials: false,
  maxAge: 3600,
};

app.use(cors(corsOptions));

// Export the CORS options for use in other parts of the application
export { corsOptions };

app.use("/api", errorRoutes);
app.use(integrationRoutes);
app.use(tickRoute);

app.get("/health", (_req, res) => {
  res.json({
    status: "running",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

export default app;
