import app from "./app";
import axios from "axios"
import "./services/zeromqService";

const PORT = process.env.PORT || 4000;

// const keepRenderAwake = () => {
//     setInterval(async () => {
//       try {
//         const response = await axios.get(RENDER_HEALTH_CHECK_URL);
//        console.log(`✅ Render Ping Successful: ${response.status} ${response.statusText}`);
//       } catch (error: unknown) {
//         if (error instanceof Error) {
//             console.log(`❌ Render Ping Failed: ${error.message}`);
//         } else {
//             console.log("❌ Render Ping Failed: Unknown error");
//         }
//       }
//     }, 300000); // 5 minutes
//   };


app.listen(PORT, () => {
  console.log(`Microservice running on port ${PORT}`);
});
