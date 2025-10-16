// Controllers/dailyPostEmailController.js
import UserModel from "../Models/User.js";
import PostModel from "../Models/Post.js";
import EmailLog from "../Models/EmailLog.js";
import { sendEmail } from "../services/emailService.js";
import { AppError } from "../Utils/AppError.js";
import dayjs from "dayjs";
import Handlebars from "handlebars";
import { DAILY_POST_EMAIL_TEMPLATE } from "../config/dailyPostEmailTemplate.js";

// ============ EMAIL SENDING CONTROLLERS ============

/**
 * 1️⃣ Send Daily Digest Emails (Bulk)
 * POST /api/dailyMail/daily-post
 */
export const sendDailyPostEmail = async (req, res, next) => {
  try {
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: false,
    });

    if (!users.length) {
      return res
        .status(200)
        .json({ success: true, message: "No users to send emails to." });
    }

    const since = dayjs().subtract(1, "day").toDate();
    const posts = await PostModel.find({
      isPublished: true,
      createdAt: { $gte: since },
      blocked: false,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("author", "name");

    if (!posts.length) {
      return res
        .status(200)
        .json({ success: true, message: "No new posts to send." });
    }

    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);
    let successCount = 0;
    let failedCount = 0;

    for (const user of users) {
      try {
        const html = template({
          subject: "Your Daily Readzio Digest",
          name: user.name,
          posts,
          hasButton: true,
          buttonText: "Visit Readzio",
          buttonUrl: "https://readzio.com",
          supportEmail: "readzio.official@gmail.com",
        });

        const result = await sendEmail({
          to: user.email,
          subject: "Your Daily Readzio Digest",
          html,
          text: `Hi ${user.name}, check out the latest posts on Readzio.`,
          type: "daily_digest",
        });

        user.emailAttempts = (user.emailAttempts || 0) + 1;
        if (result.success) {
          user.emailStatus = "sent";
          user.emailLastError = null;
          successCount++;
        } else {
          user.emailStatus = "failed";
          user.emailLastError = result.error || "Unknown error";
          failedCount++;
        }
        await user.save();
      } catch (err) {
        console.error(
          `[DailyDigest] Failed for user ${user.email}:`,
          err.message
        );
        failedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: "Daily digest emails sent.",
      results: {
        successful: successCount,
        failed: failedCount,
        total: users.length,
      },
    });
  } catch (err) {
    console.error("[DailyDigest] Controller error:", err.message);
    next(
      err instanceof AppError
        ? err
        : new AppError(err.message, 500, "SendDailyPostEmail")
    );
  }
};

/**
 * 2️⃣ Send Direct Email (Manual)
 * POST /api/dailyMail/send-direct-email
 */
export const sendDirectEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError("Email is required", 400, "SendDirectEmail");
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 404, "SendDirectEmail");
    }

    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);
    const posts = await PostModel.find({ isPublished: true, blocked: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("author", "name");

    const html = template({
      subject: "Your Readzio Digest",
      name: user.name,
      posts,
      hasButton: true,
      buttonText: "Visit Readzio",
      buttonUrl: "https://readzio.com",
      supportEmail: "readzio.official@gmail.com",
    });

    const result = await sendEmail({
      to: user.email,
      subject: "Your Readzio Digest",
      html,
      text: `Hi ${user.name}, check out the latest posts on Readzio.`,
      type: "daily_digest",
    });

    user.emailAttempts = (user.emailAttempts || 0) + 1;
    if (result.success) {
      user.emailStatus = "sent";
      user.emailLastError = null;
    } else {
      user.emailStatus = "failed";
      user.emailLastError = result.error || "Unknown error";
    }
    await user.save();

    res.status(200).json({
      success: result.success,
      message: result.success
        ? "Direct email sent successfully"
        : "Failed to send email",
      email: user.email,
      messageId: result.messageId || null,
    });
  } catch (err) {
    console.error("[sendDirectEmail] Error:", err.message);
    next(
      err instanceof AppError
        ? err
        : new AppError(err.message, 500, "SendDirectEmail")
    );
  }
};

// ============ EMAIL STATUS CONTROLLERS ============

/**
 * 3️⃣ Get All Email Statuses (with pagination + optional status filter)
 * GET /api/dailyMail/email-statuses
 */
export const getAllEmailStatuses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = {};
    if (status) query.emailStatus = status;

    const total = await UserModel.countDocuments(query);
    const users = await UserModel.find(query)
      .select("email name emailStatus emailAttempts emailLastError")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    return res.status(200).json({
      success: true,
      statuses: users,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
    });
  } catch (err) {
    console.error("[getAllEmailStatuses] Error:", err.message);
    next(
      err instanceof AppError
        ? err
        : new AppError(err.message, 500, "GetAllEmailStatuses")
    );
  }
};

/**
 * 4️⃣ Check Single Email Status
 * GET /api/dailyMail/email-status
 */
export const checkEmailStatus = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) {
      throw new AppError("Email is required", 400, "CheckEmailStatus");
    }

    const user = await UserModel.findOne({ email }).select(
      "email name emailStatus emailAttempts emailLastError stopEmailAttempts"
    );

    if (!user) {
      throw new AppError("User not found", 404, "CheckEmailStatus");
    }

    res.status(200).json({
      success: true,
      email: user.email,
      name: user.name,
      emailStatus: user.emailStatus,
      emailAttempts: user.emailAttempts,
      emailLastError: user.emailLastError,
      stopEmailAttempts: user.stopEmailAttempts,
    });
  } catch (err) {
    console.error("[checkEmailStatus] Error:", err.message);
    next(
      err instanceof AppError
        ? err
        : new AppError(err.message, 500, "CheckEmailStatus")
    );
  }
};

/**
 * 5️⃣ Retry Failed Emails
 * POST /api/dailyMail/retry-failed
 */
export const retryFailedEmails = async (req, res, next) => {
  try {
    const { emails } = req.body;
    if (!emails?.length) {
      throw new AppError("Emails array is required", 400, "RetryFailedEmails");
    }

    const results = [];
    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);

    const posts = await PostModel.find({ isPublished: true, blocked: false })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("author", "name");

    for (const email of emails) {
      const user = await UserModel.findOne({ email });
      if (!user) {
        results.push({ email, success: false, error: "User not found" });
        continue;
      }

      try {
        const html = template({
          subject: "Your Daily Readzio Digest",
          name: user.name,
          posts,
          hasButton: true,
          buttonText: "Visit Readzio",
          buttonUrl: "https://readzio.com",
          supportEmail: "readzio.official@gmail.com",
        });

        const result = await sendEmail({
          to: user.email,
          subject: "Your Daily Readzio Digest",
          html,
          text: `Hi ${user.name}, check out the latest posts on Readzio.`,
          type: "daily_digest",
        });

        user.emailAttempts = (user.emailAttempts || 0) + 1;
        if (result.success) {
          user.emailStatus = "sent";
          user.emailLastError = null;
        } else {
          user.emailStatus = "failed";
          user.emailLastError = result.error || "Unknown error";
        }
        await user.save();
        results.push({ email: user.email, success: result.success });
      } catch (err) {
        console.error(`[retryFailedEmails] Failed for ${email}:`, err.message);
        results.push({ email, success: false, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: "Retry process completed",
      results,
    });
  } catch (err) {
    console.error("[retryFailedEmails] Error:", err.message);
    next(
      err instanceof AppError
        ? err
        : new AppError(err.message, 500, "RetryFailedEmails")
    );
  }
};

// ============ HEALTH & REPORTING CONTROLLERS ============

/**
 * 6️⃣ Get Email System Health
 * GET /api/dailyMail/email-health
 */
export const getEmailSystemHealth = async (req, res, next) => {
  try {
    // Get basic stats
    const totalUsers = await UserModel.countDocuments({
      isAccountVerified: true,
    });
    const activeUsers = await UserModel.countDocuments({
      isAccountVerified: true,
      stopEmailAttempts: false,
    });
    const failedEmails = await UserModel.countDocuments({
      emailStatus: "failed",
    });

    res.status(200).json({
      success: true,
      status: "operational",
      timestamp: new Date().toISOString(),
      stats: {
        totalUsers,
        activeUsers,
        failedEmails,
        healthScore:
          totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(2) : 0,
      },
      message: "Email system is running normally",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetEmailSystemHealth")
    );
  }
};

/**
 * 7️⃣ Get Bounce Statistics
 * GET /api/dailyMail/bounce-stats
 */
export const getBounceStatistics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = dayjs().subtract(parseInt(days), "day").toDate();

    // Get failed emails in the time period
    const failedEmails = await EmailLog.countDocuments({
      emailStatus: "failed",
      createdAt: { $gte: since },
    });

    const totalEmails = await EmailLog.countDocuments({
      createdAt: { $gte: since },
    });

    res.status(200).json({
      success: true,
      stats: {
        totalBounces: failedEmails,
        hardBounces: 0, // TODO: Implement if tracking bounce types
        softBounces: 0, // TODO: Implement if tracking bounce types
        totalEmails,
        bounceRate:
          totalEmails > 0 ? ((failedEmails / totalEmails) * 100).toFixed(2) : 0,
        days: parseInt(days),
      },
      message: "Bounce statistics retrieved successfully",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetBounceStatistics")
    );
  }
};

/**
 * 8️⃣ Get Daily Post Email Report
 * GET /api/dailyMail/daily-post-report
 */
export const getDailyPostEmailReport = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      date,
      status,
      includeStats = true,
    } = req.query;

    const query = { type: "daily_digest" };
    if (date) {
      const startDate = dayjs(date).startOf("day").toDate();
      const endDate = dayjs(date).endOf("day").toDate();
      query.createdAt = { $gte: startDate, $lte: endDate };
    }
    if (status) {
      query.emailStatus = status;
    }

    const total = await EmailLog.countDocuments(query);
    const logs = await EmailLog.find(query)
      .select("email emailStatus emailAttempts emailLastError createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    let stats = undefined;
    if (includeStats === "true" || includeStats === true) {
      const totalSent = await EmailLog.countDocuments({
        ...query,
        emailStatus: "sent",
      });
      const totalFailed = await EmailLog.countDocuments({
        ...query,
        emailStatus: "failed",
      });

      stats = {
        totalSent,
        totalFailed,
        total,
        successRate: total > 0 ? ((totalSent / total) * 100).toFixed(2) : 0,
      };
    }

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
      },
      stats,
      message: "Daily post report retrieved successfully",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "GetDailyPostEmailReport")
    );
  }
};

/**
 * 9️⃣ Check User Email Eligibility
 * GET /api/dailyMail/check-user-eligibility/:userId
 */
export const checkUserEmailEligibility = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId).select(
      "email name isAccountVerified stopEmailAttempts emailStatus"
    );

    if (!user) {
      throw new AppError("User not found", 404, "CheckUserEmailEligibility");
    }

    const eligible = user.isAccountVerified && !user.stopEmailAttempts;
    const reason = !user.isAccountVerified
      ? "Account not verified"
      : user.stopEmailAttempts
      ? "Email attempts stopped"
      : "User is eligible";

    res.status(200).json({
      success: true,
      userId,
      email: user.email,
      name: user.name,
      eligible,
      reason,
      message: "User eligibility checked successfully",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "CheckUserEmailEligibility")
    );
  }
};

/**
 * 🔟 Batch Operations (Check Eligibility)
 * POST /api/dailyMail/batch-operations
 */
export const batchOperations = async (req, res, next) => {
  try {
    const { operation, data } = req.body;

    if (operation === "check-eligibility") {
      const { userIds } = data;

      if (!userIds || !Array.isArray(userIds)) {
        throw new AppError("userIds array is required", 400, "BatchOperations");
      }

      const users = await UserModel.find({ _id: { $in: userIds } }).select(
        "email name isAccountVerified stopEmailAttempts"
      );

      const results = users.map((user) => ({
        userId: user._id,
        email: user.email,
        eligible: user.isAccountVerified && !user.stopEmailAttempts,
      }));

      const summary = {
        eligible: results.filter((r) => r.eligible).length,
        ineligible: results.filter((r) => !r.eligible).length,
      };

      res.status(200).json({
        success: true,
        summary,
        results,
        message: "Batch eligibility check completed",
      });
    } else {
      throw new AppError("Invalid operation", 400, "BatchOperations");
    }
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "BatchOperations")
    );
  }
};

/**
 * 1️⃣1️⃣ Remove Email from Suppression List
 * POST /api/dailyMail/remove-suppression
 */
export const removeEmailSuppression = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400, "RemoveEmailSuppression");
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 404, "RemoveEmailSuppression");
    }

    user.stopEmailAttempts = false;
    user.emailStatus = "not_sent";
    user.emailAttempts = 0;
    user.emailLastError = null;
    await user.save();

    res.status(200).json({
      success: true,
      email,
      message: "Email removed from suppression list successfully",
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "RemoveEmailSuppression")
    );
  }
};

/**
 * 1️⃣2️⃣ Send Test Email
 * POST /api/dailyMail/test-email
 */
export const sendTestEmail = async (req, res, next) => {
  try {
    const { email, type = "test" } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400, "SendTestEmail");
    }

    const result = await sendEmail({
      to: email,
      subject: "Test Email from Readzio",
      html: "<h1>This is a test email</h1><p>If you received this, the email system is working correctly!</p>",
      text: "This is a test email. If you received this, the email system is working correctly!",
      type,
    });

    res.status(200).json({
      success: result.success,
      email,
      type,
      messageId: result.messageId,
      message: result.success
        ? "Test email sent successfully"
        : "Failed to send test email",
      error: result.success ? null : result.error,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "SendTestEmail")
    );
  }
};
