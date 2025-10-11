import nodemailer from "nodemailer";
import { google } from "googleapis";
import {
  SENDER_EMAIL,
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
} from "../config/dotenv.js";

// OAuth2 client
const oAuth2Client = new google.auth.OAuth2(
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  "https://readzio.com/api/email/oauth/callback" // redirect URI you added
);

oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: SENDER_EMAIL,
    clientId: GMAIL_CLIENT_ID,
    clientSecret: GMAIL_CLIENT_SECRET,
    refreshToken: GMAIL_REFRESH_TOKEN,
    accessToken: async () => {
      const { token } = await oAuth2Client.getAccessToken();
      return token;
    },
  },
});

transporter.verify((error, success) => {
  if (error)
    console.error("❌ Email service connection failed:", error.message);
  else console.log("✅ Email service is ready to send messages!");
});

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: `"Readzio" <${SENDER_EMAIL}>`,
      to,
      subject,
      text,
      html,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Email sent successfully:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
    return { success: false, error: error.message };
  }
};
