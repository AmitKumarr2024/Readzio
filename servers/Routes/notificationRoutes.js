import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  adminSendNotification,
  broadcastNotification,
  replyToNotification,
  deleteNotification,
  getUserNotificationHistory,
} from "../Controllers/notificationsController.js";
import { protectedRoute } from "../Middlewares/authMiddleware.js";
import { adminOnly } from "../Middlewares/AdminMiddleware.js";

const router = express.Router();

router.use(protectedRoute);

router.get("/notifications", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/mark-as-read/:id", markAsRead);
router.patch("/mark-all-as-read", markAllAsRead);
router.post("/", createNotification);
router.post("/reply", replyToNotification);
router.delete("/:id", deleteNotification);
router.get("/user/:userId", getUserNotificationHistory);

router.post("/admin", adminOnly, adminSendNotification);
router.post("/admin/broadcast", adminOnly, broadcastNotification);

export default router;