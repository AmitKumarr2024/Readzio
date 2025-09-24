import EmailLog from "../../servers/Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Bounce from "../../servers/Models/BounceModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { sendEmail } from "../../servers/config/sendEmail.js"; // Resend-based sender
import { RESEND_API_KEY, SENDER_EMAIL } from "../../servers/config/dotenv.js";

// ✅ Do not crash app if missing, just warn
if (!RESEND_API_KEY) {
  console.warn(
    "⚠️ RESEND_API_KEY is missing - email functionality will be disabled"
  );
}
if (!SENDER_EMAIL) {
  console.warn(
    "⚠️ SENDER_EMAIL is missing - email functionality may be limited"
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
    // Check if email functionality is available
    if (!RESEND_API_KEY) {
      logWithContext(
        "DailyEmail",
        "Email functionality disabled - RESEND_API_KEY missing"
      );
      return res.status(200).json({
        message:
          "Email functionality is disabled - RESEND_API_KEY not configured",
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
        )}... | inkshaa Daily Digest`;

        const mailOption = await createMailOption({
          to: user.email,
          subject,
          name: user.name || "Reader",
          email: user.email,
          hasButton: true,
          buttonText: "Read Today's Posts",
          buttonUrl: "https://inkshaa.onrender.com/explore",
          posts,
        });

        const emailResult = await sendEmail(mailOption);

        results.push({
          email: user.email,
          success: emailResult.success !== false,
          userId: user._id,
          messageId: emailResult.id || "no-id",
        });
      } catch (error) {
        logError("DailyEmail", `Failed to send email to ${user.email}`, error);
        results.push({
          email: user.email,
          success: false,
          error: error.message,
          userId: user._id,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000)); // throttle
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

  if (!RESEND_API_KEY) {
    return res.status(503).json({
      success: false,
      message:
        "Email functionality is disabled - RESEND_API_KEY not configured",
      email,
    });
  }

  try {
    const mailOption = await createMailOption({
      to: email,
      subject: "🧪 Test Email from inkshaa",
      name: "Test User",
      message: "This is a test email to verify the system is working.",
      hasButton: true,
      buttonText: "Visit inkshaa",
      buttonUrl: "https://inkshaa.onrender.com",
    });

    const result = await sendEmail(mailOption);

    res.status(200).json({
      success: result.success !== false,
      message:
        result.success !== false
          ? "Test email sent successfully"
          : "Email sending failed",
      email,
      messageId: result.id || "no-id",
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    logError("TestEmail", "Failed to send test email", error);
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

  if (!RESEND_API_KEY) {
    return res.status(503).json({
      success: false,
      message:
        "Email functionality is disabled - RESEND_API_KEY not configured",
      email,
    });
  }

  try {
    const mailOption = await createMailOption({
      to: email,
      subject: "Message from inkshaa",
      message: "Hello world",
    });

    const result = await sendEmail(mailOption);

    res.status(200).json({
      success: result.success !== false,
      message:
        result.success !== false
          ? "Direct email sent successfully"
          : "Email sending failed",
      email,
      messageId: result.id || "no-id",
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    logError("DirectEmail", `Failed to send direct email to ${email}`, error);
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
      message: `Failures cleared for ${email}`,
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
    });
  } catch (error) {
    logError(
      "ClearEmailFailures",
      `Failed to clear failures for ${email}`,
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
            "Failed to fetch email report",
            500,
            "GetDailyPostEmailReport"
          )
    );
  }
};
