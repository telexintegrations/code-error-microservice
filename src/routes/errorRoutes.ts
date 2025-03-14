import express from "express";
import { handleIncomingError } from "../controllers/errorController";

const router = express.Router();

router.post("/errors", handleIncomingError);

export default router;
