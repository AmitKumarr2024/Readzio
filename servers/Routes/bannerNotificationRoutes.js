import express from "express";
import {
  createNotification,
  dismissNotification,
  getNotificationById,
  getNotifications,
  checkDismissedNotification,
  deactivateNotification,
  deleteAllNotifications,
} from "../Controllers/bannerNotificationController.js";
import { verifyUser } from "../Middlewares/verifyUser.js";
import { adminOnly } from "../Middlewares/AdminMiddleware.js";

const router = express.Router();

// ✅ Public or authenticated routes
router.get("/get-Notification", getNotifications);
router.get("/get-Notification/:id", getNotificationById);
router.get("/dismissed/:id", verifyUser, checkDismissedNotification);

// ✅ Admin-only routes (secure: verifyUser → adminOnly)
router.post("/create", verifyUser, adminOnly, createNotification);
router.patch("/deactivate/:id", verifyUser, adminOnly, deactivateNotification);

// ✅ Authenticated user route
router.patch("/dismiss/:id", verifyUser, dismissNotification);

// In your router (bannerNotificationRoutes.js)
router.delete("/delete-all", verifyUser, adminOnly, deleteAllNotifications);

export default router;
