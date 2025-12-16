import express from "express";
import { verifyWebhook, receiveMessage } from "../controllers/whatsappController.js";
const router = express.Router();

router.get("/webhook", verifyWebhook);
router.post("/webhook", receiveMessage);

export default router;
