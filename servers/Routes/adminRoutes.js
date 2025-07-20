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

// Authenticated user routes
router.use(protectedRoute);
router.post("/contact", createContactMessage);
router.post("/reports", createReport);
router.get("/users", getAllUsers);
router.get("/email-status", checkEmailStatus);

// Admin-only routes
router.use(adminOnly);

// User Management
router.patch("/users/block/:userId", toggleBlockUser);
router.patch("/users/role/:userId", toggleUserRole);
router.delete("/users/:userId", deleteUser);

// Post Management
router.get("/posts", getAllPosts);
router.patch("/posts/block/:postId", toggleBlockPost);
router.delete("/posts/:postId", deletePost);
router.post("/acknowledge-report/:reportId", acknowledgeReport);

// Contact Message Management
router.get("/contact-messages", viewContactMessages);
router.post("/reply-contact/:messageId", replyContactMessage);

// Report Management
router.get("/reports", getAllReportedPosts);
router.patch("/reports/:reportId", reviewReport);
router.post("/replies/send-notification", sendReportNotification);

// Email Status Management
router.get("/all-email-statuses", getAllEmailStatuses);
router.post("/retry-failed-emails", retryFailedEmails);

// Traffic Tracking
router.post("/reading-time", recordReadingTime);
router.get("/reading-details/:postId", getReadingDetailsByPost);
router.get("/analytics", getSiteAnalytics);

// Excel Download
router.get("/download-csv", downloadAllDataCsv);

// Subscription Management
// router.get("/subscriptions/plans", getAllSubscriptionPlans);
// router.post("/subscriptions/eligibility/toggle", toggleUserEligibility);
// router.patch("/subscriptions/criteria", updateGlobalEligibilityCriteria);
// router.get("/subscriptions/eligibility/:userId", checkUserEligibility);
// router.patch("/subscriptions/plan/status", toggleSubscriptionPlanStatus);
// router.post("/subscriptions/grant", grantSubscriptionAccess);

export default router;
