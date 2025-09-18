import EmailLog from "../Models/EmailLog.js";
import { AppError } from "./AppError.js";

// ===== BOUNCE MANAGEMENT FUNCTIONS =====

export const getSuppressedEmails = async (limit = 100, offset = 0) => {
  try {
    const [emails, total] = await Promise.all([
      EmailLog.find({
        $or: [{ emailStatus: "suppressed" }, { bounceType: "hard" }],
      })
        .select(
          "email bounceType bounceReason bounceCode suppressedAt bounceCount"
        )
        .sort({ suppressedAt: -1 })
        .limit(limit)
        .skip(offset)
        .lean(),

      EmailLog.countDocuments({
        $or: [{ emailStatus: "suppressed" }, { bounceType: "hard" }],
      }),
    ]);

    return { emails, total, hasMore: offset + limit < total };
  } catch (error) {
    throw new AppError(
      "Failed to retrieve suppressed emails",
      500,
      "getSuppressedEmails",
      error.message
    );
  }
};

export const unsuppressEmail = async (email, reason = "Manual override") => {
  try {
    if (!email || typeof email !== "string") {
      throw new AppError(
        "Valid email address required",
        400,
        "unsuppressEmail"
      );
    }

    const result = await EmailLog.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        $unset: {
          bounceType: 1,
          bounceReason: 1,
          bounceCode: 1,
          suppressedAt: 1,
        },
        $set: {
          emailStatus: "pending",
          stopEmailAttempts: false,
          bounceCount: 0,
          emailLastError: `Unsuppressed: ${reason}`,
          updatedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!result) {
      throw new AppError(
        `Email ${email} not found in suppression list`,
        404,
        "unsuppressEmail"
      );
    }

    return result;
  } catch (error) {
    throw error instanceof AppError
      ? error
      : new AppError(
          "Failed to unsuppress email",
          500,
          "unsuppressEmail",
          error.message
        );
  }
};

export const getBounceStats = async (days = 30) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await EmailLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            bounceType: "$bounceType",
            status: "$emailStatus",
          },
          count: { $sum: 1 },
          uniqueEmails: { $addToSet: "$email" },
        },
      },
      {
        $group: {
          _id: "$_id.bounceType",
          statusBreakdown: {
            $push: {
              status: "$_id.status",
              count: "$count",
              uniqueEmails: { $size: "$uniqueEmails" },
            },
          },
          totalCount: { $sum: "$count" },
          totalUniqueEmails: {
            $sum: { $size: "$uniqueEmails" },
          },
        },
      },
      {
        $sort: { totalCount: -1 },
      },
    ]);

    // Transform results for better readability
    const result = {
      period: `Last ${days} days`,
      summary: {},
      details: {},
    };

    let totalEmails = 0;
    let totalBounces = 0;

    for (const stat of stats) {
      const bounceType = stat._id || "none";

      result.details[bounceType] = {
        totalCount: stat.totalCount,
        uniqueEmails: stat.totalUniqueEmails,
        statusBreakdown: stat.statusBreakdown.reduce((acc, item) => {
          acc[item.status] = {
            count: item.count,
            uniqueEmails: item.uniqueEmails,
          };
          return acc;
        }, {}),
      };

      totalEmails += stat.totalCount;
      if (bounceType !== "none") {
        totalBounces += stat.totalCount;
      }
    }

    result.summary = {
      totalEmails,
      totalBounces,
      bounceRate:
        totalEmails > 0
          ? ((totalBounces / totalEmails) * 100).toFixed(2) + "%"
          : "0%",
      successfulEmails: totalEmails - totalBounces,
    };

    return result;
  } catch (error) {
    throw new AppError(
      "Failed to generate bounce statistics",
      500,
      "getBounceStats",
      error.message
    );
  }
};

export const getEmailSystemHealth = async () => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [recentFailures, suppressedCount, pendingCount, recentSuccessCount] =
      await Promise.all([
        EmailLog.countDocuments({
          emailStatus: "failed",
          updatedAt: { $gte: oneHourAgo },
        }),
        EmailLog.countDocuments({
          emailStatus: "suppressed",
        }),
        EmailLog.countDocuments({
          emailStatus: "pending",
        }),
        EmailLog.countDocuments({
          emailStatus: "sent",
          updatedAt: { $gte: oneDayAgo },
        }),
      ]);

    return {
      status: recentFailures > 10 ? "warning" : "healthy",
      timestamp: now,
      metrics: {
        recentFailures: {
          count: recentFailures,
          period: "last hour",
        },
        suppressedEmails: suppressedCount,
        pendingEmails: pendingCount,
        recentSuccesses: {
          count: recentSuccessCount,
          period: "last 24 hours",
        },
      },
    };
  } catch (error) {
    return {
      status: "error",
      timestamp: new Date(),
      error: error.message,
    };
  }
};

// Helper function to check if an email should be blocked before sending
export const shouldBlockEmail = async (email) => {
  try {
    const emailLower = email.toLowerCase();

    // Check if suppressed
    const suppressedEmail = await EmailLog.findOne({
      email: emailLower,
      $or: [
        { bounceType: "hard" },
        { emailStatus: "suppressed" },
        {
          bounceType: "spam",
          bounceCount: { $gte: 2 },
        },
      ],
    });

    if (suppressedEmail) {
      return {
        blocked: true,
        reason: "suppressed",
        details: `${suppressedEmail.bounceType} bounce: ${suppressedEmail.bounceReason}`,
      };
    }

    // Check for recent soft bounces
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSoftBounce = await EmailLog.findOne({
      email: emailLower,
      bounceType: "soft",
      lastBounceAt: { $gte: oneHourAgo },
    });

    if (recentSoftBounce) {
      return {
        blocked: true,
        reason: "recent_soft_bounce",
        details: `Recent soft bounce, retry after ${new Date(
          recentSoftBounce.lastBounceAt.getTime() + 60 * 60 * 1000
        ).toISOString()}`,
      };
    }

    return { blocked: false };
  } catch (error) {
    console.error("Error checking email block status:", error);
    return { blocked: false }; // Don't block on error
  }
};
