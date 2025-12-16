import dotenv from "dotenv";
import { sendWhatsAppMessage } from "../services/whatsappService.js";
import { handleEmailConversation, startEmailConversation } from "../services/emailConversationService.js";
import User from "../models/User.js";
dotenv.config();

export const verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  console.log(req.query)

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token && mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook Verified");
    return res.status(200).send(challenge);
  } else {
    console.log("Webhook Verification Failed");
    return res.sendStatus(403);
  }
};


export const receiveMessage = async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (message) {
      const from = message.from;
      const text = message.text?.body?.toLowerCase().trim();

      console.log("Incoming message:", text);

      // Fetch user from database
      let user = await User.findOne({ whatsappNumber: from });
      
      // If user doesn't exist, create one
      if (!user) {
        user = await User.create({ whatsappNumber: from });
      }

      // Check if user is in a conversation flow
      if (user.conversationState?.step !== null && user.conversationState?.step !== undefined) {
        await handleEmailConversation(from, message.text?.body);
        return res.sendStatus(200);
      }

      // Handle commands
      if (text === "send email" || text === "/send" || text === "send") {
        if (!user.gmailConnected) {
          await sendWhatsAppMessage(from, "❌ Gmail not connected. Please connect your Gmail first.\n\nUse this link to connect:\n" + 
            `${process.env.BASE_URL || "http://localhost:5000"}/google/auth?wa=${from}`);
          return res.sendStatus(200);
        }
        await startEmailConversation(from);
        return res.sendStatus(200);
      }

      if (text === "help" || text === "/help") {
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
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error:", err);
    res.sendStatus(500);
  }
};

