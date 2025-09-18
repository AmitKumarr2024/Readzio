import EmailLog from "../Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Notification from "../../servers/Models/Notification.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { sendEmailWithRetries } from "../../servers/helpers/sendEmailWithRetries.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { DAILY_POST_ADMIN_REPORT_TEMPLATE } from "../../servers/config/DailyPostEmailReport.js";
import transporter from "../config/nodeMailer.js";

// Sends daily post email to verified users with published posts
export const sendDailyPostEmail = async (req, res, next) => {
  const startTime = Date.now();

  try {
    console.log("📧 [DailyEmail] Starting daily post email process");

    // Verify SMTP connection
    let isSmtpAvailable = false;
    try {
      await transporter.verify();
      console.log("✅ [DailyEmail] SMTP Server is ready");
      isSmtpAvailable = true;
    } catch (error) {
      console.error("❌ [DailyEmail] SMTP Connection Error:", {
        message: error.message,
        code: error.code,
        command: error.command,
      });
      console.warn(
        "⚠️ [DailyEmail] Proceeding with limited email functionality"
      );
    }

    // Fetch eligible users
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: { $ne: true },
      email: { $exists: true, $ne: null, $ne: "" },
    })
      .select("_id name email")
      .lean({ virtuals: true });

    console.log(`📊 [DailyEmail] Found ${users.length} eligible users`);

    if (users.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No eligible users found for daily email",
        results: {
          total: 0,
          successful: 0,
          failed: 0,
          failureRate: "0%",
        },
        postCount: 0,
        processTime: Date.now() - startTime,
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Debug: Check total published posts
    const totalPublishedPosts = await PostModel.countDocuments({
      isPublished: true,
    });
    console.log(
      `📰 [DailyEmail] Total published posts in DB: ${totalPublishedPosts}`
    );

    // Fetch today's posts
    let posts = await PostModel.find({
      createdAt: { $gte: todayStart },
      isPublished: true,
      title: { $exists: true, $ne: "" },
    })
      .select(
        "title slug thumbnail author readTime likesCount commentsCount createdAt"
      )
      .populate("author", "name avatar")
      .sort({ likesCount: -1, commentsCount: -1 })
      .limit(15)
      .lean({ virtuals: true });

    console.log(`📰 [DailyEmail] Found ${posts.length} posts from today`);

    // Fallback: Fetch any published posts (no time limit)
    if (posts.length < 10) {
      const needed = 10 - posts.length;

      const randomFallbackPosts = await PostModel.aggregate([
        {
          $match: {
            createdAt: { $lt: todayStart },
            isPublished: true,
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

      const populatedFallback = await PostModel.populate(randomFallbackPosts, {
        path: "author",
        select: "name avatar",
      });

      posts = [...posts, ...populatedFallback];
      console.log(
        `📰 [DailyEmail] Added ${populatedFallback.length} fallback posts`
      );
    }

    // If no posts, create a fallback post
    if (posts.length === 0) {
      console.warn(
        "⚠️ [DailyEmail] No posts available. Creating fallback post."
      );

      const admin = await UserModel.findOne({ role: "admin" });
      if (admin) {
        await PostModel.create({
          title: "Explore Our Latest Content",
          slug: `fallback-post-${Date.now()}`,
          author: admin._id,
          postType: "Blog",
          category: "General",
          blocks: [
            {
              id: "1",
              type: "text",
              text: "Check out our platform for the latest updates!",
            },
          ],
          isPublished: true,
          createdAt: new Date(),
        });
        console.log("✅ [DailyEmail] Fallback post created");

        // Re-fetch the newly created post
        posts = await PostModel.find({
          isPublished: true,
          title: "Explore Our Latest Content",
        })
          .select(
            "title slug thumbnail author readTime likesCount commentsCount createdAt"
          )
          .populate("author", "name avatar")
          .lean({ virtuals: true });
      }
    }

    const postSlugs = posts.map((post) => post.slug);
    const results = [];

    // Skip email sending if SMTP is unavailable
    if (!isSmtpAvailable) {
      console.warn("⚠️ [DailyEmail] SMTP unavailable. Skipping email sending.");
      return res.status(200).json({
        success: true,
        message: "SMTP unavailable. No emails sent.",
        results: {
          total: users.length,
          successful: 0,
          failed: users.length,
          failureRate: "100%",
        },
        postCount: posts.length,
        processTime: Date.now() - startTime,
      });
    }

    // Process users in batches
    const batchSize = 50;
    const userBatches = [];
    for (let i = 0; i < users.length; i += batchSize) {
      userBatches.push(users.slice(i, i + batchSize));
    }

    console.log(
      `🔄 [DailyEmail] Processing ${userBatches.length} batches of users`
    );

    for (let batchIndex = 0; batchIndex < userBatches.length; batchIndex++) {
      const batch = userBatches[batchIndex];
      console.log(
        `📦 [DailyEmail] Processing batch ${batchIndex + 1}/${
          userBatches.length
        } (${batch.length} users)`
      );

      const batchPromises = batch.map(async (user) => {
        try {
          const popularPost = posts[0];
          const subject = popularPost
            ? `${popularPost.title.substring(0, 50)}${
                popularPost.title.length > 50 ? "..." : ""
              } | inkshaa Daily Digest`
            : `Your inkshaa Daily Brief – ${posts.length} Fresh Posts for You`;

          const mailOption = createMailOption({
            to: user.email,
            subject: subject,
            name: user.name || "Reader",
            email: user.email,
            hasButton: true,
            buttonText: "Read Today's Posts",
            buttonUrl: "https://inksha-uedq.onrender.com/explore",
            posts,
          });

          console.log(`📧 [DailyEmail] Sending to ${user.email}`);

          await sendEmailWithRetries(mailOption, user._id, "daily_digest", 3);

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

          await recordActivity({
            userId: user._id,
            action: "DAILY_EMAIL_FAILED",
            message: `Daily digest failed for ${user.email}: ${error.message}`,
            metadata: { postCount: posts.length, error: error.message },
          });

          return {
            email: user.email,
            success: false,
            error: error.message,
            userId: user._id,
          };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          results.push(result.value);
        } else {
          const user = batch[index];
          results.push({
            email: user.email,
            success: false,
            error: result.reason?.message || "Unknown error",
            userId: user._id,
          });
        }
      });

      if (batchIndex < userBatches.length - 1) {
        console.log("⏳ [DailyEmail] Waiting between batches...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    console.log(
      `✅ [DailyEmail] Completed: ${successCount} success, ${failedCount} failed`
    );

    // Admin report
    const admin = await UserModel.findOne({ role: "admin" }).lean();
    if (admin && isSmtpAvailable) {
      try {
        const failedUsers = results.filter((r) => !r.success).slice(0, 10);

        const adminMailOption = createMailOption({
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

    const processingTime = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      message: isSmtpAvailable
        ? "Daily post emails processed successfully"
        : "SMTP unavailable. No emails sent.",
      results: {
        total: results.length || users.length,
        successful: successCount,
        failed: failedCount,
        failureRate:
          results.length > 0
            ? ((failedCount / results.length) * 100).toFixed(2) + "%"
            : "100%",
      },
      postCount: posts.length,
      processTime: processingTime,
      performance: {
        avgTimePerEmail:
          results.length > 0 ? Math.round(processingTime / results.length) : 0,
        totalBatches: userBatches.length,
        batchSize,
      },
    });
  } catch (error) {
    console.error("💥 [DailyEmail] Critical error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to process daily post emails",
      error: error.message || "Internal server error",
      processTime: Date.now() - startTime,
    });
  }
};

// Unchanged functions
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
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      const startDate = new Date(istDate);
      startDate.setUTCHours(18, 30, 0, 0); // 00:00 IST
      const endDate = new Date(istDate);
      endDate.setUTCHours(18 + 23, 30 + 59, 59, 999); // 23:59 IST

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
          stats: [{ $group: { _id: "$emailStatus", count: { $sum: 1 } } }],
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

    return res.status(200).json({
      success: true,
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

    return res.status(500).json({
      success: false,
      message: "Failed to fetch email report",
      error: error.message || "Internal server error",
    });
  }
};

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

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} notifications`,
      deletedCount: result.deletedCount,
      totalFound: countBefore,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ [Cleanup] Failed to delete notifications:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notifications",
      error: error.message || "Internal server error",
    });
  }
};
