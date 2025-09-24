import Resend from "@resendlabs/resend";
import { RESEND_API_KEY, SENDER_EMAIL } from "./dotenv";

if (!RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY is required in .env");
}
if (!SENDER_EMAIL) {
  throw new Error("SENDER_EMAIL is required in .env");
}

const resend = new Resend(RESEND_API_KEY);

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
