import { isValidObjectId } from "mongoose";
import BannerNotifyModel from "../Models/bannerNotificationModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { recordActivity } from "../../servers/helpers/activityHelper.js";
import { io } from "../sockets/socket.js";
import DismissedBannerNotification from "../Models/DismissedBannerNotification.js";

// Input validation helper
const validateNotificationInput = (title, message) => {
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    throw new AppError(
      "Title is required and must be a non-empty string",
      400,
      "ValidationError",
      "Invalid title field"
    );
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    throw new AppError(
      "Message is required and must be a non-empty string",
      400,
      "ValidationError",
      "Invalid message field"
    );
  }

  // Validate length limits (adjust as needed)
  if (title.trim().length > 100) {
    throw new AppError(
      "Title must be 100 characters or less",
      400,
      "ValidationError",
      "Title too long"
    );
  }

  if (message.trim().length > 500) {
    throw new AppError(
      "Message must be 500 characters or less",
      400,
      "ValidationError",
      "Message too long"
    );
  }
};

// Creates a new banner notification
export const createNotification = async (req, res) => {
  try {
    const { title, message, region, expiresAt, link } = req.body;

    // Enhanced validation
    validateNotificationInput(title, message);

    // Validate expiresAt if provided
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      if (isNaN(expDate.getTime())) {
        throw new AppError(
          "Invalid expiration date format",
          400,
          "CreateNotification",
          "Invalid expiresAt field"
        );
      }
      if (expDate <= new Date()) {
        throw new AppError(
          "Expiration date must be in the future",
          400,
          "CreateNotification",
          "Invalid expiration date"
        );
      }
    }

    // Validate link if provided
    if (link && typeof link !== "string") {
      throw new AppError(
        "Link must be a string",
        400,
        "CreateNotification",
        "Invalid link field"
      );
    }

    // Validate region if provided
    const validRegions = [
      "global",
      "north-america",
      "europe",
      "asia",
      "australia",
    ]; // Add your valid regions
    const finalRegion = region || "global";
    if (!validRegions.includes(finalRegion)) {
      throw new AppError(
        "Invalid region specified",
        400,
        "CreateNotification",
        "Invalid region field"
      );
    }

    const notification = new BannerNotifyModel({
      title: title.trim(),
      message: message.trim(),
      region: finalRegion,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      link: link ? link.trim() : "",
      createdBy: req.user.userId,
      dismissedBy: [],
    });

    await notification.save();

    // Emits notification to connected clients
    io.emit("newBroadcastNotification", {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      region: notification.region,
      link: notification.link,
      expiresAt: notification.expiresAt,
      timestamp: Date.now(),
    });

    // Logs creation activity
    await recordActivity({
      userId: req.user.userId,
      action: "CREATED_NOTIFICATION",
      message: `Admin created notification: ${notification._id}`,
      targetUser: req.user.userId,
    });

    res.status(201).json({
      success: true,
      notification: {
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        region: notification.region,
        link: notification.link,
        expiresAt: notification.expiresAt,
        createdAt: notification.createdAt,
        isActive: notification.isActive,
      },
    });
  } catch (error) {
    console.error("Create notification error:", error);

    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Internal server error",
            500,
            "CreateNotification",
            "Failed to create notification"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

// Fetches all notifications with dismissal counts
export const getNotifications = async (req, res) => {
  try {
    const { includeInactive = false } = req.query;

    // Build query based on includeInactive parameter
    const query = includeInactive === "true" ? {} : { isActive: true };

    const notifications = await BannerNotifyModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (notifications.length === 0) {
      return res.status(200).json({
        success: true,
        notifications: [],
        message: "No notifications found",
      });
    }

    const ids = notifications.map((n) => n._id);

    // Aggregates dismissal counts per notification
    const dismissCounts = await DismissedBannerNotification.aggregate([
      { $match: { notificationId: { $in: ids } } },
      {
        $group: {
          _id: "$notificationId",
          count: { $sum: 1 },
        },
      },
    ]);

    const dismissMap = {};
    dismissCounts.forEach((d) => {
      dismissMap[d._id.toString()] = d.count;
    });

    // Enriches notifications with dismissal count and filters expired ones
    const now = new Date();
    const enriched = notifications
      .filter((n) => !n.expiresAt || n.expiresAt > now) // Filter out expired notifications
      .map((n) => ({
        ...n,
        dismissedCount: dismissMap[n._id.toString()] || 0,
      }));

    res.status(200).json({ success: true, notifications: enriched });
  } catch (error) {
    console.error("Get notifications error:", error);

    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Internal server error",
            500,
            "GetNotifications",
            "Failed to fetch notifications"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

// Fetches a single notification by ID
export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validates ObjectId
    if (!isValidObjectId(id))
      throw new AppError(
        "Invalid notification ID format",
        400,
        "GetNotificationById",
        "Invalid notification ID"
      );

    const notification = await BannerNotifyModel.findById(id);

    // Checks if notification exists
    if (!notification) {
      throw new AppError(
        "Notification not found",
        404,
        "GetNotificationById",
        "Notification does not exist"
      );
    }

    // Check if notification is active
    if (!notification.isActive) {
      throw new AppError(
        "Notification is not active",
        410, // Gone status
        "GetNotificationById",
        "Notification has been deactivated"
      );
    }

    // Check if notification has expired
    if (notification.expiresAt && notification.expiresAt <= new Date()) {
      throw new AppError(
        "Notification has expired",
        410, // Gone status
        "GetNotificationById",
        "Notification has expired"
      );
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    console.error("Get notification by ID error:", error);

    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Internal server error",
            500,
            "GetNotificationById",
            "Failed to get notification"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

// Dismisses a notification for a user
export const dismissNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // Validates ObjectId
    if (!isValidObjectId(id))
      throw new AppError(
        "Invalid notification ID format",
        400,
        "DismissNotification",
        "Invalid notification ID"
      );

    // Check if notification exists and is active
    const notification = await BannerNotifyModel.findById(id);
    if (!notification) {
      throw new AppError(
        "Notification not found",
        404,
        "DismissNotification",
        "Notification does not exist"
      );
    }

    if (!notification.isActive) {
      throw new AppError(
        "Cannot dismiss inactive notification",
        400,
        "DismissNotification",
        "Notification is not active"
      );
    }

    // Check if already dismissed by this user
    const alreadyDismissed = await DismissedBannerNotification.findOne({
      userId: req.user.userId,
      notificationId: id,
    });

    if (alreadyDismissed) {
      return res.status(200).json({
        success: true,
        message: "Notification already dismissed",
        data: { id, alreadyDismissed: true },
      });
    }

    // Records dismissal in database
    await DismissedBannerNotification.create({
      userId: req.user.userId,
      notificationId: id,
    });

    // Emits dismissal event to specific user (more targeted than broadcasting to all)
    io.to(`user_${req.user.userId}`).emit("notificationDismissed", { id });

    // Logs dismissal activity
    await recordActivity({
      userId: req.user.userId,
      action: "DISMISSED_NOTIFICATION",
      message: `User dismissed notification: ${id}`,
      targetUser: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Notification dismissed successfully",
      data: { id, dismissed: true },
    });
  } catch (error) {
    console.error("Dismiss notification error:", error);

    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Internal server error",
            500,
            "DismissNotification",
            "Failed to dismiss notification"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

// Checks if a notification is dismissed by a user
export const checkDismissedNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // Validates ObjectId
    if (!isValidObjectId(id))
      throw new AppError(
        "Invalid notification ID format",
        400,
        "CheckDismissedNotification",
        "Invalid notification ID"
      );

    // Check if notification exists
    const notification = await BannerNotifyModel.findById(id);
    if (!notification) {
      throw new AppError(
        "Notification not found",
        404,
        "CheckDismissedNotification",
        "Notification does not exist"
      );
    }

    const dismissed = await DismissedBannerNotification.findOne({
      userId: req.user.userId,
      notificationId: id,
    });

    res.status(200).json({
      success: true,
      dismissed: !!dismissed,
      notificationExists: true,
    });
  } catch (error) {
    console.error("Check dismissed notification error:", error);

    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Internal server error",
            500,
            "CheckDismissedNotification",
            "Failed to check dismissed notification"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

// Deactivates a notification
export const deactivateNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // Validates ObjectId
    if (!isValidObjectId(id))
      throw new AppError(
        "Invalid notification ID format",
        400,
        "DeactivateNotification",
        "Invalid notification ID"
      );

    const notification = await BannerNotifyModel.findById(id);

    // Checks if notification exists
    if (!notification)
      throw new AppError(
        "Notification not found",
        404,
        "DeactivateNotification",
        "Notification does not exist"
      );

    // Check if already deactivated
    if (!notification.isActive) {
      return res.status(200).json({
        success: true,
        message: "Notification is already deactivated",
        data: { id, alreadyDeactivated: true },
      });
    }

    await BannerNotifyModel.updateOne({ _id: id }, { isActive: false });

    // Emits deactivation event to all clients
    io.emit("broadcastNotificationDeactivated", { id });

    // Logs deactivation activity
    await recordActivity({
      userId: req.user.userId,
      action: "DEACTIVATED_NOTIFICATION",
      message: `Admin deactivated notification: ${id}`,
      targetUser: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Notification deactivated successfully",
      data: { id, deactivated: true },
    });
  } catch (error) {
    console.error("Deactivate notification error:", error);

    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Internal server error",
            500,
            "DeactivateNotification",
            "Failed to deactivate notification"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

// Deletes all notifications
export const deleteAllNotifications = async (req, res) => {
  try {
    // Add safety check - consider requiring confirmation
    const { confirm } = req.body;
    if (confirm !== "DELETE_ALL") {
      throw new AppError(
        "Confirmation required. Send { confirm: 'DELETE_ALL' } to proceed",
        400,
        "DeleteAllNotifications",
        "Missing confirmation"
      );
    }

    const deleteResult = await BannerNotifyModel.deleteMany({});

    // Also clean up dismissed notifications for deleted notifications
    await DismissedBannerNotification.deleteMany({});

    // Emits event for all notifications deleted
    io.emit("broadcastNotificationDeletedAll", {
      deletedCount: deleteResult.deletedCount,
      timestamp: Date.now(),
    });

    // Logs deletion activity
    await recordActivity({
      userId: req.user.userId,
      action: "DELETED_ALL_NOTIFICATIONS",
      message: `Admin deleted all notifications (${deleteResult.deletedCount} notifications)`,
      targetUser: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: `All notifications deleted (${deleteResult.deletedCount} notifications)`,
      data: { deletedCount: deleteResult.deletedCount },
    });
  } catch (error) {
    console.error("Delete all notifications error:", error);

    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Internal server error",
            500,
            "DeleteAllNotifications",
            "Failed to delete all notifications"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

// Additional helper function: Get active notifications for a specific user (excluding dismissed ones)
export const getActiveNotificationsForUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { region } = req.query;

    // Build query for active, non-expired notifications
    const now = new Date();
    const query = {
      isActive: true,
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    };

    // Add region filter if specified
    if (region) {
      query.$and = [{ $or: [{ region: region }, { region: "global" }] }];
    }

    const notifications = await BannerNotifyModel.find(query)
      .sort({ createdAt: -1 })
      .lean();

    if (notifications.length === 0) {
      return res.status(200).json({
        success: true,
        notifications: [],
        message: "No active notifications found",
      });
    }

    // Get dismissed notifications for this user
    const dismissedNotifications = await DismissedBannerNotification.find({
      userId: userId,
      notificationId: { $in: notifications.map((n) => n._id) },
    }).lean();

    const dismissedIds = new Set(
      dismissedNotifications.map((d) => d.notificationId.toString())
    );

    // Filter out dismissed notifications
    const activeForUser = notifications.filter(
      (n) => !dismissedIds.has(n._id.toString())
    );

    res.status(200).json({
      success: true,
      notifications: activeForUser,
      count: activeForUser.length,
    });
  } catch (error) {
    console.error("Get active notifications for user error:", error);

    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Internal server error",
            500,
            "GetActiveNotificationsForUser",
            "Failed to fetch active notifications"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};
