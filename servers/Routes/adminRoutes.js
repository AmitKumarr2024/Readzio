import express from "express";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { adminOnly } from "../Middlewares/AdminMiddleware.js";
import {
  getAllUsers,
  toggleBlockUser,
  toggleUserRole,
  deleteUser,
  getAllPosts,
  toggleBlockPost,
  deletePost,
  recordReadingTime,
  getReadingDetailsByPost,
  getSiteAnalytics,
  downloadAllDataCsv,
  getAllSubscriptionPlans,
  toggleUserEligibility,
  updateGlobalEligibilityCriteria,
  checkUserEligibility,
  toggleSubscriptionPlanStatus,
  grantSubscriptionAccess,
  setUserEligibilityOverride,
  overrideUserMilestones,
  resetUserMilestones,
} from "../Controllers/adminController.js";
import {
  createContactMessage,
  viewContactMessages,
  createReport,
  getAllReportedPosts,
  reviewReport,
  replyContactMessage,
  sendReportNotification,
  acknowledgeReport,
} from "../Controllers/messageController.js";
import {
  checkEmailStatus,
  getAllEmailStatuses,
  retryFailedEmails,
} from "../Controllers/EmailStatusController.js";

const router = express.Router();

// Protected routes for authenticated users
router.use(protectedRoute);
// POST /contact - Creates a contact message
router.post("/contact", createContactMessage);
// POST /reports - Creates a report for a post
router.post("/reports", createReport);
// GET /users - Fetches all users
router.get("/users", getAllUsers);
// GET /email-status - Checks email status for the authenticated user
router.get("/email-status", checkEmailStatus);
// GET /subscriptions/eligibility/:userId - Checks subscription eligibility for a user
router.get("/subscriptions/eligibility/:userId", checkUserEligibility);

// Admin-only routes
router.use(adminOnly);

// User Management
// PATCH /users/block/:userId - Toggles user block status
router.patch("/users/block/:userId", toggleBlockUser);
// PATCH /users/role/:userId - Toggles user role (user/admin)
router.patch("/users/role/:userId", toggleUserRole);
// DELETE /users/:userId - Deletes a user
router.delete("/users/:userId", deleteUser);

// Post Management
// GET /posts - Fetches all posts
router.get("/posts", getAllPosts);
// PATCH /posts/block/:postId - Toggles post block status
router.patch("/posts/block/:postId", toggleBlockPost);
// DELETE /posts/:postId - Deletes a post
router.delete("/posts/:postId", deletePost);
// POST /acknowledge-report/:reportId - Acknowledges a reported post
router.post("/acknowledge-report/:reportId", acknowledgeReport);

// Contact Message Management
// GET /contact-messages - Fetches all contact messages
router.get("/contact-messages", viewContactMessages);
// POST /reply-contact/:messageId - Replies to a contact message
router.post("/reply-contact/:messageId", replyContactMessage);

// Report Management
// GET /reports - Fetches all reported posts
router.get("/reports", getAllReportedPosts);
// PATCH /reports/:reportId - Reviews a reported post
router.patch("/reports/:reportId", reviewReport);
// POST /replies/send-notification - Sends notification for a report
router.post("/replies/send-notification", sendReportNotification);

// Email Status Management
// GET /all-email-statuses - Fetches all email statuses
router.get("/all-email-statuses", getAllEmailStatuses);
// POST /retry-failed-emails - Retries sending failed emails
router.post("/retry-failed-emails", retryFailedEmails);

// Traffic Tracking
// POST /reading-time - Records reading time for a post
router.post("/reading-time", recordReadingTime);
// GET /reading-details/:postId - Fetches reading details for a post
router.get("/reading-details/:postId", getReadingDetailsByPost);
// GET /analytics - Fetches site analytics
router.get("/analytics", getSiteAnalytics);

// Excel Download
// GET /download-csv - Downloads site data as CSV
router.get("/download-csv", downloadAllDataCsv);

// Subscription Management
// GET /subscriptions/plans - Fetches all subscription plans
router.get("/subscriptions/plans", getAllSubscriptionPlans);
// POST /subscriptions/eligibility/toggle - Toggles user eligibility for subscriptions
router.post("/subscriptions/eligibility/toggle", toggleUserEligibility);
// PATCH /subscriptions/criteria - Updates global subscription eligibility criteria
router.patch("/subscriptions/criteria", updateGlobalEligibilityCriteria);
// PATCH /subscriptions/plan/status - Toggles subscription plan status
router.patch("/subscriptions/plan/status", toggleSubscriptionPlanStatus);
// POST /subscriptions/grant - Grants subscription access to a user
router.post("/subscriptions/grant", grantSubscriptionAccess);
// PATCH /subscriptions/user-override/:userId - Overrides user eligibility
router.patch(
  "/subscriptions/user-override/:userId",
  setUserEligibilityOverride
);
// ✅ Admin-only override
router.patch(
  "/admin/user-milestone/:userId",
  protectedRoute,
  overrideUserMilestones
);

// ✅ Admin-only reset
router.patch(
  "/admin/user-milestone-reset/:userId",
  protectedRoute,
  resetUserMilestones
);

export default router;
