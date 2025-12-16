import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    whatsappNumber: { type: String, unique: true },
    gmail: { type: String, default: null },
    accessToken: { type: String, default: null },
    refreshToken: { type: String, default: null },
    filters: { type: Array, default: [] },
    gmailConnected: { type: Boolean, default: false },
    conversationState: {
        step: { type: String, default: null },
        emailDraft: {
          to: { type: String, default: "" },
          subject: { type: String, default: "" },
          body: { type: String, default: "" }
        }
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
