import dotenv from "dotenv";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { handleEmailConversation, startEmailConversation } from "../services/emailConversationService.js";
import User from "../models/User.js";
dotenv.config();

export const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  // Log all request details for debugging
  console.log("🔍 Webhook verification request received");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Query params:", JSON.stringify(req.query, null, 2));
  console.log("VERIFY_TOKEN from env:", VERIFY_TOKEN ? "✅ Set" : "❌ NOT SET");

  // Check both query params and body (some proxies might put them in body)
  const mode = req.query["hub.mode"] || req.body?.["hub.mode"];
  const token = req.query["hub.verify_token"] || req.body?.["hub.verify_token"];
  const challenge = req.query["hub.challenge"] || req.body?.["hub.challenge"];

  console.log("Mode:", mode);
  console.log("Token received:", token ? "***" + token.slice(-4) : "none");
  console.log("Token match:", token === VERIFY_TOKEN);
  console.log("Challenge:", challenge ? challenge.substring(0, 20) + "..." : "none");

  // If no VERIFY_TOKEN is set, we can't verify
  if (!VERIFY_TOKEN) {
    console.error("❌ WHATSAPP_VERIFY_TOKEN is not set in environment variables!");
    return res.status(500).send("Server configuration error: VERIFY_TOKEN not set");
  }

  // If this is just a health check or empty request, return 200 but log it
  if (!mode && !token && !challenge) {
    console.log("ℹ️  Webhook endpoint accessed without verification parameters (might be health check)");
    return res.status(200).send("Webhook endpoint is active. Waiting for verification request.");
  }

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook Verified Successfully!");
    return res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook Verification Failed");
    console.log("Expected mode: 'subscribe', got:", mode);
    console.log("Expected token:", VERIFY_TOKEN ? "***" + VERIFY_TOKEN.slice(-4) : "NOT SET");
    console.log("Received token:", token ? "***" + token.slice(-4) : "none");
    return res.sendStatus(403);
  }
};


export const receiveMessage = async (req, res) => {
  try {
    // Log the incoming webhook payload for debugging
    console.log("📨 Webhook POST received");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    // Handle webhook verification (if it comes as POST)
    if (req.body["hub.mode"] || req.query["hub.mode"]) {
      return verifyWebhook(req, res);
    }

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // Also check for status updates (not messages)
    if (value?.statuses) {
      console.log("Status update received:", value.statuses);
      return res.sendStatus(200);
    }

    if (!message) {
      console.log("No message found in webhook payload");
      return res.sendStatus(200);
    }

    const from = message.from;
    const text = message.text?.body;
    const messageType = message.type;

    console.log("Incoming message from:", from);
    console.log("Message type:", messageType);
    console.log("Message text:", text);

    if (messageType !== "text") {
      console.log("Non-text message received, ignoring");
      return res.sendStatus(200);
    }

    const textLower = text?.toLowerCase().trim();

    // Fetch user from database
    let user = await User.findOne({ whatsappNumber: from });

    // If user doesn't exist, create one
    if (!user) {
      console.log("Creating new user for:", from);
      user = await User.create({ whatsappNumber: from });
    }

    // Check if user is in a conversation flow
    if (user.conversationState?.step !== null && user.conversationState?.step !== undefined) {
      console.log("User in conversation flow, step:", user.conversationState.step);
      await handleEmailConversation(from, text);
      return res.sendStatus(200);
    }

    // Handle commands
    if (textLower === "send email" || textLower === "/send" || textLower === "send") {
      if (!user.gmailConnected) {
        await sendWhatsAppMessage(from, "❌ Gmail not connected. Please connect your Gmail first.\n\nUse this link to connect:\n" +
          `${process.env.BASE_URL || "http://localhost:5000"}/google/auth?wa=${from}`);
        return res.sendStatus(200);
      }
      await startEmailConversation(from);
      return res.sendStatus(200);
    }

    if (textLower === "help" || textLower === "/help") {
      const helpText = `📱 *WhatsApp Email Bot Commands:*
        
🔗 *Connect Gmail:*
Visit: ${process.env.BASE_URL || "http://localhost:3000"}/google/auth?wa=${from}

📨 *Send Email:*
Type: send email

❓ *Help:*
Type: help

More features coming soon!`;
      await sendWhatsAppMessage(from, helpText);
      return res.sendStatus(200);
    }

    // fallback reply
    await sendWhatsAppMessage(from, "❓ Command not recognized.\n\nType 'help' for available commands.");
    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Error in receiveMessage:", err);
    console.error("Error stack:", err.stack);
    if (err.response) {
      console.error("Error response data:", err.response.data);
    }
    // Always return 200 to prevent WhatsApp from retrying
    return res.sendStatus(200);
  }
};

