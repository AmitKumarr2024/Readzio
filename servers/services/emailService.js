// services/emailService.js
import nodemailer from "nodemailer";
import { SENDER_EMAIL, SMTP_USER, SMTP_PASS } from "../config/dotenv.js";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email service connection failed:", error.message);
  } else {
    console.log("✅ Email service is ready to send messages!");
  }
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
