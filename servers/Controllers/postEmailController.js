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
        message: "No eligible users found for daily email",
        results: [],
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

    // If still no posts, create a fallback post or send generic email
    if (posts.length === 0) {
      console.warn(
        "⚠️ [DailyEmail] No posts available. Using fallback strategy."
      );

      if (totalPublishedPosts === 0) {
        console.log("🛠️ [DailyEmail] Creating fallback post");
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

      if (posts.length === 0) {
        console.log("📧 [DailyEmail] Sending generic email without posts");
        const results = [];
        for (const user of users) {
          try {
            const subject = "Your inkshaa Daily Brief – Stay Connected!";
            const genericMailOption = createMailOption({
              to: user.email,
              subject: subject,
              name: user.name || "Reader",
              email: user.email,
              hasButton: true,
              buttonText: "Explore inkshaa",
              buttonUrl: "https://inksha-uedq.onrender.com/explore",
              posts: [], // Empty posts array
            });

            console.log(
              `📧 [DailyEmail] Sending generic email to ${user.email}`
            );

            await sendEmailWithRetries(
              genericMailOption,
              user._id,
              "daily_digest",
              3
            );

            await recordActivity({
              userId: user._id,
              action: "DAILY_EMAIL_SENT",
              message: `Generic daily digest sent to ${user.email}`,
              metadata: { postCount: 0 },
            });

            results.push({
              email: user.email,
              success: true,
              userId: user._id,
            });
          } catch (error) {
            console.error(
              `❌ [DailyEmail] Generic email failed for ${user.email}:`,
              error.message
            );
            await recordActivity({
              userId: user._id,
              action: "DAILY_EMAIL_FAILED",
              message: `Generic daily digest failed for ${user.email}: ${error.message}`,
              metadata: { postCount: 0, error: error.message },
            });

            results.push({
              email: user.email,
              success: false,
              error: error.message,
              userId: user._id,
            });
          }
        }

        const successCount = results.filter((r) => r.success).length;
        const failedCount = results.filter((r) => !r.success).length;

        // Admin report for generic email
        const admin = await UserModel.findOne({ role: "admin" }).lean();
        if (admin) {
          try {
            const failedUsers = results.filter((r) => !r.success).slice(0, 10);

            const adminMailOption = createMailOption({
              to: admin.email,
              subject: `Daily Email Report - Generic Email Sent (${successCount}/${results.length})`,
              name: admin.name || "Admin",
              email: admin.email,
              customTemplate: DAILY_POST_ADMIN_REPORT_TEMPLATE,
              customData: {
                totalUsers: results.length,
                successCount,
                failedCount,
                failedUsers,
                postCount: 0,
                processTime: Math.round((Date.now() - startTime) / 1000),
                topPosts: [],
              },
            });

            await sendEmailWithRetries(adminMailOption, admin._id, "report", 3);
            console.log("📊 [DailyEmail] Admin report sent for generic email");
          } catch (adminError) {
            console.error(
              "❌ [DailyEmail] Failed to send admin report:",
              adminError.message
            );
          }
        }

        return res.status(200).json({
          message: "No posts available. Sent generic emails.",
          results: {
            total: results.length,
            successful: successCount,
            failed: failedCount,
            failureRate:
              ((failedCount / results.length) * 100).toFixed(2) + "%",
          },
          postCount: 0,
          processTime: Date.now() - startTime,
        });
      }
    }

    // Sort posts by engagement
    posts = posts
      .sort(
        (a, b) =>
          (b.likesCount || 0) +
          (b.commentsCount || 0) -
          ((a.likesCount || 0) + (a.commentsCount || 0))
      )
      .slice(0, 10);

    const postSlugs = posts.map((post) => post.slug);
    const results = [];

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
    if (admin) {
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

    res.status(200).json({
      message: "Daily post emails processed successfully",
      results: {
        total: results.length,
        successful: successCount,
        failed: failedCount,
        failureRate: ((failedCount / results.length) * 100).toFixed(2) + "%",
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

    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to process daily post emails",
            500,
            "SendDailyPostEmail",
            "Critical error in sendDailyPostEmail"
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
