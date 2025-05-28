import NotificationModel from '../Models/Notification.js';
import { AppError } from '../utils/AppError.js';

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const notifications = await NotificationModel.find({ user: userId }).sort({ createdAt: -1 });
    
    console.log("User ID:", userId.toString());
    console.log("Number of notifications:", notifications.length);

    res.status(200).json({ success: true, notifications });
  } catch (error) {
    next(new AppError(error.message, 500, "GetNotifications Controller"));
  }
};


export const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await NotificationModel.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      throw new AppError("Notification not found", 404, "MarkAsRead Controller");
    }

    res.status(200).json({ success: true, message: "Notification marked as read", notification });
  } catch (error) {
    next(new AppError(error.message, 500, "MarkAsRead Controller"));
  }
};