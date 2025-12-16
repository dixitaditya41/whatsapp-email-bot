import { oauth2Client } from "../config/google.js";
import User from "../models/User.js";
import { google } from "googleapis";
import { sendWhatsAppMessage } from "../services/whatsappService.js";

export const googleLogin = (req, res) => {
  const waNumber = req.query.wa;

  if (!waNumber) {
    return res.status(400).send("whatsapp number missing");
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send"
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    state: waNumber
  });

  res.redirect(url);
};

export const googleCallback = async (req, res) => {
    try {
      const code = req.query.code;
      const waNumber = req.query.state;
  
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
  
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  
      // Get user email
      const profile = await gmail.users.getProfile({ userId: "me" });
      const email = profile.data.emailAddress;
  
      // Start watching this user’s Gmail inbox
      await gmail.users.watch({
        userId: "me",
        requestBody: {
          labelIds: ["INBOX"],
          topicName: process.env.GMAIL_PUBSUB_TOPIC
        }
      });
  
      // Save user info to DB
      await User.findOneAndUpdate(
        { whatsappNumber: waNumber },
        {
          gmail: email,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          gmailConnected: true
        },
        { upsert: true }
      );
  
      // Send WhatsApp confirmation
      await sendWhatsAppMessage(
        waNumber,
        `🎉 Gmail connected successfully!\nYour email: ${email}`
      );
  
      res.send("Gmail connected successfully! You can close this tab.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Error connecting Gmail");
    }
  };

// Webhook endpoint for Gmail Pub/Sub notifications
export const gmailWebhook = async (req, res) => {
  try {
    // Verify the request is from Google Pub/Sub
    const signature = req.get("X-Goog-Channel-Token");
    if (signature !== process.env.GMAIL_WEBHOOK_SECRET) {
      console.log("Invalid webhook signature");
      return res.sendStatus(403);
    }

    // Handle Pub/Sub message
    const message = req.body.message;
    if (!message) {
      return res.sendStatus(200);
    }

    // Decode the base64 data
    const data = JSON.parse(Buffer.from(message.data, "base64").toString());
    const emailAddress = data.emailAddress;
    const historyId = data.historyId;

    console.log(`New email notification for: ${emailAddress}, historyId: ${historyId}`);

    // Find user by email
    const user = await User.findOne({ gmail: emailAddress });
    if (!user || !user.gmailConnected) {
      console.log("User not found or Gmail not connected");
      return res.sendStatus(200);
    }

    // Fetch new emails
    await fetchAndSendNewEmails(user, historyId);

    res.sendStatus(200);
  } catch (error) {
    console.error("Error processing Gmail webhook:", error);
    res.sendStatus(200); // Return 200 to prevent retries for transient errors
  }
};

// Fetch new emails and send to WhatsApp
const fetchAndSendNewEmails = async (user, historyId) => {
  try {
    const { oauth2Client } = await import("../config/google.js");

    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Get history to find new messages
    const history = await gmail.users.history.list({
      userId: "me",
      startHistoryId: historyId,
      historyTypes: ["messageAdded"]
    });

    if (!history.data.history || history.data.history.length === 0) {
      return;
    }

    // Get message IDs from history
    const messageIds = [];
    history.data.history.forEach((h) => {
      if (h.messagesAdded) {
        h.messagesAdded.forEach((m) => {
          if (m.message) {
            messageIds.push(m.message.id);
          }
        });
      }
    });

    // Fetch and process each new email
    for (const messageId of messageIds) {
      try {
        const message = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full"
        });

        const headers = message.data.payload.headers;
        const from = headers.find((h) => h.name === "From")?.value || "Unknown";
        const subject = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
        const date = headers.find((h) => h.name === "Date")?.value || "";

        // Get email body (simplified - handles text/plain only)
        let body = "";
        if (message.data.payload.body?.data) {
          body = Buffer.from(message.data.payload.body.data, "base64").toString();
        } else if (message.data.payload.parts) {
          const textPart = message.data.payload.parts.find(
            (p) => p.mimeType === "text/plain"
          );
          if (textPart?.body?.data) {
            body = Buffer.from(textPart.body.data, "base64").toString();
          }
        }

        // Truncate body for WhatsApp (max ~4096 chars)
        const bodyPreview = body.length > 500 ? body.substring(0, 500) + "..." : body;

        // Send to WhatsApp
        const emailNotification = `📧 *New Email Received*

From: ${from}
Subject: ${subject}
Date: ${date}

${bodyPreview}

_Reply to this message to respond (coming soon)_`;

        await sendWhatsAppMessage(user.whatsappNumber, emailNotification);
      } catch (err) {
        console.error(`Error processing message ${messageId}:`, err);
      }
    }
  } catch (error) {
    console.error("Error fetching new emails:", error);
    // Try to refresh token if expired
    if (error.code === 401) {
      // Token refresh logic would go here
      console.log("Token expired, need to refresh");
    }
  }
};
  
  