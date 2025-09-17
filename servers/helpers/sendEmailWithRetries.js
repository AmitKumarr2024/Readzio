import mongoose from "mongoose";
import transporter from "../../servers/config/nodeMailer.js";
import EmailLog from "../../servers/Models/EmailLog.js";
import Bounce from "../../servers/Models/BounceModel.js";
import { AppError } from "../../servers/Utils/AppError.js";

// Defines valid email types for sending emails
const VALID_EMAIL_TYPES = [
  "signup",
  "payout",
  "subscription",
  "contact_reply",
  "report",
  "daily_digest",
];

// Sends an email with retry logic, logs, and bounce handling
export const sendEmailWithRetries = async (
  mailOption,
  userId,
  type,
  maxAttempts = 3
) => {
  try {
    // === Input validation ===
    if (!mailOption || typeof mailOption !== "object" || !mailOption.to) {
      throw new AppError("Invalid mail options", 400, "SendEmailWithRetries");
    }
    if (!VALID_EMAIL_TYPES.includes(type)) {
      throw new AppError(
        `Invalid email type: ${type}`,
        400,
        "SendEmailWithRetries"
      );
    }
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError("Invalid user ID", 400, "SendEmailWithRetries");
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
      throw new AppError("Invalid maxAttempts", 400, "SendEmailWithRetries");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailOption.to)) {
      throw new AppError(
        "Invalid recipient email",
        400,
        "SendEmailWithRetries"
      );
    }

    const email = mailOption.to.toLowerCase();

    // === Check if email is already bounced ===
    const bounced = await Bounce.findOne({ email });
    if (bounced) {
      throw new AppError(
        `Email previously bounced: ${email}`,
        400,
        "SendEmailWithRetries"
      );
    }

    let attempts = 0;
    let lastError = null;

    // === Create or update EmailLog ===
    const log = await EmailLog.findOneAndUpdate(
      { email, type, userId: userId || null },
      {
        $setOnInsert: {
          email,
          type,
          userId: userId || null,
          emailStatus: "pending",
        },
      },
      { upsert: true, new: true }
    );

    // === Try sending with retries ===
    while (attempts < maxAttempts && !log.stopEmailAttempts) {
      try {
        attempts++;
        await transporter.sendMail(mailOption);

        await EmailLog.findByIdAndUpdate(log._id, {
          emailStatus: "sent",
          emailAttempts: attempts,
          emailLastError: null,
          updatedAt: new Date(),
        });

        return { success: true, attempts };
      } catch (error) {
        lastError = error;

        await EmailLog.findByIdAndUpdate(log._id, {
          emailAttempts: attempts,
          emailLastError: error.message,
          updatedAt: new Date(),
        });

        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    // === Mark as failed after retries ===
    await EmailLog.findByIdAndUpdate(log._id, {
      emailStatus: "failed",
      emailAttempts: attempts,
      emailLastError: lastError?.message || "Unknown error",
      stopEmailAttempts: true,
      updatedAt: new Date(),
    });

    // === Add to Bounce list ===
    await Bounce.create({
      email,
      error: lastError?.message || "Unknown error",
      status: "permanent",
    });

    throw new AppError(
      `Email permanently failed: ${email}`,
      500,
      "SendEmailWithRetries",
      lastError?.message || "Unknown error"
    );
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError(error.message || "Failed to send email", 500);
  }
};
