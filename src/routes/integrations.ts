import { Router, Request, Response } from "express";
import { ENV_CONFIG } from "../utils/envConfig";

const router = Router();

router.get("/integration-json", (req: Request, res: Response) => {
  const integrationData = {
    data: {
      date: {
        created_at: "2025-02-20 22:25:37",
        updated_at: "2025-02-20 22:25:37",
      },
      descriptions: {
        app_description:
          "Analyzes your codebase for static errors and reports them to Telex channels with prioritized error classification.",
        app_logo: "https://example.com/path-to-code-error-agent-logo.png",
        app_name: "Code Error Agent",
        app_url: ENV_CONFIG.SERVER_URL,
        background_color: "#FF4444",
      },
      integration_category: "AI & Machine Learning",
      integration_type: "interval",
      is_active: true,
      output: [
        {
          label: "error_notifications",
          value: true,
        },
      ],
      key_features: [
        "Static code error detection using ESLint",
        "Prioritized error classification (High, Medium, Low)",
        "Automated error reporting to Telex channels",
        "Configurable analysis intervals",
        "Integration with development pipelines",
      ],
      settings: [
        {
          label: "codeBasePath",
          type: "text",
          required: true,
          default: process.env.CODE_BASE_PATH || "./src",
        },
        {
          label: "errorThreshold",
          type: "text",
          required: true,
          default: "1",
        },
        {
          label: "interval",
          type: "text",
          required: true,
          default: "*/15 * * * *",
        },
      ],
      tick_url: `${ENV_CONFIG.SERVER_URL}/tick`,
      target_url: `${ENV_CONFIG.SERVER_URL}/webhook`,
    },
  };

  res.json(integrationData);
});

export default router;
