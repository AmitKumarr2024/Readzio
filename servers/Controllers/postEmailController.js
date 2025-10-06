import EmailLog from "../../servers/Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Bounce from "../../servers/Models/BounceModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { sendEmailWithRetries } from "../../servers/helpers/sendEmailWithRetries.js";
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
  "RESEND_API_KEY in email.js:",
  RESEND_API_KEY ? "✅ Loaded" : "❌ Missing"
);
console.log(
  "SENDER_EMAIL in email.js:",
  SENDER_EMAIL ? "✅ Loaded" : "❌ Missing"
);

// Validate environment variables
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

// Logging helpers
const logWithContext = (context, message, data = {}) =>
  console.log(
    `[${new Date().toISOString()}] [${context}] ${message}`,
    JSON.stringify(data, null, 2)
  );

const logError = (context, message, error) =>
  console.error(`[${new Date().toISOString()}] [${context}] ${message}`, {
    error: error.message,
    stack: error.stack,
    details: error,
  });

// ------------------------
// Daily post emails
// ------------------------
export const sendDailyPostEmail = async (req, res, next) => {
  const startTime = Date.now();
  logWithContext("DailyEmail", "Starting daily post email process", {
    startTime,
  });

  try {
    if (!RESEND_API_KEY || !SENDER_EMAIL) {
      logWithContext(
        "DailyEmail",
        "Email functionality disabled due to missing configuration"
      );
      return res.status(503).json({
        success: false,
        message:
          "Email functionality is disabled - check RESEND_API_KEY and SENDER_EMAIL configuration",
        results: {
          total: 0,
          successful: 0,
          failed: 0,
          successRate: "0%",
        },
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: { $ne: true },
      blocked: { $ne: true },
      email: { $exists: true, $ne: null, $ne: "" },
    })
      .select("_id name email")
      .limit(50)
      .lean();

    if (users.length === 0) {
      logWithContext("DailyEmail", "No eligible users found");
      return res.status(200).json({
        success: true,
        message: "No eligible users found for daily email",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    const posts = await PostModel.find({
      isPublished: true,
      title: { $exists: true, $ne: "" },
    })
      .select(
        "title slug thumbnail author readTime likesCount commentsCount createdAt"
      )
      .populate("author", "name avatar")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (posts.length === 0) {
      logWithContext("DailyEmail", "No posts available");
      return res.status(200).json({
        success: true,
        message: "No posts available to send",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    const results = [];

    for (const user of users) {
      try {
        const subject = `${posts[0].title.substring(
          0,
          50
        )}... | readzio Daily Digest`;

        const mailOption = await createMailOption({
          to: user.email,
          subject,
          name: user.name || "Reader",
          email: user.email,
          hasButton: true,
          buttonText: "Read Today's Posts",
          buttonUrl: "https://readzio.com/explore",
          posts,
        });

        const emailResult = await sendEmailWithRetries(
          mailOption,
          user._id,
          "daily_digest",
          3
        );

        results.push({
          email: user.email,
          success: emailResult.success,
          userId: user._id,
          messageId: emailResult.id || "no-id",
          attempts: emailResult.attempts,
        });

        await EmailLog.create({
          userId: user._id,
          email: user.email,
          type: "daily_digest",
          emailStatus: "sent",
          emailAttempts: emailResult.attempts,
          messageId: emailResult.id || null,
          sentAt: new Date(),
          subject: mailOption.subject,
          from: mailOption.from,
          to: user.email,
        });
      } catch (error) {
        logError("DailyEmail", `Failed to send email to ${user.email}`, error);
        results.push({
          email: user.email,
          success: false,
          error: error.message,
          userId: user._id,
        });

        await EmailLog.create({
          userId: user._id,
          email: user.email,
          type: "daily_digest",
          emailStatus: "failed",
          emailAttempts: error.attempts || 1,
          emailLastError: error.message,
          createdAt: new Date(),
          subject:
            posts[0]?.title?.substring(0, 50) + "... | readzio Daily Digest" ||
            "N/A",
          from: SENDER_EMAIL || "N/A",
          to: user.email,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    logWithContext("DailyEmail", "Email process completed", {
      successCount,
      failedCount,
      successRate:
        results.length > 0
          ? ((successCount / results.length) * 100).toFixed(2) + "%"
          : "0%",
      processTime: Date.now() - startTime,
    });

    res.status(200).json({
      success: true,
      message: "Daily post emails processed successfully",
      results: {
        total: results.length,
        successful: successCount,
        failed: failedCount,
        successRate:
          results.length > 0
            ? ((successCount / results.length) * 100).toFixed(2) + "%"
            : "0%",
      },
      postCount: posts.length,
      processTime: Date.now() - startTime,
      details: results,
    });
  } catch (error) {
    logError("DailyEmail", "Critical error in email process", error);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to process daily post emails",
            500,
            "SendDailyPostEmail"
          )
    );
  }
};

// ------------------------
// Send test email
// ------------------------
export const testSingleEmail = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });

  if (!RESEND_API_KEY || !SENDER_EMAIL) {
    logWithContext(
      "TestEmail",
      "Email functionality disabled due to missing configuration"
    );
    return res.status(503).json({
      success: false,
      message:
        "Email functionality is disabled - check RESEND_API_KEY and SENDER_EMAIL configuration",
      email,
    });
  }

  try {
    const mailOption = await createMailOption({
      to: email,
      subject: "🧪 Test Email from readzio",
      name: "Test User",
      message: "This is a test email to verify the system is working.",
      hasButton: true,
      buttonText: "Visit readzio",
      buttonUrl: "https://readzio.com",
    });

    const emailResult = await sendEmailWithRetries(mailOption, null, "test", 3);
    console.log("Resend response:", emailResult);

    await EmailLog.create({
      userId: null,
      email,
      type: "test",
      emailStatus: "sent",
      emailAttempts: emailResult.attempts,
      messageId: emailResult.id || null,
      sentAt: new Date(),
      subject: mailOption.subject,
      from: mailOption.from,
      to: email,
    });

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      email,
      messageId: emailResult.id || "no-id",
      attempts: emailResult.attempts,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    logError("TestEmail", "Failed to send test email", error);

    await EmailLog.create({
      userId: null,
      email,
      type: "test",
      emailStatus: "failed",
      emailAttempts: error.attempts || 1,
      emailLastError: error.message,
      createdAt: new Date(),
      subject: "🧪 Test Email from readzio",
      from: SENDER_EMAIL || "N/A",
      to: email,
    });

    res.status(500).json({
      success: false,
      message: error.message || "Failed to send test email",
      email,
    });
  }
};

// ------------------------
// Send direct email
// ------------------------
export const sendDirectEmail = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });

  if (!RESEND_API_KEY || !SENDER_EMAIL) {
    logWithContext(
      "DirectEmail",
      "Email functionality disabled due to missing configuration"
    );
    return res.status(503).json({
      success: false,
      message:
        "Email functionality is disabled - check RESEND_API_KEY and SENDER_EMAIL configuration",
      email,
    });
  }

  try {
    const mailOption = await createMailOption({
      to: email,
      subject: "Message from readzio",
      message: "Hello world",
    });

    const emailResult = await sendEmailWithRetries(
      mailOption,
      null,
      "direct",
      3
    );
    console.log("Resend response:", emailResult);

    await EmailLog.create({
      userId: null,
      email,
      type: "direct",
      emailStatus: "sent",
      emailAttempts: emailResult.attempts,
      messageId: emailResult.id || null,
      sentAt: new Date(),
      subject: mailOption.subject,
      from: mailOption.from,
      to: email,
    });

    res.status(200).json({
      success: true,
      message: "Direct email sent successfully",
      email,
      messageId: emailResult.id || "no-id",
      attempts: emailResult.attempts,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    logError("DirectEmail", `Failed to send direct email to ${email}`, error);

    await EmailLog.create({
      userId: null,
      email,
      type: "direct",
      emailStatus: "failed",
      emailAttempts: error.attempts || 1,
      emailLastError: error.message,
      createdAt: new Date(),
      subject: "Message from readzio",
      from: SENDER_EMAIL || "N/A",
      to: email,
    });

    res.status(500).json({
      success: false,
      message: error.message || "Failed to send direct email",
      email,
    });
  }
};

// ------------------------
// Clear email failures
// ------------------------
export const clearEmailFailures = async (req, res) => {
  const { email } = req.body;
  if (!email)
    return res
      .status(400)
      .json({ success: false, message: "Email is required" });

  try {
    const result = await Bounce.updateOne(
      { email },
      { $set: { bounceCount: 0, status: "resolved", updatedAt: new Date() } },
      { upsert: true }
    );

    res.status(200).json({
      success: true,
      message: `Email failures cleared for ${email}`,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    });
  } catch (error) {
    logError(
      "ClearEmailFailures",
      `Failed to clear email failures for ${email}`,
      error
    );
    res.status(500).json({
      success: false,
      message: error.message || "Failed to clear email failures",
      email,
    });
  }
};

// ------------------------
// Fetch email report
// ------------------------
export const getDailyPostEmailReport = async (req, res, next) => {
  const { page = 1, limit = 20, type = "daily_digest" } = req.query;

  try {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const logs = await EmailLog.find({ type })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await EmailLog.countDocuments({ type });

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    logError("EmailReport", "Failed to fetch email report", error);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch email report",
            500,
            "GetDailyPostEmailReport"
          )
    );
  }
};
