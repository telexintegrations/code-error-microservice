import app from "./app";
import "./services/zeromqService";
import { ENV_CONFIG } from "./utils/envConfig";

app.listen(ENV_CONFIG.PORT, () => {
  console.log(`Microservice running on http://localhost:${ENV_CONFIG.PORT}`);
});
