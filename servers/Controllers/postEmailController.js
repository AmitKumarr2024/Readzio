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
import { SMTP_USER } from "../config/dotenv.js";

/**
 * Sends daily digest emails to eligible users in batches.
 * Uses createMailOption(...) to build mail options (which sets the correct 'from').
 */
export const sendDailyPostEmail = async (req, res) => {
  try {
    console.log("📧 Sending daily email...");

    // Get one verified user (for testing)
    const user = await UserModel.findOne({
      isAccountVerified: true,
      email: { $exists: true, $ne: "" },
    }).lean();

    if (!user) {
      return res.status(404).json({ message: "No user found with email" });
    }

    // Get one post (for testing)
    const post = await PostModel.findOne({ isPublished: true }).lean();

    const mailOptions = {
      from: SMTP_USER, // your sender email
      to: user.email,
      subject: "Inksha Daily Digest (Test)",
      html: `
        <h2>Hello ${user.name || "Reader"},</h2>
        <p>Here’s a test daily email from Inksha.</p>
        ${
          post
            ? `<p>Featured post: <b>${post.title}</b></p>`
            : `<p>No posts available today.</p>`
        }
        <a href="https://inksha-uedq.onrender.com/explore" 
           style="display:inline-block;margin-top:10px;padding:8px 12px;background:#007bff;color:#fff;text-decoration:none;border-radius:4px;">
           Read Posts
        </a>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully!");
    res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    res
      .status(500)
      .json({ message: "Failed to send email", error: error.message });
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
