import EmailLog from "../../servers/Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Notification from "../../servers/Models/Notification.js";
import { AppError } from "../../servers/Utils/AppError.js";
// ✅ IMPORT THE ENHANCED VERSION
import { sendEmailWithRetries } from "../../servers/helpers/sendEmailWithRetries.js"; // or wherever you put it
import createMailOption from "../../servers/helpers/emailHelper.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { DAILY_POST_ADMIN_REPORT_TEMPLATE } from "../../servers/config/DailyPostEmailReport.js";

// Sends daily post email to verified users with published posts
export const sendDailyPostEmail = async (req, res, next) => {
  try {
    const users = await UserModel.find({
      isAccountVerified: true,
      // ✅ REMOVE THIS - bounce system handles suppression
      // stopEmailAttempts: false,
    }).lean({ virtuals: true });

    if (users.length === 0) {
      return res.status(200).json({
        message: "No verified users to send emails to",
        results: [],
        postCount: 0,
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Step 1: Fetch today's published posts
    let posts = await PostModel.find({
      createdAt: { $gte: todayStart },
      isPublished: true,
    })
      .select("title slug thumbnail author readTime likesCount commentsCount")
      .populate("author", "name avatar")
      .lean({ virtuals: true });

    // Step 2: If less than 10, fill with older random published posts
    if (posts.length < 10) {
      const needed = 10 - posts.length;

      const randomFallbackPosts = await PostModel.aggregate([
        { $match: { createdAt: { $lt: todayStart }, isPublished: true } },
        { $sample: { size: needed } },
      ]);

      const populatedFallback = await PostModel.populate(randomFallbackPosts, {
        path: "author",
        select: "name avatar",
      });

      posts = [...posts, ...populatedFallback];
    }

    // Step 3: If no posts found even in fallback, skip sending
    if (posts.length === 0) {
      console.warn("[DailyEmail] No posts available at all. Skipping email.");
      return res.status(200).json({
        message: "No posts available to send. Skipped email.",
        results: [],
        postCount: 0,
      });
    }

    const results = [];

    // Step 4: Send email to each verified user
    for (const user of users) {
      const subject =
        posts.length > 0
          ? `${
              posts[Math.floor(Math.random() * posts.length)].title
            } | inkshaa Daily Digest`
          : `Your inkshaa Daily Brief – Fresh Posts for You (${posts.length} Posts)`;

      const mailOption = createMailOption({
        to: user.email,
        subject: subject,
        name: user.name || "User",
        email: user.email,
        hasButton: true,
        buttonText: "Read Posts",
        buttonUrl: "https://inksha-uedq.onrender.com",
        posts,
      });

      try {
        // ✅ USE THE ENHANCED sendEmailWithRetries (it handles EmailLog automatically)
        const emailResult = await sendEmailWithRetries(
          mailOption,
          user._id,
          "daily_digest" // email type
        );

        // ✅ Record success activity
        await recordActivity({
          userId: user._id,
          action: "EMAIL_SENT",
          message: `Daily post email sent to ${user.email} after ${emailResult.attempts} attempt(s)`,
        });

        results.push({
          email: user.email,
          success: true,
          attempts: emailResult.attempts,
          logId: emailResult.logId,
        });
      } catch (error) {
        // ✅ Enhanced error handling - EmailLog is already created by sendEmailWithRetries
        console.error(
          `Failed to send daily email to ${user.email}:`,
          error.message
        );

        await recordActivity({
          userId: user._id,
          action: "EMAIL_FAILED_ALL_ATTEMPTS",
          message: `Daily post email failed for ${user.email}: ${error.message}`,
        });

        results.push({
          email: user.email,
          success: false,
          error: error.message,
          suppressed:
            error.statusCode === 400 && error.message.includes("suppressed"),
        });
      }
    }

    // Step 5: Send report to admin
    const admin = await UserModel.findOne({ role: "admin" }).lean();
    if (admin) {
      const adminMailOption = createMailOption({
        to: admin.email,
        subject: "Daily Post Email Report",
        name: admin.name || "Admin",
        email: admin.email,
        customTemplate: DAILY_POST_ADMIN_REPORT_TEMPLATE,
        customData: {
          totalUsers: results.length,
          successCount: results.filter((r) => r.success).length,
          failedCount: results.filter((r) => !r.success).length,
          suppressedCount: results.filter((r) => r.suppressed).length,
          failedUsers: results.filter((r) => !r.success),
          postCount: posts.length,
          date: new Date().toISOString().split("T")[0],
        },
      });

      try {
        await sendEmailWithRetries(adminMailOption, admin._id, "report");
      } catch (error) {
        console.error("Failed to send admin report:", error.message);
      }
    }

    res.status(200).json({
      message: "Daily post emails processed",
      results,
      postCount: posts.length,
      summary: {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success && !r.suppressed).length,
        suppressed: results.filter((r) => r.suppressed).length,
      },
    });
  } catch (error) {
    next(
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Failed to process daily post emails",
            500,
            "SendDailyPostEmail",
            "Error in sendDailyPostEmail"
          )
    );
  }
};

// Retrieves daily post email report with pagination and optional date filter
export const getDailyPostEmailReport = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, date, status } = req.query;

    const query = { type: "daily_digest" };

    // If a date is provided, apply IST-safe date filtering
    if (date) {
      const istDate = new Date(date);
      const startDate = new Date(istDate);
      startDate.setUTCHours(18, 30, 0, 0); // 00:00 IST
      const endDate = new Date(istDate);
      endDate.setUTCHours(18 + 23, 30 + 59, 59, 999); // 23:59 IST

      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    // ✅ Filter by email status if provided
    if (status) {
      query.emailStatus = status;
    }

    // Fetch paginated logs
    const logs = await EmailLog.find(query)
      .select(
        "userId email emailStatus emailAttempts emailLastError bounceType bounceReason suppressedAt createdAt updatedAt"
      )
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean({ virtuals: true });

    const total = await EmailLog.countDocuments(query);

    // ✅ Get summary stats
    const stats = await EmailLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$emailStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {});

    res.status(200).json({
      logs,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
      summary,
    });
  } catch (error) {
    console.error("[Error] Failed to fetch email report:", error);

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

// Deletes all notifications
export const deleteAllNotifications = async (req, res, next) => {
  try {
    // Deletes all notifications in the database
    const result = await Notification.deleteMany({});

    res.status(200).json({
      message: `Deleted ${result.deletedCount} notifications`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    // AppError with context for deleting notifications
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

// ✅ REMOVE THE OLD sendEmailWithRetries FUNCTION COMPLETELY
// The enhanced version should be imported from a separate file
