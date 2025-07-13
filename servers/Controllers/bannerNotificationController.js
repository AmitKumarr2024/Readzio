import { isValidObjectId } from "mongoose";
import BannerNotifyModel from "../Models/bannerNotificationModel.js";
import { AppError } from "../utils/AppError.js";
import { recordActivity } from "../helpers/activityHelper.js";
import { io } from "../sockets/socket.js";
import DismissedBannerNotification from "../Models/DismissedBannerNotification.js";

export const createNotification = async (req, res) => {
  try {
    const { title, message, region, expiresAt, link } = req.body;
    if (!message || !title) {
      return res
        .status(400)
        .json({ message: "Title and message are required" });
    }

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

    // Emit notification to clients
    io.emit("newBroadcastNotification", {
      _id: notification._id,
      title,
      message,
      region: region || "global",
      link: link || "",
      expiresAt: notification.expiresAt,
      timestamp: Date.now(),
    });

    // Log activity
    await recordActivity({
      userId: req.user.userId,
      action: "CREATED_NOTIFICATION",
      message: `Admin created notification: ${notification._id}`,
      targetUser: req.user.userId,
    });

    res.status(201).json({ notification });
  } catch (error) {
    res.status(500).json({
      message: "Error creating notification",
      error: error.message,
    });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await BannerNotifyModel.find({})
      .sort({ createdAt: -1 })
      .lean();

    const ids = notifications.map((n) => n._id);

    // Count dismissals per notification
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

    // Attach `dismissedCount` instead of empty dismissedBy
    const enriched = notifications.map((n) => ({
      ...n,
      dismissedCount: dismissMap[n._id.toString()] || 0,
    }));

    res.status(200).json({ success: true, notifications: enriched });
  } catch (error) {
    const err =
      error instanceof AppError
        ? error
        : new AppError("Error fetching notifications", 500, "GetNotifications");
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

export const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw new AppError("Invalid ID", 400, "GetNotificationById");
    }

    const notification = await BannerNotifyModel.findById(id);

    if (!notification || !notification.isActive) {
      throw new AppError("Notification not found", 404, "GetNotificationById");
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Failed to get notification",
            500,
            "GetNotificationById"
          );

    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

export const dismissNotification = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[dismissNotification] req.user:", req.user);

    if (!isValidObjectId(id)) {
      throw new AppError("Invalid notification ID", 400, "DismissNotification");
    }

    // Record dismissal in DismissedNotification model
    await DismissedBannerNotification.create({
      userId: req.user.userId,
      notificationId: id,
    });

    // Emit dismissal event
    io.emit("broadcastNotificationDismissed", { id });

    // Log activity
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
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Error dismissing notification",
            500,
            "DismissNotification"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

export const checkDismissedNotification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      throw new AppError(
        "Invalid notification ID",
        400,
        "CheckDismissedNotification"
      );
    }

    const dismissed = await DismissedBannerNotification.findOne({
      userId: req.user.userId,
      notificationId: id,
    });

    res.status(200).json({ success: true, dismissed: !!dismissed });
  } catch (error) {
    const err =
      error instanceof AppError
        ? error
        : new AppError(
            "Error checking dismissed notification",
            500,
            "CheckDismissedNotification"
          );
    res.status(err.statusCode).json({ success: false, message: err.message });
  }
};

export const deactivateNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      throw new AppError(
        "Invalid notification ID",
        400,
        "DeactivateNotification"
      );
    }

    const notification = await BannerNotifyModel.findById(id);
    console.log("[deactivateNotification]", notification);

    if (!notification) {
      throw new AppError(
        "Notification not found",
        404,
        "DeactivateNotification"
      );
    }

    await BannerNotifyModel.updateOne({ _id: id }, { isActive: false });

    io.emit("broadcastNotificationDeactivated", { id });

    await recordActivity({
      userId: req.user.userId, // ✅ Fix here
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
    console.error("[deactivateNotification] ❌ Error:", error);

    const err =
      error instanceof AppError
        ? error
        : new AppError(
            error.message || "Error deactivating notification",
            500,
            "DeactivateNotification"
          );

    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }
};

// In bannerNotificationController.js
export const deleteAllNotifications = async (req, res) => {
  try {
    await BannerNotifyModel.deleteMany({});
    io.emit("broadcastNotificationDeletedAll");
    res
      .status(200)
      .json({ success: true, message: "All notifications deleted." });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to delete all notifications." });
  }
};
