import express from "express";
import { handleIncomingError } from "../controllers/errorController";

const router = express.Router();

// Route to receive errors from the APM agent
router.post("/errors", handleIncomingError);

export default router;
