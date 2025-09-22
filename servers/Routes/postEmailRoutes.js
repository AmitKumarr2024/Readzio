// import express from "express";
// import { protectedRoute } from "../../servers/Middlewares/authMiddleware.js";
// import {
//   sendDailyPostEmail,
//   getDailyPostEmailReport,
//   testSingleEmail,
//   sendDirectEmail, // New function
//   clearEmailFailures, // New function
// } from "../../servers/Controllers/postEmailController.js";

// const router = express.Router();

// // ================================
// // EXISTING ROUTES
// // ================================

// // Send daily post email to all verified users
// router.post("/daily-post", protectedRoute, sendDailyPostEmail);

// // Fetch daily post email report
// router.get("/daily-post-report", protectedRoute, getDailyPostEmailReport);

// // Manual test route to trigger email now
// router.get("/test", protectedRoute, async (req, res) => {
//   try {
//     console.log("[ManualTrigger] Calling enhanced sendDailyPostEmail");

//     // Create mock req object with user info for authorization
//     const mockReq = {
//       ...req,
//       body: {
//         forceRun: true, // Force run even if already sent today
//         testMode: false, // Set to true for testing
//         maxUsers: req.query.maxUsers ? parseInt(req.query.maxUsers) : null,
//       },
//     };

//     await sendDailyPostEmail(mockReq, res, (error) => {
//       if (error) {
//         console.error("[ManualTrigger] Error:", error.message);
//         res.status(500).json({
//           success: false,
//           message: error.message,
//           error: error.name,
//         });
//       }
//     });
//   } catch (err) {
//     console.error("[ManualTrigger] Critical error:", err.message);
//     res.status(500).json({
//       success: false,
//       message: err.message,
//       timestamp: new Date().toISOString(),
//     });
//   }
// });

// // Test single email functionality (admin only)
// router.post("/test-email", protectedRoute, (req, res, next) => {
//   if (req.user?.role !== "admin") {
//     return res.status(403).json({
//       success: false,
//       message: "Unauthorized: Admin access required",
//     });
//   }
//   testSingleEmail(req, res, next);
// });

// // ================================
// // NEW ROUTES
// // ================================

// // Send direct email (admin only)
// router.post("/send-direct-email", protectedRoute, (req, res, next) => {
//   if (req.user?.role !== "admin") {
//     return res.status(403).json({
//       success: false,
//       message: "Unauthorized: Admin access required",
//     });
//   }
//   sendDirectEmail(req, res, next);
// });

// // Clear email failures (admin only)
// router.post("/clear-email-failures", protectedRoute, (req, res, next) => {
//   if (req.user?.role !== "admin") {
//     return res.status(403).json({
//       success: false,
//       message: "Unauthorized: Admin access required",
//     });
//   }
//   clearEmailFailures(req, res, next);
// });

// // ================================
// // UTILITY ROUTES
// // ================================

// // Quick health check for email system
// router.get("/email-health", protectedRoute, async (req, res) => {
//   try {
//     const { default: EmailLog } = await import(
//       "../../servers/Models/EmailLog.js"
//     );
//     const { default: Bounce } = await import(
//       "../../servers/Models/BounceModel.js"
//     );
//     const { default: UserModel } = await import("../../servers/Models/User.js");

//     // Get basic stats
//     const [recentEmails, totalBounces, verifiedUsers] = await Promise.all([
//       EmailLog.countDocuments({
//         type: "daily_digest",
//         createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
//       }),
//       Bounce.countDocuments({ status: "suppressed" }),
//       UserModel.countDocuments({
//         isAccountVerified: true,
//         stopEmailAttempts: { $ne: true },
//         blocked: { $ne: true },
//       }),
//     ]);

//     res.status(200).json({
//       success: true,
//       health: "good",
//       stats: {
//         emailsSentToday: recentEmails,
//         suppressedEmails: totalBounces,
//         eligibleUsers: verifiedUsers,
//       },
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       health: "error",
//       message: error.message,
//       timestamp: new Date().toISOString(),
//     });
//   }
// });

// // ================================
// // LEGACY COMPATIBILITY
// // ================================

// router.post("/send-daily", protectedRoute, sendDailyPostEmail); // Alias
// router.get("/report", protectedRoute, getDailyPostEmailReport); // Alias

// export default router;
