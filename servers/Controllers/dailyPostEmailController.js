import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import EmailLog from "../../servers/Models/EmailLog.js";
import { sendEmail } from "../../servers/services/emailService.js";
import { AppError } from "../../servers/Utils/AppError.js";
import dayjs from "dayjs";
import Handlebars from "handlebars";
import { DAILY_POST_EMAIL_TEMPLATE } from "../config/dailyPostEmailTemplate.js";

// ============ HELPER FUNCTIONS FOR RANDOMNESS ============

/**
 * Generate a random integer between min and max (inclusive).
 */
const getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Shuffle an array using the Fisher-Yates algorithm to ensure
 * random posts are selected.
 * @param {Array} array
 */
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// ============ EMAIL SENDING CONTROLLERS ============

/**
 * 1️⃣ Send Daily Digest Emails (Bulk) - PRODUCTION READY
 * POST /api/dailyMail/daily-post
 * Features:
 * - Sends a random number of posts (min 6, max 10)
 * - Selects posts randomly from a pool
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

    // Fetch posts (with fallback logic and shuffling)
    const posts = await fetchPostsForDigest();
    const noPosts = posts.length === 0;

    console.log(
      `📨 [sendDailyPostEmail] Found ${posts.length} posts pool for selection`
    );

    // Compile template
    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);

    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    // Send emails to all users
    for (const user of users) {
      // The random selection of 6-10 posts is handled inside sendEmailToUser
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
      // Note: postsIncluded is based on the initial pool size, not the sent count per user
      postsPoolSize: posts.length,
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
 * Fetch posts for digest with intelligent fallback and random selection pool creation.
 * It fetches up to 50 posts, shuffles them, and returns a max of 10 shuffled posts
 * to ensure random variety for each user.
 * Priority: Recent posts (24h) → Older posts (7d) → Empty digest
 * @returns {Array} Up to 10 shuffled posts
 */
async function fetchPostsForDigest() {
  // Fetch up to 50 posts to ensure enough variety for random selection
  const FETCH_LIMIT = 50;
  const MAX_POSTS_TO_RETURN = 10;

  try {
    let posts = [];

    // 1. Try recent posts first (last 24 hours)
    posts = await PostModel.find({
      isPublished: true,
      blocked: false,
      createdAt: { $gte: dayjs().subtract(1, "day").toDate() },
    })
      .sort({ createdAt: -1 })
      .limit(FETCH_LIMIT)
      .populate("author", "name")
      .lean();

    if (posts.length >= 1) {
      console.log(`✅ Found ${posts.length} recent posts (24h)`);
      // Shuffle the posts and take only the top 10 as the working pool
      return shuffleArray(posts).slice(0, MAX_POSTS_TO_RETURN);
    }

    // 2. Fallback: Try posts from last 7 days
    posts = await PostModel.find({
      isPublished: true,
      blocked: false,
      createdAt: { $gte: dayjs().subtract(7, "day").toDate() },
    })
      .sort({ createdAt: -1 })
      .limit(FETCH_LIMIT)
      .populate("author", "name")
      .lean();

    if (posts.length >= 1) {
      console.log(`⚠️ Found ${posts.length} older posts (7d)`);
      // Shuffle the posts and take only the top 10 as the working pool
      return shuffleArray(posts).slice(0, MAX_POSTS_TO_RETURN);
    }

    // 3. Final fallback: Get any recent published posts
    posts = await PostModel.find({
      isPublished: true,
      blocked: false,
    })
      .sort({ createdAt: -1 })
      .limit(FETCH_LIMIT)
      .populate("author", "name")
      .lean();

    if (posts.length >= 1) {
      console.log(`⚠️ Found ${posts.length} posts (all time)`);
      // Shuffle the posts and take only the top 10 as the working pool
      return shuffleArray(posts).slice(0, MAX_POSTS_TO_RETURN);
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
 * Send email to a single user with retry logic and random post count (5-10).
 * @param {Object} user - User document
 * @param {Array} posts - Posts pool (max 10, already shuffled)
 * @param {Function} template - Compiled Handlebars template
 * @param {Boolean} noPosts - Whether there are no posts
 * @returns {String} "success" | "failed" | "skipped"
 */
async function sendEmailToUser(user, posts, template, noPosts) {
  const MAX_RETRIES = 1; // Single retry on failure
  let attempts = 0;
  let lastError = null;

  // 🎯 Implement Random Post Count Logic (min 6 to max 10)
  const MIN_POSTS_TO_SEND = 6;
  const MAX_POSTS_TO_SEND = 10;

  const totalAvailablePosts = posts.length;
  let postsToSendCount = totalAvailablePosts;

  if (totalAvailablePosts >= MIN_POSTS_TO_SEND) {
    // Generate a random number between MIN_POSTS_TO_SEND and min(MAX_POSTS_TO_SEND, totalAvailablePosts)
    const upperLimit = Math.min(MAX_POSTS_TO_SEND, totalAvailablePosts);
    postsToSendCount = getRandomNumber(MIN_POSTS_TO_SEND, upperLimit);
  } else if (totalAvailablePosts > 0) {
    // If we have posts but less than the minimum (e.g., 5), we send all of them.
    postsToSendCount = totalAvailablePosts;
  }

  // Slice the posts array based on the determined count (posts are already shuffled in fetchPostsForDigest)
  const postsToSend = posts.slice(0, postsToSendCount);

  // Update noPosts flag based on the actual posts being sent
  const actualNoPosts = postsToSend.length === 0;

  while (attempts <= MAX_RETRIES) {
    try {
      const html = template({
        subject: "Your Daily Readzio Digest",
        name: user.name,
        posts: postsToSend, // Use the randomly selected and sliced posts
        hasButton: true,
        buttonText: actualNoPosts ? "Explore Readzio" : "Visit Readzio",
        buttonUrl: "https://readzio.com",
        supportEmail: "readzio.official@gmail.com",
        noPosts: actualNoPosts,
      });

      const result = await sendEmail({
        to: user.email,
        subject: "Your Daily Readzio Digest",
        html,
        text: actualNoPosts
          ? `Hi ${user.name}, no new posts today — explore more at Readzio!`
          : `Hi ${user.name}, check out today's ${postsToSend.length} curated posts on Readzio.`,
        type: "daily_digest",
      });

      // Update user record
      user.emailAttempts = (user.emailAttempts || 0) + 1;

      if (result.success) {
        user.emailStatus = "sent";
        user.emailLastError = null;
        await user.save();

        console.log(
          `✅ Email sent to ${user.email} with ${
            postsToSend.length
          } posts (attempt ${attempts + 1})`
        );
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

    // Use the same logic for fetching posts (gets a random pool of max 10)
    const posts = await fetchPostsForDigest();
    const template = Handlebars.compile(DAILY_POST_EMAIL_TEMPLATE);

    // Apply the random post count logic here too (min 6 to max 10)
    const MIN_POSTS_TO_SEND = 6;
    const MAX_POSTS_TO_SEND = 10;

    const totalAvailablePosts = posts.length;
    let postsToSendCount = totalAvailablePosts;

    if (totalAvailablePosts >= MIN_POSTS_TO_SEND) {
      const upperLimit = Math.min(MAX_POSTS_TO_SEND, totalAvailablePosts);
      postsToSendCount = getRandomNumber(MIN_POSTS_TO_SEND, upperLimit);
    } else if (totalAvailablePosts > 0) {
      postsToSendCount = totalAvailablePosts;
    }

    const postsToSend = posts.slice(0, postsToSendCount);
    const noPosts = postsToSend.length === 0;

    const html = template({
      subject: "Your Readzio Digest",
      name: user.name,
      posts: postsToSend,
      hasButton: true,
      buttonText: "Visit Readzio",
      buttonUrl: "https://readzio.com",
      supportEmail: "readzio.official@gmail.com",
      noPosts: noPosts,
    });

    const result = await sendEmail({
      to: user.email,
      subject: "Your Readzio Digest",
      html,
      text: `Hi ${user.name}, check out the latest ${postsToSend.length} posts on Readzio.`,
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
      postsSent: postsToSend.length,
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

      // Reusing the sendEmailToUser logic which includes random post count
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
