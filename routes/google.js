import express from "express";
import { googleLogin, googleCallback, gmailWebhook } from "../controllers/googleController.js";

const router = express.Router();

router.get("/auth", googleLogin);
router.get("/callback", googleCallback);
router.post("/webhook", gmailWebhook); // Pub/Sub webhook for Gmail notifications

export default router;
