import { google } from "googleapis";
import { oauth2Client } from "../config/google.js";
import User from "../models/User.js";

export const sendEmailThroughGmail = async (user, { to, subject, body }) => {
  try {
    oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const rawEmail = createRawEmail(user.gmail, to, subject, body);

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawEmail
      }
    });
  } catch (error) {
    // If token expired, try to refresh
    if (error.code === 401) {
      await refreshUserToken(user.whatsappNumber);
      // Retry with new token
      const updatedUser = await User.findOne({ whatsappNumber: user.whatsappNumber });
      oauth2Client.setCredentials({
        access_token: updatedUser.accessToken,
        refresh_token: updatedUser.refreshToken
      });
      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      const rawEmail = createRawEmail(updatedUser.gmail, to, subject, body);
      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: rawEmail
        }
      });
    } else {
      throw error;
    }
  }
};

const refreshUserToken = async (waNumber) => {
  const user = await User.findOne({ whatsappNumber: waNumber });
  if (!user.refreshToken) {
    throw new Error("No refresh token available");
  }

  oauth2Client.setCredentials({
    refresh_token: user.refreshToken
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  
  await User.findOneAndUpdate(
    { whatsappNumber: waNumber },
    {
      accessToken: credentials.access_token,
      refreshToken: credentials.refresh_token || user.refreshToken
    }
  );
};

const createRawEmail = (from, to, subject, message) => {
    const emailLines = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "",
      message,
    ];
  
    const email = emailLines.join("\n");
  
    return Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };
  