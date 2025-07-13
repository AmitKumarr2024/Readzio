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
  downloadAllDataCsv
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
import { checkEmailStatus, getAllEmailStatuses, retryFailedEmails } from "../Controllers/EmailStatusController.js";

const router = express.Router();

// 🔓 Authenticated user routes (user or admin)
router.use(protectedRoute);

router.post("/contact", createContactMessage); // Anyone logged in can contact
router.post("/reports", createReport); // ✅ Anyone logged in can report a post
router.get("/users", getAllUsers);
router.get("/email-status", checkEmailStatus); // Allow authenticated users to check email status

// 🧑‍💼 Admin-only routes
router.use(adminOnly);

// 👤 User Management
router.patch("/users/block/:userId", toggleBlockUser);
router.patch("/users/role/:userId", toggleUserRole);
router.delete("/users/:userId", deleteUser);

// 📝 Post Management
router.get("/posts", getAllPosts);
router.patch("/posts/block/:postId", toggleBlockPost);
router.delete("/posts/:postId", deletePost);
router.post("/acknowledge-report/:reportId", acknowledgeReport);

// 📧 Contact Message Management
router.get("/contact-messages", viewContactMessages);
router.post("/reply-contact/:messageId", replyContactMessage);

// 🚨 Report Management
router.get("/reports", getAllReportedPosts);
router.patch("/reports/:reportId", reviewReport);
router.post("/replies/send-notification", sendReportNotification);

// 📧 Email Status Management
router.get("/all-email-statuses", getAllEmailStatuses); // Admin-only: View all email statuses
router.post("/retry-failed-emails", retryFailedEmails); // Admin-only: Retry failed emails

// 📊 Traffic Tracking
router.post("/reading-time", recordReadingTime);
router.get("/reading-details/:postId", getReadingDetailsByPost);
router.get("/analytics", getSiteAnalytics);

// 📥 CSV Download
router.get("/download-csv", downloadAllDataCsv);

export default router;