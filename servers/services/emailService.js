// services/emailService.js
import fetch from "node-fetch";
import { SENDER_EMAIL, RESEND_API_KEY } from "../config/dotenv.js";
import EmailLog from "../Models/EmailLog.js";

/**
 * Send email using Resend API
 * @param {Object} params
 * @param {string} params.to - Recipient email
 * @param {string} params.subject
 * @param {string} params.html
 * @param {string} params.text
 * @param {string} params.type - Type of email for logging
 */
export const sendEmail = async ({ to, subject, html, text, type }) => {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: SENDER_EMAIL || "Readzio official",
        to,
        subject,
        html,
        text,
      }),
    });

    const data = await res.json();

    // Log email
    await EmailLog.create({
      email: to,
      type,
      emailStatus: res.ok ? "sent" : "failed",
      emailAttempts: 1,
      emailLastError: res.ok ? null : JSON.stringify(data),
      stopEmailAttempts: false,
    });

    if (!res.ok) {
      console.error("❌ Error sending email:", data);
      return { success: false, error: data };
    }

    console.log("📨 Email sent successfully:", data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error("❌ Error sending email:", error.message);

    // Log failure
    await EmailLog.create({
      email: to,
      type,
      emailStatus: "failed",
      emailAttempts: 1,
      emailLastError: error.message,
      stopEmailAttempts: false,
    });

    return { success: false, error: error.message };
  }
};
