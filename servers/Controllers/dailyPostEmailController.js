// Controllers/dailyPostEmailController.js
import UserModel from "../Models/User.js";
import PostModel from "../Models/Post.js";
import EmailLog from "../Models/EmailLog.js";
import { sendEmail } from "../services/emailService.js";
import { AppError } from "../Utils/AppError.js";
import dayjs from "dayjs";
import Handlebars from "handlebars";
import { DAILY_POST_EMAIL_TEMPLATE } from "../config/dailyPostEmailTemplate.js";
import SystemSettings from "../Models/email/SystemSettings.js";

// ============ EMAIL SENDING CONTROLLERS ============

/**
 * 1️⃣ Send Daily Digest Emails (Bulk) - PRODUCTION READY
 * POST /api/dailyMail/daily-post
 * Features:
 * - Sends 6-10 random posts
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
    // Check global email switch
    const settings = await SystemSettings.findOne();
    if (settings && settings.dailyDigestEnabled === false) {
      console.log("⛔ Daily digest emails are globally disabled");
      return res.status(200).json({
        success: false,
        message: "Daily digest emails are currently disabled.",
      });
    }
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

    // Fetch posts (with fallback logic and random selection)
    const posts = await fetchPostsForDigest();
    const noPosts = posts.length === 0;

    console.log(
      `📨 [sendDailyPostEmail] Found ${posts.length} random posts to send`,
    );

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
        : new AppError(err.message, 500, "SendDailyPostEmail"),
    );
  }
};

/**
 * Fetch RANDOM posts for digest with intelligent fallback
 * Priority: Recent posts (24h) → Older posts (7d) → All posts
 * @returns {Array} 6-10 random posts (minimum 6, maximum 10)
 */
async function fetchPostsForDigest() {
  const MIN_POSTS = 6;
  const MAX_POSTS = 10;

  try {
    // Try recent posts first (last 24 hours)
    let availablePosts = await PostModel.find({
      isPublished: true,
      blocked: false,
      createdAt: { $gte: dayjs().subtract(1, "day").toDate() },
    })
      .populate("author", "name")
      .lean();

    if (availablePosts.length >= MIN_POSTS) {
      console.log(`✅ Found ${availablePosts.length} recent posts (24h)`);
      return getRandomPosts(availablePosts, MIN_POSTS, MAX_POSTS);
    }

    // Fallback: Try posts from last 7 days
    availablePosts = await PostModel.find({
      isPublished: true,
      blocked: false,
      createdAt: { $gte: dayjs().subtract(7, "day").toDate() },
    })
      .populate("author", "name")
      .lean();

    if (availablePosts.length >= MIN_POSTS) {
      console.log(`⚠️ Found ${availablePosts.length} older posts (7d)`);
      return getRandomPosts(availablePosts, MIN_POSTS, MAX_POSTS);
    }

    // Final fallback: Get any recent published posts
    availablePosts = await PostModel.find({
      isPublished: true,
      blocked: false,
    })
      .sort({ createdAt: -1 })
      .limit(50) // Get more posts for better randomization
      .populate("author", "name")
      .lean();

    if (availablePosts.length >= MIN_POSTS) {
      console.log(`⚠️ Found ${availablePosts.length} posts (all time)`);
      return getRandomPosts(availablePosts, MIN_POSTS, MAX_POSTS);
    }

    // Not enough posts available
    if (availablePosts.length > 0 && availablePosts.length < MIN_POSTS) {
      console.log(
        `⚠️ Only ${availablePosts.length} posts found (less than minimum ${MIN_POSTS})`,
      );
      return availablePosts; // Return whatever we have
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
 * Get random posts from available posts
 * @param {Array} posts - Available posts
 * @param {Number} min - Minimum number of posts (default 6)
 * @param {Number} max - Maximum number of posts (default 10)
 * @returns {Array} Random posts between min and max
 */
function getRandomPosts(posts, min = 6, max = 10) {
  if (posts.length <= min) {
    return posts; // Return all if we have less than or equal to minimum
  }

  // Determine random count between min and max
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const actualCount = Math.min(count, posts.length);

  console.log(
    `🎲 Selecting ${actualCount} random posts from ${posts.length} available`,
  );

  // Shuffle array using Fisher-Yates algorithm
  const shuffled = [...posts];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Return random selection
  return shuffled.slice(0, actualCount);
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
        posts: posts, // Already filtered to 6-10 posts
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
            `❌ Email failed for ${user.email} after ${attempts} attempts: ${lastError}`,
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
      posts: posts, // Already 6-10 random posts
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
      postsCount: posts.length,
      messageId: result.messageId || null,
    });
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new AppError(err.message, 500, "SendDirectEmail"),
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
      "email name emailStatus emailAttempts emailLastError stopEmailAttempts",
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
        posts.length === 0,
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
      "email name isAccountVerified stopEmailAttempts emailStatus",
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
        "email name isAccountVerified stopEmailAttempts",
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

export const toggleDailyEmail = async (req, res, next) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      throw new AppError(
        "'enabled' must be a boolean",
        400,
        "ToggleDailyEmail",
      );
    }

    let settings = await SystemSettings.findOne();

    if (!settings) {
      settings = await SystemSettings.create({ dailyDigestEnabled: enabled });
    } else {
      settings.dailyDigestEnabled = enabled;
      await settings.save();
    }

    res.status(200).json({
      success: true,
      dailyDigestEnabled: settings.dailyDigestEnabled,
      message: `Daily digest emails ${settings.dailyDigestEnabled ? "enabled ✅" : "disabled ⛔"}`,
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(error.message, 500, "ToggleDailyEmail"),
    );
  }
};

export const getDailyEmailStatus = async (req, res, next) => {
  try {
    const settings = await SystemSettings.findOne();
    res.status(200).json({
      success: true,
      dailyDigestEnabled: settings ? settings.dailyDigestEnabled : true,
    });
  } catch (error) {
    next(new AppError(error.message, 500, "GetDailyEmailStatus"));
  }
};
