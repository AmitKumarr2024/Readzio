// sendEmailWithRetries.js
import mongoose from "mongoose";
import transporter from "../../servers/config/nodeMailer.js";
import EmailLog from "../../servers/Models/EmailLog.js";
import { AppError } from "../../servers/Utils/AppError.js";
import {
  classifyBounce,
  extractSmtpCode,
} from "../../servers/Utils/bounceClassifier.js";

// Defines valid email types for sending emails
const VALID_EMAIL_TYPES = [
  "signup",
  "payout",
  "subscription",
  "contact_reply",
  "report",
  "daily_digest",
];

// Sends an email with retry logic and logs the attempt
export const sendEmailWithRetries = async (mailOptions, maxAttempts = 3) => {
  let attempts = 0;
  let lastError = null;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`📤 Sending email (attempt ${attempts})...`);
      const result = await transporter.sendMail(mailOptions);
      console.log("✅ Email sent:", result.messageId);
      return result;
    } catch (err) {
      lastError = err;
      console.error(`❌ Attempt ${attempts} failed:`, err.message);

      if (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 2000)); // wait 2s before retry
      }
    }
  }

  throw new Error(
    `Failed to send email after ${maxAttempts} attempts: ${lastError?.message}`
  );
};
