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

const router = express.Router();

// 🔓 Authenticated user routes (user or admin)
router.use(protectedRoute);

router.post("/contact", createContactMessage); // Anyone logged in can contact
router.post("/reports", createReport);         // ✅ Anyone logged in can report a post

// 🧑‍💼 Admin-only routes
router.use(adminOnly);

// 👤 User Management
router.get("/users", getAllUsers);
router.patch("/users/block/:userId", toggleBlockUser);
router.patch("/users/role/:userId", toggleUserRole);
router.delete("/users/:userId", deleteUser);

// 📝 Post Management
router.get("/posts", getAllPosts);
router.patch("/posts/block/:postId", toggleBlockPost);
router.delete("/posts/:postId", deletePost);
router.post('/acknowledge-report/:reportId', acknowledgeReport);

// 📧 Contact Message Management
router.get("/contact-messages", viewContactMessages);
router.post("/reply-contact/:messageId", replyContactMessage); // New endpoint for replying to contact messages

// 🚨 Report Management
router.get("/reports", getAllReportedPosts);
router.patch("/reports/:reportId", reviewReport);
router.post("/replies/send-notification", sendReportNotification); // New endpoint for sending report notifications


// track traffic
router.post('/reading-time', recordReadingTime);
router.get("/reading-details/:postId", getReadingDetailsByPost);
router.get("/analytics", getSiteAnalytics);



export default router;
