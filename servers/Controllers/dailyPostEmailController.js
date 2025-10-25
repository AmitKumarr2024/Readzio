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
 * 1️⃣ Send Daily Digest Emails (Bulk) - PRODUCTION READY
 * POST /api/dailyMail/daily-post
 * Features:
 * - Sends up to 10 posts (min 0)
 * - Tries both recent (24h) and older posts
 * - Single retry per user on failure
 * - Comprehensive logging
 */
export const sendDailyPostEmail = async (req, res, next) => {
  console.log("📨 [sendDailyPostEmail] Request received:", {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
  });

  try {
    // Fetch eligible users
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: false,
    });

    if (!users.length) {
      console.log("📨 [sendDailyPostEmail] No eligible users found");
      return res.status(200).json({
        success: true,
        message: "No users to send emails to.",
        results: { successful: 0, failed: 0, total: 0 },
      });
    }

    console.log(`📨 [sendDailyPostEmail] Found ${users.length} eligible users`);

    // Fetch posts (with fallback logic)
    const posts = await fetchPostsForDigest();
    const noPosts = posts.length === 0;

    console.log(`📨 [sendDailyPostEmail] Found ${posts.length} posts to send`);

    // Compile template
    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Send emails to all users
    for (const user of users) {
      const result = await sendEmailToUser(user, posts, template, noPosts);

      if (result === "success") successCount++;
      else if (result === "failed") failedCount++;
      else skippedCount++;
    }

    const summary = {
      successful: successCount,
      failed: failedCount,
      skipped: skippedCount,
      total: users.length,
      postsIncluded: posts.length,
    };

    console.log("📨 [sendDailyPostEmail] Batch complete:", summary);

    return res.status(200).json({
      success: true,
      message: "Daily digest emails sent.",
      results: summary,
    });
  } catch (err) {
    console.error("[sendDailyPostEmail] Controller error:", err.message);
    next(
      err instanceof AppError
        ? err
        : new AppError(err.message, 500, "SendDailyPostEmail")
    );
  }
};

/**
 * Fetch posts for digest with intelligent fallback
 * Priority: Recent posts (24h) → Older posts (7d) → Empty digest
 * @returns {Array} Up to 10 posts
 */
async function fetchPostsForDigest() {
  const MAX_POSTS = 10;

  try {
    // Try recent posts first (last 24 hours)
    const recentPosts = await PostModel.find({
      isPublished: true,
      blocked: false,
      createdAt: { $gte: dayjs().subtract(1, "day").toDate() },
    })
      .sort({ createdAt: -1 })
      .limit(MAX_POSTS)
      .populate("author", "name")
      .lean();

    if (recentPosts.length >= 1) {
      console.log(`✅ Found ${recentPosts.length} recent posts (24h)`);
      return recentPosts;
    }

    // Fallback: Try posts from last 7 days
    const olderPosts = await PostModel.find({
      isPublished: true,
      blocked: false,
      createdAt: { $gte: dayjs().subtract(7, "day").toDate() },
    })
      .sort({ createdAt: -1 })
      .limit(MAX_POSTS)
      .populate("author", "name")
      .lean();

    if (olderPosts.length >= 1) {
      console.log(`⚠️ Found ${olderPosts.length} older posts (7d)`);
      return olderPosts;
    }

    // Final fallback: Get any recent published posts
    const anyPosts = await PostModel.find({
      isPublished: true,
      blocked: false,
    })
      .sort({ createdAt: -1 })
      .limit(MAX_POSTS)
      .populate("author", "name")
      .lean();

    if (anyPosts.length >= 1) {
      console.log(`⚠️ Found ${anyPosts.length} posts (all time)`);
      return anyPosts;
    }

    // No posts available
    console.log("❌ No posts found - sending empty digest");
    return [];
  } catch (error) {
    console.error("❌ Error fetching posts:", error.message);
    return []; // Return empty array on error
  }
}

/**
 * Send email to a single user with retry logic
 * @param {Object} user - User document
 * @param {Array} posts - Posts to include
 * @param {Function} template - Compiled Handlebars template
 * @param {Boolean} noPosts - Whether there are no posts
 * @returns {String} "success" | "failed" | "skipped"
 */
async function sendEmailToUser(user, posts, template, noPosts) {
  const MAX_RETRIES = 1; // Single retry on failure
  let attempts = 0;
  let lastError = null;

  while (attempts <= MAX_RETRIES) {
    try {
      const html = template({
        subject: "Your Daily Readzio Digest",
        name: user.name,
        posts: posts.slice(0, 10), // Ensure max 10 posts
        hasButton: true,
        buttonText: noPosts ? "Explore Readzio" : "Visit Readzio",
        buttonUrl: "https://readzio.com",
        supportEmail: "readzio.official@gmail.com",
        noPosts,
      });

      const result = await sendEmail({
        to: user.email,
        subject: "Your Daily Readzio Digest",
        html,
        text: noPosts
          ? `Hi ${user.name}, no new posts today — explore more at Readzio!`
          : `Hi ${user.name}, check out today's ${posts.length} curated posts on Readzio.`,
        type: "daily_digest",
      });

      // Update user record
      user.emailAttempts = (user.emailAttempts || 0) + 1;

      if (result.success) {
        user.emailStatus = "sent";
        user.emailLastError = null;
        await user.save();

        console.log(`✅ Email sent to ${user.email} (attempt ${attempts + 1})`);
        return "success";
      } else {
        lastError = result.error || "Unknown error";
        attempts++;

        if (attempts > MAX_RETRIES) {
          // Final failure
          user.emailStatus = "failed";
          user.emailLastError = lastError;
          await user.save();

          console.error(
            `❌ Email failed for ${user.email} after ${attempts} attempts: ${lastError}`
          );
          return "failed";
        }

        // Wait before retry (exponential backoff)
        console.warn(`⚠️ Retry ${attempts}/${MAX_RETRIES} for ${user.email}`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
      }
    } catch (err) {
      lastError = err.message;
      attempts++;

      if (attempts > MAX_RETRIES) {
        user.emailStatus = "failed";
        user.emailLastError = lastError;
        await user.save();

        console.error(`❌ Exception for ${user.email}:`, err.message);
        return "failed";
      }

      console.warn(`⚠️ Exception on attempt ${attempts}, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }

  return "failed";
}

/**
 * 2️⃣ Send Direct Email (Manual)
 * POST /api/dailyMail/send-direct-email
 */
export const sendDirectEmail = async (req, res, next) => {
  console.log("📨 [sendDirectEmail] Request received");
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError("Email is required", 400, "SendDirectEmail");
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError("User not found", 404, "SendDirectEmail");
    }

    const posts = await fetchPostsForDigest();
    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);

    const html = template({
      subject: "Your Readzio Digest",
      name: user.name,
      posts: posts.slice(0, 10),
      hasButton: true,
      buttonText: "Visit Readzio",
      buttonUrl: "https://readzio.com",
      supportEmail: "readzio.official@gmail.com",
      noPosts: posts.length === 0,
    });

    const result = await sendEmail({
      to: user.email,
      subject: "Your Readzio Digest",
      html,
      text: `Hi ${user.name}, check out the latest posts on Readzio.`,
      type: "daily_digest",
    });

    user.emailAttempts = (user.emailAttempts || 0) + 1;
    user.emailStatus = result.success ? "sent" : "failed";
    user.emailLastError = result.success
      ? null
      : result.error || "Unknown error";
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
    next(
      err instanceof AppError
        ? err
        : new AppError(err.message, 500, "SendDirectEmail")
    );
  }
};

// ============ EMAIL STATUS CONTROLLERS ============

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
    next(new AppError(err.message, 500, "GetAllEmailStatuses"));
  }
};

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
    next(new AppError(err.message, 500, "CheckEmailStatus"));
  }
};

export const retryFailedEmails = async (req, res, next) => {
  try {
    const { emails } = req.body;
    if (!emails?.length) {
      throw new AppError("Emails array is required", 400, "RetryFailedEmails");
    }

    const posts = await fetchPostsForDigest();
    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);
    const results = [];

    for (const email of emails) {
      const user = await UserModel.findOne({ email });
      if (!user) {
        results.push({ email, success: false, error: "User not found" });
        continue;
      }

      const result = await sendEmailToUser(
        user,
        posts,
        template,
        posts.length === 0
      );

      results.push({
        email: user.email,
        success: result === "success",
        status: result,
      });
    }

    res.status(200).json({
      success: true,
      message: "Retry process completed",
      results,
    });
  } catch (err) {
    next(new AppError(err.message, 500, "RetryFailedEmails"));
  }
};

// ============ HEALTH & REPORTING CONTROLLERS ============

export const getEmailSystemHealth = async (req, res, next) => {
  try {
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
    next(new AppError(error.message, 500, "GetEmailSystemHealth"));
  }
};

export const getBounceStatistics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const since = dayjs().subtract(parseInt(days), "day").toDate();

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
        hardBounces: 0,
        softBounces: 0,
        totalEmails,
        bounceRate:
          totalEmails > 0 ? ((failedEmails / totalEmails) * 100).toFixed(2) : 0,
        days: parseInt(days),
      },
      message: "Bounce statistics retrieved successfully",
    });
  } catch (error) {
    next(new AppError(error.message, 500, "GetBounceStatistics"));
  }
};

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
    next(new AppError(error.message, 500, "GetDailyPostEmailReport"));
  }
};

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
    next(new AppError(error.message, 500, "CheckUserEmailEligibility"));
  }
};

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
    next(new AppError(error.message, 500, "BatchOperations"));
  }
};

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
    next(new AppError(error.message, 500, "RemoveEmailSuppression"));
  }
};

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
    next(new AppError(error.message, 500, "SendTestEmail"));
  }
};
