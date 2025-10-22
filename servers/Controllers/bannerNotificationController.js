import BannerNotifyModel from "../../servers/Models/BannerNotifyModel.js";
import { DismissedBannerNotificationModel } from "../Models/DismissedBannerNotification.js";
import User from "../../servers/Models/User.js";
import { AppError } from "../Utils/AppError.js";
import mongoose from "mongoose";

// Creates a new banner notification
export const createNotification = async (req, res, next) => {
  try {
    const { title, message, region, expiresIn } = req.body;

    if (!title || !message) {
      throw new AppError("Title and message are required", 400);
    }

    // 🕒 Parse duration (supports "h" or "d")
    let durationMs;

    if (typeof expiresIn === "string") {
      const lower = expiresIn.toLowerCase();

      if (lower.endsWith("h")) {
        durationMs = parseInt(lower) * 60 * 60 * 1000; // hours
      } else if (lower.endsWith("d")) {
        durationMs = parseInt(lower) * 24 * 60 * 60 * 1000; // days
      } else {
        durationMs = 24 * 60 * 60 * 1000; // default 1 day
      }
    } else if (typeof expiresIn === "number" && !isNaN(expiresIn)) {
      // if numeric, treat as days
      durationMs = expiresIn * 24 * 60 * 60 * 1000;
    } else {
      durationMs = 24 * 60 * 60 * 1000; // default 1 day
    }

    const expiresAt = new Date(Date.now() + durationMs);

    // 🧠 Create notification
    const newNotification = await BannerNotification.create({
      title,
      message,
      region: region || "global",
      expiresAt,
    });

    // 🔔 Emit real-time event
    req.io.emit("newBroadcastNotification", newNotification);

    console.log(
      `🕒 Notification created. Expires at: ${expiresAt.toISOString()}`
    );

    res.status(201).json({
      success: true,
      message: "Banner notification created successfully",
      notification: newNotification,
    });
  } catch (err) {
    next(err);
  }
};

// Fetches all banner notifications (active for public, all for admin)
export const getNotifications = async (req, res, next) => {
  try {
    const { region } = req.query;
    const isAdmin = req.user && req.user.role === "admin";

    // Build base query for non-expired notifications
    let query = {
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    // For admin, fetch all (including inactive and expired)
    if (isAdmin) {
      query = {};
    } else {
      query.isActive = true;
    }

    // Add region filter if specified
    if (region && region !== "global") {
      const regionQuery = { $in: [region, "global"] };
      if (isAdmin) {
        query.$or = [{ region: regionQuery }, { region: "global" }];
      } else {
        query.region = regionQuery;
      }
    }

    const notifications = await BannerNotifyModel.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .lean();

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to fetch banner notifications",
            500,
            "GetBannerNotifications",
            "Failed to fetch notifications"
          )
    );
  }
};

// Fetches active notifications for authenticated user (excluding dismissed)
export const getActiveNotificationsForUser = async (req, res, next) => {
  try {
    const { region } = req.query;

    // Validates user authentication
    if (!req.user?._id)
      throw new AppError(
        "User not authenticated",
        401,
        "GetActiveNotifications",
        "You must be signed in to access this feature."
      );

    // Build query for active, non-expired notifications
    const query = {
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    };

    // Add region filter if specified
    if (region && region !== "global") {
      query.region = { $in: [region, "global"] };
    }

    // Fetch active notifications
    const notifications = await BannerNotifyModel.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email")
      .lean();

    // Fetch user's dismissed notifications
    const dismissed = await DismissedBannerNotificationModel.find({
      userId: req.user._id,
    })
      .select("notificationId")
      .lean();

    const dismissedIds = new Set(
      dismissed.map((d) => d.notificationId.toString())
    );

    // Filter out dismissed notifications
    const activeNotifications = notifications.filter(
      (n) => !dismissedIds.has(n._id.toString())
    );

    res.status(200).json({
      success: true,
      notifications: activeNotifications,
    });
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to fetch active notifications",
            500,
            "GetActiveNotifications",
            "Failed to fetch notifications"
          )
    );
  }
};

// Fetches a single banner notification by ID
export const getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validates notification ID
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      throw new AppError(
        "Invalid notification ID",
        400,
        "GetBannerNotificationById",
        "Invalid ID format"
      );

    const notification = await BannerNotifyModel.findById(id)
      .populate("createdBy", "name email")
      .lean();

    if (!notification)
      throw new AppError(
        "Notification not found",
        404,
        "GetBannerNotificationById",
        "Notification does not exist"
      );

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to fetch banner notification",
            500,
            "GetBannerNotificationById",
            "Failed to fetch notification"
          )
    );
  }
};

// Records user's dismissal of a notification
export const dismissNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validates user authentication
    if (!req.user?._id)
      throw new AppError(
        "User not authenticated",
        401,
        "DismissBannerNotification",
        "You must be signed in to access this feature."
      );

    // Validates notification ID
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      throw new AppError(
        "Invalid notification ID",
        400,
        "DismissBannerNotification",
        "Invalid ID format"
      );

    // Check if notification exists
    const notification = await BannerNotifyModel.findById(id).lean();
    if (!notification)
      throw new AppError(
        "Notification not found",
        404,
        "DismissBannerNotification",
        "Notification does not exist"
      );

    // Check if already dismissed
    const existingDismissal = await DismissedBannerNotificationModel.findOne({
      userId: req.user._id,
      notificationId: id,
    }).lean();

    if (existingDismissal) {
      return res.status(200).json({
        success: true,
        message: "Notification already dismissed",
      });
    }

    // Create dismissal record
    const dismissal = new DismissedBannerNotificationModel({
      userId: req.user._id,
      notificationId: id,
      dismissedAt: new Date(),
    });

    await dismissal.save();

    // Increment dismissedCount in notification
    await BannerNotifyModel.findByIdAndUpdate(id, {
      $inc: { dismissedCount: 1 },
    });

    // Emit socket event to admin room (assuming io is available in route handler)
    // req.app.get('io').to('adminRoom').emit('broadcastNotificationDismissed', { id });

    res.status(200).json({
      success: true,
      message: "Notification dismissed successfully",
    });
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to dismiss notification",
            500,
            "DismissBannerNotification",
            "Failed to dismiss notification"
          )
    );
  }
};

// Checks if user has dismissed a notification
export const checkDismissedNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validates user authentication
    if (!req.user?._id)
      throw new AppError(
        "User not authenticated",
        401,
        "CheckDismissedNotification",
        "You must be signed in to access this feature."
      );

    // Validates notification ID
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      throw new AppError(
        "Invalid notification ID",
        400,
        "CheckDismissedNotification",
        "Invalid ID format"
      );

    const dismissal = await DismissedBannerNotificationModel.findOne({
      userId: req.user._id,
      notificationId: id,
    }).lean();

    res.status(200).json({
      success: true,
      dismissed: !!dismissal,
      dismissedAt: dismissal?.dismissedAt || null,
    });
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to check dismissal status",
            500,
            "CheckDismissedNotification",
            "Failed to check status"
          )
    );
  }
};

// Deactivates a banner notification (admin only)
export const deactivateNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validates admin access
    if (!req.user || req.user.role !== "admin")
      throw new AppError(
        "Only admins can deactivate notifications",
        403,
        "DeactivateBannerNotification",
        "Admin privileges required"
      );

    // Validates notification ID
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      throw new AppError(
        "Invalid notification ID",
        400,
        "DeactivateBannerNotification",
        "Invalid ID format"
      );

    const notification = await BannerNotifyModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    ).lean();

    if (!notification)
      throw new AppError(
        "Notification not found",
        404,
        "DeactivateBannerNotification",
        "Notification does not exist"
      );

    // Emit socket event to admin room (assuming io is available)
    // req.app.get('io').to('adminRoom').emit('broadcastNotificationDeactivated', { id });

    res.status(200).json({
      success: true,
      message: "Notification deactivated successfully",
      notification,
    });
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to deactivate notification",
            500,
            "DeactivateBannerNotification",
            "Failed to deactivate notification"
          )
    );
  }
};

// Deletes all banner notifications (admin only)
export const deleteAllNotifications = async (req, res, next) => {
  try {
    // Validates admin access
    if (!req.user || req.user.role !== "admin")
      throw new AppError(
        "Only admins can delete all notifications",
        403,
        "DeleteAllBannerNotifications",
        "Admin privileges required"
      );

    // Delete all notifications and dismissals
    const notificationResult = await BannerNotifyModel.deleteMany({});
    const dismissalResult = await DismissedBannerNotificationModel.deleteMany(
      {}
    );

    // Emit socket event to admin room (assuming io is available)
    // req.app.get('io').to('adminRoom').emit('broadcastNotificationDeletedAll');

    res.status(200).json({
      success: true,
      message: "All notifications deleted successfully",
      deletedNotifications: notificationResult.deletedCount,
      deletedDismissals: dismissalResult.deletedCount,
    });
  } catch (err) {
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to delete all notifications",
            500,
            "DeleteAllBannerNotifications",
            "Failed to delete notifications"
          )
    );
  }
};

// Cleanup expired notifications (run via cron job)
export const cleanupExpiredBannerNotifications = async (req, res, next) => {
  try {
    // Validates admin access (if called via API)
    if (req.user && req.user.role !== "admin")
      throw new AppError(
        "Only admins can cleanup notifications",
        403,
        "CleanupBannerNotifications",
        "Admin privileges required"
      );

    // Delete expired notifications
    const result = await BannerNotifyModel.deleteMany({
      expiresAt: { $exists: true, $lte: new Date() },
    });

    // Clean up orphaned dismissals
    const activeNotificationIds = await BannerNotifyModel.find({})
      .select("_id")
      .lean();
    const activeIds = new Set(
      activeNotificationIds.map((n) => n._id.toString())
    );

    const dismissals = await DismissedBannerNotificationModel.find({}).lean();
    const orphanedDismissalIds = dismissals
      .filter((d) => !activeIds.has(d.notificationId.toString()))
      .map((d) => d._id);

    const dismissalResult = await DismissedBannerNotificationModel.deleteMany({
      _id: { $in: orphanedDismissalIds },
    });

    const response = {
      success: true,
      deletedNotifications: result.deletedCount,
      deletedOrphanedDismissals: dismissalResult.deletedCount,
      message: `Cleaned up ${result.deletedCount} expired notifications and ${dismissalResult.deletedCount} orphaned dismissals`,
    };

    // If called via API, send response
    if (res) {
      res.status(200).json(response);
    }

    return response;
  } catch (err) {
    if (next) {
      next(
        err instanceof AppError
          ? err
          : new AppError(
              err.message || "Failed to cleanup notifications",
              500,
              "CleanupBannerNotifications",
              "Failed to cleanup"
            )
      );
    } else {
      console.error("Cleanup error:", err);
      throw err;
    }
  }
};
