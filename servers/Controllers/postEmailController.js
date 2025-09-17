import EmailLog from "../Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Notification from "../../servers/Models/Notification.js";
import { AppError } from "../../servers/Utils/AppError.js";
import transporter from "../config/nodeMailer.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { DAILY_POST_ADMIN_REPORT_TEMPLATE } from "../../servers/config/DailyPostEmailReport.js";

// Sends daily post email to verified users with published posts
export const sendDailyPostEmail = async (req, res, next) => {
  console.log("[Cron] Entered sendDailyPostEmail controller");
  try {
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: false,
    }).lean({ virtuals: true });
    console.log("[Cron] Users fetched:", users.length, users.slice(0, 3));

    if (users.length === 0) {
      console.log("[Cron] No verified users found");
      return res.status(200).json({
        message: "No verified users to send emails to",
        results: [],
        postCount: 0,
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    console.log("[Cron] Fetching posts for date:", todayStart.toISOString());

    // Step 1: Fetch today's published posts
    let posts = await PostModel.find({
      createdAt: { $gte: todayStart },
      isPublished: true,
    })
      .select("title slug thumbnail author readTime likesCount commentsCount")
      .populate("author", "name avatar")
      .lean({ virtuals: true });
    console.log("[Cron] Posts fetched:", posts.length);

    // Step 2: If less than 10, fill with older random published posts
    if (posts.length < 10) {
      const needed = 10 - posts.length;
      console.log("[Cron] Fetching", needed, "fallback posts");

      const randomFallbackPosts = await PostModel.aggregate([
        { $match: { createdAt: { $lt: todayStart }, isPublished: true } },
        { $sample: { size: needed } },
      ]);

      const populatedFallback = await PostModel.populate(randomFallbackPosts, {
        path: "author",
        select: "name avatar",
      });

      posts = [...posts, ...populatedFallback];
      console.log("[Cron] Total posts after fallback:", posts.length);
    }

    // Step 3: If no posts found even in fallback, skip sending
    if (posts.length === 0) {
      console.warn("[Cron] No posts available at all. Skipping email.");
      return res.status(200).json({
        message: "No posts available to send. Skipped email.",
        results: [],
        postCount: 0,
      });
    }

    const postSlugs = posts.map((post) => post.slug);
    const results = [];

    // Step 4: Send email to each verified user
    for (const user of users) {
      const subject =
        posts.length > 0
          ? `${
              posts[Math.floor(Math.random() * posts.length)].title
            } | inkshaa Daily Digest`
          : `Your inkshaa Daily Brief – Fresh Posts for You (${posts.length} Posts)`;

      console.log(`[Email] Preparing mail for ${user.email}`);
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
      console.log("[Email] MailOption subject:", subject);
      console.log(
        "[Email] Posts included:",
        posts.map((p) => p.slug)
      );

      try {
        console.log(`[Email] Sending to ${user.email} (attempt 1)`);
        const emailResult = await sendEmailWithRetries(mailOption, user._id);
        console.log(
          `[Email] Success for ${user.email} on attempt ${emailResult.attempts}`
        );
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
        console.error(`[Email] Failed for ${user.email}:`, error.message);
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

    // Step 5: Send report to admin
    const admin = await UserModel.findOne({ role: "admin" }).lean();
    if (admin) {
      console.log("[AdminReport] Sending report to admin:", admin.email);
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
          failedUsers: results.filter((r) => !r.success),
          postCount: posts.length,
        },
      });

      await sendEmailWithRetries(adminMailOption, admin._id);
    }

    console.log(
      "[Cron] Finished. Sent:",
      results.filter((r) => r.success).length,
      "Failed:",
      results.filter((r) => !r.success).length
    );

    res.status(200).json({
      message: "Daily post emails processed",
      results,
      postCount: posts.length,
    });
  } catch (error) {
    console.error("[Cron] Error in sendDailyPostEmail:", error.message);
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
      console.log(`[Email] Sending to ${mailOption.to} (attempt ${attempts})`);
      await transporter.sendMail(mailOption);
      console.log(
        `[Email] Success for ${mailOption.to} on attempt ${attempts}`
      );
      await recordActivity({
        userId,
        action: "EMAIL_SENT",
        message: `Daily post email sent to ${mailOption.to} after ${attempts} attempt(s)`,
      });
      return { success: true, attempts };
    } catch (error) {
      lastError = error;
      console.error(
        `[Email] Failed attempt ${attempts} for ${mailOption.to}:`,
        error.message
      );
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

  console.error(
    `[Email] All attempts failed for ${mailOption.to}:`,
    lastError.message
  );
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
