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

// Public or authenticated routes
// GET /get-Notification
// Fetches all active banner notifications, optionally filtered by region
// - Queries `BannerNotifyModel` for `isActive: true` and `expiresAt > now` or null
// - Supports unauthenticated access for public visibility
// - Consider adding region-based filtering in query params (e.g., ?region=global)
// - Test with expired and inactive notifications to ensure correct filtering
// - Performance: Ensure index on `{ isActive: 1, expiresAt: 1, region: 1 }` in `BannerNotifyModel`
router.get("/get-Notification", getNotifications);

// GET /get-Notification/:id
// Fetches a single banner notification by ID
// - Validates `:id` as MongoDB ObjectId in `getNotificationById`
// - Queries `BannerNotifyModel` by `_id`; returns 404 if not found
// - Public access; no You must be signed in to access this feature.
// - Test with invalid ObjectId and non-existent IDs
// - Security: Ensure no sensitive fields (e.g., `createdBy`) are exposed
router.get("/get-Notification/:id", getNotificationById);

// GET /dismissed/:id
// Checks if authenticated user dismissed a notification
// - Requires `verifyUser` middleware to authenticate user via JWT
// - Queries `DismissedBannerNotificationModel` for `userId` and `notificationId`
// - Returns dismissal status (true/false)
// - Test with non-dismissed and invalid notification IDs
// - Performance: Ensure index on `{ userId: 1, notificationId: 1 }` in `DismissedBannerNotificationModel`
router.get("/dismissed/:id", verifyUser, checkDismissedNotification);

// Admin-only routes (secure: verifyUser → adminOnly)
// POST /create
// Creates a new banner notification
// - Requires `verifyUser` and `adminOnly` middleware to ensure admin access
// - Validates input (e.g., `message`, `title`, `type`) against `BannerNotifyModel` schema
// - Stores `createdBy` as authenticated admin's user ID
// - Test with invalid inputs (e.g., missing required fields, invalid `type`)
// - Security: Sanitize `message` and `title` to prevent XSS
// - Logs creation in `ActivityModel` with action `CREATED_NOTIFICATION`
router.post("/create", verifyUser, adminOnly, createNotification);

// PATCH /deactivate/:id
// Deactivates a banner notification
// - Requires `verifyUser` and `adminOnly` middleware
// - Updates `isActive: false` in `BannerNotifyModel` for the given `:id`
// - Validates `:id` as MongoDB ObjectId
// - Test with non-existent IDs and already deactivated notifications
// - Logs deactivation in `ActivityModel` with action `DEACTIVATED_NOTIFICATION`
router.patch("/deactivate/:id", verifyUser, adminOnly, deactivateNotification);

// Authenticated user route
// PATCH /dismiss/:id
// Records a user's dismissal of a notification
// - Requires `verifyUser` middleware to authenticate user
// - Creates entry in `DismissedBannerNotificationModel` with `userId` and `notificationId`
// - Validates `:id` as MongoDB ObjectId
// - Test with already dismissed notifications to ensure idempotency
// - Logs dismissal in `ActivityModel` with action `DISMISSED_NOTIFICATION`
router.patch("/dismiss/:id", verifyUser, dismissNotification);

// DELETE /delete-all
// Deletes all banner notifications (admin-only)
// - Requires `verifyUser` and `adminOnly` middleware
// - Removes all documents from `BannerNotifyModel` and `DismissedBannerNotificationModel`
// - Destructive operation; use with caution in production
// - Test with empty collections and large datasets for performance
// - Logs deletion in `ActivityModel` with action `DELETED_ALL_NOTIFICATIONS`
// - Consider adding confirmation mechanism to prevent accidental deletion
router.delete("/delete-all", verifyUser, adminOnly, deleteAllNotifications);

export default router;
