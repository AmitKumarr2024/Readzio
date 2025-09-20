import EmailLog from "../../servers/Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Notification from "../../servers/Models/Notification.js";
import Bounce from "../../servers/Models/Bounce.js"; // Add this import
import { AppError } from "../../servers/Utils/AppError.js";
import { sendEmailWithRetries } from "../../servers/helpers/sendEmailWithRetries.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { DAILY_POST_ADMIN_REPORT_TEMPLATE } from "../../servers/config/DailyPostEmailReport.js";

// Helper function to check if user is eligible (simple version using your existing fields)
async function isUserEligibleForEmail(user) {
  // Your existing checks
  if (!user.isAccountVerified)
    return { eligible: false, reason: "Not verified" };
  if (user.stopEmailAttempts)
    return { eligible: false, reason: "Email stopped" };
  if (user.blocked) return { eligible: false, reason: "User blocked" };
  if (!user.email || user.email.trim() === "")
    return { eligible: false, reason: "No email" };

  // Enhanced checks (NEW - but simple)

  // Check if email is bouncing
  const isSuppressed = await Bounce.isEmailSuppressed(user.email);
  if (isSuppressed)
    return { eligible: false, reason: "Email suppressed due to bounces" };

  // Check recent activity (if lastActiveAt exists)
  if (user.lastActiveAt) {
    const daysSinceActive =
      (Date.now() - new Date(user.lastActiveAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceActive > 60)
      return { eligible: false, reason: "Inactive for 60+ days" };
  }

  // Check recent email count to prevent spam
  const recentEmails = await EmailLog.countDocuments({
    email: user.email,
    type: "daily_digest",
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  if (recentEmails >= 2)
    return { eligible: false, reason: "Already sent today" };

  return { eligible: true, reason: "All checks passed" };
}

// Your existing function with enhancements
export const sendDailyPostEmail = async (req, res, next) => {
  const startTime = Date.now();

  try {
    console.log("📧 [DailyEmail] Starting daily post email process");

    // Your existing user query with small enhancement
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: { $ne: true },
      email: { $exists: true, $ne: null, $ne: "" },
      blocked: { $ne: true }, // Add this
      // Optional: Add activity filter
      $or: [
        {
          lastActiveAt: {
            $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        },
        { lastActiveAt: { $exists: false } },
      ],
    })
      .select("_id name email lastActiveAt")
      .lean({ virtuals: true });

    console.log(`📊 [DailyEmail] Found ${users.length} potential users`);

    if (users.length === 0) {
      return res.status(200).json({
        message: "No potential users found for daily email",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    // Enhanced eligibility checking (NEW)
    const eligibilityChecks = await Promise.all(
      users.map(async (user) => {
        const eligibility = await isUserEligibleForEmail(user);
        return { user, ...eligibility };
      })
    );

    const eligibleUsers = eligibilityChecks
      .filter((check) => check.eligible)
      .map((check) => check.user);
    const ineligibleUsers = eligibilityChecks.filter(
      (check) => !check.eligible
    );

    console.log(
      `✅ [DailyEmail] ${eligibleUsers.length} users eligible out of ${users.length}`
    );

    // Log ineligible reasons for debugging
    if (ineligibleUsers.length > 0) {
      const reasonCounts = {};
      ineligibleUsers.forEach((user) => {
        reasonCounts[user.reason] = (reasonCounts[user.reason] || 0) + 1;
      });
      console.log(`📊 [DailyEmail] Ineligible reasons:`, reasonCounts);
    }

    if (eligibleUsers.length === 0) {
      return res.status(200).json({
        message: "No eligible users found for daily email",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
        ineligibleReasons: ineligibleUsers.reduce((acc, user) => {
          acc[user.reason] = (acc[user.reason] || 0) + 1;
          return acc;
        }, {}),
      });
    }

    // Your existing post fetching logic (keeping exactly the same)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let posts = await PostModel.find({
      createdAt: { $gte: todayStart },
      isPublished: true,
      title: { $exists: true, $ne: "" },
      content: { $exists: true },
    })
      .select(
        "title slug thumbnail author readTime likesCount commentsCount createdAt"
      )
      .populate("author", "name avatar")
      .sort({ likesCount: -1, commentsCount: -1 })
      .limit(15)
      .lean({ virtuals: true });

    console.log(`📰 [DailyEmail] Found ${posts.length} posts from today`);

    // Your existing fallback logic (keeping the same)
    if (posts.length < 10) {
      const needed = 10 - posts.length;
      console.log(
        `🔄 [DailyEmail] Need ${needed} more posts, searching for older posts...`
      );

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentPosts = await PostModel.aggregate([
        {
          $match: {
            createdAt: { $gte: sevenDaysAgo, $lt: todayStart },
            isPublished: true,
            likesCount: { $gte: 1 },
            title: { $exists: true, $ne: "" },
          },
        },
        { $sample: { size: needed } },
        {
          $project: {
            title: 1,
            slug: 1,
            thumbnail: 1,
            author: 1,
            readTime: 1,
            likesCount: 1,
            commentsCount: 1,
            createdAt: 1,
          },
        },
      ]);

      if (recentPosts.length > 0) {
        const populatedFallback = await PostModel.populate(recentPosts, {
          path: "author",
          select: "name avatar",
        });
        posts = [...posts, ...populatedFallback];
      }
    }

    if (posts.length === 0) {
      return res.status(200).json({
        message: "No posts available to send. Skipped daily email.",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    posts = posts
      .sort(
        (a, b) =>
          b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount)
      )
      .slice(0, 10);

    const results = [];

    // Enhanced batch processing (same structure, better error handling)
    const batchSize = 50;
    const userBatches = [];
    for (let i = 0; i < eligibleUsers.length; i += batchSize) {
      userBatches.push(eligibleUsers.slice(i, i + batchSize));
    }

    console.log(
      `🔄 [DailyEmail] Processing ${userBatches.length} batches of users`
    );

    for (let batchIndex = 0; batchIndex < userBatches.length; batchIndex++) {
      const batch = userBatches[batchIndex];

      const batchPromises = batch.map(async (user) => {
        try {
          // Your existing subject generation
          const popularPost = posts[0];
          const subject = popularPost
            ? `${popularPost.title.substring(0, 50)}${
                popularPost.title.length > 50 ? "..." : ""
              } | inkshaa Daily Digest`
            : `Your inkshaa Daily Brief – ${posts.length} Fresh Posts for You`;

          // Create mail options (enhanced createMailOption will handle suppression)
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

          // Send email (enhanced sendEmailWithRetries will handle bounces)
          await sendEmailWithRetries(mailOption, user._id, "daily_digest", 3);

          // Your existing activity logging
          await recordActivity({
            userId: user._id,
            action: "DAILY_EMAIL_SENT",
            message: `Daily digest sent successfully to ${user.email}`,
            metadata: { postCount: posts.length },
          });

          return {
            email: user.email,
            success: true,
            userId: user._id,
          };
        } catch (error) {
          console.error(
            `❌ [DailyEmail] Failed for ${user.email}:`,
            error.message
          );

          // Enhanced error logging
          await recordActivity({
            userId: user._id,
            action: "DAILY_EMAIL_FAILED",
            message: `Daily digest failed for ${user.email}: ${error.message}`,
            metadata: { postCount: posts.length, error: error.message },
          });

          // Record bounce if it's a delivery issue
          if (
            error.message.includes("user unknown") ||
            error.message.includes("domain not found") ||
            error.message.includes("invalid address")
          ) {
            try {
              await Bounce.create({
                email: user.email.toLowerCase(),
                error: error.message,
                bounceType: "hard",
                status: "suppressed",
              });
            } catch (bounceError) {
              console.error("Failed to record bounce:", bounceError.message);
            }
          }

          return {
            email: user.email,
            success: false,
            error: error.message,
            userId: user._id,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || "Unknown error",
          });
        }
      });

      // Your existing delay between batches
      if (batchIndex < userBatches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(
      `✅ [DailyEmail] Completed: ${successCount} success, ${failedCount} failed`
    );

    // Your existing admin report
    const admin = await UserModel.findOne({ role: "admin" }).lean();
    if (admin) {
      try {
        const failedUsers = results.filter((r) => !r.success).slice(0, 10);

        const adminMailOption = await createMailOption({
          to: admin.email,
          subject: `Daily Email Report - ${successCount}/${results.length} Sent Successfully`,
          name: admin.name || "Admin",
          email: admin.email,
          customTemplate: DAILY_POST_ADMIN_REPORT_TEMPLATE,
          customData: {
            totalUsers: results.length,
            successCount,
            failedCount,
            failedUsers,
            postCount: posts.length,
            processTime: Math.round((Date.now() - startTime) / 1000),
            topPosts: posts.slice(0, 3).map((p) => ({
              title: p.title,
              author: p.author?.name || "Unknown",
              likes: p.likesCount || 0,
              comments: p.commentsCount || 0,
            })),
            // Add eligibility stats
            totalPotentialUsers: users.length,
            eligibleUsers: eligibleUsers.length,
            ineligibleReasons: ineligibleUsers.reduce((acc, user) => {
              acc[user.reason] = (acc[user.reason] || 0) + 1;
              return acc;
            }, {}),
          },
        });

        await sendEmailWithRetries(adminMailOption, admin._id, "report", 3);
        console.log("📊 [DailyEmail] Admin report sent successfully");
      } catch (adminError) {
        console.error(
          "❌ [DailyEmail] Failed to send admin report:",
          adminError.message
        );
      }
    }

    // Your existing response format (enhanced)
    res.status(200).json({
      message: "Daily post emails processed successfully",
      results: {
        total: results.length,
        successful: successCount,
        failed: failedCount,
        failureRate: ((failedCount / results.length) * 100).toFixed(2) + "%",
      },
      eligibilityCheck: {
        totalPotential: users.length,
        eligible: eligibleUsers.length,
        ineligible: ineligibleUsers.length,
        ineligibleReasons: ineligibleUsers.reduce((acc, user) => {
          acc[user.reason] = (acc[user.reason] || 0) + 1;
          return acc;
        }, {}),
      },
      postCount: posts.length,
      processTime: Date.now() - startTime,
      performance: {
        avgTimePerEmail: Math.round((Date.now() - startTime) / results.length),
        totalBatches: userBatches.length,
        batchSize,
      },
    });
  } catch (error) {
    console.error("💥 [DailyEmail] Critical error:", error);
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

// Your existing report function (keeping exactly the same)
export const getDailyPostEmailReport = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      date,
      status,
      type = "daily_digest",
    } = req.query;

    const query = { type };

    if (date) {
      const istDate = new Date(date);
      if (isNaN(istDate.getTime())) {
        throw new AppError(
          "Invalid date format",
          400,
          "GetDailyPostEmailReport"
        );
      }

      const startDate = new Date(istDate);
      startDate.setUTCHours(18, 30, 0, 0);
      const endDate = new Date(istDate);
      endDate.setUTCHours(18 + 23, 30 + 59, 59, 999);

      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (
      status &&
      ["sent", "failed", "suppressed", "pending"].includes(status)
    ) {
      query.emailStatus = status;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // Enhanced aggregation pipeline (keeping your existing structure but adding bounce info)
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { name: 1, email: 1, role: 1 } }],
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          email: 1,
          emailStatus: 1,
          emailAttempts: 1,
          emailLastError: 1,
          bounceType: 1,
          bounceReason: 1,
          messageId: 1,
          sentAt: 1,
          createdAt: 1,
          updatedAt: 1,
          "user.name": 1,
          "user.role": 1,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          logs: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
          stats: [
            {
              $group: {
                _id: "$emailStatus",
                count: { $sum: 1 },
              },
            },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ];

    const [result] = await EmailLog.aggregate(pipeline);
    const { logs, stats, totalCount } = result;
    const total = totalCount[0]?.count || 0;

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    console.log(
      `📊 [EmailReport] Fetched ${logs.length} logs out of ${total} total`
    );

    res.status(200).json({
      logs,
      pagination: {
        total,
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1,
      },
      stats: {
        total,
        sent: statusStats.sent || 0,
        failed: statusStats.failed || 0,
        suppressed: statusStats.suppressed || 0,
        pending: statusStats.pending || 0,
        successRate:
          total > 0
            ? (((statusStats.sent || 0) / total) * 100).toFixed(2) + "%"
            : "0%",
      },
      filters: { date, status, type },
    });
  } catch (error) {
    console.error("❌ [EmailReport] Failed to fetch email report:", error);
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

// Your existing cleanup function (keeping exactly the same)
export const deleteAllNotifications = async (req, res, next) => {
  try {
    console.log("🗑️ [Cleanup] Starting notification cleanup...");
    const countBefore = await Notification.countDocuments({});
    const result = await Notification.deleteMany({});

    console.log(
      `✅ [Cleanup] Deleted ${result.deletedCount} notifications (${countBefore} total found)`
    );

    await recordActivity({
      userId: req.user?._id || null,
      action: "NOTIFICATIONS_CLEANUP",
      message: `Deleted ${result.deletedCount} notifications`,
      metadata: { deletedCount: result.deletedCount, totalFound: countBefore },
    });

    res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} notifications`,
      deletedCount: result.deletedCount,
      totalFound: countBefore,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [Cleanup] Failed to delete notifications:", error);
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to delete notifications",
            500,
            "DeleteAllNotifications"
          )
    );
  }
};

// NEW FUNCTIONS - Additional utility functions for bounce management

// Check if user is eligible (can be called from frontend)
export const checkUserEligibilityForEmail = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await UserModel.findById(userId).select(
      "_id name email isAccountVerified stopEmailAttempts blocked lastActiveAt"
    );
    if (!user) {
      throw new AppError("User not found", 404, "CheckUserEligibility");
    }

    const eligibility = await isUserEligibleForEmail(user);

    res.status(200).json({
      success: true,
      userId,
      email: user.email,
      ...eligibility,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to check user eligibility",
            500,
            "CheckUserEligibility"
          )
    );
  }
};

// Get bounce statistics
export const getBounceStatistics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date(
      Date.now() - parseInt(days) * 24 * 60 * 60 * 1000
    );

    const [totalBounces, hardBounces, softBounces, suppressedEmails] =
      await Promise.all([
        Bounce.countDocuments({ createdAt: { $gte: cutoffDate } }),
        Bounce.countDocuments({
          bounceType: "hard",
          createdAt: { $gte: cutoffDate },
        }),
        Bounce.countDocuments({
          bounceType: "soft",
          createdAt: { $gte: cutoffDate },
        }),
        Bounce.countDocuments({ status: "suppressed" }),
      ]);

    // Get top bouncing domains
    const topDomains = await Bounce.aggregate([
      { $match: { createdAt: { $gte: cutoffDate } } },
      {
        $project: {
          domain: { $arrayElemAt: [{ $split: ["$email", "@"] }, 1] },
        },
      },
      { $group: { _id: "$domain", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalBounces,
        hardBounces,
        softBounces,
        suppressedEmails,
        hardBounceRate:
          totalBounces > 0
            ? ((hardBounces / totalBounces) * 100).toFixed(2) + "%"
            : "0%",
      },
      topBouncingDomains: topDomains,
      daysAnalyzed: parseInt(days),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to get bounce statistics",
            500,
            "GetBounceStatistics"
          )
    );
  }
};

// Remove email from suppression list (admin only)
export const removeEmailSuppression = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError(
        "Valid email is required",
        400,
        "RemoveEmailSuppression"
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Remove from bounce list or mark as resolved
    const bounce = await Bounce.findOne({
      email: normalizedEmail,
      status: "suppressed",
    });

    if (!bounce) {
      return res.status(404).json({
        success: false,
        message: "Email not found in suppression list",
      });
    }

    bounce.status = "resolved";
    bounce.updatedAt = new Date();
    await bounce.save();

    console.log(
      `📧 [BounceManagement] Removed ${normalizedEmail} from suppression list`
    );

    res.status(200).json({
      success: true,
      message: `Email ${normalizedEmail} removed from suppression list`,
      email: normalizedEmail,
      removedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to remove email suppression",
            500,
            "RemoveEmailSuppression"
          )
    );
  }
};

// Test single email (for debugging)
export const testSingleEmail = async (req, res, next) => {
  try {
    const { email, type = "test" } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400, "TestSingleEmail");
    }

    // Check eligibility first
    const testUser = {
      _id: "test_user",
      name: "Test User",
      email: email,
      isAccountVerified: true,
      stopEmailAttempts: false,
      blocked: false,
      lastActiveAt: new Date(),
    };

    const eligibility = await isUserEligibleForEmail(testUser);

    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: `Email not eligible: ${eligibility.reason}`,
        eligibility,
      });
    }

    // Create and send test email
    const mailOption = await createMailOption({
      to: email,
      subject: "Test Email from inkshaa",
      name: "Test User",
      email: email,
      message: "This is a test email to verify email functionality.",
      hasButton: true,
      buttonText: "Visit Website",
      buttonUrl: "https://inkshaa.onrender.com",
    });

    const result = await sendEmailWithRetries(mailOption, "test_user", type, 1);

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      email: email,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to send test email:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send test email",
      email: req.body.email,
    });
  }
};
