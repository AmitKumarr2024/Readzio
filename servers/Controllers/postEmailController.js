import EmailLog from "../../servers/Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Notification from "../../servers/Models/Notification.js";
import Bounce from "../../servers/Models/BounceModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { sendEmailWithRetries } from "../../servers/helpers/sendEmailWithRetries.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { DAILY_POST_ADMIN_REPORT_TEMPLATE } from "../../servers/config/DailyPostEmailReport.js";

// Helper function to check if user is eligible
async function isUserEligibleForEmail(user) {
  console.log(
    `[EligibilityCheck] Checking user: ${user.email}, ID: ${user._id}`
  );
  if (!user.isAccountVerified)
    return { eligible: false, reason: "Not verified" };
  if (user.stopEmailAttempts)
    return { eligible: false, reason: "Email stopped" };
  if (user.blocked) return { eligible: false, reason: "User blocked" };
  if (!user.email || user.email.trim() === "")
    return { eligible: false, reason: "No email" };

  const isSuppressed = await Bounce.isEmailSuppressed(user.email);
  console.log(
    `[EligibilityCheck] Email ${user.email} suppressed: ${isSuppressed}`
  );
  if (isSuppressed)
    return { eligible: false, reason: "Email suppressed due to bounces" };

  if (user.lastActiveAt) {
    const daysSinceActive =
      (Date.now() - new Date(user.lastActiveAt).getTime()) /
      (1000 * 60 * 60 * 24);
    console.log(
      `[EligibilityCheck] Days since active for ${user.email}: ${daysSinceActive}`
    );
    if (daysSinceActive > 60)
      return { eligible: false, reason: "Inactive for 60+ days" };
  }

  const recentEmails = await EmailLog.countDocuments({
    email: user.email,
    type: "daily_digest",
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  console.log(
    `[EligibilityCheck] Recent emails for ${user.email}: ${recentEmails}`
  );
  if (recentEmails >= 2)
    return { eligible: false, reason: "Already sent today" };

  return { eligible: true, reason: "All checks passed" };
}

export const sendDailyPostEmail = async (req, res, next) => {
  const startTime = Date.now();
  console.log("📧 [DailyEmail] Starting daily post email process");

  try {
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: { $ne: true },
      email: { $exists: true, $ne: null, $ne: "" },
      blocked: { $ne: true },
      $or: [
        {
          lastActiveAt: {
            $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        },
        { lastActiveAt: { $exists: false } },
      ],
    })
      .select("_id name email lastActiveAt isAccountVerified")
      .lean({ virtuals: true });
    console.log(
      `📊 [DailyEmail] Found users:`,
      users.map((u) => ({
        id: u._id,
        email: u.email,
        isAccountVerified: u.isAccountVerified,
      }))
    );

    if (users.length === 0) {
      return res.status(200).json({
        message: "No potential users found for daily email",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    const eligibilityChecks = await Promise.all(
      users.map(async (user) => {
        const eligibility = await isUserEligibleForEmail(user);
        console.log(
          `[EligibilityCheck] Result for ${user.email}:`,
          eligibility
        );
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
      `[DailyEmail] Eligible users: ${eligibleUsers.length}, Ineligible users: ${ineligibleUsers.length}`
    );

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

    // Log before fetching posts
    console.log(
      `[DailyEmail] Fetching posts for eligible users:`,
      eligibleUsers.map((u) => ({ id: u._id, email: u.email }))
    );

    // Log query details
    const postQuery = {
      isPublished: true,
      title: { $exists: true, $ne: "" },
    };
    console.log(`[DailyEmail] Post query:`, JSON.stringify(postQuery, null, 2));
    console.log(
      `[DailyEmail] Querying collection: ${PostModel.collection.name}`
    );
    console.log(`[DailyEmail] Database: ${PostModel.db.name}`);

    // Fetch any 10 published posts, prioritizing recent and popular
    let posts = await PostModel.find(postQuery)
      .select(
        "title slug thumbnail author readTime likesCount commentsCount createdAt"
      )
      .populate("author", "name avatar")
      .sort({ createdAt: -1, likesCount: -1, commentsCount: -1 })
      .limit(10)
      .lean({ virtuals: true });

    // Log raw post results
    console.log(
      `[DailyEmail] Raw posts fetched:`,
      posts.map((p) => ({
        id: p._id,
        title: p.title,
        isPublished: p.isPublished,
        createdAt: p.createdAt,
      }))
    );
    console.log(`[DailyEmail] Total posts found: ${posts.length}`);

    if (posts.length === 0) {
      // Additional debug query to check all posts
      const allPostsCount = await PostModel.countDocuments({});
      console.log(`[DailyEmail] Total posts in collection: ${allPostsCount}`);
      const publishedPostsCount = await PostModel.countDocuments({
        isPublished: true,
      });
      console.log(`[DailyEmail] Total published posts: ${publishedPostsCount}`);
      const postsWithTitleCount = await PostModel.countDocuments({
        isPublished: true,
        title: { $exists: true, $ne: "" },
      });
      console.log(
        `[DailyEmail] Total published posts with title: ${postsWithTitleCount}`
      );

      return res.status(200).json({
        message: "No posts available to send. Skipped daily email.",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
        debug: {
          totalPosts: allPostsCount,
          publishedPosts: publishedPostsCount,
          postsWithTitle: postsWithTitleCount,
        },
      });
    }

    const results = [];
    const batchSize = 50;
    const userBatches = [];
    for (let i = 0; i < eligibleUsers.length; i += batchSize) {
      userBatches.push(eligibleUsers.slice(i, i + batchSize));
    }
    console.log(`[DailyEmail] Created ${userBatches.length} batches`);

    for (let batchIndex = 0; bagtchIndex < userBatches.length; batchIndex++) {
      const batch = userBatches[batchIndex];
      console.log(
        `[DailyEmail] Processing batch ${batchIndex + 1}:`,
        batch.map((u) => u.email)
      );

      const batchPromises = batch.map(async (user) => {
        try {
          const popularPost = posts[0];
          const subject = popularPost
            ? `${popularPost.title.substring(0, 50)}${
                popularPost.title.length > 50 ? "..." : ""
              } | inkshaa Daily Digest`
            : `Your inkshaa Daily Brief – ${posts.length} Fresh Posts for You`;
          console.log(
            `[DailyEmail] Generated subject for ${user.email}: ${subject}`
          );

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
          console.log(
            `[DailyEmail] Mail options for ${user.email}:`,
            JSON.stringify(mailOption, null, 2)
          );

          console.log(`[DailyEmail] Sending email to ${user.email}...`);
          const emailResult = await sendEmailWithRetries(
            mailOption,
            user._id,
            "daily_digest",
            3
          );
          console.log(
            `[DailyEmail] Email sent to ${user.email}:`,
            emailResult.messageId
          );

          await recordActivity({
            userId: user._id,
            action: "DAILY_EMAIL_SENT",
            message: `Daily digest sent successfully to ${user.email}`,
            metadata: {
              postCount: posts.length,
              messageId: emailResult.messageId,
            },
          });

          return {
            email: user.email,
            success: true,
            userId: user._id,
            messageId: emailResult.messageId,
          };
        } catch (error) {
          console.error(
            `[DailyEmail] Failed for ${user.email}:`,
            error.message,
            error.stack
          );

          await recordActivity({
            userId: user._id,
            action: "DAILY_EMAIL_FAILED",
            message: `Daily digest failed for ${user.email}: ${error.message}`,
            metadata: { postCount: posts.length, error: error.message },
          });

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
              console.log(`[DailyEmail] Recorded bounce for ${user.email}`);
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
      console.log(
        `[DailyEmail] Batch ${batchIndex + 1} results:`,
        batchResults.map((r) => ({
          status: r.status,
          value: r.status === "fulfilled" ? r.value : r.reason,
        }))
      );
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

      if (batchIndex < userBatches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;
    console.log(
      `[DailyEmail] Final results: ${successCount} success, ${failedCount} failed`
    );

    const admin = await UserModel.findOne({ role: "admin" }).lean();
    if (admin) {
      try {
        const failedUsers = results.filter((r) => !r.success).slice(0, 10);
        console.log(`[DailyEmail] Admin report failed users:`, failedUsers);

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
            totalPotentialUsers: users.length,
            eligibleUsers: eligibleUsers.length,
            ineligibleReasons: ineligibleUsers.reduce((acc, user) => {
              acc[user.reason] = (acc[user.reason] || 0) + 1;
              return acc;
            }, {}),
          },
        });
        console.log(
          `[DailyEmail] Admin mail options:`,
          JSON.stringify(adminMailOption, null, 2)
        );

        console.log(`[DailyEmail] Sending admin report to ${admin.email}...`);
        await sendEmailWithRetries(adminMailOption, admin._id, "report", 3);
        console.log("📊 [DailyEmail] Admin report sent successfully");
      } catch (adminError) {
        console.error(
          "❌ [DailyEmail] Failed to send admin report:",
          adminError.message
        );
      }
    }

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
        avgTimePerEmail:
          Math.round((Date.now() - startTime) / results.length) || 0,
        totalBatches: userBatches.length,
        batchSize,
      },
    });
  } catch (error) {
    console.error(
      "💥 [DailyEmail] Critical error:",
      error.message,
      error.stack
    );
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

export const getDailyPostEmailReport = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      date,
      status,
      type = "daily_digest",
    } = req.query;
    console.log(`[EmailReport] Query params:`, {
      page,
      limit,
      date,
      status,
      type,
    });

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
      console.log(`[EmailReport] Date filter:`, { startDate, endDate });
    }

    if (
      status &&
      ["sent", "failed", "suppressed", "pending"].includes(status)
    ) {
      query.emailStatus = status;
      console.log(`[EmailReport] Status filter: ${status}`);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

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
    console.log(
      `[EmailReport] Aggregation pipeline:`,
      JSON.stringify(pipeline, null, 2)
    );

    const [result] = await EmailLog.aggregate(pipeline);
    const { logs, stats, totalCount } = result;
    const total = totalCount[0]?.count || 0;
    console.log(`[EmailReport] Aggregation result:`, {
      totalLogs: logs.length,
      total,
    });

    const statusStats = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});
    console.log(`[EmailReport] Status stats:`, statusStats);

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
    console.error(
      "❌ [EmailReport] Failed to fetch email report:",
      error.message,
      error.stack
    );
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

export const deleteAllNotifications = async (req, res, next) => {
  try {
    console.log("🗑️ [Cleanup] Starting notification cleanup...");
    const countBefore = await Notification.countDocuments({});
    console.log(`[Cleanup] Notifications before: ${countBefore}`);

    const result = await Notification.deleteMany({});
    console.log(`[Cleanup] Delete result:`, result);

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
    console.error(
      "❌ [Cleanup] Failed to delete notifications:",
      error.message,
      error.stack
    );
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

export const checkUserEligibilityForEmail = async (req, res, next) => {
  try {
    const { userId } = req.params;
    console.log(
      `[EligibilityCheck] Checking eligibility for userId: ${userId}`
    );

    const user = await UserModel.findById(userId).select(
      "_id name email stopEmailAttempts blocked lastActiveAt isAccountVerified"
    );
    console.log(`[EligibilityCheck] Found user:`, user);

    if (!user) {
      throw new AppError("User not found", 404, "CheckUserEligibility");
    }

    const eligibility = await isUserEligibleForEmail(user);
    console.log(`[EligibilityCheck] Eligibility result:`, eligibility);

    res.status(200).json({
      success: true,
      userId,
      email: user.email,
      ...eligibility,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [EligibilityCheck] Failed:", error.message, error.stack);
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

export const getBounceStatistics = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    console.log(`[BounceStats] Fetching stats for ${days} days`);

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
    console.log(`[BounceStats] Counts:`, {
      totalBounces,
      hardBounces,
      softBounces,
      suppressedEmails,
    });

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
    console.log(`[BounceStats] Top domains:`, topDomains);

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
    console.error("❌ [BounceStats] Failed:", error.message, error.stack);
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

export const removeEmailSuppression = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log(`[BounceManagement] Removing suppression for email: ${email}`);

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError(
        "Valid email is required",
        400,
        "RemoveEmailSuppression"
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const bounce = await Bounce.findOne({
      email: normalizedEmail,
      status: "suppressed",
    });
    console.log(`[BounceManagement] Bounce record:`, bounce);

    if (!bounce) {
      return res.status(404).json({
        success: false,
        message: "Email not found in suppression list",
      });
    }

    bounce.status = "resolved";
    bounce.updatedAt = new Date();
    await bounce.save();
    console.log(`[BounceManagement] Updated bounce record:`, bounce);

    res.status(200).json({
      success: true,
      message: `Email ${normalizedEmail} removed from suppression list`,
      email: normalizedEmail,
      removedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [BounceManagement] Failed:", error.message, error.stack);
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

export const testSingleEmail = async (req, res, next) => {
  try {
    const { email, type = "test" } = req.body;
    console.log(`[TestEmail] Testing email: ${email}, type: ${type}`);

    if (!email) {
      throw new AppError("Email is required", 400, "TestSingleEmail");
    }

    const testUser = {
      _id: "test_user",
      name: "Test User",
      email: email,
      stopEmailAttempts: false,
      blocked: false,
      lastActiveAt: new Date(),
      isAccountVerified: true,
    };
    console.log(`[TestEmail] Test user created:`, testUser);

    const eligibility = await isUserEligibleForEmail(testUser);
    console.log(`[TestEmail] Eligibility:`, eligibility);

    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: `Email not eligible: ${eligibility.reason}`,
        eligibility,
      });
    }

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
    console.log(
      `[TestEmail] Mail options:`,
      JSON.stringify(mailOption, null, 2)
    );

    console.log(`[TestEmail] Sending test email to ${email}...`);
    const result = await sendEmailWithRetries(mailOption, "test_user", type, 1);
    console.log(`[TestEmail] Email sent to ${email}:`, result.messageId);

    res.status(200).json({
      success: true,
      message: "Test email sent successfully",
      email: email,
      messageId: result.messageId,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [TestEmail] Failed:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to send test email",
      email: req.body.email,
    });
  }
};
