import { Resend } from "resend";
import { RESEND_API_KEY, SENDER_EMAIL } from "./dotenv.js";

// Debug logging
console.log(
  "RESEND_API_KEY in sendEmail.js:",
  RESEND_API_KEY ? "✅ Loaded" : "❌ Missing"
);
console.log(
  "SENDER_EMAIL in sendEmail.js:",
  SENDER_EMAIL ? "✅ Loaded" : "❌ Missing"
);

if (!RESEND_API_KEY) {
  console.warn(
    "⚠️ RESEND_API_KEY is missing - email functionality will be disabled"
  );
}
if (!SENDER_EMAIL) {
  console.warn(
    "⚠️ SENDER_EMAIL is missing - email functionality will be disabled"
  );
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

    if (!resend || !SENDER_EMAIL) {
      console.warn(
        `⚠️ Cannot send email to ${to} - Resend not initialized or SENDER_EMAIL missing`
      );
      return {
        id: "no-resend-config",
        success: false,
        error:
          "Email functionality disabled - check RESEND_API_KEY and SENDER_EMAIL",
      };
    }

    const response = await resend.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
    });

    console.log(`✅ Email sent via Resend to ${to}, id: ${response.id}`);
    return { id: response.id, success: true };
  } catch (err) {
    console.error(`❌ Resend email error for ${mailOptions.to}:`, err);
    return { id: "error", success: false, error: err.message };
  }
}
