import EmailLog from "../Models/EmailLog.js";
import UserModel from "../../servers/Models/User.js";
import PostModel from "../../servers/Models/Post.js";
import Notification from "../../servers/Models/Notification.js";
import { AppError } from "../../servers/Utils/AppError.js";
import transporter from "../config/nodeMailer.js";
import createMailOption from "../../servers/helpers/emailHelper.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";

// Sends daily post email to verified users with published posts
export const sendDailyPostEmail = async (req, res, next) => {
  console.log("[Cron:sendDailyPostEmail] Function entered");
  try {
    // Fetches verified users who haven't opted out of emails
    const users = await UserModel.find({
      isAccountVerified: true,
      stopEmailAttempts: false,
    }).lean();

    console.log("[Cron:sendDailyPostEmail] Fetched users:", users.length);
    
    if (users.length === 0) {
      return res.status(200).json({
        message: "No verified users to send emails to",
        results: [],
        postCount: 0,
      });
    }

    // Fetches posts created today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    let posts = await PostModel.find({
      createdAt: { $gte: todayStart },
      status: "published",
    })
      .select("title slug thumbnail author")
      .populate("author", "name")
      .limit(10)
      .lean();

    // Fills up to 10 posts with popular posts if needed
    if (posts.length < 10) {
      const additionalPostsNeeded = 10 - posts.length;
      const popularPosts = await PostModel.find({
        createdAt: { $lt: todayStart },
        status: "published",
      })
        .sort({ views: -1 })
        .select("title slug thumbnail author")
        .populate("author", "name")
        .limit(additionalPostsNeeded)
        .lean();
      posts = [...posts, ...popularPosts];
    }

    // Sends fallback email if no posts are found
    if (posts.length === 0) {
      const fallbackMailOption = createMailOption({
        to: users.map((user) => user.email),
        subject: "Your Daily Post Digest (No New Posts)",
        name: "User",
        email: "",
        message: "No new posts today. Check out our platform for more content!",
        hasButton: true,
        buttonText: "Visit Platform",
        buttonUrl: "https://inksha.onrender.com/posts",
        posts: [],
      });

      await transporter.sendMail(fallbackMailOption);
      return res.status(200).json({
        message: "No posts available, sent fallback email",
        results: [],
        postCount: 0,
      });
    }

    const postSlugs = posts.map((post) => post.slug);
    const results = [];

    // Sends emails to each user
    for (const user of users) {
      const mailOption = createMailOption({
        to: user.email,
        subject: `Your Daily Post Digest (${posts.length} Posts)`,
        name: user.name || "User",
        email: user.email,
        hasButton: true,
        buttonText: "Read Posts",
        buttonUrl: "https://inksha.onrender.com/posts",
        posts,
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

    // Notifies admin of email send results
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
        }, Posts included: ${posts.length}`,
        hasButton: false,
      });
      await sendEmailWithRetries(adminMailOption, admin._id);
    }

    res.status(200).json({
      message: "Daily post emails processed",
      results,
      postCount: posts.length,
    });
  } catch (error) {
    // AppError with context for sending daily emails
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

    // Applies date filter if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.sentAt = { $gte: startDate, $lte: endDate };
    }

    // Fetches email logs with pagination
    const logs = await EmailLog.find(query)
      .select(
        "userId email type emailStatus emailAttempts emailLastError postSlugs sentAt"
      )
      .populate("userId", "name")
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();

    const total = await EmailLog.countDocuments(query);

    res.status(200).json({
      logs,
      total,
      currentPage: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    // AppError with context for fetching email report
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
