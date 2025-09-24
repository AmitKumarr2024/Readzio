import { Resend } from "resend";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file directly
const envPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(envPath)) {
  console.log(`📄 Loading .env from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(
    "🌐 No .env found, relying on host-provided environment variables"
  );
}

// Fetch environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

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
      throw new Error(
        "Email functionality disabled - check RESEND_API_KEY and SENDER_EMAIL configuration"
      );
    }

    const response = await resend.emails.send({
      from: SENDER_EMAIL,
      to,
      subject,
      html,
    });
    console.log("Raw Resend response:", response);

    if (response.error) {
      throw new Error(response.error.message || "Resend API error");
    }

    if (!response.data?.id) {
      throw new Error("No email ID returned from Resend");
    }

    console.log(`✅ Email sent via Resend to ${to}, id: ${response.data.id}`);
    return { id: response.data.id, success: true };
  } catch (err) {
    console.error(`❌ Resend email error for ${mailOptions.to}:`, err);
    throw err; // Throw error to be caught by caller
  }
}
