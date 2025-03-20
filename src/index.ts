import app from "./app";
import "./services/zeromqService";
import { ENV_CONFIG } from "./utils/envConfig";

app.listen(ENV_CONFIG.PORT, () => {
  console.log(`Microservice running on port ${ENV_CONFIG.PORT}`);
});
