import EmailLog from "../../servers/Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Bounce from "../../servers/Models/BounceModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { sendEmailWithRetries } from "../../servers/helpers/sendEmailWithRetries.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import transporter from "../../servers/config/nodeMailer.js";
import { SMTP_USER } from "../../servers/config/dotenv.js";

const SENDER_EMAIL = SMTP_USER;

// Utility to format logs with timestamp and context
const logWithContext = (context, message, data = {}) => {
  console.log(
    `[${new Date().toISOString()}] [${context}] ${message}`,
    JSON.stringify(data, null, 2)
  );
};

// Utility to log errors with stack trace
const logError = (context, message, error) => {
  console.error(`[${new Date().toISOString()}] [${context}] ${message}`, {
    error: error.message,
    stack: error.stack,
    details: error,
  });
};

export const sendDailyPostEmail = async (req, res, next) => {
  const startTime = Date.now();
  logWithContext("DailyEmail", "Starting daily post email process", {
    startTime,
  });

  try {
    logWithContext("DailyEmail", "Fetching eligible users");
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: { $ne: true },
      blocked: { $ne: true },
      email: { $exists: true, $ne: null, $ne: "" },
    })
      .select("_id name email")
      .limit(50)
      .lean();

    logWithContext("DailyEmail", "Users fetched", {
      userCount: users.length,
      userIds: users.map((u) => u._id),
    });

    if (users.length === 0) {
      logWithContext("DailyEmail", "No eligible users found");
      return res.status(200).json({
        message: "No eligible users found for daily email",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    logWithContext("DailyEmail", "Fetching recent posts");
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

    logWithContext("DailyEmail", "Posts fetched", {
      postCount: posts.length,
      postTitles: posts.map((p) => p.title),
    });

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
        logWithContext("DailyEmail", `Preparing email for user`, {
          userId: user._id,
          email: user.email,
        });

        const subject = `${posts[0].title.substring(
          0,
          50
        )}... | inkshaa Daily Digest`;

        const mailOption = await createMailOption({
          to: user.email,
          subject: subject,
          name: user.name || "Reader",
          email: user.email,
          hasButton: true,
          buttonText: "Read Today's Posts",
          buttonUrl: "https://inkshaa.onrender.com/explore",
          posts,
        });

        logWithContext("DailyEmail", "Mail options created", { mailOption });

        const emailResult = await sendEmailWithRetries(
          mailOption,
          user._id,
          "daily_digest",
          2
        );

        logWithContext("DailyEmail", "Email sent successfully", {
          email: user.email,
          messageId: emailResult.messageId,
        });

        results.push({
          email: user.email,
          success: true,
          userId: user._id,
          messageId: emailResult.messageId,
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

      logWithContext("DailyEmail", "Pausing before next email");
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

export const testSingleEmail = async (req, res, next) => {
  const { email, type = "test" } = req.body;
  logWithContext("TestEmail", "Starting test email process", { email, type });

  try {
    if (!email) {
      logWithContext("TestEmail", "Email missing in request");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const mailOption = await createMailOption({
      from: SENDER_EMAIL,
      to: email,
      subject: "🧪 Test Email from inkshaa",
      name: "Test User",
      email: email,
      message: "This is a test email to verify the system is working.",
      hasButton: true,
      buttonText: "Visit inkshaa",
      buttonUrl: "https://inkshaa.onrender.com",
    });

    logWithContext("TestEmail", "Mail options created", { mailOption });

    logWithContext("TestEmail", "Sending test email", { email });
    const result = await sendEmailWithRetries(
      mailOption,
      "test_user_id",
      type,
      1
    );

    logWithContext("TestEmail", "Test email sent", {
      email,
      messageId: result.messageId,
    });

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      email: email,
      messageId: result.messageId,
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

export const sendDirectEmail = async (req, res, next) => {
  let email = req.body?.email;
  logWithContext("DirectEmail", "Starting direct email process", { email });

  try {
    if (!email) {
      logWithContext("DirectEmail", "Email missing in request");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    logWithContext("DirectEmail", "Verifying SMTP transporter");
    try {
      await transporter.verify();
      logWithContext("DirectEmail", "SMTP transporter verified");
    } catch (verifyErr) {
      logError("DirectEmail", "SMTP verification failed", verifyErr);
      return res.status(500).json({
        success: false,
        message: "SMTP transporter verification failed",
        error: verifyErr.message,
      });
    }

    const mailOption = {
      from: SENDER_EMAIL,
      to: email,
      subject: "Message from inkshaa",
      text: "hello world",
    };

    logWithContext("DirectEmail", "Mail options prepared", { mailOption });

    logWithContext("DirectEmail", "Sending direct email", { email });
    const emailResult = await transporter.sendMail(mailOption);

    logWithContext("DirectEmail", "Direct email sent", {
      email,
      messageId: emailResult.messageId,
    });

    return res.status(200).json({
      success: true,
      message: "Direct email sent successfully",
      email,
      messageId: emailResult.messageId,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    logError("DirectEmail", `Failed to send direct email to ${email}`, error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to send direct email",
      email,
    });
  }
};

export const clearEmailFailures = async (req, res, next) => {
  const { email } = req.body;
  logWithContext("ClearEmailFailures", "Starting failure clearance", { email });

  try {
    if (!email) {
      logWithContext("ClearEmailFailures", "Email missing in request");
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    logWithContext("ClearEmailFailures", "Updating bounce record", { email });
    const result = await Bounce.updateOne(
      { email },
      { $set: { bounceCount: 0, status: "resolved", updatedAt: new Date() } },
      { upsert: true }
    );

    logWithContext("ClearEmailFailures", "Bounce record updated", {
      email,
      result,
    });

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

export const getDailyPostEmailReport = async (req, res, next) => {
  const { page = 1, limit = 20, type = "daily_digest" } = req.query;
  logWithContext("EmailReport", "Starting report fetch", { page, limit, type });

  try {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    logWithContext("EmailReport", "Fetching email logs", {
      pageNum,
      limitNum,
      type,
    });
    const logs = await EmailLog.find({ type })
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();

    const total = await EmailLog.countDocuments({ type });

    logWithContext("EmailReport", "Report fetched", {
      logCount: logs.length,
      total,
      page: pageNum,
      limit: limitNum,
    });

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
