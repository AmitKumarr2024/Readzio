// Enhanced Email Routes - Same structure, additional endpoints
import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import {
  sendDailyPostEmail,
  getDailyPostEmailReport,
  deleteAllNotifications,
  // New enhanced functions
  checkUserEligibilityForEmail,
  getBounceStatistics,
  removeEmailSuppression,
  testSingleEmail,
} from "../Controllers/enhancedDailyEmailController.js";

const router = express.Router();

// ================================
// EXISTING ROUTES (keeping exactly the same)
// ================================

// Send daily post email to all verified users
router.post("/daily-post", protectedRoute, sendDailyPostEmail);

// Fetch daily post email report
router.get("/daily-post-report", protectedRoute, getDailyPostEmailReport);

// Delete all notifications
router.delete("/notifications", protectedRoute, deleteAllNotifications);

// Manual test route to trigger email now (enhanced version)
router.get("/test", protectedRoute, async (req, res) => {
  try {
    console.log("[ManualTrigger] Calling enhanced sendDailyPostEmail");

    // Create mock req object with user info for authorization
    const mockReq = {
      ...req,
      body: {
        forceRun: true, // Force run even if already sent today
        testMode: false, // Set to true for testing
        maxUsers: req.query.maxUsers ? parseInt(req.query.maxUsers) : null,
      },
    };

    await sendDailyPostEmail(mockReq, res, (error) => {
      if (error) {
        console.error("[ManualTrigger] Error:", error.message);
        res.status(500).json({
          success: false,
          message: error.message,
          error: error.name,
        });
      }
    });
  } catch (err) {
    console.error("[ManualTrigger] Critical error:", err.message);
    res.status(500).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ================================
// NEW ENHANCED ROUTES (optional)
// ================================

// Check if a specific user is eligible for emails
router.get(
  "/check-user-eligibility/:userId",
  protectedRoute,
  checkUserEligibilityForEmail
);

// Get bounce statistics (admin only)
router.get("/bounce-stats", protectedRoute, (req, res, next) => {
  // Admin only check
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Unauthorized: Admin access required",
    });
  }
  getBounceStatistics(req, res, next);
});

// Remove email from suppression list (admin only)
router.post("/remove-suppression", protectedRoute, (req, res, next) => {
  // Admin only check
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Unauthorized: Admin access required",
    });
  }
  removeEmailSuppression(req, res, next);
});

// Test single email functionality (admin only)
router.post("/test-email", protectedRoute, (req, res, next) => {
  // Admin only check
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Unauthorized: Admin access required",
    });
  }
  testSingleEmail(req, res, next);
});

// ================================
// UTILITY ROUTES
// ================================

// Quick health check for email system
router.get("/email-health", protectedRoute, async (req, res) => {
  try {
    const { default: EmailLog } = await import("../Models/EmailLog.js");
    const { default: Bounce } = await import("../Models/Bounce.js");
    const { default: UserModel } = await import("../Models/User.js");

    // Get basic stats
    const [recentEmails, totalBounces, verifiedUsers] = await Promise.all([
      EmailLog.countDocuments({
        type: "daily_digest",
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      Bounce.countDocuments({ status: "suppressed" }),
      UserModel.countDocuments({
        isAccountVerified: true,
        stopEmailAttempts: { $ne: true },
        blocked: { $ne: true },
      }),
    ]);

    res.status(200).json({
      success: true,
      health: "good",
      stats: {
        emailsSentToday: recentEmails,
        suppressedEmails: totalBounces,
        eligibleUsers: verifiedUsers,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      health: "error",
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Get email system configuration (admin only)
router.get("/email-config", protectedRoute, async (req, res) => {
  try {
    // Admin only check
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Admin access required",
      });
    }

    const { SENDER_EMAIL, SMTP_USER } = await import("../config/dotenv.js");

    res.status(200).json({
      success: true,
      config: {
        senderEmail: SENDER_EMAIL || "Not configured",
        smtpUser: SMTP_USER || "Not configured",
        smtpConfigured: !!(SENDER_EMAIL && SMTP_USER),
        environment: process.env.NODE_ENV || "development",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get email configuration",
      error: error.message,
    });
  }
});

// Batch operations for admin
router.post("/batch-operations", protectedRoute, async (req, res) => {
  try {
    // Admin only check
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Admin access required",
      });
    }

    const { operation, data } = req.body;

    switch (operation) {
      case "check-eligibility":
        const { userIds } = data;
        if (!Array.isArray(userIds) || userIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: "userIds array is required",
          });
        }

        const { default: UserModel } = await import("../Models/User.js");
        const users = await UserModel.find({
          _id: { $in: userIds },
        }).select(
          "_id name email isAccountVerified stopEmailAttempts blocked lastActiveAt"
        );

        // Import the eligibility function
        const { isUserEligibleForEmail } = await import(
          "../Controllers/enhancedDailyEmailController.js"
        );

        const eligibilityResults = await Promise.all(
          users.map(async (user) => {
            const eligibility = await isUserEligibleForEmail(user);
            return {
              userId: user._id,
              email: user.email,
              name: user.name,
              ...eligibility,
            };
          })
        );

        res.status(200).json({
          success: true,
          operation: "check-eligibility",
          results: eligibilityResults,
          summary: {
            total: eligibilityResults.length,
            eligible: eligibilityResults.filter((r) => r.eligible).length,
            ineligible: eligibilityResults.filter((r) => !r.eligible).length,
          },
        });
        break;

      case "cleanup-bounces":
        const { default: Bounce } = await import("../Models/Bounce.js");
        const { daysOld = 90 } = data;
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

        const cleanupResult = await Bounce.deleteMany({
          status: "resolved",
          updatedAt: { $lt: cutoffDate },
        });

        res.status(200).json({
          success: true,
          operation: "cleanup-bounces",
          deletedCount: cleanupResult.deletedCount,
          cutoffDate: cutoffDate.toISOString(),
        });
        break;

      default:
        res.status(400).json({
          success: false,
          message: `Unknown operation: ${operation}`,
          availableOperations: ["check-eligibility", "cleanup-bounces"],
        });
    }
  } catch (error) {
    console.error("Batch operation error:", error);
    res.status(500).json({
      success: false,
      message: "Batch operation failed",
      error: error.message,
    });
  }
});

// ================================
// LEGACY COMPATIBILITY
// ================================

// Legacy route aliases (if you have any existing frontend calls)
router.post("/send-daily", protectedRoute, sendDailyPostEmail); // Alias
router.get("/report", protectedRoute, getDailyPostEmailReport); // Alias

export default router;
