import Notification from "../Models/Notification.js";
import PostModel from "../Models/Post.js";
import User from "../Models/User.js";
import { AppError } from "../utils/AppError.js";
import mongoose from "mongoose";

// Sends a notification from an admin to a specific user
export const adminSendNotification = async (req, res, next) => {
  try {
    const { userId, content, navigateTo } = req.body;

    // Validates admin access
    if (!req.user || req.user.role !== "admin")
      throw new AppError(
        "Only admins can send notifications",
        403,
        "AdminSendNotification",
        "Admin privileges required"
      );

    // Validates input
    if (!mongoose.Types.ObjectId.isValid(userId) || !content)
      throw new AppError(
        "Invalid userId or content",
        400,
        "AdminSendNotification",
        "Missing or invalid fields"
      );

    // Prevents self-notification
    if (userId === req.user._id.toString())
      throw new AppError(
        "Cannot send notification to self",
        400,
        "AdminSendNotification",
        "Self-notification not allowed"
      );

    // Validates user existence
    const user = await User.findById(userId).lean();
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "AdminSendNotification",
        "User does not exist"
      );

    // Creates and saves notification
    const notification = new Notification({
      user: userId,
      sender: req.user._id,
      type: "admin",
      content,
      navigateTo: navigateTo || null,
    });
    await notification.save();

    // Populates notification with sender and post details
    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name avatar")
      .populate("post", "title slug")
      .lean();

    // Emits notification to user
    req.io.to(userId).emit("newNotification", populatedNotification);

    res
      .status(201)
      .json({ success: true, notification: populatedNotification });
  } catch (err) {
    // AppError with context for sending admin notification
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to send notification",
            500,
            "AdminSendNotification",
            "Failed to send admin notification"
          )
    );
  }
};

// Broadcasts a notification to all users except sender
export const broadcastNotification = async (req, res, next) => {
  try {
    const { content, excludeSender } = req.body;

    // Validates admin access
    if (!req.user || req.user.role !== "admin")
      throw new AppError(
        "Only admins can broadcast",
        403,
        "BroadcastNotification",
        "Admin privileges required"
      );

    // Validates content
    if (!content)
      throw new AppError(
        "Content is required",
        400,
        "BroadcastNotification",
        "Missing content"
      );

    // Fetches users excluding sender
    const users = await User.find({
      _id: { $ne: excludeSender || req.user._id },
    })
      .select("_id")
      .lean();
    if (!users.length)
      throw new AppError(
        "No users found",
        404,
        "BroadcastNotification",
        "No eligible users"
      );

    const notifications = [];

    // Creates and emits notification for each user
    for (const user of users) {
      const notification = new Notification({
        user: user._id,
        sender: req.user._id,
        type: "admin",
        content,
      });
      await notification.save();

      const populatedNotification = await Notification.findById(
        notification._id
      )
        .populate("sender", "name avatar")
        .populate("post", "title slug")
        .lean();

      req.io
        .to(user._id.toString())
        .emit("newNotification", populatedNotification);
      notifications.push(populatedNotification);
    }

    res.status(201).json({ success: true, notifications });
  } catch (err) {
    // AppError with context for broadcasting notifications
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to broadcast notification",
            500,
            "BroadcastNotification",
            "Failed to broadcast notification"
          )
    );
  }
};

// Replies to an admin notification
export const replyToNotification = async (req, res, next) => {
  try {
    const { notificationId, content } = req.body;

    // Validates user authentication
    if (!req.user)
      throw new AppError(
        "User not authenticated",
        401,
        "ReplyNotification",
        "Authentication required"
      );

    // Validates input
    if (!mongoose.Types.ObjectId.isValid(notificationId) || !content)
      throw new AppError(
        "Invalid notificationId or content",
        400,
        "ReplyNotification",
        "Missing or invalid fields"
      );

    // Validates original notification
    const originalNotification = await Notification.findById(
      notificationId
    ).lean();
    if (!originalNotification || originalNotification.type !== "admin")
      throw new AppError(
        "Invalid or non-admin notification",
        400,
        "ReplyNotification",
        "Invalid notification type"
      );

    // Prevents self-reply
    if (originalNotification.sender.toString() === req.user._id.toString())
      throw new AppError(
        "Cannot reply to own notification",
        400,
        "ReplyNotification",
        "Self-reply not allowed"
      );

    // Creates reply notification
    const notification = new Notification({
      user: originalNotification.sender,
      sender: req.user._id,
      type: "admin_reply",
      content: `Reply to your message: ${content}`,
      parentNotification: notificationId,
    });
    await notification.save();

    // Populates reply notification
    const populatedNotification = await Notification.findById(notification._id)
      .populate("sender", "name avatar")
      .populate("post", "title slug")
      .lean();

    // Emits reply to sender
    req.io
      .to(originalNotification.sender.toString())
      .emit("newNotification", populatedNotification);

    res
      .status(201)
      .json({ success: true, notification: populatedNotification });
  } catch (err) {
    // AppError with context for replying to notification
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to reply",
            500,
            "ReplyNotification",
            "Failed to reply to notification"
          )
    );
  }
};

// Fetches user notifications
export const getNotifications = async (req, res, next) => {
  try {
    // Fetches notifications for authenticated user
    const notifications = await Notification.find({
      user: req.user._id,
      sender: { $ne: req.user._id },
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name avatar")
      .populate("post", "title slug")
      .lean()
      .limit(50); // Limits for scalability

    res.status(200).json({ success: true, notifications });
  } catch (err) {
    // AppError with context for fetching notifications
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to fetch notifications",
            500,
            "GetNotifications",
            "Failed to fetch notifications"
          )
    );
  }
};

// Counts unread notifications for a user
export const getUnreadCount = async (req, res, next) => {
  try {
    // Counts unread notifications excluding self-sent
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
      sender: { $ne: req.user._id },
    });

    res.status(200).json({ success: true, count });
  } catch (err) {
    // AppError with context for counting unread notifications
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to count notifications",
            500,
            "GetUnreadCount",
            "Failed to count unread notifications"
          )
    );
  }
};

// Marks a notification as read
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validates user authentication
    if (!req.user?._id)
      throw new AppError(
        "User not authenticated",
        401,
        "MarkAsRead",
        "Authentication required"
      );

    // Validates notification ID
    if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id))
      throw new AppError(
        "Invalid notification ID",
        400,
        "MarkAsRead",
        "Invalid notification ID format"
      );

    // Updates notification as read
    const updated = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    ).lean();

    if (!updated)
      throw new AppError(
        "Notification not found or unauthorized",
        404,
        "MarkAsRead",
        "Notification does not exist or user not authorized"
      );

    // Updates unread count
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
      sender: { $ne: req.user._id },
    });

    req.io.to(req.user._id.toString()).emit("updateUnreadCount", { count });

    res.status(200).json({ success: true, notification: updated });
  } catch (err) {
    // AppError with context for marking notification as read
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to mark as read",
            500,
            "MarkAsRead",
            "Failed to mark notification as read"
          )
    );
  }
};

// Marks all notifications as read for a user
export const markAllAsRead = async (req, res, next) => {
  try {
    // Validates user authentication
    if (!req.user?._id)
      throw new AppError(
        "User not authenticated",
        401,
        "MarkAllAsRead",
        "Authentication required"
      );

    // Updates all unread notifications
    await Notification.updateMany(
      { user: req.user._id, sender: { $ne: req.user._id }, read: false },
      { read: true, readAt: new Date() }
    );

    // Emits updated unread count
    req.io.to(req.user._id.toString()).emit("updateUnreadCount", { count: 0 });

    res.status(200).json({ success: true });
  } catch (err) {
    // AppError with context for marking all notifications as read
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to mark all as read",
            500,
            "MarkAllAsRead",
            "Failed to mark all notifications as read"
          )
    );
  }
};

// Creates a new notification
export const createNotification = async (req, res, next) => {
  try {
    const { userId, senderId, type, postId, content } = req.body;

    // Validates input
    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(senderId) ||
      !type
    )
      throw new AppError(
        "Invalid userId, senderId, or type",
        400,
        "CreateNotification",
        "Missing or invalid fields"
      );

    // Prevents self-notification
    if (userId === senderId)
      throw new AppError(
        "Cannot send notification to self",
        400,
        "CreateNotification",
        "Self-notification not allowed"
      );

    // Creates and saves notification
    const notification = new Notification({
      user: userId,
      sender: senderId,
      type,
      post: postId && mongoose.Types.ObjectId.isValid(postId) ? postId : null,
      content,
    });
    await notification.save();

    // Populates notification with sender and post details
    const populateOptions = [
      { path: "sender", select: "name avatar" },
      postId && mongoose.Types.ObjectId.isValid(postId)
        ? { path: "post", select: "title slug" }
        : null,
    ].filter(Boolean);

    const populatedNotification = await Notification.findById(notification._id)
      .populate(populateOptions)
      .lean();

    // Emits notification to user
    req.io.to(userId).emit("newNotification", populatedNotification);

    res
      .status(201)
      .json({ success: true, notification: populatedNotification });
  } catch (err) {
    // AppError with context for creating notification
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to create notification",
            500,
            "CreateNotification",
            "Failed to create notification"
          )
    );
  }
};

// Deletes a notification
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validates user authentication
    if (!req.user?._id)
      throw new AppError(
        "User not authenticated",
        401,
        "DeleteNotification",
        "Authentication required"
      );

    // Validates notification ID
    if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id))
      throw new AppError(
        "Invalid notification ID",
        400,
        "DeleteNotification",
        "Invalid notification ID format"
      );

    // Validates notification existence and authorization
    const notification = await Notification.findById(id).lean();
    if (!notification)
      throw new AppError(
        "Notification not found",
        404,
        "DeleteNotification",
        "Notification does not exist"
      );

    if (notification.user.toString() !== req.user._id.toString())
      throw new AppError(
        "Not authorized to delete this notification",
        403,
        "DeleteNotification",
        "User not authorized"
      );

    // Deletes notification
    await Notification.deleteOne({ _id: id });

    // Updates unread count
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
      sender: { $ne: req.user._id },
    });

    req.io.to(req.user._id.toString()).emit("updateUnreadCount", { count });

    res.status(200).json({ success: true });
  } catch (err) {
    // AppError with context for deleting notification
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to delete notification",
            500,
            "DeleteNotification",
            "Failed to delete notification"
          )
    );
  }
};

// Fetches notification history for a specific user (admin only)
export const getUserNotificationHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Validates admin access
    if (!req.user || req.user.role !== "admin")
      throw new AppError(
        "Only admins can view user notification history",
        403,
        "GetUserNotificationHistory",
        "Admin privileges required"
      );

    // Validates user ID
    if (!mongoose.Types.ObjectId.isValid(userId))
      throw new AppError(
        "Invalid userId",
        400,
        "GetUserNotificationHistory",
        "Invalid user ID format"
      );

    // Validates user existence
    const user = await User.findById(userId).lean();
    if (!user)
      throw new AppError(
        "User not found",
        404,
        "GetUserNotificationHistory",
        "User does not exist"
      );

    // Fetches admin-related notifications for user
    const notifications = await Notification.find({
      user: userId,
      type: { $in: ["admin", "admin_reply"] },
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name avatar")
      .populate("post", "title slug")
      .lean()
      .limit(50); // Limits for scalability

    res.status(200).json({ success: true, notifications });
  } catch (err) {
    // AppError with context for fetching user notification history
    next(
      err instanceof AppError
        ? err
        : new AppError(
            err.message || "Failed to fetch notification history",
            500,
            "GetUserNotificationHistory",
            "Failed to fetch notification history"
          )
    );
  }
};
