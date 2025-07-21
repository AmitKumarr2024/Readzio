import { isValidObjectId } from "mongoose";
import BannerNotifyModel from "../Models/bannerNotificationModel.js";
import { AppError } from "../../servers/Utils/AppError.js";
import { recordActivity } from "../helpers/activityHelper.js";
import { io } from "../sockets/socket.js";
import DismissedBannerNotification from "../Models/DismissedBannerNotification.js";

// Creates a new banner notification
export const createNotification = async (req, res) => {
  try {
    const { title, message, region, expiresAt, link } = req.body;
    // Validates required fields
    if (!message || !title)
      throw new AppError(
        "Title and message are required",
        400,
        "CreateNotification",
        "Missing required fields"
      );

    const notification = new BannerNotifyModel({
      title,
      message,
      region: region || "global",
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      link: link || "",
      createdBy: req.user.userId,
      dismissedBy: [],
    });
    await notification.save();

    // Emits notification to connected clients
    io.emit("newBroadcastNotification", {
      _id: notification._id,
      title,
      message,
      region: region || "global",
      link: link || "",
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

    res.status(201).json({ notification });
  } catch (error) {
    // AppError with context for notification creation issues
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
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
    const notifications = await BannerNotifyModel.find({})
      .sort({ createdAt: -1 })
      .lean();

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

    // Enriches notifications with dismissal count
    const enriched = notifications.map((n) => ({
      ...n,
      dismissedCount: dismissMap[n._id.toString()] || 0,
    }));

    res.status(200).json({ success: true, notifications: enriched });
  } catch (error) {
    // AppError with context for fetching notifications
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
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
        "Invalid ID",
        400,
        "GetNotificationById",
        "Invalid notification ID"
      );

    const notification = await BannerNotifyModel.findById(id);
    // Checks if notification exists and is active
    if (!notification || !notification.isActive)
      throw new AppError(
        "Notification not found",
        404,
        "GetNotificationById",
        "Notification does not exist or is inactive"
      );

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    // AppError with context for fetching single notification
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
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
        "Invalid notification ID",
        400,
        "DismissNotification",
        "Invalid notification ID"
      );

    // Records dismissal in database
    await DismissedBannerNotification.create({
      userId: req.user.userId,
      notificationId: id,
    });

    // Emits dismissal event to clients
    io.emit("broadcastNotificationDismissed", { id });

    // Logs dismissal activity
    await recordActivity({
      userId: req.user.userId,
      action: "DISMISSED_NOTIFICATION",
      message: `User ${req.user.userId} dismissed notification: ${id}`,
      targetUser: req.user.userId,
    });

    res
      .status(200)
      .json({ success: true, message: "Notification dismissed", data: { id } });
  } catch (error) {
    // AppError with context for dismissing notification
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
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
        "Invalid notification ID",
        400,
        "CheckDismissedNotification",
        "Invalid notification ID"
      );

    const dismissed = await DismissedBannerNotification.findOne({
      userId: req.user.userId,
      notificationId: id,
    });

    res.status(200).json({ success: true, dismissed: !!dismissed });
  } catch (error) {
    // AppError with context for checking dismissed notification
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
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
        "Invalid notification ID",
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

    await BannerNotifyModel.updateOne({ _id: id }, { isActive: false });

    // Emits deactivation event to clients
    io.emit("broadcastNotificationDeactivated", { id });

    // Logs deactivation activity
    await recordActivity({
      userId: req.user.userId,
      action: "DEACTIVATED_NOTIFICATION",
      message: `Admin ${req.user.userId} deactivated notification: ${id}`,
      targetUser: req.user.userId,
    });

    res.status(200).json({
      success: true,
      message: "Notification deactivated",
      data: { id },
    });
  } catch (error) {
    // AppError with context for deactivating notification
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
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
    await BannerNotifyModel.deleteMany({});
    // Emits event for all notifications deleted
    io.emit("broadcastNotificationDeletedAll");

    // Logs deletion activity
    await recordActivity({
      userId: req.user.userId,
      action: "DELETED_ALL_NOTIFICATIONS",
      message: `Admin ${req.user.userId} deleted all notifications`,
      targetUser: req.user.userId,
    });

    res
      .status(200)
      .json({ success: true, message: "All notifications deleted" });
  } catch (error) {
    // AppError with context for deleting all notifications
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            error.message,
            500,
            "DeleteAllNotifications",
            "Failed to delete all notifications"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};
