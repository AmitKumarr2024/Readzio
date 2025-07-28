import NotificationModel from '../../servers/Models/Notification.js';

export const createNotification = async ({ user, sender, type, post }) => {
  // console.log('[createNotification] Starting', { user, sender, type, post });
  try {
    if (!user) {
      console.warn('[createNotification] Missing user (recipient)');
      return null;
    }
    if (!sender) {
      console.warn('[createNotification] Missing sender');
      return null;
    }
    if (!type) {
      console.warn('[createNotification] Missing type');
      return null;
    }
    if (user.toString() === sender.toString()) {
      // console.log('[createNotification] Skipping: user is sender');
      return null;
    }

    const notification = new NotificationModel({
      user,
      sender,
      type,
      post: post || null,
    });
    await notification.save();
    // console.log('[createNotification] Notification saved:', { notificationId: notification._id });
    return notification;
  } catch (error) {
    console.error('[createNotification] Error:', { error: error.message, stack: error.stack });
    return null;
  }
};