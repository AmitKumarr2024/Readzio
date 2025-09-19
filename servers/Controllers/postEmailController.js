// servers/controllers/dailyEmailController.js
import EmailLog from "../../servers/Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Notification from "../../servers/Models/Notification.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { sendEmailWithRetries } from "../../servers/helpers/sendEmailWithRetries.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { DAILY_POST_ADMIN_REPORT_TEMPLATE } from "../../servers/config/DailyPostEmailReport.js";

/**
 * Sends daily digest emails to eligible users in batches.
 * Uses createMailOption(...) to build mail options (which sets the correct 'from').
 */
export const sendDailyPostEmail = async (req, res, next) => {
  const startTime = Date.now();

  try {
    console.log("📧 [DailyEmail] Starting daily post email process");

    // fetch eligible users
    const users =
      (await UserModel.find({
        isAccountVerified: true,
        blocked: { $ne: true },
        stopEmailAttempts: { $ne: true },
        email: { $exists: true, $ne: "" },
      })
        .select("_id name email")
        .lean()) || [];

    console.log(`📊 [DailyEmail] Found ${users.length} eligible users`);

    if (!users.length) {
      return res.status(200).json({
        message: "No eligible users found for daily email",
        results: [],
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    // today's posts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let posts =
      (await PostModel.find({
        isPublished: true,
        createdAt: { $gte: todayStart },
        title: { $exists: true, $ne: "" },
      })
        .select(
          "title slug thumbnail author readTime likesCount commentsCount createdAt"
        )
        .populate("author", "name avatar")
        .sort({ likesCount: -1, commentsCount: -1 })
        .limit(15)
        .lean()) || [];

    console.log(`📰 [DailyEmail] Found ${posts.length} posts from today`);

    // fallback up-to-30-days if not enough posts
    if (posts.length < 10) {
      const needed = 10 - posts.length;
      console.log(
        `🔄 [DailyEmail] Need ${needed} more posts, searching older posts...`
      );

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentPosts =
        (await PostModel.find({
          isPublished: true,
          createdAt: { $gte: thirtyDaysAgo, $lt: todayStart },
          title: { $exists: true, $ne: "" },
        })
          .sort({ likesCount: -1, commentsCount: -1 })
          .limit(needed)
          .populate("author", "name avatar")
          .lean()) || [];

      posts = posts.concat(recentPosts);
      console.log(
        `📰 [DailyEmail] Added ${recentPosts.length} posts from last 30 days`
      );
    }

    if (!posts.length) {
      console.warn("⚠️ [DailyEmail] No posts available. Skipping email send.");
      return res.status(200).json({ message: "No posts available to send." });
    }

    // rank and limit to top 10
    posts = posts
      .sort(
        (a, b) =>
          (b.likesCount || 0) +
          (b.commentsCount || 0) -
          ((a.likesCount || 0) + (a.commentsCount || 0))
      )
      .slice(0, 10);

    const results = [];
    const batchSize = 50;
    const batches = [];

    for (let i = 0; i < users.length; i += batchSize) {
      batches.push(users.slice(i, i + batchSize));
    }

    console.log(
      `🔄 [DailyEmail] Processing ${batches.length} batches of users`
    );

    // process batches sequentially (so we can add delays/rate-limit easily)
    for (let bi = 0; bi < batches.length; bi++) {
      const batch = batches[bi];
      console.log(
        `📦 [DailyEmail] Processing batch ${bi + 1}/${batches.length} (${
          batch.length
        } users)`
      );

      // use Promise.allSettled so one failure doesn't reject the whole batch
      const settled = await Promise.allSettled(
        batch.map(async (user) => {
          try {
            const subject = posts[0]?.title
              ? `${posts[0].title.substring(0, 50)}${
                  posts[0].title.length > 50 ? "..." : ""
                } | Inksha Daily Digest`
              : "Inksha Daily Digest – Fresh Posts for You";

            // IMPORTANT: do NOT override 'from' here — let createMailOption use SENDER_EMAIL
            const mailOption = createMailOption({
              to: user.email,
              subject,
              name: user.name || "Reader",
              email: user.email,
              hasButton: true,
              buttonText: "Read Today's Posts",
              buttonUrl: "https://inksha-uedq.onrender.com/explore",
              posts,
            });

            // send with retries (sendEmailWithRetries logs SMTP errors)
            await sendEmailWithRetries(mailOption, user._id, "daily_digest", 3);

            // record activity for successful send
            await recordActivity({
              userId: user._id,
              action: "DAILY_EMAIL_SENT",
              message: `Daily digest sent successfully to ${user.email}`,
              metadata: { postCount: posts.length },
            });

            return { email: user.email, success: true };
          } catch (err) {
            // log full error object for debugging
            console.error(`❌ [DailyEmail] Failed for ${user.email}:`, {
              message: err?.message,
              stack: err?.stack,
              name: err?.name,
              // include additional properties if present
              ...(err && typeof err === "object"
                ? Object.keys(err).reduce((acc, k) => {
                    acc[k] = err[k];
                    return acc;
                  }, {})
                : {}),
            });

            // record failure activity
            try {
              await recordActivity({
                userId: user._id,
                action: "DAILY_EMAIL_FAILED",
                message: `Daily digest failed for ${user.email}: ${
                  err?.message || "unknown error"
                }`,
                metadata: { error: err?.message || JSON.stringify(err || {}) },
              });
            } catch (recordErr) {
              console.error(
                "⚠️ Failed to recordActivity for failed email:",
                recordErr
              );
            }

            return {
              email: user.email,
              success: false,
              error: err?.message || String(err),
            };
          }
        })
      );

      // collect results from this batch
      settled.forEach((r) => {
        if (r.status === "fulfilled") results.push(r.value);
        else results.push({ success: false, error: r.reason });
      });

      // small delay between batches to reduce rate-limit risk
      if (bi < batches.length - 1) {
        console.log("⏳ [DailyEmail] Waiting 2s before next batch...");
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.length - successCount;

    console.log(
      `✅ [DailyEmail] Completed: ${successCount} success, ${failedCount} failed`
    );

    // Send admin report (use createMailOption — it will use SENDER_EMAIL as from)
    try {
      const adminUser = await UserModel.findOne({ role: "admin" }).lean();
      const adminEmail = adminUser?.email || "inksha.official@gmail.com";

      const adminMailOption = createMailOption({
        to: adminEmail,
        subject: `Daily Email Report - ${successCount}/${results.length} Sent`,
        name: adminUser?.name || "Admin",
        email: adminEmail,
        customTemplate: DAILY_POST_ADMIN_REPORT_TEMPLATE,
        customData: {
          totalUsers: users.length,
          successCount,
          failedCount,
          failedUsers: results.filter((r) => !r.success).slice(0, 10),
          postCount: posts.length,
          processTimeSeconds: Math.round((Date.now() - startTime) / 1000),
        },
      });

      await sendEmailWithRetries(
        adminMailOption,
        adminUser?._id || null,
        "report",
        2
      );
      console.log("📊 [DailyEmail] Admin report sent successfully");
    } catch (e) {
      console.error("❌ [DailyEmail] Failed to send admin report:", e);
    }

    // reply
    return res.status(200).json({
      message: "Daily emails processed",
      summary: { successCount, failedCount, total: results.length },
      postCount: posts.length,
      processTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    console.error("💥 [DailyEmail] Critical error:", error);
    return next(
      error instanceof AppError
        ? error
        : new AppError(
            error?.message || "Failed to send daily emails",
            500,
            "SendDailyPostEmail"
          )
    );
  }
};

// Enhanced report function with better filtering and pagination
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

    // Enhanced date filtering with timezone support
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
      startDate.setUTCHours(18, 30, 0, 0); // 00:00 IST
      const endDate = new Date(istDate);
      endDate.setUTCHours(18 + 23, 30 + 59, 59, 999); // 23:59 IST

      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Status filtering
    if (
      status &&
      ["sent", "failed", "suppressed", "pending"].includes(status)
    ) {
      query.emailStatus = status;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 per page

    // Enhanced aggregation pipeline for better reporting
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

    // Process stats for better reporting
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
      filters: {
        date,
        status,
        type,
      },
    });
  } catch (error) {
    console.error("❌ [EmailReport] Failed to fetch email report:", error);

    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to fetch email report",
            500,
            "GetDailyPostEmailReport",
            "Error in getDailyPostEmailReport"
          )
    );
  }
};

// Enhanced notification cleanup with better logging
export const deleteAllNotifications = async (req, res, next) => {
  try {
    console.log("🗑️ [Cleanup] Starting notification cleanup...");

    // Get count before deletion for logging
    const countBefore = await Notification.countDocuments({});

    const result = await Notification.deleteMany({});

    console.log(
      `✅ [Cleanup] Deleted ${result.deletedCount} notifications (${countBefore} total found)`
    );

    // Record activity for audit trail
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
            "DeleteAllNotifications",
            "Error in deleteAllNotifications"
          )
    );
  }
};
