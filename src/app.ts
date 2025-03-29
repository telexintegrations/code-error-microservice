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

app.use(
  cors({
    origin: "https://telex.im",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

// Export the CORS options for use in other parts of the application

app.use(cors());
app.use("/api", errorRoutes);
app.use(integrationRoutes);
app.use(tickRoute);

app.get("/health", (_req, res) => {
  res.json({ status: "running", timestamp: new Date().toISOString() });
});

export default app;
