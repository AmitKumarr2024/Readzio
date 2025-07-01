import Notification from '../Models/Notification.js';
import PostModel from '../Models/Post.js';
import User from '../Models/User.js';
import { AppError } from '../utils/AppError.js';
import mongoose from 'mongoose';

export const adminSendNotification = async (req, res, next) => {
  console.log('[NotificationController:adminSend]', { userId: req.body.userId, senderId: req.user?._id });
  try {
    const { userId, content, navigateTo } = req.body;

    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Only admins can send notifications', 403, 'AdminSendNotification');
    }
    if (!mongoose.Types.ObjectId.isValid(userId) || !content) {
      throw new AppError('Invalid userId or content', 400, 'AdminSendNotification');
    }
    if (userId === req.user._id.toString()) {
      throw new AppError('Cannot send notification to self', 400, 'AdminSendNotification');
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      throw new AppError('User not found', 404, 'AdminSendNotification');
    }

    const notification = new Notification({
      user: userId,
      sender: req.user._id,
      type: 'admin',
      content,
      navigateTo: navigateTo || null,
    });
    await notification.save();

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'name avatar')
      .populate('post', 'title slug')
      .lean();

    req.io.to(userId).emit('newNotification', populatedNotification);
    res.status(201).json({ success: true, notification: populatedNotification });
  } catch (err) {
    console.error('[NotificationController:adminSend] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to send notification', 500, 'AdminSendNotification'));
  }
};

export const broadcastNotification = async (req, res, next) => {
  console.log('[NotificationController:broadcast]', { excludeSender: req.body.excludeSender });
  try {
    const { content, excludeSender } = req.body;
    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Only admins can broadcast', 403, 'BroadcastNotification');
    }
    if (!content) {
      throw new AppError('Content is required', 400, 'BroadcastNotification');
    }

    const users = await User.find({ _id: { $ne: excludeSender || req.user._id } }).select('_id').lean();
    if (!users.length) {
      throw new AppError('No users found', 404, 'BroadcastNotification');
    }

    const notifications = [];
    for (const user of users) {
      const notification = new Notification({
        user: user._id,
        sender: req.user._id,
        type: 'admin',
        content,
      });
      await notification.save();
      const populatedNotification = await Notification.findById(notification._id)
        .populate('sender', 'name avatar')
        .populate('post', 'title slug')
        .lean();
      req.io.to(user._id.toString()).emit('newNotification', populatedNotification);
      notifications.push(populatedNotification);
    }

    res.status(201).json({ success: true, notifications });
  } catch (err) {
    console.error('[NotificationController:broadcast] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to broadcast notification', 500, 'BroadcastNotification'));
  }
};

export const replyToNotification = async (req, res, next) => {
  console.log('[NotificationController:reply]', { notificationId: req.body.notificationId });
  try {
    const { notificationId, content } = req.body;
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'ReplyNotification');
    }
    if (!mongoose.Types.ObjectId.isValid(notificationId) || !content) {
      throw new AppError('Invalid notificationId or content', 400, 'ReplyNotification');
    }

    const originalNotification = await Notification.findById(notificationId).lean();
    if (!originalNotification || originalNotification.type !== 'admin') {
      throw new AppError('Invalid or non-admin notification', 400, 'ReplyNotification');
    }
    if (originalNotification.sender.toString() === req.user._id.toString()) {
      throw new AppError('Cannot reply to own notification', 400, 'ReplyNotification');
    }

    const notification = new Notification({
      user: originalNotification.sender,
      sender: req.user._id,
      type: 'admin_reply',
      content: `Reply to your message: ${content}`,
      parentNotification: notificationId,
    });
    await notification.save();

    const populatedNotification = await Notification.findById(notification._id)
      .populate('sender', 'name avatar')
      .populate('post', 'title slug')
      .lean();

    req.io.to(originalNotification.sender.toString()).emit('newNotification', populatedNotification);
    res.status(201).json({ success: true, notification: populatedNotification });
  } catch (err) {
    console.error('[NotificationController:reply] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to reply', 500, 'ReplyNotification'));
  }
};

export const getNotifications = async (req, res, next) => {
  console.log('[NotificationController:getNotifications]', { userId: req.user?._id });
  try {
    const notifications = await Notification.find({
      user: req.user._id,
      sender: { $ne: req.user._id },
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name avatar')
      .populate('post', 'title slug')
      .lean()
      .limit(50); // Limit for scalability

    res.status(200).json({ success: true, notifications });
  } catch (err) {
    console.error('[NotificationController:getNotifications] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to fetch notifications', 500, 'GetNotifications'));
  }
};

export const getUnreadCount = async (req, res, next) => {
  console.log('[NotificationController:getUnreadCount]', { userId: req.user?._id });
  try {
    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
      sender: { $ne: req.user._id },
    });
    res.status(200).json({ success: true, count });
  } catch (err) {
    console.error('[NotificationController:getUnreadCount] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to count notifications', 500, 'GetUnreadCount'));
  }
};

export const markAsRead = async (req, res, next) => {
  console.log('[NotificationController:markAsRead]', { notificationId: req.params.id });
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid notification ID', 400, 'MarkAsRead');
    }
    if (!req.user?._id) {
      throw new AppError('User not authenticated', 401, 'MarkAsRead');
    }

    const updated = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) {
      throw new AppError('Notification not found or unauthorized', 404, 'MarkAsRead');
    }

    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
      sender: { $ne: req.user._id },
    });

    req.io.to(req.user._id.toString()).emit('updateUnreadCount', { count });
    res.status(200).json({ success: true, notification: updated });
  } catch (err) {
    console.error('[NotificationController:markAsRead] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to mark as read', 500, 'MarkAsRead'));
  }
};

export const markAllAsRead = async (req, res, next) => {
  console.log('[NotificationController:markAllAsRead]', { userId: req.user?._id });
  try {
    if (!req.user?._id) {
      throw new AppError('User not authenticated', 401, 'MarkAllAsRead');
    }

    await Notification.updateMany(
      { user: req.user._id, sender: { $ne: req.user._id }, read: false },
      { read: true, readAt: new Date() }
    );

    req.io.to(req.user._id.toString()).emit('updateUnreadCount', { count: 0 });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[NotificationController:markAllAsRead] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to mark all as read', 500, 'MarkAllAsRead'));
  }
};

export const createNotification = async (req, res, next) => {
  console.log('[NotificationController:createNotification]', { body: req.body });
  try {
    const { userId, senderId, type, postId, content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(senderId) || !type) {
      throw new AppError('Invalid userId, senderId, or type', 400, 'CreateNotification');
    }
    if (userId === senderId) {
      throw new AppError('Cannot send notification to self', 400, 'CreateNotification');
    }

    const notification = new Notification({
      user: userId,
      sender: senderId,
      type,
      post: postId && mongoose.Types.ObjectId.isValid(postId) ? postId : null,
      content,
    });
    await notification.save();

    const populateOptions = [
      { path: 'sender', select: 'name avatar' },
      postId && mongoose.Types.ObjectId.isValid(postId) ? { path: 'post', select: 'title slug' } : null,
    ].filter(Boolean);

    const populatedNotification = await Notification.findById(notification._id)
      .populate(populateOptions)
      .lean();

    req.io.to(userId).emit('newNotification', populatedNotification);
    res.status(201).json({ success: true, notification: populatedNotification });
  } catch (err) {
    console.error('[NotificationController:createNotification] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to create notification', 500, 'CreateNotification'));
  }
};

export const deleteNotification = async (req, res, next) => {
  console.log('[NotificationController:deleteNotification]', { notificationId: req.params.id });
  try {
    const { id } = req.params;

    if (!id || id === 'undefined' || !mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError('Invalid notification ID', 400, 'DeleteNotification');
    }
    if (!req.user?._id) {
      throw new AppError('User not authenticated', 401, 'DeleteNotification');
    }

    const notification = await Notification.findById(id).lean();
    if (!notification) {
      throw new AppError('Notification not found', 404, 'DeleteNotification');
    }
    if (notification.user.toString() !== req.user._id.toString()) {
      throw new AppError('Not authorized to delete this notification', 403, 'DeleteNotification');
    }

    await Notification.deleteOne({ _id: id });

    const count = await Notification.countDocuments({
      user: req.user._id,
      read: false,
      sender: { $ne: req.user._id },
    });

    req.io.to(req.user._id.toString()).emit('updateUnreadCount', { count });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('[NotificationController:deleteNotification] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to delete notification', 500, 'DeleteNotification'));
  }
};

export const getUserNotificationHistory = async (req, res, next) => {
  console.log('[NotificationController:getUserNotificationHistory]', { requestedUser: req.params.userId, admin: req.user?._id });
  try {
    const { userId } = req.params;

    if (!req.user || req.user.role !== 'admin') {
      throw new AppError('Only admins can view user notification history', 403, 'GetUserNotificationHistory');
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new AppError('Invalid userId', 400, 'GetUserNotificationHistory');
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      throw new AppError('User not found', 404, 'GetUserNotificationHistory');
    }

    const notifications = await Notification.find({
      user: userId,
      type: { $in: ['admin', 'admin_reply'] },
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name avatar')
      .populate('post', 'title slug')
      .lean()
      .limit(50); // Limit for scalability

    res.status(200).json({ success: true, notifications });
  } catch (err) {
    console.error('[NotificationController:getUserNotificationHistory] Error:', { error: err.message });
    next(err instanceof AppError ? err : new AppError(err.message || 'Failed to fetch notification history', 500, 'GetUserNotificationHistory'));
  }
};