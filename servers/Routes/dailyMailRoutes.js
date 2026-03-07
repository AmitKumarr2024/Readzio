// routes/dailyMailRoutes.js
import express from "express";
import { protectedRoute } from "../../servers/Middlewares/authMiddleware.js";
import { adminOnly } from "../../servers/Middlewares/AdminMiddleware.js";
import {
  // Email Sending
  sendDailyPostEmail,
  sendDirectEmail,

  // Email Status
  getAllEmailStatuses,
  checkEmailStatus,
  retryFailedEmails,

  // Health & Reporting
  getEmailSystemHealth,
  getBounceStatistics,
  getDailyPostEmailReport,
  checkUserEmailEligibility,

  // Batch & Utilities
  batchOperations,
  removeEmailSuppression,
  sendTestEmail,
  getDailyEmailStatus,
  toggleDailyEmail,
} from "../../servers/Controllers/dailyPostEmailController.js";

const router = express.Router();

// All routes require authentication
router.use(protectedRoute);

// Admin-only routes
router.use(adminOnly);

// ============ EMAIL SENDING ROUTES ============
// POST /daily-post - Send daily digest emails (bulk)
router.post("/daily-post", sendDailyPostEmail);

// POST /send-direct-email - Send email to specific user
router.post("/send-direct-email", sendDirectEmail);

// ============ EMAIL STATUS ROUTES ============
// GET /email-statuses - Get all email statuses with pagination
router.get("/email-statuses", getAllEmailStatuses);

// GET /email-status - Check single email status
router.get("/email-status", checkEmailStatus);

// POST /retry-failed - Retry failed emails
router.post("/retry-failed", retryFailedEmails);

// ============ HEALTH & REPORTING ROUTES ============
// GET /email-health - Get email system health status
router.get("/email-health", getEmailSystemHealth);

// GET /bounce-stats - Get email bounce statistics
router.get("/bounce-stats", getBounceStatistics);

// GET /daily-post-report - Get daily email report with stats
router.get("/daily-post-report", getDailyPostEmailReport);

// GET /check-user-eligibility/:userId - Check if user is eligible for emails
router.get("/check-user-eligibility/:userId", checkUserEmailEligibility);

// ============ BATCH & UTILITY ROUTES ============
// POST /batch-operations - Batch check email eligibility
router.post("/batch-operations", batchOperations);

// POST /remove-suppression - Remove email from suppression list
router.post("/remove-suppression", removeEmailSuppression);

// POST /test-email - Send test email
router.post("/test-email", sendTestEmail);

// GET  /email-toggle - Get current global email switch status
router.get("/email-toggle", getDailyEmailStatus);

// POST /email-toggle - Turn all daily emails ON or OFF (admin)
router.post("/email-toggle", toggleDailyEmail);

export default router;
