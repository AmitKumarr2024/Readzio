import { Resend } from "resend";
import { RESEND_API_KEY, SENDER_EMAIL } from "./dotenv";

// Debug logging
console.log(
  "RESEND_API_KEY in sendEmail.js:",
  RESEND_API_KEY ? "✅ Loaded" : "❌ Missing"
);

if (!RESEND_API_KEY) {
  console.warn(
    "⚠️ RESEND_API_KEY is missing - email functionality will be disabled"
  );
}
if (!SENDER_EMAIL) {
  throw new Error("SENDER_EMAIL is required in .env");
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

/**
 * Send an email via Resend
 * @param {Object} mailOptions - { to, subject, html, text }
 */
export async function sendEmail(mailOptions) {
  try {
    const { to, subject, html } = mailOptions;

    if (!to || !subject || !html) {
      throw new Error("Missing required email fields: to, subject, html");
    }

    if (!resend) {
      console.warn("⚠️ Resend not initialized - skipping email send");
      return { id: "no-resend-api-key", success: false };
    }

    const response = await resend.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent via Resend to ${to}, id: ${response.id}`);
    return response;
  } catch (err) {
    console.error("❌ Resend email error:", err);
    throw err;
  }
}
