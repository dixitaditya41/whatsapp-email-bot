import User from "../models/User.js";
import { sendWhatsAppMessage } from "./whatsappService.js";
import { sendEmailThroughGmail } from "./gmailSendService.js";

export const startEmailConversation = async (waNumber) => {
    await User.findOneAndUpdate(
        { whatsappNumber: waNumber },
        {
            conversationState: {
                step: "ask_to",
                emailDraft: { to: "", subject: "", body: "" }
            }
        }
    );

    await sendWhatsAppMessage(waNumber, "📨 To whom do you want to send the email?\nEnter the receiver email address:");
};

export const handleEmailConversation = async (waNumber, message) => {
    const user = await User.findOne({ whatsappNumber: waNumber });
    const state = user.conversationState;

    switch (state.step) {

        case "ask_to":
            await saveToField(waNumber, "to", message);
            await askSubject(waNumber);
            break;

        case "ask_subject":
            await saveToField(waNumber, "subject", message);
            await askBody(waNumber);
            break;

        case "ask_body":
            await saveToField(waNumber, "body", message);
            await showPreview(waNumber);    
            break;

        case "preview":
            await handlePreviewSelection(waNumber, message);
            break;

        case "edit_to":
            await saveToField(waNumber, "to", message);
            await showPreview(waNumber);
            break;

        case "edit_subject":
            await saveToField(waNumber, "subject", message);
            await showPreview(waNumber);
            break;

        case "edit_body":
            await saveToField(waNumber, "body", message);
            await showPreview(waNumber);
            break;
    }
};

const saveToField = async (waNumber, field, value) => {
    const user = await User.findOne({ whatsappNumber: waNumber });

    user.conversationState.emailDraft[field] = value;
    await user.save();
};

const askSubject = async (waNumber) => {
    await User.findOneAndUpdate(
        { whatsappNumber: waNumber },
        { "conversationState.step": "ask_subject" }
    );

    await sendWhatsAppMessage(waNumber, "✏️ Enter subject:");
};

const askBody = async (waNumber) => {
    await User.findOneAndUpdate(
        { whatsappNumber: waNumber },
        { "conversationState.step": "ask_body" }
    );

    await sendWhatsAppMessage(waNumber, "📝 Enter the body of the email:");
};

const showPreview = async (waNumber) => {
    const user = await User.findOne({ whatsappNumber: waNumber });
    const { to, subject, body } = user.conversationState.emailDraft;

    const preview = `
  📨 *Email Preview*
  To: ${to}
  Subject: ${subject}
  Body:
  ${body}
  
  Reply with:
  1 → Send
  2 → Edit To
  3 → Edit Subject
  4 → Edit Body
  5 → Cancel
  `;

    await User.findOneAndUpdate(
        { whatsappNumber: waNumber },
        { "conversationState.step": "preview" }
    );

    await sendWhatsAppMessage(waNumber, preview);
};

const handlePreviewSelection = async (waNumber, message) => {
    if (message === "1") {
      return finalizeSend(waNumber);
    }
    if (message === "2") {
      return enterEditMode(waNumber, "to", "Enter new receiver email:");
    }
    if (message === "3") {
      return enterEditMode(waNumber, "subject", "Enter new subject:");
    }
    if (message === "4") {
      return enterEditMode(waNumber, "body", "Enter new body:");
    }
    if (message === "5") {
      return cancelEmail(waNumber);
    }
  
    await sendWhatsAppMessage(waNumber, "Invalid choice. Please send 1,2,3,4 or 5.");
  };
  
  const finalizeSend = async (waNumber) => {
    const user = await User.findOne({ whatsappNumber: waNumber });
    const draft = user.conversationState.emailDraft;
  
    await sendEmailThroughGmail(user, draft);
  
    await sendWhatsAppMessage(waNumber, "📧 Email sent successfully!");
  
    await resetConversation(waNumber);
  };

  const resetConversation = async (waNumber) => {
    await User.findOneAndUpdate(
      { whatsappNumber: waNumber },
      { conversationState: { step: null, emailDraft: { to: "", subject: "", body: "" } } }
    );
  };

  const enterEditMode = async (waNumber, field, prompt) => {
    await User.findOneAndUpdate(
      { whatsappNumber: waNumber },
      { "conversationState.step": `edit_${field}` }
    );
    await sendWhatsAppMessage(waNumber, prompt);
  };

  const cancelEmail = async (waNumber) => {
    await resetConversation(waNumber);
    await sendWhatsAppMessage(waNumber, "❌ Email cancelled.");
  };
    