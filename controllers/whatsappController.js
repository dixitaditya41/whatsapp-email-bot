import dotenv from "dotenv";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { handleEmailConversation, startEmailConversation } from "../services/emailConversationService.js";
import User from "../models/User.js";
dotenv.config();

export const verifyWebhook = async (req, res) => {
  try {
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    console.log("🔍 Verify request:", { mode, token, challenge });

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook Verified");
      return res.status(200).send(challenge); // plain text only
    }

    console.log("❌ Webhook verification failed");
    return res.sendStatus(403);

  } catch (err) {
    console.error("❌ Error in verifyWebhook:", err);
    return res.sendStatus(403);
  }
};

export const receiveMessage = async (req, res) => {
  // 1️⃣ ACK WhatsApp immediately
  res.sendStatus(200);

  try {
    console.log("📨 Webhook POST received");
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const message = value?.messages?.[0];

    // status updates
    if (value?.statuses) {
      console.log("Status update received");
      return;
    }

    if (!message) return;

    const from = message.from;
    const text = message.text?.body;
    const messageType = message.type;

    console.log("Incoming message from:", from);
    console.log("Message text:", text);

    if (messageType !== "text") return;

    const textLower = text.toLowerCase().trim();

    let user = await User.findOne({ whatsappNumber: from });
    if (!user) {
      user = await User.create({ whatsappNumber: from });
    }

    if (user.conversationState?.step) {
      await handleEmailConversation(from, text);
      return;
    }

    if (textLower === "help") {
      await sendWhatsAppMessage(from, "Type *send email* to start.");
      return;
    }

    if (textLower === "send email") {
      await sendWhatsAppMessage(from, "Email flow starting...");
      return;
    }

    await sendWhatsAppMessage(
      from,
      "❓ Command not recognized.\n\nType *help* for available commands."
    );

  } catch (err) {
    console.error("❌ Error in receiveMessage:", err.response?.data || err);
  }
};

// export const receiveMessage = async (req, res) => {
//   res.sendStatus(200); // ACK immediately
//   try {
//     // Log the incoming webhook payload for debugging
//     console.log("📨 Webhook POST received");
//     console.log("Request body:", JSON.stringify(req.body, null, 2));

//     const entry = req.body.entry?.[0];
//     const changes = entry?.changes?.[0];
//     const value = changes?.value;
//     const message = value?.messages?.[0];

//     // Also check for status updates (not messages)
//     if (value?.statuses) {
//       console.log("Status update received:", value.statuses);
//       return res.sendStatus(200);
//     }

//     if (!message) {
//       console.log("No message found in webhook payload");
//       return res.sendStatus(200);
//     }

//     const from = message.from;
//     const text = message.text?.body;
//     const messageType = message.type;

//     console.log("Incoming message from:", from);
//     console.log("Message type:", messageType);
//     console.log("Message text:", text);

//     if (messageType !== "text") {
//       console.log("Non-text message received, ignoring");
//       return res.sendStatus(200);
//     }

//     const textLower = text?.toLowerCase().trim();

//     // Fetch user from database
//     let user = await User.findOne({ whatsappNumber: from });

//     // If user doesn't exist, create one
//     if (!user) {
//       console.log("Creating new user for:", from);
//       user = await User.create({ whatsappNumber: from });
//     }

//     // Check if user is in a conversation flow
//     if (user.conversationState?.step) {
//       console.log("User in conversation, step:", user.conversationState.step);
//       await handleEmailConversation(from, text);
//       return res.sendStatus(200);
//     }

//     // Handle commands
//     if (textLower === "send email" || textLower === "/send" || textLower === "send") {
//       if (!user.gmailConnected) {
//         await sendWhatsAppMessage(from, "❌ Gmail not connected. Please connect your Gmail first.\n\nUse this link to connect:\n" +
//           `${process.env.BASE_URL || "http://localhost:3000"}/google/auth?wa=${from}`);
//         return res.sendStatus(200);
//       }
//       await startEmailConversation(from);
//       return res.sendStatus(200);
//     }

//     if (textLower === "help" || textLower === "/help") {
//       const helpText = `📱 *WhatsApp Email Bot Commands:*
        
// 🔗 *Connect Gmail:*
// Visit: ${process.env.BASE_URL || "http://localhost:3000"}/google/auth?wa=${from}

// 📨 *Send Email:*
// Type: send email

// ❓ *Help:*
// Type: help

// More features coming soon!`;
//       await sendWhatsAppMessage(from, helpText);
//       return res.sendStatus(200);
//     }

//     // fallback reply
//     await sendWhatsAppMessage(from, "❓ Command not recognized.\n\nType 'help' for available commands.");
//     return res.sendStatus(200);
//   } catch (err) {
//     console.error("❌ Error in receiveMessage:", err);
//     console.error("Error stack:", err.stack);
//     if (err.response) {
//       console.error("Error response data:", err.response.data);
//     }
//     // Always return 200 to prevent WhatsApp from retrying
//     return res.sendStatus(200);
//   }
// };

