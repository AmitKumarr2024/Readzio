import EmailLog from "../Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Notification from "../../servers/Models/Notification.js";
import { AppError } from "../../servers/Utils/AppError.js";
import transporter from "../config/nodeMailer.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";

// Sends daily post email to verified users with published posts
const getRecentlySentPostSlugs = async (userId, days = 7) => {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  const logs = await EmailLog.find({
    userId,
    type: "daily_digest",
    sentAt: { $gte: sinceDate },
  }).select("postSlugs -_id");

  const sentSlugs = new Set();
  logs.forEach((log) => {
    (log.postSlugs || []).forEach((slug) => sentSlugs.add(slug));
  });

  return Array.from(sentSlugs);
};

// 🚀 Main Cron Email Sender
export const sendDailyPostEmail = async (req, res, next) => {
  console.log("[Cron:sendDailyPostEmail] Function entered");
  try {
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: false,
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

    const freshTodayPosts = await PostModel.find({
      createdAt: { $gte: todayStart },
      isPublished: true,
    })
      .select("title slug thumbnail author readTime likesCount commentsCount")
      .populate("author", "name avatar")
      .lean({ virtuals: true });

    const results = [];

    for (const user of users) {
      const recentlySentSlugs = await getRecentlySentPostSlugs(user._id);
      const recentSet = new Set(recentlySentSlugs);

      // Filter out posts already sent to this user
      const newFreshPosts = freshTodayPosts.filter(
        (post) => !recentSet.has(post.slug)
      );

      let userPosts = [...newFreshPosts];

      // Fetch fallback posts if not enough
      if (userPosts.length < 10) {
        const needed = 10 - userPosts.length;

        const fallbackPosts = await PostModel.find({
          createdAt: { $lt: todayStart },
          isPublished: true,
          slug: {
            $nin: [...recentlySentSlugs, ...userPosts.map((p) => p.slug)],
          },
        })
          .sort({ views: -1 }) // or use random if you prefer variety
          .limit(needed)
          .select("title slug thumbnail author readTime likesCount commentsCount")
          .populate("author", "name avatar")
          .lean({ virtuals: true });

        userPosts = [...userPosts, ...fallbackPosts];
      }

      if (userPosts.length === 0) {
        const fallbackMailOption = createMailOption({
          to: user.email,
          subject: "Your Inksha Daily Brief (No New Posts)",
          name: user.name || "User",
          email: user.email,
          message:
            "No fresh posts today. Check out our platform for more content!",
          hasButton: true,
          buttonText: "Visit Platform",
          buttonUrl: "https://inksha.onrender.com",
          posts: [],
        });

        await sendEmailWithRetries(fallbackMailOption, user._id);

        results.push({
          email: user.email,
          success: true,
          message: "Sent fallback email",
          attempts: 1,
        });

        continue;
      }

      const postSlugs = userPosts.map((p) => p.slug);

      const mailOption = createMailOption({
        to: user.email,
        subject: `Your Inksha Daily Brief – ${userPosts.length} New Reads`,
        name: user.name || "User",
        email: user.email,
        hasButton: true,
        buttonText: "Read Posts",
        buttonUrl: "https://inksha.onrender.com",
        posts: userPosts,
      });

      try {
        const emailResult = await sendEmailWithRetries(mailOption, user._id);
        const emailLog = new EmailLog({
          userId: user._id,
          email: user.email,
          type: "daily_digest",
          emailStatus: "sent",
          emailAttempts: emailResult.attempts,
          postSlugs,
          sentAt: new Date(),
        });
        await emailLog.save();
        results.push({
          email: user.email,
          success: true,
          attempts: emailResult.attempts,
        });
      } catch (error) {
        const emailLog = new EmailLog({
          userId: user._id,
          email: user.email,
          type: "daily_digest",
          emailStatus: "failed",
          emailAttempts: error.attempts || 3,
          emailLastError: error.message,
          postSlugs,
          sentAt: new Date(),
        });
        await emailLog.save();
        results.push({
          email: user.email,
          success: false,
          error: error.message,
        });
      }
    }

    // Notify admin
    const admin = await UserModel.findOne({ role: "admin" }).lean();
    if (admin) {
      const adminMailOption = createMailOption({
        to: admin.email,
        subject: "Daily Post Email Report",
        name: admin.name || "Admin",
        email: admin.email,
        message: `Daily post email sent to ${results.length} users. Success: ${
          results.filter((r) => r.success).length
        }, Failed: ${
          results.filter((r) => !r.success).length
        }, Total posts varied per user.`,
        hasButton: false,
      });
      await sendEmailWithRetries(adminMailOption, admin._id);
    }

    res.status(200).json({
      message: "Daily post emails processed",
      results,
      totalUsers: users.length,
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
    const { page = 1, limit = 10, date } = req.query;

    const query = { type: "daily_digest" };

    // If a date is provided, apply IST-safe date filtering
    if (date) {
      const istDate = new Date(date);
      const startDate = new Date(istDate);
      startDate.setUTCHours(18, 30, 0, 0); // 00:00 IST
      const endDate = new Date(istDate);
      endDate.setUTCHours(18 + 23, 30 + 59, 59, 999); // 23:59 IST

      query.sentAt = { $gte: startDate, $lte: endDate };

      console.log(
        `[Report] Applying date filter: ${startDate.toISOString()} → ${endDate.toISOString()}`
      );
    }

    // Fetch paginated logs
    const logs = await EmailLog.find(query)
      .select(
        "userId email type emailStatus emailAttempts emailLastError postSlugs sentAt"
      )
      .populate("userId", "name")
      .sort({ sentAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean({ virtuals: true });

    const total = await EmailLog.countDocuments(query);

    console.log(`[Report] Email logs fetched: ${logs.length} / ${total} total`);

    res.status(200).json({
      logs,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
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

// Sends email with retry logic for reliability
const sendEmailWithRetries = async (mailOption, userId, maxAttempts = 3) => {
  let attempts = 0;
  let lastError = null;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      await transporter.sendMail(mailOption);
      await recordActivity({
        userId,
        action: "EMAIL_SENT",
        message: `Daily post email sent to ${mailOption.to} after ${attempts} attempt(s)`,
      });
      return { success: true, attempts };
    } catch (error) {
      lastError = error;
      await recordActivity({
        userId,
        action: "EMAIL_FAILED",
        message: `Daily post email failed for ${mailOption.to} on attempt ${attempts}: ${error.message}`,
      });
      if (attempts < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * attempts ** 2)
        );
      }
    }
  }

  await recordActivity({
    userId,
    action: "EMAIL_FAILED_ALL_ATTEMPTS",
    message: `All ${attempts} daily post email attempts failed for ${mailOption.to}: ${lastError.message}`,
  });
  throw new AppError(
    `Failed to send email after ${attempts} attempts: ${lastError.message}`,
    500,
    "SendEmailWithRetries",
    "All email attempts failed"
  );
};
