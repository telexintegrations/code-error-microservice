import app from "./app";
import axios from "axios"
import "./services/zeromqService";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Microservice running on port ${PORT}`);
});
