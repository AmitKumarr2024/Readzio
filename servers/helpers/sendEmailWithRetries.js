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
export const sendEmailWithRetries = async (
  mailOption,
  userId = null,
  type,
  maxAttempts = 3
) => {
  const session = await mongoose.startSession();

  try {
    // Enhanced input validation
    if (!mailOption || typeof mailOption !== "object" || !mailOption.to) {
      throw new AppError(
        "Invalid mail options",
        400,
        "SendEmailWithRetries",
        'mailOption must be a non-null object with a valid "to" field'
      );
    }
    if (!VALID_EMAIL_TYPES.includes(type)) {
      throw new AppError(
        "Invalid email type",
        400,
        "SendEmailWithRetries",
        `Type must be one of: ${VALID_EMAIL_TYPES.join(", ")}`
      );
    }
    if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError(
        "Invalid user ID",
        400,
        "SendEmailWithRetries",
        "userId must be a valid MongoDB ObjectId"
      );
    }
    if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) {
      throw new AppError(
        "Invalid max attempts",
        400,
        "SendEmailWithRetries",
        "maxAttempts must be between 1 and 5"
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mailOption.to)) {
      throw new AppError(
        "Invalid recipient email",
        400,
        "SendEmailWithRetries",
        "Recipient email must be a valid email address"
      );
    }

    const email = mailOption.to.toLowerCase().trim();

    session.startTransaction();

    // Check if email is suppressed (hard bounced before)
    const suppressedCheck = await EmailLog.findOne({
      email,
      $or: [
        { bounceType: "hard" },
        { emailStatus: "suppressed" },
        {
          bounceType: "spam",
          bounceCount: { $gte: 2 },
          suppressedAt: { $exists: true },
        },
      ],
    }).session(session);

    if (suppressedCheck) {
      await session.abortTransaction();
      throw new AppError(
        `Email delivery blocked: ${email} is suppressed`,
        400,
        "SendEmailWithRetries",
        `Reason: ${suppressedCheck.bounceType} bounce (${suppressedCheck.bounceReason})`
      );
    }

    // Check for recent soft bounces (don't retry for 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSoftBounce = await EmailLog.findOne({
      email,
      bounceType: "soft",
      lastBounceAt: { $gte: oneHourAgo },
    }).session(session);

    if (recentSoftBounce) {
      await session.abortTransaction();
      const waitUntil = new Date(
        recentSoftBounce.lastBounceAt.getTime() + 60 * 60 * 1000
      );
      throw new AppError(
        `Email temporarily blocked due to recent soft bounce`,
        429,
        "SendEmailWithRetries",
        `Try again after ${waitUntil.toISOString()}`
      );
    }

    // Creates or updates email log entry with better error handling
    const log = await EmailLog.findOneAndUpdate(
      { email, type, userId: userId || null },
      {
        $setOnInsert: {
          email,
          type,
          userId: userId || null,
          emailStatus: "pending",
          createdAt: new Date(),
        },
        $set: {
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, session }
    ).catch((error) => {
      // Handle potential duplicate key errors gracefully
      if (error.code === 11000) {
        return EmailLog.findOne({
          email,
          type,
          userId: userId || null,
        }).session(session);
      }
      throw error;
    });

    await session.commitTransaction();

    // Attempts to send email with retries
    let attempts = 0;
    let lastError = null;

    while (attempts < maxAttempts && !log.stopEmailAttempts) {
      try {
        attempts++;

        // Enhanced mail options with better headers
        const enhancedMailOption = {
          ...mailOption,
          headers: {
            ...mailOption.headers,
            "X-Priority": "3",
            "X-MSMail-Priority": "Normal",
            "X-Mailer": "Inksha Production Mailer",
            "Message-ID": `<${Date.now()}.${Math.random().toString(
              36
            )}@inksha.com>`,
          },
        };

        console.log(
          `Attempting to send email (attempt ${attempts}):`,
          enhancedMailOption
        );

        const result = await transporter.sendMail(enhancedMailOption);

        // SUCCESS - Updates log on successful send
        await EmailLog.findByIdAndUpdate(log._id, {
          emailStatus: "sent",
          emailAttempts: attempts,
          emailLastError: null,
          bounceType: null,
          bounceReason: null,
          bounceCode: null,
          messageId: result.messageId,
          sentAt: new Date(),
          updatedAt: new Date(),
        });

        console.log(`✅ Email sent successfully to ${email}:`, {
          messageId: result.messageId,
          attempts,
          type,
          userId: userId || "anonymous",
        });

        return {
          success: true,
          attempts,
          messageId: result.messageId,
          logId: log._id,
        };
      } catch (error) {
        lastError = error;

        console.error(`❌ Email attempt ${attempts} failed for ${email}:`, {
          error: error.message,
          code: error.code,
          responseCode: error.responseCode,
          response: error.response,
          command: error.command,
          stack: error.stack,
        });

        // Enhanced bounce classification
        const smtpCode =
          extractSmtpCode(error.message) || error.code || error.responseCode;
        const bounceInfo = classifyBounce(error.message, smtpCode);

        // Updates log with bounce info
        const updateData = {
          emailAttempts: attempts,
          emailLastError: error.message.substring(0, 1000), // Truncate long errors
          bounceType: bounceInfo.type,
          bounceReason: bounceInfo.reason,
          bounceCode: bounceInfo.code,
          lastBounceAt: new Date(),
          $inc: { bounceCount: 1 },
          updatedAt: new Date(),
        };

        // Handle different bounce types
        if (bounceInfo.type === "hard") {
          // Hard bounce - stop immediately and suppress
          updateData.emailStatus = "suppressed";
          updateData.stopEmailAttempts = true;
          updateData.suppressedAt = new Date();

          await EmailLog.findByIdAndUpdate(log._id, updateData);

          throw new AppError(
            `Email delivery permanently failed`,
            400,
            "SendEmailWithRetries",
            `Hard bounce detected for ${email}: ${bounceInfo.reason}`
          );
        } else if (bounceInfo.type === "spam") {
          // Spam bounce - stop after 2 attempts
          const currentBounceCount = (log.bounceCount || 0) + 1;

          if (currentBounceCount >= 2) {
            updateData.emailStatus = "suppressed";
            updateData.stopEmailAttempts = true;
            updateData.suppressedAt = new Date();

            await EmailLog.findByIdAndUpdate(log._id, updateData);

            throw new AppError(
              `Email delivery blocked due to spam classification`,
              400,
              "SendEmailWithRetries",
              `${email} marked as spam multiple times`
            );
          } else {
            updateData.emailStatus = "failed";
            await EmailLog.findByIdAndUpdate(log._id, updateData);
          }
        } else {
          // Soft bounce - continue retrying
          updateData.emailStatus = "failed";
          await EmailLog.findByIdAndUpdate(log._id, updateData);
        }

        // Enhanced exponential backoff with jitter and circuit breaker
        if (attempts < maxAttempts) {
          const baseDelay = Math.min(1000 * Math.pow(2, attempts - 1), 30000); // Max 30s
          const jitter = Math.random() * 1000; // Add randomness
          const delay = baseDelay + jitter;

          console.log(
            `⏳ Waiting ${Math.round(delay)}ms before retry ${
              attempts + 1
            }/${maxAttempts} for ${email}`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Final failure handling
    await EmailLog.findByIdAndUpdate(log._id, {
      emailStatus: "failed",
      emailAttempts: attempts,
      emailLastError: lastError?.message || "Unknown error",
      stopEmailAttempts: true,
      updatedAt: new Date(),
    });

    throw new AppError(
      "Failed to send email after maximum attempts",
      500,
      "SendEmailWithRetries",
      `${
        lastError?.message || "Unknown error during email sending"
      } (${attempts} attempts)`
    );
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    // Enhanced error logging for production debugging
    if (!(error instanceof AppError)) {
      console.error("💥 Unexpected error in sendEmailWithRetries:", {
        error: error.message,
        stack: error.stack,
        mailTo: mailOption?.to,
        type,
        userId,
      });
    }

    throw error instanceof AppError
      ? error
      : new AppError(
          error.message || "Failed to send email",
          500,
          "SendEmailWithRetries",
          "Error in sendEmailWithRetries"
        );
  } finally {
    await session.endSession();
  }
};
